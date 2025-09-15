/**
 * Centralized Error Classification System
 *
 * This enum provides a comprehensive classification of all possible errors
 * in the Sakinah application, organized by HTTP status codes and semantic meaning.
 */

export enum ErrorCode {
  // Authentication Errors (401)
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_CODE = 'INVALID_CODE',
  CODE_EXPIRED = 'CODE_EXPIRED',
  CODE_ALREADY_USED = 'CODE_ALREADY_USED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',

  // Authorization Errors (403)
  FORBIDDEN = 'FORBIDDEN',
  ACCOUNT_SUSPENDED = 'ACCOUNT_SUSPENDED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',

  // Validation Errors (400)
  INVALID_INPUT = 'INVALID_INPUT',
  INVALID_EMAIL = 'INVALID_EMAIL',
  INVALID_PHONE = 'INVALID_PHONE',
  REQUIRED_FIELD = 'REQUIRED_FIELD',
  INVALID_FORMAT = 'INVALID_FORMAT',
  BAD_REQUEST = 'BAD_REQUEST',
  INVALID_SPIRITUAL_GOAL = 'INVALID_SPIRITUAL_GOAL',

  // Conflicts (409)
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',
  HABIT_ALREADY_EXISTS = 'HABIT_ALREADY_EXISTS',

  // Not Found (404)
  NOT_FOUND = 'NOT_FOUND',
  PROFILE_NOT_FOUND = 'PROFILE_NOT_FOUND',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  CONTENT_NOT_FOUND = 'CONTENT_NOT_FOUND',
  PLAN_NOT_FOUND = 'PLAN_NOT_FOUND',
  HABIT_NOT_FOUND = 'HABIT_NOT_FOUND',

  // Rate Limiting (429)
  RATE_LIMITED = 'RATE_LIMITED',
  TOO_MANY_ATTEMPTS = 'TOO_MANY_ATTEMPTS',
  API_QUOTA_EXCEEDED = 'API_QUOTA_EXCEEDED',

  // Server Errors (500)
  SERVER_ERROR = 'SERVER_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',

  // Spiritual App Specific Errors (500)
  TAZKIYAH_GENERATION_FAILED = 'TAZKIYAH_GENERATION_FAILED',
  HABIT_UPDATE_FAILED = 'HABIT_UPDATE_FAILED',
  CHECKIN_SAVE_FAILED = 'CHECKIN_SAVE_FAILED',
  PLAN_CREATION_FAILED = 'PLAN_CREATION_FAILED',
  CONTENT_GENERATION_FAILED = 'CONTENT_GENERATION_FAILED',
  AI_SERVICE_ERROR = 'AI_SERVICE_ERROR',

  // Service Issues (503)
  MAINTENANCE_MODE = 'MAINTENANCE_MODE',
  DB_DOWN = 'DB_DOWN',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',

  // Timeouts (408/504)
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  GATEWAY_TIMEOUT = 'GATEWAY_TIMEOUT',
  REQUEST_TIMEOUT = 'REQUEST_TIMEOUT',

  // Network Issues
  NETWORK_ERROR = 'NETWORK_ERROR',
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  DNS_ERROR = 'DNS_ERROR',

  // Special Cases (200 with error state)
  NOT_ELIGIBLE = 'NOT_ELIGIBLE',
  PROFILE_INCOMPLETE = 'PROFILE_INCOMPLETE',
  ONBOARDING_INCOMPLETE = 'ONBOARDING_INCOMPLETE',

  // Generic Fallback
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Error severity levels for UI presentation
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Error categories for grouping and analytics
 */
export enum ErrorCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  NETWORK = 'network',
  SERVER = 'server',
  SPIRITUAL = 'spiritual',
  USER_ACTION = 'user_action'
}

/**
 * Map error codes to their categories and severity
 */
export const ERROR_METADATA: Record<ErrorCode, { category: ErrorCategory; severity: ErrorSeverity }> = {
  // Authentication
  [ErrorCode.UNAUTHORIZED]: { category: ErrorCategory.AUTHENTICATION, severity: ErrorSeverity.MEDIUM },
  [ErrorCode.INVALID_CODE]: { category: ErrorCategory.AUTHENTICATION, severity: ErrorSeverity.MEDIUM },
  [ErrorCode.CODE_EXPIRED]: { category: ErrorCategory.AUTHENTICATION, severity: ErrorSeverity.MEDIUM },
  [ErrorCode.CODE_ALREADY_USED]: { category: ErrorCategory.AUTHENTICATION, severity: ErrorSeverity.MEDIUM },
  [ErrorCode.SESSION_EXPIRED]: { category: ErrorCategory.AUTHENTICATION, severity: ErrorSeverity.MEDIUM },
  [ErrorCode.INVALID_TOKEN]: { category: ErrorCategory.AUTHENTICATION, severity: ErrorSeverity.MEDIUM },
  [ErrorCode.INVALID_CREDENTIALS]: { category: ErrorCategory.AUTHENTICATION, severity: ErrorSeverity.MEDIUM },

  // Authorization
  [ErrorCode.FORBIDDEN]: { category: ErrorCategory.AUTHORIZATION, severity: ErrorSeverity.MEDIUM },
  [ErrorCode.ACCOUNT_SUSPENDED]: { category: ErrorCategory.AUTHORIZATION, severity: ErrorSeverity.HIGH },
  [ErrorCode.INSUFFICIENT_PERMISSIONS]: { category: ErrorCategory.AUTHORIZATION, severity: ErrorSeverity.MEDIUM },

  // Validation
  [ErrorCode.INVALID_INPUT]: { category: ErrorCategory.VALIDATION, severity: ErrorSeverity.LOW },
  [ErrorCode.INVALID_EMAIL]: { category: ErrorCategory.VALIDATION, severity: ErrorSeverity.LOW },
  [ErrorCode.INVALID_PHONE]: { category: ErrorCategory.VALIDATION, severity: ErrorSeverity.LOW },
  [ErrorCode.REQUIRED_FIELD]: { category: ErrorCategory.VALIDATION, severity: ErrorSeverity.LOW },
  [ErrorCode.INVALID_FORMAT]: { category: ErrorCategory.VALIDATION, severity: ErrorSeverity.LOW },
  [ErrorCode.BAD_REQUEST]: { category: ErrorCategory.VALIDATION, severity: ErrorSeverity.LOW },
  [ErrorCode.INVALID_SPIRITUAL_GOAL]: { category: ErrorCategory.VALIDATION, severity: ErrorSeverity.LOW },

  // Conflicts
  [ErrorCode.EMAIL_ALREADY_EXISTS]: { category: ErrorCategory.VALIDATION, severity: ErrorSeverity.MEDIUM },
  [ErrorCode.RESOURCE_CONFLICT]: { category: ErrorCategory.VALIDATION, severity: ErrorSeverity.MEDIUM },
  [ErrorCode.HABIT_ALREADY_EXISTS]: { category: ErrorCategory.VALIDATION, severity: ErrorSeverity.LOW },

  // Not Found
  [ErrorCode.NOT_FOUND]: { category: ErrorCategory.USER_ACTION, severity: ErrorSeverity.LOW },
  [ErrorCode.PROFILE_NOT_FOUND]: { category: ErrorCategory.USER_ACTION, severity: ErrorSeverity.MEDIUM },
  [ErrorCode.USER_NOT_FOUND]: { category: ErrorCategory.USER_ACTION, severity: ErrorSeverity.MEDIUM },
  [ErrorCode.CONTENT_NOT_FOUND]: { category: ErrorCategory.USER_ACTION, severity: ErrorSeverity.LOW },
  [ErrorCode.PLAN_NOT_FOUND]: { category: ErrorCategory.USER_ACTION, severity: ErrorSeverity.LOW },
  [ErrorCode.HABIT_NOT_FOUND]: { category: ErrorCategory.USER_ACTION, severity: ErrorSeverity.LOW },

  // Rate Limiting
  [ErrorCode.RATE_LIMITED]: { category: ErrorCategory.USER_ACTION, severity: ErrorSeverity.MEDIUM },
  [ErrorCode.TOO_MANY_ATTEMPTS]: { category: ErrorCategory.USER_ACTION, severity: ErrorSeverity.MEDIUM },
  [ErrorCode.API_QUOTA_EXCEEDED]: { category: ErrorCategory.USER_ACTION, severity: ErrorSeverity.MEDIUM },

  // Server Errors
  [ErrorCode.SERVER_ERROR]: { category: ErrorCategory.SERVER, severity: ErrorSeverity.HIGH },
  [ErrorCode.DATABASE_ERROR]: { category: ErrorCategory.SERVER, severity: ErrorSeverity.HIGH },
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: { category: ErrorCategory.SERVER, severity: ErrorSeverity.HIGH },

  // Spiritual App Specific
  [ErrorCode.TAZKIYAH_GENERATION_FAILED]: { category: ErrorCategory.SPIRITUAL, severity: ErrorSeverity.MEDIUM },
  [ErrorCode.HABIT_UPDATE_FAILED]: { category: ErrorCategory.SPIRITUAL, severity: ErrorSeverity.MEDIUM },
  [ErrorCode.CHECKIN_SAVE_FAILED]: { category: ErrorCategory.SPIRITUAL, severity: ErrorSeverity.MEDIUM },
  [ErrorCode.PLAN_CREATION_FAILED]: { category: ErrorCategory.SPIRITUAL, severity: ErrorSeverity.MEDIUM },
  [ErrorCode.CONTENT_GENERATION_FAILED]: { category: ErrorCategory.SPIRITUAL, severity: ErrorSeverity.MEDIUM },
  [ErrorCode.AI_SERVICE_ERROR]: { category: ErrorCategory.SPIRITUAL, severity: ErrorSeverity.HIGH },

  // Service Issues
  [ErrorCode.MAINTENANCE_MODE]: { category: ErrorCategory.SERVER, severity: ErrorSeverity.HIGH },
  [ErrorCode.DB_DOWN]: { category: ErrorCategory.SERVER, severity: ErrorSeverity.CRITICAL },
  [ErrorCode.SERVICE_UNAVAILABLE]: { category: ErrorCategory.SERVER, severity: ErrorSeverity.HIGH },

  // Timeouts
  [ErrorCode.TIMEOUT_ERROR]: { category: ErrorCategory.NETWORK, severity: ErrorSeverity.MEDIUM },
  [ErrorCode.GATEWAY_TIMEOUT]: { category: ErrorCategory.NETWORK, severity: ErrorSeverity.MEDIUM },
  [ErrorCode.REQUEST_TIMEOUT]: { category: ErrorCategory.NETWORK, severity: ErrorSeverity.MEDIUM },

  // Network
  [ErrorCode.NETWORK_ERROR]: { category: ErrorCategory.NETWORK, severity: ErrorSeverity.HIGH },
  [ErrorCode.CONNECTION_FAILED]: { category: ErrorCategory.NETWORK, severity: ErrorSeverity.HIGH },
  [ErrorCode.DNS_ERROR]: { category: ErrorCategory.NETWORK, severity: ErrorSeverity.HIGH },

  // Special Cases
  [ErrorCode.NOT_ELIGIBLE]: { category: ErrorCategory.USER_ACTION, severity: ErrorSeverity.MEDIUM },
  [ErrorCode.PROFILE_INCOMPLETE]: { category: ErrorCategory.USER_ACTION, severity: ErrorSeverity.MEDIUM },
  [ErrorCode.ONBOARDING_INCOMPLETE]: { category: ErrorCategory.USER_ACTION, severity: ErrorSeverity.MEDIUM },

  // Generic
  [ErrorCode.UNKNOWN_ERROR]: { category: ErrorCategory.SERVER, severity: ErrorSeverity.MEDIUM }
};