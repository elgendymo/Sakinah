export enum ErrorCode {
  // Authentication (401)
  UNAUTHORIZED = 'unauthorized',
  INVALID_CODE = 'invalid_code',
  SESSION_EXPIRED = 'session_expired',
  CODE_ALREADY_USED = 'code_already_used',

  // Bad Request (400)
  BAD_REQUEST = 'bad_request',
  INVALID_INPUT = 'invalid_input',
  REQUIRED_FIELD = 'required_field',
  VALIDATION_ERROR = 'validation_error',
  MALFORMED_REQUEST = 'malformed_request',

  // Not Found (404)
  NOT_FOUND = 'not_found',
  USER_NOT_FOUND = 'user_not_found',
  HABIT_NOT_FOUND = 'habit_not_found',
  PLAN_NOT_FOUND = 'plan_not_found',
  CONTENT_NOT_FOUND = 'content_not_found',
  JOURNAL_ENTRY_NOT_FOUND = 'journal_entry_not_found',

  // Conflict (409)
  CONFLICT = 'conflict',
  EMAIL_ALREADY_EXISTS = 'email_already_exists',
  HABIT_ALREADY_EXISTS = 'habit_already_exists',

  // Server Errors (500)
  SERVER_ERROR = 'server_error',
  DATABASE_ERROR = 'database_error',
  CONNECTION_ERROR = 'connection_error',
  UNKNOWN_ERROR = 'unknown_error',

  // AI Provider Errors
  AI_PROVIDER_ERROR = 'ai_provider_error',
  OPENAI_ERROR = 'openai_error',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',

  // Network Errors
  NETWORK_ERROR = 'network_error',
  TIMEOUT_ERROR = 'timeout_error',

  // Survey Progress Errors
  SURVEY_PROGRESS_ERROR = 'survey_progress_error',
  SURVEY_PHASE_ACCESS_DENIED = 'survey_phase_access_denied',
  SURVEY_NOT_FOUND = 'survey_not_found',
  SURVEY_ALREADY_COMPLETED = 'survey_already_completed',
  INVALID_PHASE_PROGRESSION = 'invalid_phase_progression',

  // Survey Validation Errors
  INVALID_LIKERT_SCORE = 'invalid_likert_score',
  REFLECTION_TOO_SHORT = 'reflection_too_short',
  REFLECTION_TOO_LONG = 'reflection_too_long',
  SURVEY_RESPONSE_INVALID = 'survey_response_invalid',
  SURVEY_NOTE_TOO_LONG = 'survey_note_too_long',
  PHASE_INCOMPLETE = 'phase_incomplete',
  REQUIRED_QUESTIONS_MISSING = 'required_questions_missing',

  // Survey Results Errors
  RESULTS_GENERATION_FAILED = 'results_generation_failed',
  RESULTS_NOT_FOUND = 'results_not_found',
  AI_ANALYSIS_FAILED = 'ai_analysis_failed',
  PERSONALIZED_HABITS_FAILED = 'personalized_habits_failed',
  TAZKIYAH_PLAN_FAILED = 'tazkiyah_plan_failed',

  // Survey Auto-save Errors
  AUTO_SAVE_FAILED = 'auto_save_failed',
  STATE_SYNC_ERROR = 'state_sync_error',
  PROGRESS_UPDATE_FAILED = 'progress_update_failed',

  // Survey Export Errors
  EXPORT_NOT_AVAILABLE = 'export_not_available',
  PDF_GENERATION_FAILED = 'pdf_generation_failed',
  JSON_EXPORT_FAILED = 'json_export_failed',
}

export enum DatabaseErrorCode {
  // Connection Issues
  DB_CONNECTION_FAILED = 'db_connection_failed',
  DB_TIMEOUT = 'db_timeout',

  // Query Issues
  DB_QUERY_FAILED = 'db_query_failed',
  DB_CONSTRAINT_VIOLATION = 'db_constraint_violation',
  DB_FOREIGN_KEY_VIOLATION = 'db_foreign_key_violation',
  DB_UNIQUE_VIOLATION = 'db_unique_violation',

  // Authentication/Authorization
  DB_UNAUTHORIZED = 'db_unauthorized',
  DB_PERMISSION_DENIED = 'db_permission_denied',

  // Data Issues
  DB_NOT_FOUND = 'db_not_found',
  DB_INVALID_DATA = 'db_invalid_data',

  // Generic
  DB_UNKNOWN_ERROR = 'db_unknown_error',
}

// Auto-mapping to HTTP status codes
export const ErrorCodeToStatus: Record<ErrorCode, number> = {
  // Authentication (401)
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.INVALID_CODE]: 401,
  [ErrorCode.SESSION_EXPIRED]: 401,
  [ErrorCode.CODE_ALREADY_USED]: 401,

  // Bad Request (400)
  [ErrorCode.BAD_REQUEST]: 400,
  [ErrorCode.INVALID_INPUT]: 400,
  [ErrorCode.REQUIRED_FIELD]: 400,
  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.MALFORMED_REQUEST]: 400,

  // Not Found (404)
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.USER_NOT_FOUND]: 404,
  [ErrorCode.HABIT_NOT_FOUND]: 404,
  [ErrorCode.PLAN_NOT_FOUND]: 404,
  [ErrorCode.CONTENT_NOT_FOUND]: 404,
  [ErrorCode.JOURNAL_ENTRY_NOT_FOUND]: 404,

  // Conflict (409)
  [ErrorCode.CONFLICT]: 409,
  [ErrorCode.EMAIL_ALREADY_EXISTS]: 409,
  [ErrorCode.HABIT_ALREADY_EXISTS]: 409,

  // Server Errors (500)
  [ErrorCode.SERVER_ERROR]: 500,
  [ErrorCode.DATABASE_ERROR]: 500,
  [ErrorCode.CONNECTION_ERROR]: 500,
  [ErrorCode.UNKNOWN_ERROR]: 500,
  [ErrorCode.AI_PROVIDER_ERROR]: 500,
  [ErrorCode.OPENAI_ERROR]: 500,
  [ErrorCode.RATE_LIMIT_EXCEEDED]: 429,
  [ErrorCode.NETWORK_ERROR]: 500,
  [ErrorCode.TIMEOUT_ERROR]: 408,

  // Survey Progress Errors
  [ErrorCode.SURVEY_PROGRESS_ERROR]: 500,
  [ErrorCode.SURVEY_PHASE_ACCESS_DENIED]: 403,
  [ErrorCode.SURVEY_NOT_FOUND]: 404,
  [ErrorCode.SURVEY_ALREADY_COMPLETED]: 409,
  [ErrorCode.INVALID_PHASE_PROGRESSION]: 400,

  // Survey Validation Errors
  [ErrorCode.INVALID_LIKERT_SCORE]: 400,
  [ErrorCode.REFLECTION_TOO_SHORT]: 400,
  [ErrorCode.REFLECTION_TOO_LONG]: 400,
  [ErrorCode.SURVEY_RESPONSE_INVALID]: 400,
  [ErrorCode.SURVEY_NOTE_TOO_LONG]: 400,
  [ErrorCode.PHASE_INCOMPLETE]: 400,
  [ErrorCode.REQUIRED_QUESTIONS_MISSING]: 400,

  // Survey Results Errors
  [ErrorCode.RESULTS_GENERATION_FAILED]: 500,
  [ErrorCode.RESULTS_NOT_FOUND]: 404,
  [ErrorCode.AI_ANALYSIS_FAILED]: 500,
  [ErrorCode.PERSONALIZED_HABITS_FAILED]: 500,
  [ErrorCode.TAZKIYAH_PLAN_FAILED]: 500,

  // Survey Auto-save Errors
  [ErrorCode.AUTO_SAVE_FAILED]: 500,
  [ErrorCode.STATE_SYNC_ERROR]: 500,
  [ErrorCode.PROGRESS_UPDATE_FAILED]: 500,

  // Survey Export Errors
  [ErrorCode.EXPORT_NOT_AVAILABLE]: 404,
  [ErrorCode.PDF_GENERATION_FAILED]: 500,
  [ErrorCode.JSON_EXPORT_FAILED]: 500,
};

// Map database error codes to API error codes
export const DatabaseToApiErrorMap: Record<DatabaseErrorCode, ErrorCode> = {
  [DatabaseErrorCode.DB_CONNECTION_FAILED]: ErrorCode.DATABASE_ERROR,
  [DatabaseErrorCode.DB_TIMEOUT]: ErrorCode.TIMEOUT_ERROR,
  [DatabaseErrorCode.DB_QUERY_FAILED]: ErrorCode.DATABASE_ERROR,
  [DatabaseErrorCode.DB_CONSTRAINT_VIOLATION]: ErrorCode.CONFLICT,
  [DatabaseErrorCode.DB_FOREIGN_KEY_VIOLATION]: ErrorCode.INVALID_INPUT,
  [DatabaseErrorCode.DB_UNIQUE_VIOLATION]: ErrorCode.CONFLICT,
  [DatabaseErrorCode.DB_UNAUTHORIZED]: ErrorCode.UNAUTHORIZED,
  [DatabaseErrorCode.DB_PERMISSION_DENIED]: ErrorCode.UNAUTHORIZED,
  [DatabaseErrorCode.DB_NOT_FOUND]: ErrorCode.NOT_FOUND,
  [DatabaseErrorCode.DB_INVALID_DATA]: ErrorCode.INVALID_INPUT,
  [DatabaseErrorCode.DB_UNKNOWN_ERROR]: ErrorCode.DATABASE_ERROR,
};