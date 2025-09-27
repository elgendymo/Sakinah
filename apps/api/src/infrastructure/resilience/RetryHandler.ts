import { Result } from '@/shared/result';
import { StructuredLogger } from '../observability/StructuredLogger';

const logger = StructuredLogger.getInstance();

export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  exponentialBase: number;
  jitterMaxMs: number;
  retryableErrors: Array<string | number>;
}

export interface RetryContext {
  attempt: number;
  lastError: Error;
  totalElapsedMs: number;
}

export type RetryableOperation<T> = () => Promise<T>;

export class RetryHandler {
  private static readonly DEFAULT_OPTIONS: RetryOptions = {
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 30000,
    exponentialBase: 2,
    jitterMaxMs: 100,
    retryableErrors: [
      'ECONNRESET',
      'ENOTFOUND',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'EHOSTUNREACH',
      'ENETUNREACH',
      408, // Request Timeout
      429, // Too Many Requests
      502, // Bad Gateway
      503, // Service Unavailable
      504, // Gateway Timeout
    ],
  };

  constructor(private options: Partial<RetryOptions> = {}) {
    this.options = { ...RetryHandler.DEFAULT_OPTIONS, ...options };
  }

  async execute<T>(operation: RetryableOperation<T>): Promise<Result<T, Error>> {
    const startTime = Date.now();
    let lastError: Error;

    for (let attempt = 1; attempt <= this.options.maxAttempts!; attempt++) {
      try {
        logger.debug('Executing operation', {
          attempt,
          maxAttempts: this.options.maxAttempts
        });

        const result = await operation();

        if (attempt > 1) {
          logger.info('Operation succeeded after retry', {
            attempt,
            totalElapsedMs: Date.now() - startTime
          });
        }

        return Result.ok(result);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        logger.warn('Operation failed', {
          attempt,
          error: lastError.message,
          errorCode: (lastError as any).code,
          statusCode: (lastError as any).statusCode
        });

        // Check if error is retryable
        if (!this.isRetryableError(lastError)) {
          logger.info('Error is not retryable, aborting', {
            error: lastError.message,
            errorCode: (lastError as any).code
          });
          return Result.error(lastError);
        }

        // Don't delay on the last attempt
        if (attempt < this.options.maxAttempts!) {
          const delay = this.calculateDelay(attempt);

          logger.debug('Retrying after delay', {
            attempt,
            delayMs: delay,
            nextAttempt: attempt + 1
          });

          await this.sleep(delay);
        }
      }
    }

    logger.error('Operation failed after all retry attempts', {
      maxAttempts: this.options.maxAttempts,
      totalElapsedMs: Date.now() - startTime,
      finalError: lastError!.message
    });

    return Result.error(lastError!);
  }

  private isRetryableError(error: Error): boolean {
    const errorCode = (error as any).code;
    const statusCode = (error as any).statusCode;

    return this.options.retryableErrors!.some(retryableError => {
      if (typeof retryableError === 'string') {
        return errorCode === retryableError || error.message.includes(retryableError);
      }
      return statusCode === retryableError;
    });
  }

  private calculateDelay(attempt: number): number {
    // Exponential backoff: baseDelay * exponentialBase^(attempt-1)
    const exponentialDelay = this.options.baseDelayMs! *
      Math.pow(this.options.exponentialBase!, attempt - 1);

    // Apply max delay cap
    const cappedDelay = Math.min(exponentialDelay, this.options.maxDelayMs!);

    // Add jitter to prevent thundering herd
    const jitter = Math.random() * this.options.jitterMaxMs!;

    return Math.floor(cappedDelay + jitter);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static async withRetry<T>(
    operation: RetryableOperation<T>,
    options?: Partial<RetryOptions>
  ): Promise<Result<T, Error>> {
    const handler = new RetryHandler(options);
    return handler.execute(operation);
  }
}

// Decorator for retry functionality
export function retry(options?: Partial<RetryOptions>) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const operation = () => originalMethod.apply(this, args);
      const result = await RetryHandler.withRetry(operation, options);

      if (Result.isError(result)) {
        throw result.error;
      }

      return result.value;
    };

    return descriptor;
  };
}