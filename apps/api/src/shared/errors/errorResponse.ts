import { NextResponse } from 'next/server';
import { ErrorCode, ErrorCodeToStatus } from './errorCodes';
import { ApiResponse, ErrorResponse, AppError } from './types';
import { getErrorMessage } from './errorMessages';

// UUID generation utility
function generateUuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older environments
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function createErrorResponse(
  errorCode: ErrorCode,
  customMessage?: string,
  traceId?: string,
  next?: string
): ErrorResponse {
  const message = customMessage || getErrorMessage(errorCode);
  const status = ErrorCodeToStatus[errorCode] || 500;
  const finalTraceId = traceId || generateUuid();

  const response: ApiResponse = {
    ok: false,
    errorCode,
    message,
    traceId: finalTraceId,
    ...(next && { next })
  };

  return { response, status };
}

export function createSuccessResponse<T>(
  data: T,
  traceId?: string,
  next?: string
): ApiResponse<T> {
  return {
    ok: true,
    data,
    traceId: traceId || generateUuid(),
    ...(next && { next })
  };
}

// Next.js API route error handler
export function handleApiError(
  error: unknown,
  traceId?: string,
  customMessage?: string
): NextResponse {
  const finalTraceId = traceId || generateUuid();
  let errorCode: ErrorCode;
  let message: string;

  if (error && typeof error === 'object' && 'code' in error) {
    errorCode = (error as any).code;
    message = customMessage || (error as any).message || getErrorMessage((error as any).code);
  } else if (error instanceof Error) {
    errorCode = ErrorCode.SERVER_ERROR;
    message = customMessage || 'An unexpected error occurred';
  } else {
    errorCode = ErrorCode.UNKNOWN_ERROR;
    message = customMessage || 'An unknown error occurred';
  }

  const { response, status } = createErrorResponse(errorCode, message, finalTraceId);

  return NextResponse.json(response, {
    status,
    headers: {
      'X-Trace-Id': finalTraceId,
      'Content-Type': 'application/json',
    },
  });
}

// Express.js error handler
export function handleExpressError(
  error: unknown,
  traceId?: string,
  customMessage?: string
) {
  const finalTraceId = traceId || generateUuid();
  let errorCode: ErrorCode;
  let message: string;

  if (error && typeof error === 'object' && 'code' in error) {
    errorCode = (error as any).code;
    message = customMessage || (error as any).message || getErrorMessage((error as any).code);
  } else if (error instanceof Error) {
    errorCode = ErrorCode.SERVER_ERROR;
    message = customMessage || 'An unexpected error occurred';
  } else {
    errorCode = ErrorCode.UNKNOWN_ERROR;
    message = customMessage || 'An unknown error occurred';
  }

  const { response, status } = createErrorResponse(errorCode, message, finalTraceId);

  return { response, status, headers: { 'X-Trace-Id': finalTraceId } };
}

// Create custom AppError
export function createAppError(
  code: ErrorCode,
  message?: string,
  originalError?: Error,
  context?: any
): AppError {
  const error = new Error(message || getErrorMessage(code)) as AppError;
  error.name = 'AppError';
  error.code = code;
  error.statusCode = ErrorCodeToStatus[code] || 500;
  error.originalError = originalError;
  error.context = context;

  return error;
}

// Utility to extract trace ID from request headers
export function getTraceId(request: Request): string {
  return request.headers.get('X-Trace-Id') || request.headers.get('x-trace-id') || generateUuid();
}

// Utility to extract trace ID from Express request
export function getExpressTraceId(req: any): string {
  return req.headers['x-trace-id'] || req.headers['X-Trace-Id'] || generateUuid();
}

// Generic result handler for consistent error responses
export function handleResult<T>(
  result: { success: boolean; data?: T; error?: any; message?: string },
  traceId?: string
): NextResponse {
  if (result.success && result.data !== undefined) {
    const response = createSuccessResponse(result.data, traceId);
    return NextResponse.json(response);
  }

  const errorCode = result.error || ErrorCode.UNKNOWN_ERROR;
  const message = result.message || getErrorMessage(errorCode);

  return handleApiError(createAppError(errorCode, message), traceId);
}