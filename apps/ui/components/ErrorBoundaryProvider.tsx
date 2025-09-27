'use client';

import React, { createContext, useContext, useCallback, useState, ReactNode } from 'react';
import { UIError, toUIError } from '@/lib/ui/errorUtils';
import { ErrorDisplay } from './ErrorDisplay';

interface ErrorContextState {
  globalError: UIError | null;
  reportError: (error: unknown, context?: ErrorContext) => void;
  clearGlobalError: () => void;
  dismissError: (errorId: string) => void;
  retryLastOperation: () => void;
}

interface ErrorContext {
  component?: string;
  feature?: string;
  operation?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

interface ErrorBoundaryProviderProps {
  children: ReactNode;
  onErrorReport?: (error: UIError, context?: ErrorContext) => void;
  fallbackComponent?: React.ComponentType<{ error: UIError; retry: () => void; context?: ErrorContext }>;
}

const ErrorContext = createContext<ErrorContextState | null>(null);

export function ErrorBoundaryProvider({
  children,
  onErrorReport,
  fallbackComponent: FallbackComponent
}: ErrorBoundaryProviderProps) {
  const [globalError, setGlobalError] = useState<UIError | null>(null);
  const [errorContext, setErrorContext] = useState<ErrorContext | undefined>();
  const [lastOperation, setLastOperation] = useState<(() => void) | null>(null);

  const reportError = useCallback((error: unknown, context?: ErrorContext) => {
    const uiError = toUIError(error);

    // Enhanced logging with context
    console.error('Global Error Reported:', {
      error: uiError,
      context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });

    // Store error and context
    setGlobalError(uiError);
    setErrorContext(context);

    // Report to external service if handler provided
    if (onErrorReport) {
      onErrorReport(uiError, context);
    }

    // Auto-dismiss low severity errors after delay
    if (uiError.severity === 'low') {
      setTimeout(() => {
        setGlobalError(null);
        setErrorContext(undefined);
      }, 5000);
    }
  }, [onErrorReport]);

  const clearGlobalError = useCallback(() => {
    setGlobalError(null);
    setErrorContext(undefined);
    setLastOperation(null);
  }, []);

  const dismissError = useCallback((_errorId: string) => {
    // For now, just clear the global error
    // In the future, could maintain multiple errors by ID
    clearGlobalError();
  }, [clearGlobalError]);

  const retryLastOperation = useCallback(() => {
    if (lastOperation) {
      clearGlobalError();
      try {
        lastOperation();
      } catch (error) {
        reportError(error, { operation: 'retry' });
      }
    }
  }, [lastOperation, clearGlobalError, reportError]);

  const contextValue: ErrorContextState = {
    globalError,
    reportError,
    clearGlobalError,
    dismissError,
    retryLastOperation
  };

  return (
    <ErrorContext.Provider value={contextValue}>
      {children}

      {/* Global Error Display */}
      {globalError && (
        <div className="fixed top-4 right-4 z-50 max-w-md animate-in slide-in-from-right duration-300">
          {FallbackComponent ? (
            <FallbackComponent
              error={globalError}
              retry={retryLastOperation}
              context={errorContext}
            />
          ) : (
            <ErrorDisplay
              error={globalError}
              onDismiss={clearGlobalError}
              onRetry={globalError.isRetryable ? retryLastOperation : undefined}
              className="shadow-lg border-2"
            />
          )}
        </div>
      )}
    </ErrorContext.Provider>
  );
}

export function useErrorBoundary() {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useErrorBoundary must be used within an ErrorBoundaryProvider');
  }
  return context;
}

// Enhanced hook for operation-specific error handling
export function useOperationError<T extends (...args: any[]) => any>(
  operation: T,
  context?: Omit<ErrorContext, 'operation'>
): {
  execute: T;
  isLoading: boolean;
  error: UIError | null;
  retry: () => void;
  clearError: () => void;
} {
  const { reportError } = useErrorBoundary();
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState<UIError | null>(null);
  const [lastArgs, setLastArgs] = useState<Parameters<T> | null>(null);

  const execute = useCallback(async (...args: Parameters<T>) => {
    setIsLoading(true);
    setLocalError(null);
    setLastArgs(args);

    try {
      const result = await operation(...args);
      setIsLoading(false);
      return result;
    } catch (error) {
      const uiError = toUIError(error);
      setLocalError(uiError);
      setIsLoading(false);

      // Report to global context for high/critical errors
      if (uiError.severity === 'high' || uiError.severity === 'critical') {
        reportError(error, {
          ...context,
          operation: operation.name || 'unknown'
        });
      }

      throw error;
    }
  }, [operation, context, reportError]) as T;

  const retry = useCallback(() => {
    if (lastArgs) {
      execute(...lastArgs);
    }
  }, [execute, lastArgs]);

  const clearError = useCallback(() => {
    setLocalError(null);
  }, []);

  return {
    execute,
    isLoading,
    error: localError,
    retry,
    clearError
  };
}

// HOC for automatic error boundary wrapping with context
export function withErrorContext<P extends object>(
  Component: React.ComponentType<P>,
  context?: ErrorContext
) {
  const WrappedComponent = (props: P) => {
    const { reportError } = useErrorBoundary();

    // Wrap component in error boundary with context
    React.useEffect(() => {
      const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
        reportError(event.reason, {
          ...context,
          component: Component.displayName || Component.name,
          operation: 'unhandled-promise-rejection'
        });
      };

      window.addEventListener('unhandledrejection', handleUnhandledRejection);

      return () => {
        window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      };
    }, [reportError]);

    return <Component {...props} />;
  };

  WrappedComponent.displayName = `withErrorContext(${Component.displayName || Component.name})`;
  return WrappedComponent;
}