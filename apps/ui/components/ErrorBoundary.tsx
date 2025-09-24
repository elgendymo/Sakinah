'use client';

import React, { ErrorInfo, ReactNode } from 'react';
import { toUIError, formatErrorForLogging, getErrorSeverityClasses, getErrorIcon } from '@/lib/ui/errorUtils';
import { UIError } from '@/lib/ui/errorUtils';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: UIError;
  traceId?: string;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: UIError, reset: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDebugInfo?: boolean;
}

/**
 * Component-Level Error Boundary
 *
 * Catches JavaScript errors anywhere in the child component tree,
 * logs them, and displays a fallback UI with Islamic context.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    const uiError = toUIError(error);
    return {
      hasError: true,
      error: uiError,
      traceId: uiError.traceId
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error for debugging
    const errorLog = formatErrorForLogging(error);
    console.error('ErrorBoundary caught an error:', {
      ...errorLog,
      componentStack: errorInfo.componentStack,
      errorBoundary: this.constructor.name
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // In production, send to error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Example: sendToErrorReporting({ ...errorLog, componentStack: errorInfo.componentStack });
    }
  }

  reset = () => {
    this.setState({ hasError: false, error: undefined, traceId: undefined });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset);
      }

      // Default fallback UI
      return (
        <DefaultErrorFallback
          error={this.state.error}
          reset={this.reset}
          showDebugInfo={this.props.showDebugInfo}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Default Error Fallback Component
 */
interface DefaultErrorFallbackProps {
  error: UIError;
  reset: () => void;
  showDebugInfo?: boolean;
}

function DefaultErrorFallback({ error, reset, showDebugInfo = false }: DefaultErrorFallbackProps) {
  const severityClasses = getErrorSeverityClasses(error.severity);
  const icon = getErrorIcon(error.code);

  return (
    <div className={`rounded-lg border p-6 ${severityClasses.container}`}>
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={`text-2xl ${severityClasses.icon}`}>
          {icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className={`text-lg font-semibold mb-2 ${severityClasses.text}`}>
            Component Error
          </h3>

          <p className={`text-sm leading-relaxed mb-4 ${severityClasses.text}`}>
            {error.userMessage}
          </p>

          {/* Islamic Encouragement for High/Critical Errors */}
          {(error.severity === 'high' || error.severity === 'critical') && (
            <div className="bg-white/50 rounded-lg p-3 mb-4 border border-emerald-200">
              <p className="text-sm text-emerald-700 italic text-center">
                \"And Allah is the best of planners.\" — Quran 8:30
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {error.isRetryable && (
              <button
                onClick={reset}
                className="px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
              >
                Try Again
              </button>
            )}

            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Refresh Page
            </button>
          </div>

          {/* Debug Info */}
          {(showDebugInfo || process.env.NODE_ENV === 'development') && (
            <details className="mt-4">
              <summary className="cursor-pointer text-xs text-gray-600 hover:text-gray-800">
                Debug Information
              </summary>
              <div className="mt-2 p-3 bg-gray-50 rounded border text-xs font-mono">
                <div><strong>Error Code:</strong> {error.code}</div>
                <div><strong>Category:</strong> {error.category}</div>
                <div><strong>Severity:</strong> {error.severity}</div>
                {error.traceId && <div><strong>Trace ID:</strong> {error.traceId}</div>}
                <div><strong>Timestamp:</strong> {error.timestamp}</div>
                <div><strong>Retryable:</strong> {error.isRetryable ? 'Yes' : 'No'}</div>
                <div><strong>Actionable:</strong> {error.actionable ? 'Yes' : 'No'}</div>
              </div>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Hook for using error boundary programmatically
 */
export function useErrorHandler() {
  return (error: Error) => {
    // This will be caught by the nearest error boundary
    throw error;
  };
}

/**
 * Higher-order component for wrapping components with error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}