import { ErrorCode, ERROR_METADATA } from '../constants/errorCodes';
import { normalizeErrorCode, getErrorMessage } from '../ui/errorMap';

/**
 * Generate unique trace ID for error tracking
 */
function generateTraceId(): string {
  return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Enhanced Service Result Interface
 */
export interface EnhancedServiceResult<T> {
  success: boolean;
  data?: T;
  error?: {
    code: ErrorCode;
    message: string;
    userMessage: string;
    traceId: string;
    timestamp: string;
    details?: Record<string, unknown>;
    category: string;
    severity: string;
  };
  metadata?: {
    operationId?: string;
    executionTime?: number;
    retryCount?: number;
  };
}

/**
 * Centralized Service Result Handler
 *
 * Provides standardized success/error result formatting with:
 * - Automatic trace ID generation
 * - Error code normalization
 * - User-friendly message mapping
 * - Execution timing
 * - Retry logic
 */
export class ServiceResultHandler {
  private static instance: ServiceResultHandler;

  static getInstance(): ServiceResultHandler {
    if (!ServiceResultHandler.instance) {
      ServiceResultHandler.instance = new ServiceResultHandler();
    }
    return ServiceResultHandler.instance;
  }

  /**
   * Create a success result
   */
  success<T>(
    data: T,
    operationId?: string,
    executionTime?: number
  ): EnhancedServiceResult<T> {
    return {
      success: true,
      data,
      metadata: {
        operationId,
        executionTime,
        retryCount: 0
      }
    };
  }

  /**
   * Create an error result
   */
  error<T>(
    message: string,
    code?: string | ErrorCode,
    details?: Record<string, unknown>,
    operationId?: string
  ): EnhancedServiceResult<T> {
    const errorCode = normalizeErrorCode(code);
    const traceId = generateTraceId();
    const userMessage = getErrorMessage(errorCode, message);
    const metadata = ERROR_METADATA[errorCode];

    // Log error for debugging (in development)
    if (process.env.NODE_ENV === 'development') {
      console.error(`[${traceId}] ${errorCode}:`, {
        message,
        details,
        operationId,
        category: metadata.category,
        severity: metadata.severity
      });
    }

    return {
      success: false,
      error: {
        code: errorCode,
        message,
        userMessage,
        traceId,
        timestamp: new Date().toISOString(),
        details,
        category: metadata.category,
        severity: metadata.severity
      },
      metadata: {
        operationId,
        retryCount: 0
      }
    };
  }

  /**
   * Wrap an operation with error handling and timing
   */
  async wrapOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    maxRetries: number = 3
  ): Promise<EnhancedServiceResult<T>> {
    const startTime = Date.now();
    let lastError: unknown;
    let retryCount = 0;

    while (retryCount <= maxRetries) {
      try {
        const result = await operation();
        const executionTime = Date.now() - startTime;

        return this.success(result, operationName, executionTime);
      } catch (error) {
        lastError = error;
        retryCount++;

        // Don't retry for certain error types
        if (this.shouldNotRetry(error)) {
          break;
        }

        // Exponential backoff for retries
        if (retryCount <= maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 10000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed
    const errorMessage = lastError instanceof Error ? lastError.message : String(lastError);
    const result = this.error<T>(errorMessage, undefined, { retryCount: retryCount - 1 }, operationName);

    // Update retry count in metadata
    if (result.metadata) {
      result.metadata.retryCount = retryCount - 1;
    }

    return result;
  }

  /**
   * Type-safe validation wrapper
   */
  async validateAndProcess<TInput, TOutput>(
    input: unknown,
    validator: (input: unknown) => TInput,
    processor: (validInput: TInput) => Promise<TOutput>,
    operationName: string = 'validate_and_process'
  ): Promise<EnhancedServiceResult<TOutput>> {
    try {
      // Validate input
      const validInput = validator(input);

      // Process validated input
      return await this.wrapOperation(
        () => processor(validInput),
        operationName
      );
    } catch (validationError) {
      return this.error<TOutput>(
        validationError instanceof Error ? validationError.message : 'Validation failed',
        ErrorCode.INVALID_INPUT,
        { input },
        operationName
      );
    }
  }

  /**
   * Determine if an error should not be retried
   */
  private shouldNotRetry(error: unknown): boolean {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorCode = normalizeErrorCode(errorMessage);

    // Don't retry validation errors, auth errors, or 4xx errors
    const noRetryErrors = [
      ErrorCode.INVALID_INPUT,
      ErrorCode.UNAUTHORIZED,
      ErrorCode.FORBIDDEN,
      ErrorCode.NOT_FOUND,
      ErrorCode.BAD_REQUEST,
      ErrorCode.INVALID_EMAIL,
      ErrorCode.INVALID_FORMAT,
      ErrorCode.REQUIRED_FIELD
    ];

    return noRetryErrors.includes(errorCode);
  }
}

/**
 * Convenience function to get singleton instance
 */
export const serviceResult = ServiceResultHandler.getInstance();

/**
 * Type guards for service results
 */
export function isSuccess<T>(result: EnhancedServiceResult<T>): result is EnhancedServiceResult<T> & { success: true; data: T } {
  return result.success;
}

export function isError<T>(result: EnhancedServiceResult<T>): result is EnhancedServiceResult<T> & { success: false; error: NonNullable<EnhancedServiceResult<T>['error']> } {
  return !result.success;
}

/**
 * Utility to extract data from result or throw error
 */
export function unwrapResult<T>(result: EnhancedServiceResult<T>): T {
  if (isSuccess(result)) {
    return result.data;
  }

  const error = new Error(result.error?.userMessage || 'Operation failed');
  (error as any).serviceResult = result;
  throw error;
}

/**
 * Utility to extract data with default fallback
 */
export function getResultData<T>(result: EnhancedServiceResult<T>, fallback: T): T {
  return isSuccess(result) ? result.data : fallback;
}