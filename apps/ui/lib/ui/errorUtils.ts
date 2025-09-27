import { ErrorCode, ErrorSeverity, ERROR_METADATA } from '../constants/errorCodes';
import { getErrorMessage, getIslamicErrorMessage, normalizeErrorCode } from './errorMap';
import { ApiRequestError } from '../net/apiFetch.client';
import { EnhancedServiceResult } from '../utils/service-result';

/**
 * UI Error Interface for Components
 */
export interface UIError {
  code: ErrorCode;
  message: string;
  userMessage: string;
  severity: ErrorSeverity;
  category: string;
  traceId?: string;
  timestamp: string;
  isRetryable: boolean;
  actionable: boolean;
}

/**
 * Convert any error to user-friendly message
 */
export function toUserMessage(err: unknown, fallback: string = 'An unexpected error occurred'): string {
  // Handle ApiRequestError
  if (err instanceof ApiRequestError) {
    return getErrorMessage(err.errorCode, fallback);
  }

  // Handle service result errors
  if (typeof err === 'object' && err !== null && 'error' in err) {
    const serviceResult = err as EnhancedServiceResult<unknown>;
    if (!serviceResult.success && serviceResult.error) {
      return serviceResult.error.userMessage;
    }
  }

  // Handle standard Error objects
  if (err instanceof Error) {
    return getErrorMessage(err.message, fallback);
  }

  // Handle string errors
  if (typeof err === 'string') {
    return getErrorMessage(err, fallback);
  }

  return fallback;
}

/**
 * Convert any error to Islamic-contextualized message
 */
export function toIslamicUserMessage(err: unknown, fallback?: string): string {
  // Handle ApiRequestError
  if (err instanceof ApiRequestError) {
    return getIslamicErrorMessage(err.errorCode, fallback);
  }

  // Handle service result errors
  if (typeof err === 'object' && err !== null && 'error' in err) {
    const serviceResult = err as EnhancedServiceResult<unknown>;
    if (!serviceResult.success && serviceResult.error) {
      return getIslamicErrorMessage(serviceResult.error.code, serviceResult.error.userMessage);
    }
  }

  // Handle standard Error objects
  if (err instanceof Error) {
    return getIslamicErrorMessage(err.message, fallback);
  }

  // Handle string errors
  if (typeof err === 'string') {
    return getIslamicErrorMessage(err, fallback);
  }

  return getIslamicErrorMessage(undefined, fallback);
}

/**
 * Convert any error to UIError object for components
 */
export function toUIError(err: unknown): UIError {
  let code: ErrorCode;
  let message: string;
  let traceId: string | undefined;

  // Handle ApiRequestError
  if (err instanceof ApiRequestError) {
    code = err.errorCode;
    message = err.message;
    traceId = err.traceId;
  }
  // Handle service result errors
  else if (typeof err === 'object' && err !== null && 'error' in err) {
    const serviceResult = err as EnhancedServiceResult<unknown>;
    if (!serviceResult.success && serviceResult.error) {
      code = serviceResult.error.code;
      message = serviceResult.error.message;
      traceId = serviceResult.error.traceId;
    } else {
      code = ErrorCode.UNKNOWN_ERROR;
      message = 'Unknown service error';
    }
  }
  // Handle standard Error objects
  else if (err instanceof Error) {
    code = normalizeErrorCode(err.message);
    message = err.message;
  }
  // Handle string errors
  else if (typeof err === 'string') {
    code = normalizeErrorCode(err);
    message = err;
  }
  // Handle unknown error types
  else {
    code = ErrorCode.UNKNOWN_ERROR;
    message = String(err);
  }

  const metadata = ERROR_METADATA[code];
  const userMessage = getErrorMessage(code);

  return {
    code,
    message,
    userMessage,
    severity: metadata.severity,
    category: metadata.category,
    traceId,
    timestamp: new Date().toISOString(),
    isRetryable: determineRetryability(code),
    actionable: determineActionability(code)
  };
}

/**
 * Determine if an error is retryable
 */
function determineRetryability(errorCode: ErrorCode): boolean {
  const retryableErrors = [
    ErrorCode.NETWORK_ERROR,
    ErrorCode.CONNECTION_FAILED,
    ErrorCode.TIMEOUT_ERROR,
    ErrorCode.GATEWAY_TIMEOUT,
    ErrorCode.REQUEST_TIMEOUT,
    ErrorCode.SERVER_ERROR,
    ErrorCode.DATABASE_ERROR,
    ErrorCode.SERVICE_UNAVAILABLE,
    ErrorCode.TAZKIYAH_GENERATION_FAILED,
    ErrorCode.HABIT_UPDATE_FAILED,
    ErrorCode.CHECKIN_SAVE_FAILED,
    ErrorCode.CONTENT_GENERATION_FAILED
  ];

  return retryableErrors.includes(errorCode);
}

/**
 * Determine if an error requires user action
 */
function determineActionability(errorCode: ErrorCode): boolean {
  const actionableErrors = [
    ErrorCode.UNAUTHORIZED,
    ErrorCode.SESSION_EXPIRED,
    ErrorCode.INVALID_INPUT,
    ErrorCode.INVALID_EMAIL,
    ErrorCode.INVALID_FORMAT,
    ErrorCode.REQUIRED_FIELD,
    ErrorCode.EMAIL_ALREADY_EXISTS,
    ErrorCode.PROFILE_INCOMPLETE,
    ErrorCode.ONBOARDING_INCOMPLETE,
    ErrorCode.INVALID_SPIRITUAL_GOAL,
    ErrorCode.HABIT_ALREADY_EXISTS
  ];

  return actionableErrors.includes(errorCode);
}

/**
 * Get CSS classes for error severity - Islamic design theme
 */
export function getErrorSeverityClasses(severity: ErrorSeverity): {
  container: string;
  text: string;
  icon: string;
} {
  switch (severity) {
    case ErrorSeverity.LOW:
      return {
        container: 'bg-emerald-50 border-emerald-200/60 shadow-sm',
        text: 'text-emerald-900',
        icon: 'text-emerald-600'
      };
    case ErrorSeverity.MEDIUM:
      return {
        container: 'bg-amber-50 border-amber-200/60 shadow-sm',
        text: 'text-amber-900',
        icon: 'text-amber-600'
      };
    case ErrorSeverity.HIGH:
      return {
        container: 'bg-rose-50 border-rose-200/60 shadow-sm',
        text: 'text-rose-900',
        icon: 'text-rose-600'
      };
    case ErrorSeverity.CRITICAL:
      return {
        container: 'bg-red-50 border-red-200/60 shadow-md',
        text: 'text-red-900',
        icon: 'text-red-600'
      };
    default:
      return {
        container: 'bg-slate-50 border-slate-200/60 shadow-sm',
        text: 'text-slate-900',
        icon: 'text-slate-600'
      };
  }
}

/**
 * Get appropriate icon for error type
 */
export function getErrorIcon(errorCode: ErrorCode): string {
  const networkErrors = [ErrorCode.NETWORK_ERROR, ErrorCode.CONNECTION_FAILED, ErrorCode.DNS_ERROR];
  const authErrors = [ErrorCode.UNAUTHORIZED, ErrorCode.SESSION_EXPIRED, ErrorCode.FORBIDDEN];
  const validationErrors = [ErrorCode.INVALID_INPUT, ErrorCode.INVALID_EMAIL, ErrorCode.REQUIRED_FIELD];
  const spiritualErrors = [ErrorCode.TAZKIYAH_GENERATION_FAILED, ErrorCode.HABIT_UPDATE_FAILED, ErrorCode.CHECKIN_SAVE_FAILED];

  if (networkErrors.includes(errorCode)) {
    return 'network'; // Network/connection icon
  }
  if (authErrors.includes(errorCode)) {
    return 'lock'; // Security/auth icon
  }
  if (validationErrors.includes(errorCode)) {
    return 'warning'; // Warning/validation icon
  }
  if (spiritualErrors.includes(errorCode)) {
    return 'spiritual'; // Spiritual/prayer icon
  }

  // Default icons by severity
  const metadata = ERROR_METADATA[errorCode];
  switch (metadata.severity) {
    case ErrorSeverity.CRITICAL:
      return 'emergency';
    case ErrorSeverity.HIGH:
      return 'error';
    case ErrorSeverity.MEDIUM:
      return 'warning';
    case ErrorSeverity.LOW:
      return 'info';
    default:
      return 'help';
  }
}

/**
 * Format error for logging/debugging
 */
export function formatErrorForLogging(err: unknown): {
  errorCode: ErrorCode;
  message: string;
  traceId?: string;
  stack?: string;
  details?: Record<string, unknown>;
} {
  const uiError = toUIError(err);

  return {
    errorCode: uiError.code,
    message: uiError.message,
    traceId: uiError.traceId,
    stack: err instanceof Error ? err.stack : undefined,
    details: err instanceof ApiRequestError ? {
      statusCode: err.statusCode,
      errorBody: err.errorBody
    } : undefined
  };
}