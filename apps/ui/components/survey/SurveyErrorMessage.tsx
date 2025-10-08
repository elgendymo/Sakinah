'use client';

import React from 'react';
import { AlertCircle, RefreshCw, WifiOff, Clock, Shield } from 'lucide-react';

export interface SurveyErrorProps {
  errorCode?: string;
  message?: string;
  recommendation?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  severity?: 'error' | 'warning' | 'info';
  showRetry?: boolean;
  className?: string;
}

const ErrorIcons = {
  'invalid_likert_score': AlertCircle,
  'reflection_too_short': AlertCircle,
  'reflection_too_long': AlertCircle,
  'survey_note_too_long': AlertCircle,
  'auto_save_failed': WifiOff,
  'network_error': WifiOff,
  'timeout_error': Clock,
  'survey_phase_access_denied': Shield,
  'survey_already_completed': Shield,
  'invalid_phase_progression': Shield,
  'results_generation_failed': RefreshCw,
  'ai_analysis_failed': RefreshCw,
  default: AlertCircle
};

const ErrorColors = {
  error: 'border-red-200 bg-red-50 text-red-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  info: 'border-blue-200 bg-blue-50 text-blue-800'
};

const IconColors = {
  error: 'text-red-500',
  warning: 'text-amber-500',
  info: 'text-blue-500'
};

const ButtonColors = {
  error: 'bg-red-600 hover:bg-red-700 text-white',
  warning: 'bg-amber-600 hover:bg-amber-700 text-white',
  info: 'bg-blue-600 hover:bg-blue-700 text-white'
};

export function SurveyErrorMessage({
  errorCode,
  message,
  recommendation,
  onRetry,
  onDismiss,
  severity = 'error',
  showRetry = true,
  className = ''
}: SurveyErrorProps) {
  const IconComponent = ErrorIcons[errorCode as keyof typeof ErrorIcons] || ErrorIcons.default;

  // Enhanced messages with Islamic context
  const getEnhancedMessage = () => {
    if (message) return message;

    switch (errorCode) {
      case 'invalid_likert_score':
        return 'Please select a rating between 1 and 5 for your spiritual self-assessment.';
      case 'reflection_too_short':
        return 'Your reflection helps us understand your spiritual journey. Please share at least 10 characters.';
      case 'reflection_too_long':
        return 'Please keep your reflection focused and under 500 characters.';
      case 'auto_save_failed':
        return 'Your spiritual assessment responses could not be saved automatically.';
      case 'network_error':
        return 'Connection lost. Please check your internet and try again.';
      case 'survey_phase_access_denied':
        return 'Please complete the previous phase of your spiritual assessment before continuing.';
      case 'survey_already_completed':
        return 'You have already completed this spiritual assessment. View your results for guidance.';
      case 'results_generation_failed':
        return 'We encountered an issue generating your spiritual guidance. Your responses are safely saved.';
      case 'ai_analysis_failed':
        return 'Spiritual guidance analysis is temporarily unavailable. Your responses have been preserved.';
      default:
        return 'An unexpected issue occurred with your spiritual assessment.';
    }
  };

  const getEnhancedRecommendation = () => {
    if (recommendation) return recommendation;

    switch (errorCode) {
      case 'auto_save_failed':
        return 'Please try submitting manually using the Continue button.';
      case 'network_error':
        return 'Check your internet connection and try again. Your progress is saved locally.';
      case 'survey_phase_access_denied':
        return 'Return to the previous phase to complete any missing responses.';
      case 'results_generation_failed':
        return 'Try again in a few moments. If the issue persists, basic results are still available.';
      case 'reflection_too_short':
        return 'Share your thoughts about your spiritual struggles or goals to receive personalized guidance.';
      default:
        return 'Please try again or contact support if the issue continues.';
    }
  };

  return (
    <div className={`
      relative border-l-4 rounded-lg p-4 shadow-sm
      ${ErrorColors[severity]}
      ${className}
    `}>
      {/* Islamic geometric pattern background */}
      <div className="absolute inset-0 opacity-5 rounded-lg">
        <svg width="100%" height="100%" className="object-cover">
          <pattern id="islamic-pattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M20 0L40 20L20 40L0 20Z" fill="currentColor" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#islamic-pattern)" />
        </svg>
      </div>

      <div className="relative flex items-start space-x-3">
        {/* Error Icon */}
        <div className={`flex-shrink-0 ${IconColors[severity]}`}>
          <IconComponent className="h-5 w-5" />
        </div>

        <div className="flex-1 min-w-0">
          {/* Error Message */}
          <h3 className="text-sm font-medium mb-1">
            {getEnhancedMessage()}
          </h3>

          {/* Recommendation */}
          {getEnhancedRecommendation() && (
            <p className="text-sm opacity-90 mb-3">
              {getEnhancedRecommendation()}
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex items-center space-x-3">
            {showRetry && onRetry && (
              <button
                onClick={onRetry}
                className={`
                  inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium
                  transition-colors duration-200
                  ${ButtonColors[severity]}
                `}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Try Again
              </button>
            )}

            {onDismiss && (
              <button
                onClick={onDismiss}
                className="text-xs font-medium opacity-70 hover:opacity-100 transition-opacity"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>

        {/* Close Button */}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

// Specialized components for common survey errors

export function ValidationErrorMessage({
  message,
  onFocus
}: {
  field: string;
  message: string;
  onFocus?: () => void;
}) {
  return (
    <div className="mt-1">
      <SurveyErrorMessage
        errorCode="validation_error"
        message={message}
        severity="warning"
        showRetry={false}
        onDismiss={onFocus}
        className="text-sm py-2 px-3"
      />
    </div>
  );
}

export function NetworkErrorMessage({
  onRetry,
  autoSaveStatus
}: {
  onRetry: () => void;
  autoSaveStatus?: 'failed' | 'sync_error' | 'success';
}) {
  const isAutoSaveError = autoSaveStatus === 'failed' || autoSaveStatus === 'sync_error';

  return (
    <SurveyErrorMessage
      errorCode={isAutoSaveError ? 'auto_save_failed' : 'network_error'}
      severity="error"
      onRetry={onRetry}
      showRetry={true}
      className="mb-4"
    />
  );
}

export function ProgressErrorMessage({
  currentPhase,
  requiredPhase,
  onNavigate
}: {
  currentPhase: number;
  requiredPhase: number;
  onNavigate: () => void;
}) {
  return (
    <SurveyErrorMessage
      errorCode="survey_phase_access_denied"
      message={`You need to complete Phase ${requiredPhase} before accessing Phase ${currentPhase}.`}
      recommendation="Click below to return to the required phase."
      severity="info"
      onRetry={onNavigate}
      showRetry={true}
      className="mb-4"
    />
  );
}

export function ResultsErrorMessage({
  errorType,
  onRetry
}: {
  errorType: 'generation_failed' | 'ai_failed' | 'not_found';
  onRetry?: () => void;
}) {
  const errorCodes = {
    generation_failed: 'results_generation_failed',
    ai_failed: 'ai_analysis_failed',
    not_found: 'results_not_found'
  };

  return (
    <SurveyErrorMessage
      errorCode={errorCodes[errorType]}
      severity={errorType === 'not_found' ? 'info' : 'error'}
      onRetry={onRetry}
      showRetry={errorType !== 'not_found'}
      className="mb-6"
    />
  );
}

// Loading state with error boundary
export function SurveyErrorBoundary({
  children,
  fallback
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const [hasError, setHasError] = React.useState(false);
  const [, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      setHasError(true);
      setError(new Error(event.message));
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <SurveyErrorMessage
        errorCode="unknown_error"
        message="An unexpected error occurred in your spiritual assessment."
        recommendation="Please refresh the page to continue. Your progress has been saved."
        onRetry={() => window.location.reload()}
        severity="error"
        className="m-4"
      />
    );
  }

  return <>{children}</>;
}