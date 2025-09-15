import { ErrorCode } from '../constants/errorCodes';

/**
 * User-Friendly Error Messages
 *
 * These messages are crafted to be:
 * 1. Actionable - Tell users what they can do
 * 2. Contextual - Specific to Islamic spiritual app
 * 3. Respectful - Appropriate for Muslim users
 * 4. Clear - Non-technical language
 */

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  // Authentication Errors
  [ErrorCode.UNAUTHORIZED]: 'Please sign in to access this feature of your spiritual journey.',
  [ErrorCode.INVALID_CODE]: 'The access code entered is not valid. Please check and try again.',
  [ErrorCode.CODE_EXPIRED]: 'This access code has expired. Please request a new one.',
  [ErrorCode.CODE_ALREADY_USED]: 'This access code has already been used. Please request a new one.',
  [ErrorCode.SESSION_EXPIRED]: 'Your session has expired for security. Please sign in again.',
  [ErrorCode.INVALID_TOKEN]: 'Authentication failed. Please sign in again.',
  [ErrorCode.INVALID_CREDENTIALS]: 'The credentials provided are incorrect. Please try again.',

  // Authorization Errors
  [ErrorCode.FORBIDDEN]: 'You don\'t have permission to perform this action.',
  [ErrorCode.ACCOUNT_SUSPENDED]: 'Your account has been temporarily suspended. Please contact support.',
  [ErrorCode.INSUFFICIENT_PERMISSIONS]: 'Additional permissions are required for this action.',

  // Validation Errors
  [ErrorCode.INVALID_INPUT]: 'Please check your input and try again.',
  [ErrorCode.INVALID_EMAIL]: 'Please enter a valid email address.',
  [ErrorCode.INVALID_PHONE]: 'Please enter a valid phone number.',
  [ErrorCode.REQUIRED_FIELD]: 'This field is required to continue.',
  [ErrorCode.INVALID_FORMAT]: 'The format of your input is not correct. Please check and try again.',
  [ErrorCode.BAD_REQUEST]: 'There was an issue with your request. Please try again.',
  [ErrorCode.INVALID_SPIRITUAL_GOAL]: 'Please provide a clear spiritual goal or area you\'d like to work on.',

  // Conflicts
  [ErrorCode.EMAIL_ALREADY_EXISTS]: 'An account with this email already exists. Would you like to sign in instead?',
  [ErrorCode.RESOURCE_CONFLICT]: 'This action conflicts with existing data. Please refresh and try again.',
  [ErrorCode.HABIT_ALREADY_EXISTS]: 'You already have a habit with this name. Please choose a different name.',

  // Not Found Errors
  [ErrorCode.NOT_FOUND]: 'The requested item could not be found.',
  [ErrorCode.PROFILE_NOT_FOUND]: 'Your profile could not be found. Please complete your registration.',
  [ErrorCode.USER_NOT_FOUND]: 'User account not found. Please check and try again.',
  [ErrorCode.CONTENT_NOT_FOUND]: 'The spiritual content you\'re looking for is not available.',
  [ErrorCode.PLAN_NOT_FOUND]: 'Your Tazkiyah plan could not be found. Please create a new one.',
  [ErrorCode.HABIT_NOT_FOUND]: 'This habit could not be found in your spiritual practices.',

  // Rate Limiting
  [ErrorCode.RATE_LIMITED]: 'You\'re making requests too quickly. Please wait a moment and try again.',
  [ErrorCode.TOO_MANY_ATTEMPTS]: 'Too many attempts. Please wait before trying again.',
  [ErrorCode.API_QUOTA_EXCEEDED]: 'Daily usage limit reached. Please try again tomorrow, insha\'Allah.',

  // Server Errors
  [ErrorCode.SERVER_ERROR]: 'Something went wrong on our end. Please try again in a moment.',
  [ErrorCode.DATABASE_ERROR]: 'We\'re experiencing technical difficulties. Please try again shortly.',
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: 'A connected service is temporarily unavailable. Please try again later.',

  // Spiritual App Specific Errors
  [ErrorCode.TAZKIYAH_GENERATION_FAILED]: 'Unable to generate your spiritual plan. Please try rephrasing your goals and try again.',
  [ErrorCode.HABIT_UPDATE_FAILED]: 'Unable to update your spiritual habit. Please try again.',
  [ErrorCode.CHECKIN_SAVE_FAILED]: 'Unable to save your daily reflection. Please try again.',
  [ErrorCode.PLAN_CREATION_FAILED]: 'Unable to create your Tazkiyah plan. Please try again with different goals.',
  [ErrorCode.CONTENT_GENERATION_FAILED]: 'Unable to generate spiritual content. Please try again.',
  [ErrorCode.AI_SERVICE_ERROR]: 'Our spiritual guidance service is temporarily unavailable. Please try again later.',

  // Service Issues
  [ErrorCode.MAINTENANCE_MODE]: 'Sakinah is currently under maintenance. We\'ll be back shortly, insha\'Allah.',
  [ErrorCode.DB_DOWN]: 'Our services are temporarily unavailable. Please try again in a few minutes.',
  [ErrorCode.SERVICE_UNAVAILABLE]: 'This feature is temporarily unavailable. Please try again later.',

  // Timeouts
  [ErrorCode.TIMEOUT_ERROR]: 'The request took too long to complete. Please try again.',
  [ErrorCode.GATEWAY_TIMEOUT]: 'Connection timeout. Please check your internet and try again.',
  [ErrorCode.REQUEST_TIMEOUT]: 'Request timed out. Please try again with a stable connection.',

  // Network Issues
  [ErrorCode.NETWORK_ERROR]: 'Unable to connect to the server. Please check your internet connection.',
  [ErrorCode.CONNECTION_FAILED]: 'Connection failed. Please check your internet and try again.',
  [ErrorCode.DNS_ERROR]: 'Network connection issue. Please check your internet and try again.',

  // Special Cases
  [ErrorCode.NOT_ELIGIBLE]: 'You\'re almost ready! Please complete the next step to continue your spiritual journey.',
  [ErrorCode.PROFILE_INCOMPLETE]: 'Please complete your profile to access all features.',
  [ErrorCode.ONBOARDING_INCOMPLETE]: 'Please complete the initial setup to begin your Tazkiyah journey.',

  // Generic Fallback
  [ErrorCode.UNKNOWN_ERROR]: 'Something unexpected happened. Please try again, and if the issue persists, contact support.'
};

/**
 * Error Code Aliases for Legacy Support and HTTP Status Codes
 */
export const ERROR_ALIASES: Record<string, ErrorCode> = {
  // Legacy string aliases from old error system
  'code_used': ErrorCode.CODE_ALREADY_USED,
  'unauthenticated': ErrorCode.UNAUTHORIZED,
  'network_error': ErrorCode.NETWORK_ERROR,
  'server_error': ErrorCode.SERVER_ERROR,
  'tazkiyah_failed': ErrorCode.TAZKIYAH_GENERATION_FAILED,
  'habit_failed': ErrorCode.HABIT_UPDATE_FAILED,
  'checkin_failed': ErrorCode.CHECKIN_SAVE_FAILED,

  // HTTP status code aliases
  '400': ErrorCode.BAD_REQUEST,
  '401': ErrorCode.UNAUTHORIZED,
  '403': ErrorCode.FORBIDDEN,
  '404': ErrorCode.NOT_FOUND,
  '408': ErrorCode.REQUEST_TIMEOUT,
  '409': ErrorCode.RESOURCE_CONFLICT,
  '429': ErrorCode.RATE_LIMITED,
  '500': ErrorCode.SERVER_ERROR,
  '502': ErrorCode.GATEWAY_TIMEOUT,
  '503': ErrorCode.SERVICE_UNAVAILABLE,
  '504': ErrorCode.GATEWAY_TIMEOUT,

  // Common error patterns
  'Failed to fetch': ErrorCode.NETWORK_ERROR,
  'NetworkError': ErrorCode.NETWORK_ERROR,
  'TimeoutError': ErrorCode.TIMEOUT_ERROR,
  'AbortError': ErrorCode.REQUEST_TIMEOUT,
  'TypeError': ErrorCode.UNKNOWN_ERROR,

  // Spiritual app specific patterns
  'tazkiyah': ErrorCode.TAZKIYAH_GENERATION_FAILED,
  'habit': ErrorCode.HABIT_UPDATE_FAILED,
  'checkin': ErrorCode.CHECKIN_SAVE_FAILED,
  'plan': ErrorCode.PLAN_CREATION_FAILED,
  'content': ErrorCode.CONTENT_NOT_FOUND
};

/**
 * Normalize any error input to a canonical ErrorCode
 */
export function normalizeErrorCode(input?: unknown): ErrorCode {
  if (!input) return ErrorCode.UNKNOWN_ERROR;

  // If already an ErrorCode enum value
  if (typeof input === 'string' && Object.values(ErrorCode).includes(input as ErrorCode)) {
    return input as ErrorCode;
  }

  // Convert to string for processing
  const inputStr = String(input).toLowerCase();

  // Check aliases first
  for (const [alias, errorCode] of Object.entries(ERROR_ALIASES)) {
    if (inputStr.includes(alias.toLowerCase())) {
      return errorCode;
    }
  }

  // HTTP status code mapping
  const statusMatch = inputStr.match(/\b(\d{3})\b/);
  if (statusMatch) {
    const statusCode = statusMatch[1];
    if (ERROR_ALIASES[statusCode]) {
      return ERROR_ALIASES[statusCode];
    }
  }

  return ErrorCode.UNKNOWN_ERROR;
}

/**
 * Get user-friendly error message with fallback
 */
export function getErrorMessage(errorCode?: unknown, fallback: string = 'An unexpected error occurred'): string {
  const normalized = normalizeErrorCode(errorCode);
  return ERROR_MESSAGES[normalized] ?? fallback;
}

/**
 * Get error message with Islamic contextual additions
 */
export function getIslamicErrorMessage(errorCode?: unknown, fallback?: string): string {
  const baseMessage = getErrorMessage(errorCode, fallback);

  // Add Islamic context for certain error types
  const normalized = normalizeErrorCode(errorCode);

  if ([ErrorCode.TIMEOUT_ERROR, ErrorCode.NETWORK_ERROR, ErrorCode.SERVER_ERROR].includes(normalized)) {
    return `${baseMessage} Remember, every difficulty is followed by ease - \"Indeed, with hardship comes ease.\" (Quran 94:6)`;
  }

  if ([ErrorCode.TAZKIYAH_GENERATION_FAILED, ErrorCode.PLAN_CREATION_FAILED].includes(normalized)) {
    return `${baseMessage} Your intention (niyyah) is what matters most to Allah. Keep trying.`;
  }

  return baseMessage;
}