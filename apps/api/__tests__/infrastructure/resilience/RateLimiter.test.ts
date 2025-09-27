import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Request, Response } from 'express';
import {
  RateLimiter,
  RateLimitMiddleware,
  MemoryRateLimitStore,
  RateLimitConfig,
  RateLimitInfo
} from '../../../src/infrastructure/resilience/RateLimiter';

// Mock Express request/response
const createMockRequest = (overrides: Partial<Request> = {}): Partial<Request> => ({
  ip: '127.0.0.1',
  get: vi.fn(),
  ...overrides,
});

const createMockResponse = (): Partial<Response> => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    on: vi.fn(),
  };
  return res;
};

describe('MemoryRateLimitStore', () => {
  let store: MemoryRateLimitStore;

  beforeEach(() => {
    store = new MemoryRateLimitStore();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('get and set operations', () => {
    it('should store and retrieve rate limit info', async () => {
      const info: RateLimitInfo = {
        limit: 100,
        remaining: 99,
        resetTime: Date.now() + 60000,
        used: 1,
      };

      await store.set('test-key', info);
      const retrieved = await store.get('test-key');

      expect(retrieved).toEqual(info);
    });

    it('should return null for non-existent keys', async () => {
      const result = await store.get('non-existent');
      expect(result).toBeNull();
    });

    it('should return null for expired entries', async () => {
      const info: RateLimitInfo = {
        limit: 100,
        remaining: 99,
        resetTime: Date.now() + 1000,
        used: 1,
      };

      await store.set('test-key', info);

      // Advance time past expiration
      vi.advanceTimersByTime(2000);

      const result = await store.get('test-key');
      expect(result).toBeNull();
    });
  });

  describe('increment operation', () => {
    it('should create new entry when key does not exist', async () => {
      const result = await store.increment('new-key');

      expect(result.used).toBe(1);
      expect(result.remaining).toBe(0); // Will be set correctly by rate limiter
    });

    it('should increment existing entry', async () => {
      const info: RateLimitInfo = {
        limit: 100,
        remaining: 99,
        resetTime: Date.now() + 60000,
        used: 1,
      };

      await store.set('test-key', info);
      const result = await store.increment('test-key');

      expect(result.used).toBe(2);
      expect(result.remaining).toBe(98);
    });
  });

  describe('reset operation', () => {
    it('should remove entry from store', async () => {
      const info: RateLimitInfo = {
        limit: 100,
        remaining: 99,
        resetTime: Date.now() + 60000,
        used: 1,
      };

      await store.set('test-key', info);
      await store.reset('test-key');

      const result = await store.get('test-key');
      expect(result).toBeNull();
    });
  });

  describe('cleanup operation', () => {
    it('should remove expired entries', async () => {
      const expiredInfo: RateLimitInfo = {
        limit: 100,
        remaining: 99,
        resetTime: Date.now() - 1000, // Already expired
        used: 1,
      };

      const validInfo: RateLimitInfo = {
        limit: 100,
        remaining: 99,
        resetTime: Date.now() + 60000,
        used: 1,
      };

      await store.set('expired-key', expiredInfo);
      await store.set('valid-key', validInfo);

      store.cleanup();

      expect(await store.get('expired-key')).toBeNull();
      expect(await store.get('valid-key')).toEqual(validInfo);
    });
  });
});

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter;
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

  describe('basic rate limiting', () => {
    beforeEach(() => {
      const config: RateLimitConfig = {
        windowMs: 60000,
        maxRequests: 2,
      };
      rateLimiter = new RateLimiter(config);
    });

    it('should allow requests within limit', async () => {
      const middleware = rateLimiter.middleware();

      await middleware(mockReq as Request, mockRes as Response, nextFn);
      await middleware(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).toHaveBeenCalledTimes(2);
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should block requests exceeding limit', async () => {
      const middleware = rateLimiter.middleware();

      // First two requests should pass
      await middleware(mockReq as Request, mockRes as Response, nextFn);
      await middleware(mockReq as Request, mockRes as Response, nextFn);

      // Third request should be blocked
      await middleware(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).toHaveBeenCalledTimes(2);
      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Too Many Requests',
        })
      );
    });

    it('should set rate limit headers', async () => {
      const middleware = rateLimiter.middleware();

      await middleware(mockReq as Request, mockRes as Response, nextFn);

      expect(mockRes.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'X-RateLimit-Limit': '2',
          'X-RateLimit-Remaining': '1',
          'X-RateLimit-Reset': expect.any(String),
        })
      );
    });
  });

  describe('custom key generation', () => {
    it('should use custom key generator', async () => {
      const keyGenerator = vi.fn().mockReturnValue('custom-key');
      const config: RateLimitConfig = {
        windowMs: 60000,
        maxRequests: 1,
        keyGenerator,
      };
      rateLimiter = new RateLimiter(config);

      const middleware = rateLimiter.middleware();
      await middleware(mockReq as Request, mockRes as Response, nextFn);

      expect(keyGenerator).toHaveBeenCalledWith(mockReq);
    });
  });

  describe('skip conditions', () => {
    it('should skip rate limiting when skipIf condition is met', async () => {
      const skipIf = vi.fn().mockReturnValue(true);
      const config: RateLimitConfig = {
        windowMs: 60000,
        maxRequests: 1,
        skipIf,
      };
      rateLimiter = new RateLimiter(config);

      const middleware = rateLimiter.middleware();
      await middleware(mockReq as Request, mockRes as Response, nextFn);

      expect(skipIf).toHaveBeenCalledWith(mockReq);
      expect(nextFn).toHaveBeenCalled();
    });

    it('should skip counting successful requests when configured', async () => {
      const config: RateLimitConfig = {
        windowMs: 60000,
        maxRequests: 1,
        skipSuccessfulRequests: true,
      };
      rateLimiter = new RateLimiter(config);

      const middleware = rateLimiter.middleware();

      // Mock successful response
      const onFinish = vi.fn();
      (mockRes.on as vi.Mock).mockImplementation((event, callback) => {
        if (event === 'finish') {
          onFinish.mockImplementation(callback);
        }
      });
      mockRes.statusCode = 200;

      await middleware(mockReq as Request, mockRes as Response, nextFn);

      // Simulate response finish
      onFinish();

      // Second request should also pass because first was skipped
      await middleware(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('window expiration', () => {
    it('should reset limits after window expires', async () => {
      const config: RateLimitConfig = {
        windowMs: 1000,
        maxRequests: 1,
      };
      rateLimiter = new RateLimiter(config);

      const middleware = rateLimiter.middleware();

      // First request should pass
      await middleware(mockReq as Request, mockRes as Response, nextFn);
      expect(nextFn).toHaveBeenCalledTimes(1);

      // Second request should be blocked
      await middleware(mockReq as Request, mockRes as Response, nextFn);
      expect(mockRes.status).toHaveBeenCalledWith(429);

      // Advance time past window
      vi.advanceTimersByTime(2000);

      // Third request should pass (new window)
      const nextFn2 = vi.fn();
      await middleware(mockReq as Request, mockRes as Response, nextFn2);
      expect(nextFn2).toHaveBeenCalled();
    });
  });
});

describe('RateLimitMiddleware', () => {
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

  describe('userRateLimit', () => {
    it('should use user ID when available', async () => {
      mockReq.userId = 'user-123';
      const middleware = RateLimitMiddleware.userRateLimit();

      await middleware(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).toHaveBeenCalled();
      expect(mockRes.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'X-RateLimit-Limit': '100',
        })
      );
    });

    it('should fall back to IP when user ID not available', async () => {
      const middleware = RateLimitMiddleware.userRateLimit();

      await middleware(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });
  });

  describe('ipRateLimit', () => {
    it('should use IP address for rate limiting', async () => {
      const middleware = RateLimitMiddleware.ipRateLimit();

      await middleware(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).toHaveBeenCalled();
      expect(mockRes.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'X-RateLimit-Limit': '1000',
        })
      );
    });
  });

  describe('strictUserRateLimit', () => {
    it('should enforce stricter limits', async () => {
      const middleware = RateLimitMiddleware.strictUserRateLimit();

      await middleware(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).toHaveBeenCalled();
      expect(mockRes.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'X-RateLimit-Limit': '20',
        })
      );
    });
  });

  describe('aiRateLimit', () => {
    it('should enforce AI-specific limits', async () => {
      const middleware = RateLimitMiddleware.aiRateLimit();

      await middleware(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).toHaveBeenCalled();
      expect(mockRes.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'X-RateLimit-Limit': '5',
        })
      );
    });
  });

  describe('authRateLimit', () => {
    it('should skip successful authentication requests', async () => {
      const middleware = RateLimitMiddleware.authRateLimit();

      // Mock successful response
      const onFinish = vi.fn();
      (mockRes.on as vi.Mock).mockImplementation((event, callback) => {
        if (event === 'finish') {
          onFinish.mockImplementation(callback);
        }
      });
      mockRes.statusCode = 200;

      await middleware(mockReq as Request, mockRes as Response, nextFn);

      expect(mockRes.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'X-RateLimit-Limit': '10',
        })
      );
    });
  });

  describe('custom rate limiter', () => {
    it('should accept custom configuration', async () => {
      const customConfig: RateLimitConfig = {
        windowMs: 5000,
        maxRequests: 50,
        message: 'Custom rate limit exceeded',
      };

      const middleware = RateLimitMiddleware.custom(customConfig);

      await middleware(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).toHaveBeenCalled();
      expect(mockRes.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'X-RateLimit-Limit': '50',
        })
      );
    });
  });
});

describe('error handling', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let nextFn: vi.Mock;

  beforeEach(() => {
    mockReq = createMockRequest();
    mockRes = createMockResponse();
    nextFn = vi.fn();
  });

  it('should continue on rate limiter errors', async () => {
    const failingStore = {
      get: vi.fn().mockRejectedValue(new Error('Store error')),
      set: vi.fn(),
      increment: vi.fn(),
      reset: vi.fn(),
    };

    const config: RateLimitConfig = {
      windowMs: 60000,
      maxRequests: 100,
    };

    const rateLimiter = new RateLimiter(config, failingStore);
    const middleware = rateLimiter.middleware();

    await middleware(mockReq as Request, mockRes as Response, nextFn);

    // Should call next() even when store fails
    expect(nextFn).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
  });
});