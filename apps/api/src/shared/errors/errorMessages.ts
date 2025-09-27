import { ErrorCode } from './errorCodes';

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  // Authentication (401)
  [ErrorCode.UNAUTHORIZED]: 'You need to sign in to access this feature.',
  [ErrorCode.INVALID_CODE]: 'Invalid access code. Please check your code and try again.',
  [ErrorCode.SESSION_EXPIRED]: 'Your session has expired. Please sign in again.',
  [ErrorCode.CODE_ALREADY_USED]: 'This access code has already been used. Please request a new one.',

  // Bad Request (400)
  [ErrorCode.BAD_REQUEST]: 'The request could not be processed. Please check your input and try again.',
  [ErrorCode.INVALID_INPUT]: 'The information you provided is invalid. Please check and try again.',
  [ErrorCode.REQUIRED_FIELD]: 'Required information is missing. Please fill in all required fields.',
  [ErrorCode.VALIDATION_ERROR]: 'The information provided does not meet the requirements.',
  [ErrorCode.MALFORMED_REQUEST]: 'The request format is invalid. Please try again.',

  // Not Found (404)
  [ErrorCode.NOT_FOUND]: 'The requested resource was not found.',
  [ErrorCode.USER_NOT_FOUND]: 'User account not found. Please check your credentials.',
  [ErrorCode.HABIT_NOT_FOUND]: 'This habit was not found. It may have been removed.',
  [ErrorCode.PLAN_NOT_FOUND]: 'This spiritual plan was not found. Please try creating a new one.',
  [ErrorCode.CONTENT_NOT_FOUND]: 'The requested content is not available at this time.',
  [ErrorCode.JOURNAL_ENTRY_NOT_FOUND]: 'This journal entry was not found. It may have been removed.',

  // Conflict (409)
  [ErrorCode.CONFLICT]: 'There was a conflict with the current state. Please refresh and try again.',
  [ErrorCode.EMAIL_ALREADY_EXISTS]: 'An account with this email already exists.',
  [ErrorCode.HABIT_ALREADY_EXISTS]: 'You already have a habit with this name. Please choose a different name.',

  // Server Errors (500)
  [ErrorCode.SERVER_ERROR]: 'Something went wrong on our end. Please try again in a moment.',
  [ErrorCode.DATABASE_ERROR]: 'There was a problem accessing your data. Please try again.',
  [ErrorCode.CONNECTION_ERROR]: 'Unable to connect to our servers. Please check your internet connection.',
  [ErrorCode.UNKNOWN_ERROR]: 'An unexpected error occurred. Please try again.',

  // AI Provider Errors
  [ErrorCode.AI_PROVIDER_ERROR]: 'Our spiritual guidance system is temporarily unavailable. Please try again later.',
  [ErrorCode.OPENAI_ERROR]: 'The AI guidance service is currently unavailable. Please try again later.',
  [ErrorCode.RATE_LIMIT_EXCEEDED]: 'You have made too many requests. Please wait a moment before trying again.',

  // Network Errors
  [ErrorCode.NETWORK_ERROR]: 'Network connection failed. Please check your internet connection and try again.',
  [ErrorCode.TIMEOUT_ERROR]: 'The request took too long to complete. Please try again.',
};

// Aliases for common error variations and legacy codes
const ERROR_ALIASES: Record<string, ErrorCode> = {
  // Legacy codes
  'code_used': ErrorCode.CODE_ALREADY_USED,
  'unauthenticated': ErrorCode.UNAUTHORIZED,
  'forbidden': ErrorCode.UNAUTHORIZED,
  'access_denied': ErrorCode.UNAUTHORIZED,
  'invalid_token': ErrorCode.SESSION_EXPIRED,
  'token_expired': ErrorCode.SESSION_EXPIRED,

  // HTTP status codes
  '400': ErrorCode.BAD_REQUEST,
  '401': ErrorCode.UNAUTHORIZED,
  '403': ErrorCode.UNAUTHORIZED,
  '404': ErrorCode.NOT_FOUND,
  '409': ErrorCode.CONFLICT,
  '429': ErrorCode.RATE_LIMIT_EXCEEDED,
  '500': ErrorCode.SERVER_ERROR,
  '502': ErrorCode.CONNECTION_ERROR,
  '503': ErrorCode.SERVER_ERROR,
  '504': ErrorCode.TIMEOUT_ERROR,

  // Common variations
  'not_found': ErrorCode.NOT_FOUND,
  'user_not_found': ErrorCode.USER_NOT_FOUND,
  'invalid_user': ErrorCode.USER_NOT_FOUND,
  'habit_not_found': ErrorCode.HABIT_NOT_FOUND,
  'plan_not_found': ErrorCode.PLAN_NOT_FOUND,
  'content_not_found': ErrorCode.CONTENT_NOT_FOUND,

  'duplicate': ErrorCode.CONFLICT,
  'already_exists': ErrorCode.CONFLICT,
  'email_exists': ErrorCode.EMAIL_ALREADY_EXISTS,
  'user_exists': ErrorCode.EMAIL_ALREADY_EXISTS,

  'validation': ErrorCode.VALIDATION_ERROR,
  'invalid': ErrorCode.INVALID_INPUT,
  'required': ErrorCode.REQUIRED_FIELD,
  'missing': ErrorCode.REQUIRED_FIELD,

  'db_error': ErrorCode.DATABASE_ERROR,
  'database': ErrorCode.DATABASE_ERROR,
  'connection': ErrorCode.CONNECTION_ERROR,
  'network': ErrorCode.NETWORK_ERROR,
  'timeout': ErrorCode.TIMEOUT_ERROR,
  'server': ErrorCode.SERVER_ERROR,

  // AI-specific
  'ai_error': ErrorCode.AI_PROVIDER_ERROR,
  'openai': ErrorCode.OPENAI_ERROR,
  'rate_limit': ErrorCode.RATE_LIMIT_EXCEEDED,
  'quota_exceeded': ErrorCode.RATE_LIMIT_EXCEEDED,
};

export function normalizeErrorCode(input?: unknown): ErrorCode {
  if (!input) return ErrorCode.UNKNOWN_ERROR;

  // Check if it's already a valid ErrorCode
  if (Object.values(ErrorCode).includes(input as ErrorCode)) {
    return input as ErrorCode;
  }

  // Normalize input to lowercase string
  const raw = String(input).trim().toLowerCase().replace(/[_-]/g, '_');

  // Check aliases
  if (ERROR_ALIASES[raw]) {
    return ERROR_ALIASES[raw];
  }

  // Try partial matching for common patterns
  if (raw.includes('auth') || raw.includes('login') || raw.includes('sign')) {
    return ErrorCode.UNAUTHORIZED;
  }

  if (raw.includes('not_found') || raw.includes('notfound')) {
    return ErrorCode.NOT_FOUND;
  }

  if (raw.includes('validation') || raw.includes('invalid')) {
    return ErrorCode.INVALID_INPUT;
  }

  if (raw.includes('duplicate') || raw.includes('exists') || raw.includes('conflict')) {
    return ErrorCode.CONFLICT;
  }

  if (raw.includes('database') || raw.includes('db')) {
    return ErrorCode.DATABASE_ERROR;
  }

  if (raw.includes('network') || raw.includes('connection')) {
    return ErrorCode.NETWORK_ERROR;
  }

  if (raw.includes('timeout') || raw.includes('time_out')) {
    return ErrorCode.TIMEOUT_ERROR;
  }

  if (raw.includes('rate') || raw.includes('limit') || raw.includes('quota')) {
    return ErrorCode.RATE_LIMIT_EXCEEDED;
  }

  return ErrorCode.UNKNOWN_ERROR;
}

export function getErrorMessage(errorCode?: ErrorCode | string): string {
  const normalizedCode = typeof errorCode === 'string'
    ? normalizeErrorCode(errorCode)
    : errorCode || ErrorCode.UNKNOWN_ERROR;

  return ERROR_MESSAGES[normalizedCode] || ERROR_MESSAGES[ErrorCode.UNKNOWN_ERROR];
}