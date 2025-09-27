// Core exports
export * from './types';
export * from './errorCodes';
export * from './errorMessages';
export * from './errorMapper';
export * from './errorResponse';

// Logging exports
export * from '../logging/logger';

// Convenience re-exports for common use cases
export {
  normalizeErrorCode,
  getErrorMessage
} from './errorMessages';

export {
  createErrorResponse,
  createSuccessResponse,
  handleApiError,
  createAppError,
  getTraceId,
  handleExpressError,
  getExpressTraceId
} from './errorResponse';

export {
  ErrorMapper,
  getDbType
} from './errorMapper';

// Bridge exports
export { ErrorBridge } from './bridge';

export {
  logger,
  createRequestLogger,
  createTimedLogger
} from '../logging/logger';

// Legacy compatibility classes
export class NotFoundError extends Error {
  public statusCode = 404;
  constructor(resource = 'Resource') {
    super(`${resource} not found`);
    this.name = 'NotFoundError';
  }
}

export class AuthenticationError extends Error {
  public statusCode = 401;
  constructor(message = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class ValidationError extends Error {
  public statusCode = 400;
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthorizationError extends Error {
  public statusCode = 403;
  constructor(message = 'Insufficient permissions') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

// Legacy Express error handler
export function errorHandler(
  err: Error,
  _req: any,
  res: any,
  _next: any
): void {
  if (err && 'statusCode' in err) {
    res.status((err as any).statusCode).json({
      error: err.message,
    });
    return;
  }

  console.error('Unexpected error:', err);
  res.status(500).json({
    error: 'Internal server error',
  });
}