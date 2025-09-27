import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  CircuitBreaker,
  CircuitBreakerManager,
  CircuitState,
  CircuitBreakerError,
  CircuitBreakerOptions
} from '../../../src/infrastructure/resilience/CircuitBreaker';
import { Result } from '../../../src/shared/result';

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      circuitBreaker = new CircuitBreaker('test-circuit');
      expect(circuitBreaker).toBeDefined();
    });

    it('should accept custom options', () => {
      const options: Partial<CircuitBreakerOptions> = {
        failureThreshold: 3,
        recoveryTimeoutMs: 30000,
      };
      circuitBreaker = new CircuitBreaker('test-circuit', options);
      expect(circuitBreaker).toBeDefined();
    });
  });

  describe('CLOSED state behavior', () => {
    beforeEach(() => {
      circuitBreaker = new CircuitBreaker('test-circuit', {
        failureThreshold: 2,
        minimumThroughput: 2,
        failureRateThreshold: 0.5,
      });
    });

    it('should allow requests when circuit is closed', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      const result = await circuitBreaker.execute(operation);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value).toBe('success');
      }
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should transition to OPEN after failure threshold', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Service unavailable'));

      // Generate enough requests with failures to trigger circuit opening
      await circuitBreaker.execute(operation);
      await circuitBreaker.execute(operation);

      const metrics = circuitBreaker.getMetrics();
      expect(metrics.state).toBe(CircuitState.OPEN);
    });

    it('should not open circuit without minimum throughput', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Service unavailable'));

      // Only one failure, below minimum throughput
      await circuitBreaker.execute(operation);

      const metrics = circuitBreaker.getMetrics();
      expect(metrics.state).toBe(CircuitState.CLOSED);
    });
  });

  describe('OPEN state behavior', () => {
    beforeEach(() => {
      circuitBreaker = new CircuitBreaker('test-circuit', {
        failureThreshold: 1,
        minimumThroughput: 1,
        failureRateThreshold: 0.5,
        recoveryTimeoutMs: 5000,
      });
    });

    it('should reject requests when circuit is open', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Service unavailable'));

      // Trigger circuit opening
      await circuitBreaker.execute(operation);

      // Next request should be rejected
      const operation2 = vi.fn().mockResolvedValue('success');
      const result = await circuitBreaker.execute(operation2);

      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.error).toBeInstanceOf(CircuitBreakerError);
        expect(result.error.message).toContain('Circuit breaker is OPEN');
      }
      expect(operation2).not.toHaveBeenCalled();
    });

    it('should transition to HALF_OPEN after recovery timeout', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Service unavailable'));

      // Trigger circuit opening
      await circuitBreaker.execute(operation);

      // Advance time past recovery timeout
      vi.advanceTimersByTime(6000);

      // Next request should be allowed (HALF_OPEN)
      const operation2 = vi.fn().mockResolvedValue('success');
      const result = await circuitBreaker.execute(operation2);

      expect(Result.isOk(result)).toBe(true);
      expect(operation2).toHaveBeenCalledTimes(1);
    });
  });

  describe('HALF_OPEN state behavior', () => {
    beforeEach(() => {
      circuitBreaker = new CircuitBreaker('test-circuit', {
        failureThreshold: 2,
        minimumThroughput: 1,
        failureRateThreshold: 0.5,
        recoveryTimeoutMs: 1000,
      });
    });

    it('should transition to CLOSED after successful requests', async () => {
      // Force circuit to OPEN
      const failingOperation = vi.fn().mockRejectedValue(new Error('Service unavailable'));
      await circuitBreaker.execute(failingOperation);

      // Advance time to enter HALF_OPEN
      vi.advanceTimersByTime(2000);

      // Successful requests should close the circuit
      const successOperation = vi.fn().mockResolvedValue('success');
      await circuitBreaker.execute(successOperation);
      await circuitBreaker.execute(successOperation);

      const metrics = circuitBreaker.getMetrics();
      expect(metrics.state).toBe(CircuitState.CLOSED);
    });

    it('should transition back to OPEN on any failure', async () => {
      // Force circuit to OPEN
      const failingOperation = vi.fn().mockRejectedValue(new Error('Service unavailable'));
      await circuitBreaker.execute(failingOperation);

      // Advance time to enter HALF_OPEN
      vi.advanceTimersByTime(2000);

      // One failure should open the circuit again
      const result = await circuitBreaker.execute(failingOperation);

      expect(Result.isError(result)).toBe(true);
      const metrics = circuitBreaker.getMetrics();
      expect(metrics.state).toBe(CircuitState.OPEN);
    });
  });

  describe('timeout handling', () => {
    beforeEach(() => {
      circuitBreaker = new CircuitBreaker('test-circuit', {
        requestTimeoutMs: 1000,
      });
    });

    it('should timeout long-running operations', async () => {
      const operation = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 2000))
      );

      const executePromise = circuitBreaker.execute(operation);

      // Advance time to trigger timeout
      vi.advanceTimersByTime(1500);

      const result = await executePromise;

      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.error.message).toContain('timed out');
      }
    });
  });

  describe('metrics', () => {
    beforeEach(() => {
      circuitBreaker = new CircuitBreaker('test-circuit');
    });

    it('should track successful requests', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      await circuitBreaker.execute(operation);
      await circuitBreaker.execute(operation);

      const metrics = circuitBreaker.getMetrics();
      expect(metrics.successfulRequests).toBe(2);
      expect(metrics.totalRequests).toBe(2);
      expect(metrics.failureRate).toBe(0);
    });

    it('should track failed requests', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Service error'));

      await circuitBreaker.execute(operation);
      await circuitBreaker.execute(operation);

      const metrics = circuitBreaker.getMetrics();
      expect(metrics.failedRequests).toBe(2);
      expect(metrics.totalRequests).toBe(2);
      expect(metrics.failureRate).toBe(1);
    });

    it('should track rejected requests when circuit is open', async () => {
      const circuitBreaker = new CircuitBreaker('test-circuit', {
        failureThreshold: 1,
        minimumThroughput: 1,
      });

      // Trigger circuit opening
      const failingOperation = vi.fn().mockRejectedValue(new Error('Service error'));
      await circuitBreaker.execute(failingOperation);

      // Rejected request
      const operation = vi.fn().mockResolvedValue('success');
      await circuitBreaker.execute(operation);

      const metrics = circuitBreaker.getMetrics();
      expect(metrics.rejectedRequests).toBe(1);
    });
  });

  describe('reset functionality', () => {
    beforeEach(() => {
      circuitBreaker = new CircuitBreaker('test-circuit');
    });

    it('should reset all metrics and state', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Service error'));

      await circuitBreaker.execute(operation);
      circuitBreaker.reset();

      const metrics = circuitBreaker.getMetrics();
      expect(metrics.state).toBe(CircuitState.CLOSED);
      expect(metrics.totalRequests).toBe(0);
      expect(metrics.failedRequests).toBe(0);
      expect(metrics.successfulRequests).toBe(0);
      expect(metrics.rejectedRequests).toBe(0);
    });
  });
});

describe('CircuitBreakerManager', () => {
  let manager: CircuitBreakerManager;

  beforeEach(() => {
    manager = CircuitBreakerManager.getInstance();
  });

  describe('singleton behavior', () => {
    it('should return the same instance', () => {
      const manager2 = CircuitBreakerManager.getInstance();
      expect(manager).toBe(manager2);
    });
  });

  describe('circuit management', () => {
    it('should create and return circuit breakers', () => {
      const circuit1 = manager.getCircuitBreaker('test-1');
      const circuit2 = manager.getCircuitBreaker('test-2');
      const circuit1Again = manager.getCircuitBreaker('test-1');

      expect(circuit1).toBeDefined();
      expect(circuit2).toBeDefined();
      expect(circuit1).toBe(circuit1Again);
      expect(circuit1).not.toBe(circuit2);
    });

    it('should accept custom options for circuits', () => {
      const options = { failureThreshold: 10 };
      const circuit = manager.getCircuitBreaker('test-custom', options);

      expect(circuit).toBeDefined();
    });
  });

  describe('metrics aggregation', () => {
    beforeEach(() => {
      // Clear any existing circuits from previous tests
      manager.resetAll();
    });

    it('should return metrics for all circuits', async () => {
      const circuit1 = manager.getCircuitBreaker('test-1');
      const circuit2 = manager.getCircuitBreaker('test-2');

      // Execute some operations
      await circuit1.execute(() => Promise.resolve('success'));
      await circuit2.execute(() => Promise.reject(new Error('failure')));

      const allMetrics = manager.getAllMetrics();

      expect(Object.keys(allMetrics)).toHaveLength(2);
      expect(allMetrics['test-1']).toBeDefined();
      expect(allMetrics['test-2']).toBeDefined();
      expect(allMetrics['test-1'].successfulRequests).toBe(1);
      expect(allMetrics['test-2'].failedRequests).toBe(1);
    });
  });

  describe('reset functionality', () => {
    it('should reset all circuits', async () => {
      const circuit1 = manager.getCircuitBreaker('test-1');
      const circuit2 = manager.getCircuitBreaker('test-2');

      // Execute some operations
      await circuit1.execute(() => Promise.resolve('success'));
      await circuit2.execute(() => Promise.reject(new Error('failure')));

      manager.resetAll();

      const allMetrics = manager.getAllMetrics();
      expect(allMetrics['test-1'].totalRequests).toBe(0);
      expect(allMetrics['test-2'].totalRequests).toBe(0);
    });
  });
});

describe('CircuitBreakerError', () => {
  it('should contain circuit state and failure time', () => {
    const error = new CircuitBreakerError(
      'Circuit is open',
      CircuitState.OPEN,
      Date.now()
    );

    expect(error.name).toBe('CircuitBreakerError');
    expect(error.state).toBe(CircuitState.OPEN);
    expect(error.lastFailureTime).toBeDefined();
  });
});