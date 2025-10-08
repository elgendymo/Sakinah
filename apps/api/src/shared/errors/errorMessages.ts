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

  // Survey Progress Errors
  [ErrorCode.SURVEY_PROGRESS_ERROR]: 'There was an issue with your survey progress. Please try refreshing the page.',
  [ErrorCode.SURVEY_PHASE_ACCESS_DENIED]: 'You need to complete the previous phase before continuing.',
  [ErrorCode.SURVEY_NOT_FOUND]: 'Your survey was not found. Please start a new assessment.',
  [ErrorCode.SURVEY_ALREADY_COMPLETED]: 'You have already completed this survey. Check your results page.',
  [ErrorCode.INVALID_PHASE_PROGRESSION]: 'Please complete the phases in order. You cannot skip ahead.',

  // Survey Validation Errors
  [ErrorCode.INVALID_LIKERT_SCORE]: 'Please select a rating between 1 and 5 for your response.',
  [ErrorCode.REFLECTION_TOO_SHORT]: 'Your reflection is too brief. Please write at least 10 characters to help us understand your spiritual journey.',
  [ErrorCode.REFLECTION_TOO_LONG]: 'Your reflection is too long. Please keep it under 500 characters for the best experience.',
  [ErrorCode.SURVEY_RESPONSE_INVALID]: 'Some of your responses are invalid. Please check your answers and try again.',
  [ErrorCode.SURVEY_NOTE_TOO_LONG]: 'Your note is too long. Please keep it under 1000 characters.',
  [ErrorCode.PHASE_INCOMPLETE]: 'Please answer all questions in this phase before continuing.',
  [ErrorCode.REQUIRED_QUESTIONS_MISSING]: 'Some required questions are missing answers. Please complete all questions.',

  // Survey Results Errors
  [ErrorCode.RESULTS_GENERATION_FAILED]: 'We encountered an issue generating your spiritual assessment results. Please try again.',
  [ErrorCode.RESULTS_NOT_FOUND]: 'Your assessment results are not available yet. Please complete all survey phases first.',
  [ErrorCode.AI_ANALYSIS_FAILED]: 'Our spiritual guidance analysis is temporarily unavailable. Your responses have been saved.',
  [ErrorCode.PERSONALIZED_HABITS_FAILED]: 'We could not generate personalized habit recommendations at this time. Please try again later.',
  [ErrorCode.TAZKIYAH_PLAN_FAILED]: 'We could not create your Tazkiyah plan at this time. Please try again later.',

  // Survey Auto-save Errors
  [ErrorCode.AUTO_SAVE_FAILED]: 'Your responses could not be saved automatically. Please try submitting manually.',
  [ErrorCode.STATE_SYNC_ERROR]: 'There was an issue syncing your progress. Your responses may not be saved.',
  [ErrorCode.PROGRESS_UPDATE_FAILED]: 'Your progress could not be updated. Please refresh and try again.',

  // Survey Export Errors
  [ErrorCode.EXPORT_NOT_AVAILABLE]: 'Export is not available for this assessment. Please complete all phases first.',
  [ErrorCode.PDF_GENERATION_FAILED]: 'We could not generate your PDF report. Please try the JSON export instead.',
  [ErrorCode.JSON_EXPORT_FAILED]: 'We could not generate your export file. Please try again later.',
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

  // Survey-specific aliases
  'survey_error': ErrorCode.SURVEY_PROGRESS_ERROR,
  'survey_not_found': ErrorCode.SURVEY_NOT_FOUND,
  'survey_completed': ErrorCode.SURVEY_ALREADY_COMPLETED,
  'phase_access_denied': ErrorCode.SURVEY_PHASE_ACCESS_DENIED,
  'invalid_progression': ErrorCode.INVALID_PHASE_PROGRESSION,
  'likert_invalid': ErrorCode.INVALID_LIKERT_SCORE,
  'reflection_short': ErrorCode.REFLECTION_TOO_SHORT,
  'reflection_long': ErrorCode.REFLECTION_TOO_LONG,
  'note_too_long': ErrorCode.SURVEY_NOTE_TOO_LONG,
  'phase_incomplete': ErrorCode.PHASE_INCOMPLETE,
  'questions_missing': ErrorCode.REQUIRED_QUESTIONS_MISSING,
  'results_failed': ErrorCode.RESULTS_GENERATION_FAILED,
  'results_not_found': ErrorCode.RESULTS_NOT_FOUND,
  'ai_analysis_failed': ErrorCode.AI_ANALYSIS_FAILED,
  'habits_failed': ErrorCode.PERSONALIZED_HABITS_FAILED,
  'tazkiyah_failed': ErrorCode.TAZKIYAH_PLAN_FAILED,
  'auto_save_failed': ErrorCode.AUTO_SAVE_FAILED,
  'state_sync_error': ErrorCode.STATE_SYNC_ERROR,
  'progress_failed': ErrorCode.PROGRESS_UPDATE_FAILED,
  'export_failed': ErrorCode.EXPORT_NOT_AVAILABLE,
  'pdf_failed': ErrorCode.PDF_GENERATION_FAILED,
  'json_failed': ErrorCode.JSON_EXPORT_FAILED,
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