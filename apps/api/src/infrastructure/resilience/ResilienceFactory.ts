import { RetryHandler, RetryOptions } from './RetryHandler';
import { CircuitBreaker, CircuitBreakerManager, CircuitBreakerOptions } from './CircuitBreaker';
import { RateLimitMiddleware, RateLimitConfig } from './RateLimiter';
import { TimeoutHandler, TimeoutMiddleware } from './TimeoutHandler';
import { Result } from '@/shared/result';

export interface ResilienceConfig {
  retry?: Partial<RetryOptions>;
  circuitBreaker?: Partial<CircuitBreakerOptions>;
  rateLimit?: RateLimitConfig;
  timeout?: number;
}

export class ResilienceFactory {
  private static circuitBreakerManager = CircuitBreakerManager.getInstance();

  // Create a complete resilient operation wrapper
  static createResilientOperation<T>(
    operationName: string,
    operation: () => Promise<T>,
    config: ResilienceConfig = {}
  ): () => Promise<Result<T, Error>> {
    return async () => {
      try {
        // Apply timeout if configured
        const timeoutMs = config.timeout || 30000;
        const timedOperation = () => TimeoutHandler.withTimeout(operation, timeoutMs, operationName);

        // Apply circuit breaker if configured
        let circuitProtectedOperation = timedOperation;
        if (config.circuitBreaker) {
          const circuit = this.circuitBreakerManager.getCircuitBreaker(
            operationName,
            config.circuitBreaker
          );
          circuitProtectedOperation = async () => {
            const result = await circuit.execute(timedOperation);
            if (Result.isError(result)) {
              throw result.error;
            }
            return result.value;
          };
        }

        // Apply retry if configured
        if (config.retry) {
          const retryHandler = new RetryHandler(config.retry);
          return await retryHandler.execute(circuitProtectedOperation);
        } else {
          const result = await circuitProtectedOperation();
          return Result.ok(result);
        }
      } catch (error) {
        return Result.error(error instanceof Error ? error : new Error(String(error)));
      }
    };
  }

  // Create standard middleware stack for API endpoints
  static createStandardMiddleware() {
    return [
      TimeoutMiddleware.apiTimeout(),
      RateLimitMiddleware.ipRateLimit(),
      RateLimitMiddleware.userRateLimit(),
    ];
  }

  // Create middleware stack for AI endpoints
  static createAIMiddleware() {
    return [
      TimeoutMiddleware.aiTimeout(),
      RateLimitMiddleware.ipRateLimit(),
      RateLimitMiddleware.aiRateLimit(),
    ];
  }

  // Create middleware stack for authentication endpoints
  static createAuthMiddleware() {
    return [
      TimeoutMiddleware.quickTimeout(),
      RateLimitMiddleware.authRateLimit(),
    ];
  }

  // Create middleware stack for sensitive endpoints
  static createSensitiveMiddleware() {
    return [
      TimeoutMiddleware.apiTimeout(),
      RateLimitMiddleware.ipRateLimit(),
      RateLimitMiddleware.strictUserRateLimit(),
    ];
  }

  // Create database operation wrapper with resilience
  static createResilientDatabaseOperation<T>(
    operation: () => Promise<T>,
    operationName = 'database-operation'
  ): () => Promise<Result<T, Error>> {
    return this.createResilientOperation(operationName, operation, {
      retry: {
        maxAttempts: 3,
        baseDelayMs: 500,
        retryableErrors: [
          'ECONNRESET',
          'ENOTFOUND',
          'ECONNREFUSED',
          'ETIMEDOUT',
          'connection_timeout',
          'statement_timeout',
        ],
      },
      circuitBreaker: {
        failureThreshold: 5,
        recoveryTimeoutMs: 30000,
      },
      timeout: 10000, // 10 seconds for database operations
    });
  }

  // Create external API call wrapper with resilience
  static createResilientExternalApiCall<T>(
    operation: () => Promise<T>,
    apiName = 'external-api'
  ): () => Promise<Result<T, Error>> {
    return this.createResilientOperation(`external-api-${apiName}`, operation, {
      retry: {
        maxAttempts: 3,
        baseDelayMs: 1000,
        retryableErrors: [
          'ECONNRESET',
          'ENOTFOUND',
          'ECONNREFUSED',
          'ETIMEDOUT',
          'EHOSTUNREACH',
          'ENETUNREACH',
          408, 429, 502, 503, 504,
        ],
      },
      circuitBreaker: {
        failureThreshold: 3,
        recoveryTimeoutMs: 60000,
        failureRateThreshold: 0.5,
      },
      timeout: 30000, // 30 seconds for external APIs
    });
  }

  // Create AI service call wrapper with resilience
  static createResilientAICall<T>(
    operation: () => Promise<T>,
    modelName = 'ai-model'
  ): () => Promise<Result<T, Error>> {
    return this.createResilientOperation(`ai-${modelName}`, operation, {
      retry: {
        maxAttempts: 2, // Lower retry count for AI calls due to cost
        baseDelayMs: 2000,
        retryableErrors: [
          'ECONNRESET',
          'ETIMEDOUT',
          429, 502, 503, 504,
        ],
      },
      circuitBreaker: {
        failureThreshold: 3,
        recoveryTimeoutMs: 120000, // 2 minutes for AI services
        failureRateThreshold: 0.3, // Lower threshold for AI services
      },
      timeout: 60000, // 1 minute for AI operations
    });
  }

  // Get all circuit breaker metrics
  static getAllCircuitBreakerMetrics() {
    return this.circuitBreakerManager.getAllMetrics();
  }

  // Reset all circuit breakers (useful for testing or recovery)
  static resetAllCircuitBreakers() {
    this.circuitBreakerManager.resetAll();
  }
}

// Decorator that applies standard resilience patterns
export function resilient(config: ResilienceConfig = {}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const operationName = `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      const operation = () => originalMethod.apply(this, args);
      const resilientOperation = ResilienceFactory.createResilientOperation(
        operationName,
        operation,
        config
      );

      const result = await resilientOperation();

      if (Result.isError(result)) {
        throw result.error;
      }

      return result.value;
    };

    return descriptor;
  };
}

// Specific decorators for common patterns
export const databaseResilient = () => resilient({
  retry: {
    maxAttempts: 3,
    baseDelayMs: 500,
    retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'connection_timeout'],
  },
  circuitBreaker: {
    failureThreshold: 5,
    recoveryTimeoutMs: 30000,
  },
  timeout: 10000,
});

export const externalApiResilient = (apiName = 'external-api') => resilient({
  retry: {
    maxAttempts: 3,
    baseDelayMs: 1000,
    retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 408, 429, 502, 503, 504],
  },
  circuitBreaker: {
    failureThreshold: 3,
    recoveryTimeoutMs: 60000,
  },
  timeout: 30000,
});

export const aiResilient = (modelName = 'ai-model') => resilient({
  retry: {
    maxAttempts: 2,
    baseDelayMs: 2000,
    retryableErrors: ['ETIMEDOUT', 429, 502, 503, 504],
  },
  circuitBreaker: {
    failureThreshold: 3,
    recoveryTimeoutMs: 120000,
    failureRateThreshold: 0.3,
  },
  timeout: 60000,
});