import React from 'react';
import { UIError, toUIError, getErrorSeverityClasses, getErrorIcon } from '@/lib/ui/errorUtils';

interface ErrorDisplayProps {
  error: UIError | Error | unknown | null;
  onDismiss?: () => void;
  onRetry?: () => void;
  className?: string;
  showDebugInfo?: boolean;
}

export function ErrorDisplay({
  error,
  onDismiss,
  onRetry,
  className = '',
  showDebugInfo = false
}: ErrorDisplayProps) {
  if (!error) return null;

  const uiError: UIError = error instanceof Error || typeof error === 'object'
    ? toUIError(error)
    : error as UIError;

  const severityClasses = getErrorSeverityClasses(uiError.severity);
  const icon = getErrorIcon(uiError.code);

  return (
    <div className={`rounded-xl border p-5 ${severityClasses.container} ${className} backdrop-blur-sm`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          {/* Icon with Islamic touch */}
          <div className={`flex-shrink-0 w-8 h-8 rounded-full bg-white/50 flex items-center justify-center text-lg ${severityClasses.icon} shadow-sm`}>
            {icon}
          </div>

          <div className="flex-1">
            <h3 className={`text-base font-semibold mb-2 ${severityClasses.text}`}>
              {uiError.severity === 'critical' && 'Critical Error'}
              {uiError.severity === 'high' && 'Connection Issue'}
              {uiError.severity === 'medium' && 'Something Needs Attention'}
              {uiError.severity === 'low' && 'Gentle Reminder'}
            </h3>
            <p className={`text-sm leading-relaxed mb-4 ${severityClasses.text}/90`}>
              {uiError.userMessage}
            </p>

            {/* Action buttons with Islamic styling */}
            <div className="flex flex-wrap gap-3 mb-3">
              {uiError.isRetryable && onRetry && (
                <button
                  onClick={onRetry}
                  className="inline-flex items-center gap-2 text-sm px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all duration-200 shadow-sm hover:shadow-md font-medium"
                >
                  <span>🔄</span>
                  Try Again
                </button>
              )}
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className={`inline-flex items-center gap-2 text-sm px-4 py-2 border rounded-lg transition-all duration-200 font-medium ${severityClasses.text} hover:bg-white/50`}
                  style={{ borderColor: 'currentColor', opacity: 0.7 }}
                >
                  <span>✕</span>
                  Dismiss
                </button>
              )}
            </div>

            {/* Show technical details in development or when requested */}
            {(showDebugInfo || process.env.NODE_ENV === 'development') && (
              <details className="mt-2">
                <summary className="text-xs cursor-pointer opacity-70 hover:opacity-100">
                  Technical Details
                </summary>
                <div className="mt-1 text-xs font-mono opacity-70 space-y-1">
                  <p><strong>Code:</strong> {uiError.code}</p>
                  <p><strong>Category:</strong> {uiError.category}</p>
                  <p><strong>Severity:</strong> {uiError.severity}</p>
                  {uiError.traceId && <p><strong>Trace ID:</strong> {uiError.traceId}</p>}
                  <p><strong>Retryable:</strong> {uiError.isRetryable ? 'Yes' : 'No'}</p>
                  <p><strong>Actionable:</strong> {uiError.actionable ? 'Yes' : 'No'}</p>
                </div>
              </details>
            )}
          </div>
        </div>

        {/* Dismiss button (alternative position) */}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className={`flex-shrink-0 ml-4 w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/30 transition-all duration-200 ${severityClasses.text}/60 hover:${severityClasses.text}`}
            aria-label="Dismiss error"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

// Hook for managing error state
export function useErrorHandler() {
  const [error, setError] = React.useState<UIError | null>(null);

  const handleError = React.useCallback((err: unknown, context?: string) => {
    console.error(`Error${context ? ` in ${context}` : ''}:`, err);
    const uiError = toUIError(err);
    setError(uiError);
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  const retryLastOperation = React.useCallback(() => {
    // This should be overridden by the component using the hook
    console.warn('No retry function provided');
  }, []);

  return {
    error,
    handleError,
    clearError,
    retryLastOperation
  };
}