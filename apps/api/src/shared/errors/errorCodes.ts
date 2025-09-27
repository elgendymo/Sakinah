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