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
  fallback?: (error: UIError, reset: () => void, context?: ErrorBoundaryContext) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo, context?: ErrorBoundaryContext) => void;
  showDebugInfo?: boolean;
  isolate?: boolean; // Prevent error from bubbling up
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number>;
  context?: ErrorBoundaryContext;
}

interface ErrorBoundaryContext {
  component?: string;
  feature?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

/**
 * Component-Level Error Boundary
 *
 * Catches JavaScript errors anywhere in the child component tree,
 * logs them, and displays a fallback UI with Islamic context.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { resetOnPropsChange, resetKeys } = this.props;

    // Reset error boundary when specific props change
    if (resetOnPropsChange && this.state.hasError) {
      if (resetKeys) {
        const hasKeyChanged = resetKeys.some((key, index) =>
          prevProps.resetKeys?.[index] !== key
        );
        if (hasKeyChanged) {
          this.setState({ hasError: false, error: undefined, traceId: undefined });
          this.retryCount = 0;
        }
      } else {
        // Reset on any prop change
        this.setState({ hasError: false, error: undefined, traceId: undefined });
        this.retryCount = 0;
      }
    }
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
    this.retryCount++;

    // Enhanced logging with context
    const errorLog = formatErrorForLogging(error);
    const enhancedLog = {
      ...errorLog,
      componentStack: errorInfo.componentStack,
      errorBoundary: this.constructor.name,
      context: this.props.context,
      retryCount: this.retryCount,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    console.error('ErrorBoundary caught an error:', enhancedLog);

    // Call custom error handler with context
    if (this.props.onError) {
      this.props.onError(error, errorInfo, this.props.context);
    }

    // Auto-recovery attempt for specific error types
    if (this.shouldAutoRecover(error) && this.retryCount <= this.maxRetries) {
      setTimeout(() => {
        if (this.state.hasError) {
          this.reset();
        }
      }, 2000 * this.retryCount); // Exponential backoff
    }

    // In production, send to error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Example: sendToErrorReporting(enhancedLog);
    }

    // Prevent error from bubbling up if isolate is true
    if (this.props.isolate) {
      errorInfo.componentStack = '';
    }
  }

  private shouldAutoRecover(error: Error): boolean {
    // Auto-recover from network-related errors or temporary issues
    const recoverablePatterns = [
      /network/i,
      /fetch/i,
      /timeout/i,
      /temporary/i,
      /rate limit/i
    ];

    return recoverablePatterns.some(pattern =>
      pattern.test(error.message) || pattern.test(error.name)
    );
  }

  reset = () => {
    this.setState({ hasError: false, error: undefined, traceId: undefined });
    this.retryCount = 0;
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
          <h3
            className="text-lg font-semibold mb-2"
            style={{
              color: severityClasses.text.includes('emerald') ? '#064e3b' :
                     severityClasses.text.includes('amber') ? '#78350f' :
                     severityClasses.text.includes('rose') ? '#881337' :
                     severityClasses.text.includes('red') ? '#7f1d1d' : '#0f172a'
            }}
          >
            Component Error
          </h3>

          <p
            className="text-sm leading-relaxed mb-4"
            style={{
              color: severityClasses.text.includes('emerald') ? '#064e3b' :
                     severityClasses.text.includes('amber') ? '#78350f' :
                     severityClasses.text.includes('rose') ? '#881337' :
                     severityClasses.text.includes('red') ? '#7f1d1d' : '#0f172a',
              opacity: 0.9
            }}
          >
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