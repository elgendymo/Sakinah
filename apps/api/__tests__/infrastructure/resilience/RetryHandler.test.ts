import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { RetryHandler, RetryOptions, retry } from '../../../src/infrastructure/resilience/RetryHandler';
import { Result } from '../../../src/shared/result';

describe('RetryHandler', () => {
  let retryHandler: RetryHandler;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('should use default options when none provided', () => {
      retryHandler = new RetryHandler();
      expect(retryHandler).toBeDefined();
    });

    it('should merge custom options with defaults', () => {
      const customOptions: Partial<RetryOptions> = {
        maxAttempts: 5,
        baseDelayMs: 2000,
      };
      retryHandler = new RetryHandler(customOptions);
      expect(retryHandler).toBeDefined();
    });
  });

  describe('execute', () => {
    beforeEach(() => {
      retryHandler = new RetryHandler({ maxAttempts: 3, baseDelayMs: 100 });
    });

    it('should return success on first attempt', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      const result = await retryHandler.execute(operation);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value).toBe('success');
      }
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable errors', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockRejectedValueOnce(new Error('ETIMEDOUT'))
        .mockResolvedValue('success');

      const executePromise = retryHandler.execute(operation);

      // Fast forward through all delays
      await vi.runAllTimersAsync();
      const result = await executePromise;

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value).toBe('success');
      }
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should not retry on non-retryable errors', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('INVALID_INPUT'));

      const result = await retryHandler.execute(operation);

      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.error.message).toBe('INVALID_INPUT');
      }
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should fail after max attempts with retryable error', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('ECONNRESET'));

      const executePromise = retryHandler.execute(operation);

      // Fast forward through all delays
      await vi.runAllTimersAsync();
      const result = await executePromise;

      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.error.message).toBe('ECONNRESET');
      }
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should respect HTTP status code retryable errors', async () => {
      const error = new Error('Service Unavailable') as any;
      error.statusCode = 503;

      const operation = vi.fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValue('success');

      const executePromise = retryHandler.execute(operation);

      // Fast forward through all delays
      await vi.runAllTimersAsync();
      const result = await executePromise;

      expect(Result.isOk(result)).toBe(true);
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should calculate exponential backoff delays correctly', async () => {
      const delays: number[] = [];

      vi.spyOn(global, 'setTimeout').mockImplementation((callback, delay) => {
        delays.push(delay as number);
        // Execute immediately for test
        (callback as Function)();
        return 1 as any;
      });

      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockResolvedValue('success');

      await retryHandler.execute(operation);

      expect(delays.length).toBe(2);
      expect(delays[0]).toBeGreaterThanOrEqual(100); // Base delay + jitter
      expect(delays[1]).toBeGreaterThanOrEqual(200); // Exponential backoff
    });
  });

  describe('static withRetry', () => {
    it('should work as static method', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      const result = await RetryHandler.withRetry(operation, { maxAttempts: 2 });

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value).toBe('success');
      }
      expect(operation).toHaveBeenCalledTimes(1);
    });
  });

  describe('isRetryableError', () => {
    beforeEach(() => {
      retryHandler = new RetryHandler();
    });

    it('should identify retryable connection errors', () => {
      const retryableErrors = [
        'ECONNRESET',
        'ENOTFOUND',
        'ECONNREFUSED',
        'ETIMEDOUT',
        'EHOSTUNREACH',
        'ENETUNREACH',
      ];

      retryableErrors.forEach(errorCode => {
        const error = new Error('Network error') as any;
        error.code = errorCode;
        expect((retryHandler as any).isRetryableError(error)).toBe(true);
      });
    });

    it('should identify retryable HTTP status codes', () => {
      const retryableStatusCodes = [408, 429, 502, 503, 504];

      retryableStatusCodes.forEach(statusCode => {
        const error = new Error('HTTP error') as any;
        error.statusCode = statusCode;
        expect((retryHandler as any).isRetryableError(error)).toBe(true);
      });
    });

    it('should not retry non-retryable errors', () => {
      const nonRetryableErrors = [
        { code: 'INVALID_INPUT' },
        { statusCode: 400 },
        { statusCode: 401 },
        { statusCode: 403 },
        { statusCode: 404 },
      ];

      nonRetryableErrors.forEach(errorProps => {
        const error = new Error('Non-retryable error') as any;
        Object.assign(error, errorProps);
        expect((retryHandler as any).isRetryableError(error)).toBe(false);
      });
    });
  });

  describe('calculateDelay', () => {
    beforeEach(() => {
      retryHandler = new RetryHandler({
        baseDelayMs: 1000,
        exponentialBase: 2,
        maxDelayMs: 30000,
        jitterMaxMs: 100,
      });
    });

    it('should calculate exponential backoff correctly', () => {
      const delay1 = (retryHandler as any).calculateDelay(1);
      const delay2 = (retryHandler as any).calculateDelay(2);
      const delay3 = (retryHandler as any).calculateDelay(3);

      expect(delay1).toBeGreaterThanOrEqual(1000);
      expect(delay1).toBeLessThanOrEqual(1100);

      expect(delay2).toBeGreaterThanOrEqual(2000);
      expect(delay2).toBeLessThanOrEqual(2100);

      expect(delay3).toBeGreaterThanOrEqual(4000);
      expect(delay3).toBeLessThanOrEqual(4100);
    });

    it('should respect max delay cap', () => {
      const delay = (retryHandler as any).calculateDelay(10); // Would be 1024000ms without cap
      expect(delay).toBeLessThanOrEqual(30100); // maxDelay + jitter
    });
  });

  describe('decorator', () => {
    it('should work as method decorator', async () => {
      let callCount = 0;

      class TestClass {
        @retry({ maxAttempts: 2, retryableErrors: ['ECONNRESET'] })
        async testMethod() {
          callCount++;
          if (callCount === 1) {
            throw new Error('ECONNRESET');
          }
          return 'success';
        }
      }

      const instance = new TestClass();
      const result = await instance.testMethod();

      expect(result).toBe('success');
      expect(callCount).toBe(2);
    });
  });
});