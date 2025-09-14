import { ErrorCode, DatabaseErrorCode } from './errorCodes';

// Re-export for convenience
export { ErrorCode, DatabaseErrorCode };

export interface ApiResponse<T = any> {
  ok: boolean;
  data?: T;
  next?: string;        // Flow state for navigation
  errorCode?: ErrorCode;
  message?: string;
  traceId: string;      // Request correlation ID
}

export interface DatabaseResult<T> {
  data: T | null;
  error: DatabaseError | null;
}

export interface DatabaseError {
  code: DatabaseErrorCode;
  message: string;
  details?: any;
}

export interface ErrorContext {
  traceId?: string;
  userId?: string;
  requestId?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  duration?: number;
  [key: string]: any;
}

export interface LogContext extends ErrorContext {
  level: LogLevel;
  timestamp: string;
}

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export interface AppError extends Error {
  code: ErrorCode;
  statusCode: number;
  context?: ErrorContext;
  originalError?: Error;
}

export interface ErrorResponse {
  response: ApiResponse;
  status: number;
}

// Result pattern for better error handling
export type Result<T, E = ErrorCode> =
  | { success: true; data: T }
  | { success: false; error: E; message: string };

// Factory function for creating success results
export function success<T>(data: T): Result<T> {
  return { success: true, data };
}

// Factory function for creating error results
export function failure<E = ErrorCode>(error: E, message: string): Result<never, E> {
  return { success: false, error, message };
}