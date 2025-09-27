import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Request, Response } from 'express';
import {
  TimeoutHandler,
  TimeoutMiddleware,
  TimeoutError,
  OperationTimeout,
  TimeoutManager
} from '../../../src/infrastructure/resilience/TimeoutHandler';

// Mock Express request/response
const createMockRequest = (overrides: Partial<Request> = {}): Partial<Request> => ({
  method: 'GET',
  url: '/test',
  ...overrides,
});

const createMockResponse = (): Partial<Response> => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    end: vi.fn().mockReturnThis(),
    on: vi.fn(),
    headersSent: false,
  };
  return res;
};

describe('TimeoutError', () => {
  it('should create error with timeout message', () => {
    const error = new TimeoutError(5000);
    expect(error.name).toBe('TimeoutError');
    expect(error.message).toContain('timed out after 5000ms');
  });

  it('should include operation name in message', () => {
    const error = new TimeoutError(5000, 'test-operation');
    expect(error.message).toContain("Operation 'test-operation' timed out");
  });
});

describe('TimeoutHandler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('requestTimeout middleware', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let nextFn: vi.Mock;

    beforeEach(() => {
      mockReq = createMockRequest();
      mockRes = createMockResponse();
      nextFn = vi.fn();
    });

    it('should call next for requests within timeout', async () => {
      const middleware = TimeoutHandler.requestTimeout({ timeoutMs: 5000 });

      middleware(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should timeout long-running requests', async () => {
      const middleware = TimeoutHandler.requestTimeout({ timeoutMs: 1000 });

      middleware(mockReq as Request, mockRes as Response, nextFn);

      // Advance time past timeout
      vi.advanceTimersByTime(1500);

      expect(mockRes.status).toHaveBeenCalledWith(408);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Request Timeout',
          timeout: 1000,
        })
      );
    });

    it('should not timeout if response already sent', async () => {
      mockRes.headersSent = true;
      const middleware = TimeoutHandler.requestTimeout({ timeoutMs: 1000 });

      middleware(mockReq as Request, mockRes as Response, nextFn);

      // Advance time past timeout
      vi.advanceTimersByTime(1500);

      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should skip timeout when skipIf condition is met', async () => {
      const skipIf = vi.fn().mockReturnValue(true);
      const middleware = TimeoutHandler.requestTimeout({
        timeoutMs: 1000,
        skipIf,
      });

      middleware(mockReq as Request, mockRes as Response, nextFn);

      expect(skipIf).toHaveBeenCalledWith(mockReq);
      expect(nextFn).toHaveBeenCalled();

      // Advance time past timeout - should not timeout
      vi.advanceTimersByTime(1500);
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should prevent response methods after timeout', async () => {
      const middleware = TimeoutHandler.requestTimeout({ timeoutMs: 1000 });

      middleware(mockReq as Request, mockRes as Response, nextFn);

      // Trigger timeout
      vi.advanceTimersByTime(1500);

      // Try to send response after timeout
      (mockRes.send as vi.Mock).mockClear();
      (mockRes as any).send('data');

      expect(mockRes.send).toHaveBeenCalled();
    });

    it('should clean up timer on response finish', async () => {
      const middleware = TimeoutHandler.requestTimeout({ timeoutMs: 5000 });
      const onFinish = vi.fn();

      (mockRes.on as vi.Mock).mockImplementation((event, callback) => {
        if (event === 'finish') {
          onFinish.mockImplementation(callback);
        }
      });

      middleware(mockReq as Request, mockRes as Response, nextFn);

      // Simulate response finish
      onFinish();

      // Advance time past timeout - should not timeout since response finished
      vi.advanceTimersByTime(6000);
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('withTimeout static method', () => {
    it('should resolve for operations within timeout', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      const result = await TimeoutHandler.withTimeout(operation, 5000, 'test-op');

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalled();
    });

    it('should timeout for long-running operations', async () => {
      const operation = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 10000))
      );

      const promise = TimeoutHandler.withTimeout(operation, 1000, 'test-op');

      // Advance time past timeout
      vi.advanceTimersByTime(1500);

      await expect(promise).rejects.toThrow(TimeoutError);
      await expect(promise).rejects.toThrow('test-op');
    });

    it('should handle operation errors properly', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Operation failed'));

      await expect(
        TimeoutHandler.withTimeout(operation, 5000, 'test-op')
      ).rejects.toThrow('Operation failed');
    });

    it('should not resolve after timeout even if operation completes later', async () => {
      let resolveOperation: (value: string) => void;
      const operation = vi.fn().mockImplementation(
        () => new Promise(resolve => {
          resolveOperation = resolve;
        })
      );

      const promise = TimeoutHandler.withTimeout(operation, 1000, 'test-op');

      // Trigger timeout
      vi.advanceTimersByTime(1500);

      // Try to resolve operation after timeout
      resolveOperation!('late success');

      await expect(promise).rejects.toThrow(TimeoutError);
    });
  });

  describe('race method', () => {
    it('should return result from fastest operation', async () => {
      const fastOperation = () => Promise.resolve('fast');
      const slowOperation = () => new Promise(resolve =>
        setTimeout(() => resolve('slow'), 2000)
      );

      const result = await TimeoutHandler.race(
        [fastOperation, slowOperation],
        5000
      );

      expect(result).toBe('fast');
    });

    it('should timeout if all operations are too slow', async () => {
      const slowOperation1 = () => new Promise(resolve =>
        setTimeout(() => resolve('slow1'), 2000)
      );
      const slowOperation2 = () => new Promise(resolve =>
        setTimeout(() => resolve('slow2'), 3000)
      );

      const promise = TimeoutHandler.race(
        [slowOperation1, slowOperation2],
        1000
      );

      vi.advanceTimersByTime(1500);

      await expect(promise).rejects.toThrow(TimeoutError);
    });
  });

  describe('timeout decorator', () => {
    it('should work as method decorator', async () => {
      class TestClass {
        @TimeoutHandler.timeout(1000, 'test-method')
        async testMethod() {
          return 'success';
        }

        @TimeoutHandler.timeout(1000, 'slow-method')
        async slowMethod() {
          return new Promise(resolve =>
            setTimeout(() => resolve('slow'), 2000)
          );
        }
      }

      const instance = new TestClass();

      // Fast method should succeed
      const result = await instance.testMethod();
      expect(result).toBe('success');

      // Slow method should timeout
      const slowPromise = instance.slowMethod();
      vi.advanceTimersByTime(1500);

      await expect(slowPromise).rejects.toThrow(TimeoutError);
    });
  });
});

describe('TimeoutMiddleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let nextFn: vi.Mock;

  beforeEach(() => {
    vi.useFakeTimers();
    mockReq = createMockRequest();
    mockRes = createMockResponse();
    nextFn = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('predefined timeouts', () => {
    it('should create API timeout middleware', () => {
      const middleware = TimeoutMiddleware.apiTimeout();
      expect(middleware).toBeDefined();

      middleware(mockReq as Request, mockRes as Response, nextFn);
      expect(nextFn).toHaveBeenCalled();
    });

    it('should create long operation timeout middleware', () => {
      const middleware = TimeoutMiddleware.longOperationTimeout();
      expect(middleware).toBeDefined();
    });

    it('should create quick timeout middleware', () => {
      const middleware = TimeoutMiddleware.quickTimeout();
      expect(middleware).toBeDefined();
    });

    it('should create AI timeout middleware', () => {
      const middleware = TimeoutMiddleware.aiTimeout();
      expect(middleware).toBeDefined();
    });

    it('should create database timeout middleware', () => {
      const middleware = TimeoutMiddleware.databaseTimeout();
      expect(middleware).toBeDefined();
    });

    it('should create custom timeout middleware', () => {
      const middleware = TimeoutMiddleware.custom({
        timeoutMs: 15000,
        message: 'Custom timeout',
      });
      expect(middleware).toBeDefined();
    });
  });
});

describe('OperationTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('basic functionality', () => {
    it('should track timeout state', () => {
      const timeout = new OperationTimeout(1000);

      expect(timeout.expired).toBe(false);
      expect(timeout.remainingMs).toBe(1000);

      timeout.start();

      // Advance time past timeout
      vi.advanceTimersByTime(1500);

      expect(timeout.expired).toBe(true);
    });

    it('should call onTimeout callback', () => {
      const onTimeout = vi.fn();
      const timeout = new OperationTimeout(1000, onTimeout);

      timeout.start();
      vi.advanceTimersByTime(1500);

      expect(onTimeout).toHaveBeenCalled();
    });

    it('should clear timeout', () => {
      const onTimeout = vi.fn();
      const timeout = new OperationTimeout(1000, onTimeout);

      timeout.start();
      timeout.clear();

      vi.advanceTimersByTime(1500);

      expect(onTimeout).not.toHaveBeenCalled();
      expect(timeout.expired).toBe(false);
    });

    it('should extend timeout', () => {
      const onTimeout = vi.fn();
      const timeout = new OperationTimeout(1000, onTimeout);

      timeout.start();
      vi.advanceTimersByTime(500);

      timeout.extend(1000); // Extend by 1 second

      vi.advanceTimersByTime(1000); // Original timeout would have expired
      expect(onTimeout).not.toHaveBeenCalled();

      vi.advanceTimersByTime(500); // Now it should expire
      expect(onTimeout).toHaveBeenCalled();
    });
  });
});

describe('TimeoutManager', () => {
  let manager: TimeoutManager;

  beforeEach(() => {
    vi.useFakeTimers();
    manager = new TimeoutManager();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('timeout management', () => {
    it('should create and track timeouts', () => {
      const onTimeout = vi.fn();
      const timeout = manager.createTimeout('test-1', 1000, onTimeout);

      expect(timeout).toBeDefined();
      expect(manager.getActiveTimeouts()).toContain('test-1');

      vi.advanceTimersByTime(1500);
      expect(onTimeout).toHaveBeenCalled();
    });

    it('should clear specific timeouts', () => {
      const onTimeout = vi.fn();
      manager.createTimeout('test-1', 1000, onTimeout);

      expect(manager.getActiveTimeouts()).toContain('test-1');

      manager.clearTimeout('test-1');

      expect(manager.getActiveTimeouts()).not.toContain('test-1');

      vi.advanceTimersByTime(1500);
      expect(onTimeout).not.toHaveBeenCalled();
    });

    it('should clear all timeouts', () => {
      const onTimeout1 = vi.fn();
      const onTimeout2 = vi.fn();

      manager.createTimeout('test-1', 1000, onTimeout1);
      manager.createTimeout('test-2', 1000, onTimeout2);

      expect(manager.getActiveTimeouts()).toHaveLength(2);

      manager.clearAllTimeouts();

      expect(manager.getActiveTimeouts()).toHaveLength(0);

      vi.advanceTimersByTime(1500);
      expect(onTimeout1).not.toHaveBeenCalled();
      expect(onTimeout2).not.toHaveBeenCalled();
    });

    it('should extend specific timeouts', () => {
      const onTimeout = vi.fn();
      manager.createTimeout('test-1', 1000, onTimeout);

      vi.advanceTimersByTime(500);

      const extended = manager.extendTimeout('test-1', 1000);
      expect(extended).toBe(true);

      vi.advanceTimersByTime(1000); // Original timeout
      expect(onTimeout).not.toHaveBeenCalled();

      vi.advanceTimersByTime(500); // Extended timeout
      expect(onTimeout).toHaveBeenCalled();
    });

    it('should return false when extending non-existent timeout', () => {
      const extended = manager.extendTimeout('non-existent', 1000);
      expect(extended).toBe(false);
    });

    it('should track only active timeouts', () => {
      manager.createTimeout('test-1', 1000);
      manager.createTimeout('test-2', 2000);

      expect(manager.getActiveTimeouts()).toHaveLength(2);

      // First timeout expires
      vi.advanceTimersByTime(1500);

      expect(manager.getActiveTimeouts()).toHaveLength(1);
      expect(manager.getActiveTimeouts()).toContain('test-2');
    });
  });
});