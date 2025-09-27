import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Request, Response } from 'express';
import {
  ResilienceFactory,
  resilient,
  databaseResilient,
  externalApiResilient,
  aiResilient
} from '../../../src/infrastructure/resilience/ResilienceFactory';
import { Result } from '../../../src/shared/result';

// Mock Express request/response
const createMockRequest = (overrides: Partial<Request> = {}): Partial<Request> => ({
  ip: '127.0.0.1',
  method: 'GET',
  url: '/test',
  userId: 'user-123',
  ...overrides,
});

const createMockResponse = (): Partial<Response> => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    end: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    on: vi.fn(),
    headersSent: false,
  };
  return res;
};

describe('ResilienceFactory', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Reset circuit breakers before each test
    ResilienceFactory.resetAllCircuitBreakers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('createResilientOperation', () => {
    it('should create successful resilient operation', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      const resilientOp = ResilienceFactory.createResilientOperation(
        'test-operation',
        operation,
        { timeout: 5000 }
      );

      const result = await resilientOp();

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value).toBe('success');
      }
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should handle operation failures', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Operation failed'));

      const resilientOp = ResilienceFactory.createResilientOperation(
        'test-operation',
        operation,
        { timeout: 5000 }
      );

      const result = await resilientOp();

      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.error.message).toBe('Operation failed');
      }
    });

    it('should apply retry logic when configured', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockResolvedValue('success');

      const resilientOp = ResilienceFactory.createResilientOperation(
        'test-operation',
        operation,
        {
          retry: {
            maxAttempts: 3,
            baseDelayMs: 100,
            retryableErrors: ['ECONNRESET']
          }
        }
      );

      const resultPromise = resilientOp();

      // Fast forward through retry delays
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value).toBe('success');
      }
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should apply circuit breaker when configured', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Service unavailable'));

      const resilientOp = ResilienceFactory.createResilientOperation(
        'test-circuit',
        operation,
        {
          circuitBreaker: {
            failureThreshold: 1,
            minimumThroughput: 1,
            failureRateThreshold: 0.5
          }
        }
      );

      // First call should fail and open circuit
      const result1 = await resilientOp();
      expect(Result.isError(result1)).toBe(true);

      // Second call should be rejected by circuit breaker
      const result2 = await resilientOp();
      expect(Result.isError(result2)).toBe(true);
      if (Result.isError(result2)) {
        expect(result2.error.message).toContain('Circuit breaker is OPEN');
      }
    });

    it('should apply timeout when configured', async () => {
      const operation = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 5000))
      );

      const resilientOp = ResilienceFactory.createResilientOperation(
        'test-operation',
        operation,
        { timeout: 1000 }
      );

      const resultPromise = resilientOp();

      // Fast forward past timeout
      vi.advanceTimersByTime(1500);

      const result = await resultPromise;

      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.error.message).toContain('timed out');
      }
    });
  });

  describe('predefined middleware stacks', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let nextFn: vi.Mock;

    beforeEach(() => {
      mockReq = createMockRequest();
      mockRes = createMockResponse();
      nextFn = vi.fn();
    });

    it('should create standard middleware stack', () => {
      const middlewares = ResilienceFactory.createStandardMiddleware();

      expect(middlewares).toHaveLength(3);
      expect(typeof middlewares[0]).toBe('function');
      expect(typeof middlewares[1]).toBe('function');
      expect(typeof middlewares[2]).toBe('function');
    });

    it('should create AI middleware stack', () => {
      const middlewares = ResilienceFactory.createAIMiddleware();

      expect(middlewares).toHaveLength(3);
      // Test that AI rate limiting is applied
      middlewares.forEach(middleware => {
        middleware(mockReq as Request, mockRes as Response, nextFn);
      });

      expect(nextFn).toHaveBeenCalledTimes(3);
    });

    it('should create auth middleware stack', () => {
      const middlewares = ResilienceFactory.createAuthMiddleware();

      expect(middlewares).toHaveLength(2);
    });

    it('should create sensitive middleware stack', () => {
      const middlewares = ResilienceFactory.createSensitiveMiddleware();

      expect(middlewares).toHaveLength(3);
    });
  });

  describe('specialized resilient operations', () => {
    it('should create resilient database operation', async () => {
      const dbOperation = vi.fn().mockResolvedValue('db result');

      const resilientDbOp = ResilienceFactory.createResilientDatabaseOperation(
        dbOperation,
        'test-db-op'
      );

      const result = await resilientDbOp();

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value).toBe('db result');
      }
    });

    it('should retry database connection errors', async () => {
      const dbOperation = vi.fn()
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockResolvedValue('db result');

      const resilientDbOp = ResilienceFactory.createResilientDatabaseOperation(
        dbOperation,
        'test-db-op'
      );

      const resultPromise = resilientDbOp();

      // Fast forward through retry delays
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(Result.isOk(result)).toBe(true);
      expect(dbOperation).toHaveBeenCalledTimes(2);
    });

    it('should create resilient external API call', async () => {
      const apiOperation = vi.fn().mockResolvedValue('api result');

      const resilientApiOp = ResilienceFactory.createResilientExternalApiCall(
        apiOperation,
        'test-api'
      );

      const result = await resilientApiOp();

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value).toBe('api result');
      }
    });

    it('should create resilient AI call with lower retry count', async () => {
      const aiOperation = vi.fn()
        .mockRejectedValueOnce(new Error('ETIMEDOUT'))
        .mockRejectedValueOnce(new Error('ETIMEDOUT'))
        .mockResolvedValue('ai result');

      const resilientAiOp = ResilienceFactory.createResilientAICall(
        aiOperation,
        'test-model'
      );

      const resultPromise = resilientAiOp();

      // Fast forward through retry delays
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      // AI operations should have lower retry count (2), so this should fail
      expect(Result.isError(result)).toBe(true);
      expect(aiOperation).toHaveBeenCalledTimes(2);
    });
  });

  describe('metrics and management', () => {
    it('should get all circuit breaker metrics', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Service error'));

      // Create some circuit breakers with different names
      const resilientOp1 = ResilienceFactory.createResilientOperation(
        'service-1',
        operation,
        { circuitBreaker: { failureThreshold: 1 } }
      );

      const resilientOp2 = ResilienceFactory.createResilientOperation(
        'service-2',
        operation,
        { circuitBreaker: { failureThreshold: 1 } }
      );

      // Execute operations to generate metrics
      await resilientOp1();
      await resilientOp2();

      const metrics = ResilienceFactory.getAllCircuitBreakerMetrics();

      expect(Object.keys(metrics)).toContain('service-1');
      expect(Object.keys(metrics)).toContain('service-2');
      expect(metrics['service-1'].failedRequests).toBeGreaterThan(0);
      expect(metrics['service-2'].failedRequests).toBeGreaterThan(0);
    });

    it('should reset all circuit breakers', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Service error'));

      const resilientOp = ResilienceFactory.createResilientOperation(
        'test-service',
        operation,
        { circuitBreaker: { failureThreshold: 1 } }
      );

      // Execute operation to generate failures
      await resilientOp();

      let metrics = ResilienceFactory.getAllCircuitBreakerMetrics();
      expect(metrics['test-service'].failedRequests).toBeGreaterThan(0);

      // Reset all circuit breakers
      ResilienceFactory.resetAllCircuitBreakers();

      metrics = ResilienceFactory.getAllCircuitBreakerMetrics();
      expect(metrics['test-service'].failedRequests).toBe(0);
    });
  });
});

describe('decorators', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('@resilient decorator', () => {
    it('should apply resilience patterns to methods', async () => {
      class TestService {
        @resilient({
          retry: { maxAttempts: 2, baseDelayMs: 100 },
          timeout: 5000
        })
        async testMethod() {
          return 'success';
        }
      }

      const service = new TestService();
      const result = await service.testMethod();

      expect(result).toBe('success');
    });

    it('should retry failed methods', async () => {
      let callCount = 0;

      class TestService {
        @resilient({
          retry: {
            maxAttempts: 3,
            baseDelayMs: 100,
            retryableErrors: ['ECONNRESET']
          }
        })
        async failingMethod() {
          callCount++;
          if (callCount === 1) {
            throw new Error('ECONNRESET');
          }
          return 'success';
        }
      }

      const service = new TestService();
      const resultPromise = service.failingMethod();

      // Fast forward through retry delays
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result).toBe('success');
      expect(callCount).toBe(2);
    });
  });

  describe('@databaseResilient decorator', () => {
    it('should apply database-specific resilience', async () => {
      let callCount = 0;

      class DatabaseService {
        @databaseResilient()
        async queryData() {
          callCount++;
          if (callCount === 1) {
            throw new Error('ECONNRESET');
          }
          return 'data';
        }
      }

      const service = new DatabaseService();
      const resultPromise = service.queryData();

      // Fast forward through retry delays
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result).toBe('data');
      expect(callCount).toBe(2);
    });
  });

  describe('@externalApiResilient decorator', () => {
    it('should apply external API resilience', async () => {
      let callCount = 0;

      class ApiService {
        @externalApiResilient('external-service')
        async fetchData() {
          callCount++;
          if (callCount === 1) {
            const error = new Error('Service Unavailable') as any;
            error.statusCode = 503;
            throw error;
          }
          return 'api data';
        }
      }

      const service = new ApiService();
      const resultPromise = service.fetchData();

      // Fast forward through retry delays
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result).toBe('api data');
      expect(callCount).toBe(2);
    });
  });

  describe('@aiResilient decorator', () => {
    it('should apply AI-specific resilience with lower retry count', async () => {
      let callCount = 0;

      class AiService {
        @aiResilient('gpt-4')
        async generateText() {
          callCount++;
          const error = new Error('Too Many Requests') as any;
          error.statusCode = 429;
          throw error;
        }
      }

      const service = new AiService();

      try {
        const resultPromise = service.generateText();
        await vi.runAllTimersAsync();
        await resultPromise;
      } catch (error) {
        // Should fail after 2 attempts (AI-specific lower retry count)
        expect(callCount).toBe(2);
        expect(error.message).toBe('Too Many Requests');
      }
    });
  });
});

describe('error handling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should handle non-Error objects thrown by operations', async () => {
    const operation = vi.fn().mockRejectedValue('string error');

    const resilientOp = ResilienceFactory.createResilientOperation(
      'test-operation',
      operation
    );

    const result = await resilientOp();

    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error.message).toBe('string error');
    }
  });

  it('should handle null/undefined errors', async () => {
    const operation = vi.fn().mockRejectedValue(null);

    const resilientOp = ResilienceFactory.createResilientOperation(
      'test-operation',
      operation
    );

    const result = await resilientOp();

    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.error).toBeInstanceOf(Error);
    }
  });
});