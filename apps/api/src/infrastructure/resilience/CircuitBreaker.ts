import { Result } from '@/shared/result';
import { StructuredLogger } from '../observability/StructuredLogger';

const logger = StructuredLogger.getInstance();

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerOptions {
  failureThreshold: number;
  recoveryTimeoutMs: number;
  requestTimeoutMs: number;
  monitoringPeriodMs: number;
  minimumThroughput: number;
  failureRateThreshold: number;
}

export interface CircuitBreakerMetrics {
  totalRequests: number;
  failedRequests: number;
  successfulRequests: number;
  rejectedRequests: number;
  lastFailureTime?: number;
  lastSuccessTime?: number;
  state: CircuitState;
  failureRate: number;
}

export class CircuitBreakerError extends Error {
  constructor(
    message: string,
    public readonly state: CircuitState,
    public readonly lastFailureTime?: number
  ) {
    super(message);
    this.name = 'CircuitBreakerError';
  }
}

export class CircuitBreaker {
  private static readonly DEFAULT_OPTIONS: CircuitBreakerOptions = {
    failureThreshold: 5,
    recoveryTimeoutMs: 60000, // 1 minute
    requestTimeoutMs: 30000, // 30 seconds
    monitoringPeriodMs: 60000, // 1 minute
    minimumThroughput: 10,
    failureRateThreshold: 0.5, // 50%
  };

  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private rejectedCount: number = 0;
  private lastFailureTime?: number;
  private lastSuccessTime?: number;
  private lastStateChangeTime: number = Date.now();
  private halfOpenSuccessCount: number = 0;

  // Rolling window for monitoring
  private requestHistory: Array<{ timestamp: number; success: boolean }> = [];

  constructor(
    private name: string,
    private options: Partial<CircuitBreakerOptions> = {}
  ) {
    this.options = { ...CircuitBreaker.DEFAULT_OPTIONS, ...options };
  }

  async execute<T>(operation: () => Promise<T>): Promise<Result<T, Error>> {
    // Clean old entries from request history
    this.cleanRequestHistory();

    // Check if circuit should reject request
    if (this.shouldRejectRequest()) {
      this.rejectedCount++;
      const error = new CircuitBreakerError(
        `Circuit breaker is ${this.state} for ${this.name}`,
        this.state,
        this.lastFailureTime
      );

      logger.warn('Circuit breaker rejected request', {
        circuitName: this.name,
        state: this.state,
        failureCount: this.failureCount,
        lastFailureTime: this.lastFailureTime
      });

      return Result.error(error);
    }

    try {
      // Execute operation with timeout
      const result = await this.executeWithTimeout(operation);

      // Record success
      this.onSuccess();

      return Result.ok(result);
    } catch (error) {
      // Record failure
      this.onFailure();

      const err = error instanceof Error ? error : new Error(String(error));
      return Result.error(err);
    }
  }

  private async executeWithTimeout<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Operation timed out after ${this.options.requestTimeoutMs}ms`));
      }, this.options.requestTimeoutMs);

      operation()
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  private shouldRejectRequest(): boolean {
    const now = Date.now();

    switch (this.state) {
      case CircuitState.CLOSED:
        return false;

      case CircuitState.OPEN:
        // Check if we should transition to half-open
        if (now - this.lastStateChangeTime >= this.options.recoveryTimeoutMs!) {
          this.transitionToHalfOpen();
          return false;
        }
        return true;

      case CircuitState.HALF_OPEN:
        return false;

      default:
        return false;
    }
  }

  private onSuccess(): void {
    this.successCount++;
    this.lastSuccessTime = Date.now();
    this.recordRequest(true);

    if (this.state === CircuitState.HALF_OPEN) {
      this.halfOpenSuccessCount++;

      // If enough successes in half-open, close the circuit
      if (this.halfOpenSuccessCount >= this.options.failureThreshold!) {
        this.transitionToClosed();
      }
    }

    logger.debug('Circuit breaker recorded success', {
      circuitName: this.name,
      state: this.state,
      successCount: this.successCount
    });
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    this.recordRequest(false);

    // If in half-open state, any failure should open the circuit
    if (this.state === CircuitState.HALF_OPEN) {
      this.transitionToOpen();
      return;
    }

    // Check if we should open the circuit
    if (this.state === CircuitState.CLOSED && this.shouldOpenCircuit()) {
      this.transitionToOpen();
    }

    logger.debug('Circuit breaker recorded failure', {
      circuitName: this.name,
      state: this.state,
      failureCount: this.failureCount
    });
  }

  private shouldOpenCircuit(): boolean {
    const totalRequests = this.requestHistory.length;

    // Not enough throughput to make a decision
    if (totalRequests < this.options.minimumThroughput!) {
      return false;
    }

    const failedRequests = this.requestHistory.filter(req => !req.success).length;
    const failureRate = failedRequests / totalRequests;

    return failureRate >= this.options.failureRateThreshold!;
  }

  private transitionToClosed(): void {
    this.state = CircuitState.CLOSED;
    this.lastStateChangeTime = Date.now();
    this.failureCount = 0;
    this.halfOpenSuccessCount = 0;

    logger.info('Circuit breaker transitioned to CLOSED', {
      circuitName: this.name
    });
  }

  private transitionToOpen(): void {
    this.state = CircuitState.OPEN;
    this.lastStateChangeTime = Date.now();

    logger.warn('Circuit breaker transitioned to OPEN', {
      circuitName: this.name,
      failureCount: this.failureCount,
      failureRate: this.getFailureRate()
    });
  }

  private transitionToHalfOpen(): void {
    this.state = CircuitState.HALF_OPEN;
    this.lastStateChangeTime = Date.now();
    this.halfOpenSuccessCount = 0;

    logger.info('Circuit breaker transitioned to HALF_OPEN', {
      circuitName: this.name
    });
  }

  private recordRequest(success: boolean): void {
    this.requestHistory.push({
      timestamp: Date.now(),
      success
    });
  }

  private cleanRequestHistory(): void {
    const cutoff = Date.now() - this.options.monitoringPeriodMs!;
    this.requestHistory = this.requestHistory.filter(
      req => req.timestamp > cutoff
    );
  }

  private getFailureRate(): number {
    const totalRequests = this.requestHistory.length;
    if (totalRequests === 0) return 0;

    const failedRequests = this.requestHistory.filter(req => !req.success).length;
    return failedRequests / totalRequests;
  }

  getMetrics(): CircuitBreakerMetrics {
    return {
      totalRequests: this.successCount + this.failureCount,
      failedRequests: this.failureCount,
      successfulRequests: this.successCount,
      rejectedRequests: this.rejectedCount,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      state: this.state,
      failureRate: this.getFailureRate(),
    };
  }

  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.rejectedCount = 0;
    this.halfOpenSuccessCount = 0;
    this.lastFailureTime = undefined;
    this.lastSuccessTime = undefined;
    this.lastStateChangeTime = Date.now();
    this.requestHistory = [];

    logger.info('Circuit breaker reset', {
      circuitName: this.name
    });
  }
}

// Circuit breaker manager for managing multiple circuits
export class CircuitBreakerManager {
  private static instance: CircuitBreakerManager;
  private circuits: Map<string, CircuitBreaker> = new Map();

  static getInstance(): CircuitBreakerManager {
    if (!CircuitBreakerManager.instance) {
      CircuitBreakerManager.instance = new CircuitBreakerManager();
    }
    return CircuitBreakerManager.instance;
  }

  getCircuitBreaker(
    name: string,
    options?: Partial<CircuitBreakerOptions>
  ): CircuitBreaker {
    if (!this.circuits.has(name)) {
      this.circuits.set(name, new CircuitBreaker(name, options));
    }
    return this.circuits.get(name)!;
  }

  getAllMetrics(): Record<string, CircuitBreakerMetrics> {
    const metrics: Record<string, CircuitBreakerMetrics> = {};

    for (const [name, circuit] of this.circuits) {
      metrics[name] = circuit.getMetrics();
    }

    return metrics;
  }

  resetAll(): void {
    for (const circuit of this.circuits.values()) {
      circuit.reset();
    }
  }
}

// Decorator for circuit breaker functionality
export function circuitBreaker(
  name: string,
  options?: Partial<CircuitBreakerOptions>
) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const manager = CircuitBreakerManager.getInstance();
      const circuit = manager.getCircuitBreaker(name, options);

      const operation = () => originalMethod.apply(this, args);
      const result = await circuit.execute(operation);

      if (Result.isError(result)) {
        throw result.error;
      }

      return result.value;
    };

    return descriptor;
  };
}