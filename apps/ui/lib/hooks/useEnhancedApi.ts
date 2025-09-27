import { useState, useCallback, useEffect, useRef } from 'react';
import { enhancedApiClient, EnhancedApiRequestOptions } from '../services/EnhancedApiClient';
import { errorService, ErrorContext, RecoveryAction } from '../services/ErrorService';
import { UIError, toUIError } from '../ui/errorUtils';
// We'll implement a simplified error boundary hook for now
// import { useErrorBoundary } from '../../components/ErrorBoundaryProvider';

/**
 * Enhanced API hook state
 */
export interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: UIError | null;
  retryCount: number;
}

/**
 * Enhanced API hook options
 */
export interface UseEnhancedApiOptions extends Omit<EnhancedApiRequestOptions, 'context'> {
  immediate?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: UIError) => void;
  onRetry?: (retryCount: number) => void;
  context?: Omit<ErrorContext, 'retryCount' | 'correlationId'>;
  enableAutoRecovery?: boolean;
  showGlobalErrors?: boolean;
}

/**
 * Enhanced API hook return type
 */
export interface UseEnhancedApiReturn<T> {
  state: ApiState<T>;
  execute: (...args: any[]) => Promise<T>;
  retry: () => Promise<T>;
  cancel: () => void;
  reset: () => void;
  isRetryable: boolean;
}

/**
 * React hook for making API requests with enhanced error handling and recovery
 *
 * Features:
 * - Automatic retry with exponential backoff
 * - Token refresh for authentication errors
 * - Offline request queueing
 * - Error recovery strategies
 * - Loading and error state management
 * - Request cancellation
 * - Global error reporting
 */
export function useEnhancedApi<T = any>(
  requestFn: (...args: any[]) => Promise<T>,
  options: UseEnhancedApiOptions = {}
): UseEnhancedApiReturn<T> {
  const {
    immediate = false,
    onSuccess,
    onError,
    onRetry,
    context = {},
    enableAutoRecovery = true,
    showGlobalErrors = true
  } = options;

  // Simplified error reporting for now
  const reportError = (error: UIError, context?: ErrorContext) => {
    console.error('Global error reported:', error, context);
  };

  // State management
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null,
    retryCount: 0
  });

  // Refs for cleanup and stability
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastArgsRef = useRef<any[]>([]);
  const mountedRef = useRef(true);

  // Enhanced request execution with error handling
  const execute = useCallback(async (...args: any[]): Promise<T> => {
    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();
    lastArgsRef.current = args;

    // Set loading state
    if (mountedRef.current) {
      setState(prev => ({
        ...prev,
        loading: true,
        error: null
      }));
    }

    try {
      // Execute the request with enhanced error handling
      const result = await requestFn(...args);

      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          data: result,
          loading: false,
          error: null,
          retryCount: 0
        }));

        // Call success callback
        onSuccess?.(result);
      }

      return result;

    } catch (error) {
      const uiError = toUIError(error);

      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: uiError,
          retryCount: prev.retryCount + 1
        }));
      }

      // Handle error with recovery if enabled
      if (enableAutoRecovery) {
        const recoveryResult = await errorService.handleError(uiError, {
          ...context,
          retryCount: state.retryCount,
          operation: context.operation || requestFn.name
        });

        // Handle recovery actions
        switch (recoveryResult.action) {
          case RecoveryAction.RETRY:
            if (recoveryResult.retryAfter) {
              setTimeout(() => {
                if (mountedRef.current) {
                  onRetry?.(state.retryCount + 1);
                  execute(...args);
                }
              }, recoveryResult.retryAfter);
              return Promise.reject(uiError); // Don't retry immediately
            }
            break;

          case RecoveryAction.USE_CACHED_DATA:
            if (recoveryResult.fallbackData && mountedRef.current) {
              setState(prev => ({
                ...prev,
                data: recoveryResult.fallbackData as T,
                loading: false,
                error: null
              }));
              return recoveryResult.fallbackData as T;
            }
            break;

          case RecoveryAction.REDIRECT_LOGIN:
            // Let the enhanced API client handle the redirect
            break;

          default:
            // No automatic recovery possible
            break;
        }
      }

      // Report to global error handler if enabled
      if (showGlobalErrors && (uiError.severity === 'high' || uiError.severity === 'critical')) {
        reportError(uiError, {
          ...context,
          component: 'useEnhancedApi',
          operation: context.operation || requestFn.name
        });
      }

      // Call error callback
      onError?.(uiError);

      throw uiError;
    }
  }, [requestFn, state.retryCount, context, enableAutoRecovery, showGlobalErrors, onSuccess, onError, onRetry, reportError]);

  // Retry function
  const retry = useCallback(async (): Promise<T> => {
    if (lastArgsRef.current.length > 0) {
      return execute(...lastArgsRef.current);
    }
    return execute();
  }, [execute]);

  // Cancel function
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    if (mountedRef.current) {
      setState(prev => ({
        ...prev,
        loading: false
      }));
    }
  }, []);

  // Reset function
  const reset = useCallback(() => {
    cancel();

    if (mountedRef.current) {
      setState({
        data: null,
        loading: false,
        error: null,
        retryCount: 0
      });
    }
  }, [cancel]);

  // Determine if error is retryable
  const isRetryable = state.error?.isRetryable ?? false;

  // Execute immediately if requested
  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [immediate]); // Only run on mount

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      cancel();
    };
  }, [cancel]);

  return {
    state,
    execute,
    retry,
    cancel,
    reset,
    isRetryable
  };
}

/**
 * Simplified hook for GET requests
 */
export function useEnhancedGet<T = any>(
  endpoint: string,
  options: UseEnhancedApiOptions = {}
): UseEnhancedApiReturn<T> {
  const requestFn = useCallback(
    () => enhancedApiClient.get<T>(endpoint, options),
    [endpoint, options]
  );

  return useEnhancedApi(requestFn, {
    ...options,
    context: {
      operation: `GET ${endpoint}`,
      ...options.context
    }
  });
}

/**
 * Simplified hook for POST requests
 */
export function useEnhancedPost<T = any, D = any>(
  endpoint: string,
  options: UseEnhancedApiOptions = {}
): UseEnhancedApiReturn<T> & {
  post: (data: D) => Promise<T>
} {
  const requestFn = useCallback(
    (data: D) => enhancedApiClient.post<T>(endpoint, data, options),
    [endpoint, options]
  );

  const hook = useEnhancedApi(requestFn, {
    ...options,
    immediate: false, // Never immediate for POST
    context: {
      operation: `POST ${endpoint}`,
      ...options.context
    }
  });

  const post = useCallback((data: D) => hook.execute(data), [hook.execute]);

  return {
    ...hook,
    post
  };
}

/**
 * Simplified hook for PUT requests
 */
export function useEnhancedPut<T = any, D = any>(
  endpoint: string,
  options: UseEnhancedApiOptions = {}
): UseEnhancedApiReturn<T> & {
  put: (data: D) => Promise<T>
} {
  const requestFn = useCallback(
    (data: D) => enhancedApiClient.put<T>(endpoint, data, options),
    [endpoint, options]
  );

  const hook = useEnhancedApi(requestFn, {
    ...options,
    immediate: false,
    context: {
      operation: `PUT ${endpoint}`,
      ...options.context
    }
  });

  const put = useCallback((data: D) => hook.execute(data), [hook.execute]);

  return {
    ...hook,
    put
  };
}

/**
 * Simplified hook for DELETE requests
 */
export function useEnhancedDelete<T = any>(
  endpoint: string,
  options: UseEnhancedApiOptions = {}
): UseEnhancedApiReturn<T> & {
  delete: () => Promise<T>
} {
  const requestFn = useCallback(
    () => enhancedApiClient.delete<T>(endpoint, options),
    [endpoint, options]
  );

  const hook = useEnhancedApi(requestFn, {
    ...options,
    immediate: false,
    context: {
      operation: `DELETE ${endpoint}`,
      ...options.context
    }
  });

  const deleteRequest = useCallback(() => hook.execute(), [hook.execute]);

  return {
    ...hook,
    delete: deleteRequest
  };
}

/**
 * Hook for monitoring offline queue status
 */
export function useOfflineQueue() {
  const [queueStatus, setQueueStatus] = useState(() =>
    errorService.getOfflineQueueStatus()
  );

  useEffect(() => {
    const updateStatus = () => {
      setQueueStatus(errorService.getOfflineQueueStatus());
    };

    // Update status periodically
    const interval = setInterval(updateStatus, 5000);

    // Listen for online/offline events
    const handleOnline = () => {
      setTimeout(updateStatus, 1000); // Delay to allow queue processing
    };

    window.addEventListener('online', handleOnline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  const clearQueue = useCallback(() => {
    errorService.clearOfflineQueue();
    setQueueStatus(errorService.getOfflineQueueStatus());
  }, []);

  return {
    queueStatus,
    clearQueue,
    isOnline: navigator.onLine
  };
}