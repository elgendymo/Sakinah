'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export interface SurveyError {
  code: string;
  message: string;
  recommendation?: string;
  phase?: number;
  field?: string;
  autoSaveStatus?: 'failed' | 'sync_error' | 'success';
  validationErrors?: Array<{
    field: string;
    message: string;
    code: string;
  }>;
}

export interface SurveyErrorState {
  error: SurveyError | null;
  isRetrying: boolean;
  retryCount: number;
  lastRetryTime: number | null;
}

export interface SurveyErrorActions {
  setError: (error: SurveyError | null) => void;
  clearError: () => void;
  retry: (operation: () => Promise<void>) => Promise<void>;
  handleApiError: (response: any) => void;
  handleNetworkError: (error: Error) => void;
  handleValidationError: (field: string, message: string) => void;
}

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000;

export function useSurveyErrorHandler(): SurveyErrorState & SurveyErrorActions {
  const router = useRouter();
  const [errorState, setErrorState] = useState<SurveyErrorState>({
    error: null,
    isRetrying: false,
    retryCount: 0,
    lastRetryTime: null
  });

  // Auto-save to localStorage for error recovery
  useEffect(() => {
    if (errorState.error) {
      localStorage.setItem('survey_last_error', JSON.stringify({
        error: errorState.error,
        timestamp: Date.now()
      }));
    }
  }, [errorState.error]);

  // Clear old errors on mount
  useEffect(() => {
    const savedError = localStorage.getItem('survey_last_error');
    if (savedError) {
      try {
        const { timestamp } = JSON.parse(savedError);
        // Clear errors older than 1 hour
        if (Date.now() - timestamp > 3600000) {
          localStorage.removeItem('survey_last_error');
        }
      } catch {
        localStorage.removeItem('survey_last_error');
      }
    }
  }, []);

  const setError = useCallback((error: SurveyError | null) => {
    setErrorState(prev => ({
      ...prev,
      error,
      // Reset retry count when setting a new error
      retryCount: error && error.code !== prev.error?.code ? 0 : prev.retryCount
    }));
  }, []);

  const clearError = useCallback(() => {
    setErrorState(prev => ({
      ...prev,
      error: null,
      isRetrying: false
    }));
    localStorage.removeItem('survey_last_error');
  }, []);

  const retry = useCallback(async (operation: () => Promise<void>) => {
    if (errorState.retryCount >= MAX_RETRY_ATTEMPTS) {
      setError({
        code: 'max_retries_exceeded',
        message: 'Maximum retry attempts reached. Please refresh the page or contact support.',
        recommendation: 'Try refreshing the page or check your internet connection.'
      });
      return;
    }

    setErrorState(prev => ({
      ...prev,
      isRetrying: true
    }));

    // Add delay between retries
    if (errorState.retryCount > 0) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * errorState.retryCount));
    }

    try {
      await operation();
      // Success - clear error and reset retry count
      setErrorState(prev => ({
        ...prev,
        error: null,
        isRetrying: false,
        retryCount: 0,
        lastRetryTime: Date.now()
      }));
    } catch (error) {
      // Failed - increment retry count and update error
      setErrorState(prev => ({
        ...prev,
        isRetrying: false,
        retryCount: prev.retryCount + 1,
        lastRetryTime: Date.now()
      }));

      if (error instanceof Error) {
        handleNetworkError(error);
      }
    }
  }, [errorState.retryCount]);

  const handleApiError = useCallback((response: any) => {
    if (!response || response.ok) return;

    const error: SurveyError = {
      code: response.errorCode || 'unknown_error',
      message: response.message || 'An unexpected error occurred',
      recommendation: response.recommendation,
      autoSaveStatus: response.autoSaveStatus,
      validationErrors: response.validationErrors
    };

    // Handle specific error codes
    switch (response.errorCode) {
      case 'survey_phase_access_denied':
        // Redirect to correct phase if available
        if (response.progressInfo?.nextAvailablePhase) {
          const phaseUrls = {
            1: '/onboarding/phase1',
            2: '/onboarding/phase2',
            3: '/onboarding/reflection',
            4: '/onboarding/results'
          };
          const nextUrl = phaseUrls[response.progressInfo.nextAvailablePhase as keyof typeof phaseUrls];
          if (nextUrl) {
            setTimeout(() => router.push(nextUrl), 2000);
          }
        }
        break;

      case 'survey_already_completed':
        // Redirect to results page
        setTimeout(() => router.push('/onboarding/results'), 2000);
        break;

      case 'unauthorized':
      case 'session_expired':
        // Redirect to login
        setTimeout(() => router.push('/auth/login'), 2000);
        break;

      case 'auto_save_failed':
      case 'state_sync_error':
        // These are recoverable - user can continue manually
        error.recommendation = error.recommendation || 'Your responses are saved locally. Please try submitting manually.';
        break;
    }

    setError(error);
  }, [router, setError]);

  const handleNetworkError = useCallback((error: Error) => {
    let errorCode = 'network_error';
    let message = 'Network connection failed. Please check your internet connection.';
    let recommendation = 'Check your connection and try again. Your progress is saved locally.';

    if (error.message.includes('timeout')) {
      errorCode = 'timeout_error';
      message = 'The request took too long to complete.';
      recommendation = 'Please try again. If the issue persists, check your internet connection.';
    } else if (error.message.includes('AbortError')) {
      errorCode = 'request_cancelled';
      message = 'Request was cancelled.';
      recommendation = 'Please try again.';
    }

    setError({
      code: errorCode,
      message,
      recommendation
    });
  }, [setError]);

  const handleValidationError = useCallback((field: string, message: string) => {
    setError({
      code: 'validation_error',
      message: `${field}: ${message}`,
      field,
      recommendation: 'Please correct the highlighted field and try again.'
    });
  }, [setError]);

  return {
    ...errorState,
    setError,
    clearError,
    retry,
    handleApiError,
    handleNetworkError,
    handleValidationError
  };
}

// Specialized hook for auto-save operations
export function useAutoSaveErrorHandler() {
  const baseHandler = useSurveyErrorHandler();

  const handleAutoSaveError = useCallback(() => {
    // Auto-save errors are less critical - don't block user flow
    baseHandler.setError({
      code: 'auto_save_failed',
      message: 'Auto-save failed, but you can continue.',
      recommendation: 'Your responses are saved locally. Please submit manually when ready.',
      autoSaveStatus: 'failed'
    });

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      if (baseHandler.error?.code === 'auto_save_failed') {
        baseHandler.clearError();
      }
    }, 5000);
  }, [baseHandler]);

  const retryAutoSave = useCallback(async (operation: () => Promise<void>) => {
    try {
      await operation();
      // Success - show brief success indicator
      baseHandler.setError({
        code: 'auto_save_success',
        message: 'Auto-save successful',
        autoSaveStatus: 'success'
      });

      // Auto-dismiss success message
      setTimeout(baseHandler.clearError, 2000);
    } catch {
      handleAutoSaveError();
    }
  }, [baseHandler, handleAutoSaveError]);

  return {
    ...baseHandler,
    handleAutoSaveError,
    retryAutoSave
  };
}

// Hook for handling survey validation with debouncing
export function useSurveyValidation() {
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isValidating, setIsValidating] = useState(false);

  const validateField = useCallback(async (
    field: string,
    value: any,
    validator: (value: any) => Promise<{ isValid: boolean; error?: string }>
  ) => {
    setIsValidating(true);

    try {
      const result = await validator(value);

      setValidationErrors(prev => {
        const newErrors = { ...prev };
        if (result.isValid) {
          delete newErrors[field];
        } else {
          newErrors[field] = result.error || 'Invalid value';
        }
        return newErrors;
      });
    } catch (error) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: 'Validation failed'
      }));
    } finally {
      setIsValidating(false);
    }
  }, []);

  const clearValidationError = useCallback((field: string) => {
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  const clearAllValidationErrors = useCallback(() => {
    setValidationErrors({});
  }, []);

  const hasErrors = Object.keys(validationErrors).length > 0;

  return {
    validationErrors,
    isValidating,
    hasErrors,
    validateField,
    clearValidationError,
    clearAllValidationErrors
  };
}