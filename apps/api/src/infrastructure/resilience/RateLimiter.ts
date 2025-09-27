import { Request, Response, NextFunction } from 'express';
import { StructuredLogger } from '../observability/StructuredLogger';

const logger = StructuredLogger.getInstance();

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string;
  skipIf?: (req: Request) => boolean;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  message?: string;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: number;
  used: number;
}

export interface RateLimitStore {
  get(key: string): Promise<RateLimitInfo | null>;
  set(key: string, value: RateLimitInfo): Promise<void>;
  increment(key: string): Promise<RateLimitInfo>;
  reset(key: string): Promise<void>;
}

// In-memory store implementation
export class MemoryRateLimitStore implements RateLimitStore {
  private store: Map<string, RateLimitInfo> = new Map();

  async get(key: string): Promise<RateLimitInfo | null> {
    const info = this.store.get(key);
    if (!info) return null;

    // Clean up expired entries
    if (Date.now() > info.resetTime) {
      this.store.delete(key);
      return null;
    }

    return info;
  }

  async set(key: string, value: RateLimitInfo): Promise<void> {
    this.store.set(key, value);
  }

  async increment(key: string): Promise<RateLimitInfo> {
    const existing = await this.get(key);

    if (!existing) {
      // Create new entry - will be properly initialized by the rate limiter
      const info: RateLimitInfo = {
        limit: 0,
        remaining: 0,
        resetTime: 0,
        used: 1,
      };
      await this.set(key, info);
      return info;
    }

    // Increment existing entry
    existing.used += 1;
    existing.remaining = Math.max(0, existing.limit - existing.used);
    await this.set(key, existing);
    return existing;
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key);
  }

  // Cleanup method to remove expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, info] of this.store.entries()) {
      if (now > info.resetTime) {
        this.store.delete(key);
      }
    }
  }
}

export class RateLimiter {
  private store: RateLimitStore;

  constructor(
    private config: RateLimitConfig,
    store?: RateLimitStore
  ) {
    this.store = store || new MemoryRateLimitStore();

    // Start cleanup timer for memory store
    if (this.store instanceof MemoryRateLimitStore) {
      setInterval(() => {
        (this.store as MemoryRateLimitStore).cleanup();
      }, this.config.windowMs);
    }
  }

  middleware() {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        // Skip if condition is met
        if (this.config.skipIf && this.config.skipIf(req)) {
          return next();
        }

        const key = this.generateKey(req);
        const result = await this.checkLimit(key);

        // Set headers
        if (this.config.standardHeaders !== false) {
          res.set({
            'X-RateLimit-Limit': result.limit.toString(),
            'X-RateLimit-Remaining': result.remaining.toString(),
            'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
          });
        }

        if (this.config.legacyHeaders) {
          res.set({
            'X-RateLimit-Used': result.used.toString(),
          });
        }

        // Check if limit exceeded
        if (result.remaining < 0) {
          const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);

          res.set('Retry-After', retryAfter.toString());

          logger.warn('Rate limit exceeded', {
            key,
            limit: result.limit,
            used: result.used,
            resetTime: result.resetTime,
            ip: req.ip,
            userAgent: req.get('User-Agent')
          });

          res.status(429).json({
            error: this.config.message || 'Too Many Requests',
            retryAfter,
            limit: result.limit,
            resetTime: result.resetTime,
          });
          return;
        }

        // Track the request for potential skip on response
        (req as any).__rateLimitKey = key;

        // Monitor response to potentially skip counting failed requests
        res.on('finish', () => {
          if (this.shouldSkipRequest(req, res)) {
            // Decrement the counter for skipped requests
            this.decrementCounter(key);
          }
        });

        next();
      } catch (error) {
        logger.error('Rate limiting error', {
          error: error instanceof Error ? error.message : String(error)
        });

        // On rate limiter error, allow the request to proceed
        next();
      }
    };
  }

  private generateKey(req: Request): string {
    if (this.config.keyGenerator) {
      return this.config.keyGenerator(req);
    }

    // Default: use IP address
    return `ip:${req.ip}`;
  }

  private async checkLimit(key: string): Promise<RateLimitInfo> {
    const now = Date.now();
    const windowStart = now;
    const resetTime = windowStart + this.config.windowMs;

    let info = await this.store.get(key);

    if (!info || now > info.resetTime) {
      // Create new window
      info = {
        limit: this.config.maxRequests,
        remaining: this.config.maxRequests - 1,
        resetTime,
        used: 1,
      };
      await this.store.set(key, info);
      return info;
    }

    // Increment existing window
    return await this.store.increment(key);
  }

  private shouldSkipRequest(req: Request, res: Response): boolean {
    if (this.config.skipSuccessfulRequests && res.statusCode < 400) {
      return true;
    }

    if (this.config.skipFailedRequests && res.statusCode >= 400) {
      return true;
    }

    return false;
  }

  private async decrementCounter(key: string): Promise<void> {
    try {
      const info = await this.store.get(key);
      if (info && info.used > 0) {
        info.used -= 1;
        info.remaining = Math.min(info.limit, info.remaining + 1);
        await this.store.set(key, info);
      }
    } catch (error) {
      logger.error('Failed to decrement rate limit counter', {
        key,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}

// Predefined rate limiters for different use cases
export class RateLimitMiddleware {

  // Per-user rate limiting (100 req/min)
  static userRateLimit() {
    return new RateLimiter({
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 100,
      keyGenerator: (req: Request) => {
        const userId = (req as any).userId;
        return userId ? `user:${userId}` : `ip:${req.ip}`;
      },
      message: 'Too many requests from this user. Please try again later.',
      standardHeaders: true,
    }).middleware();
  }

  // Per-IP rate limiting (1000 req/min)
  static ipRateLimit() {
    return new RateLimiter({
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 1000,
      keyGenerator: (req: Request) => `ip:${req.ip}`,
      message: 'Too many requests from this IP. Please try again later.',
      standardHeaders: true,
    }).middleware();
  }

  // Strict rate limiting for sensitive endpoints (20 req/min per user)
  static strictUserRateLimit() {
    return new RateLimiter({
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 20,
      keyGenerator: (req: Request) => {
        const userId = (req as any).userId;
        return userId ? `strict:user:${userId}` : `strict:ip:${req.ip}`;
      },
      message: 'Too many requests to this sensitive endpoint. Please try again later.',
      standardHeaders: true,
    }).middleware();
  }

  // AI endpoint rate limiting (5 req/min per user)
  static aiRateLimit() {
    return new RateLimiter({
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 5,
      keyGenerator: (req: Request) => {
        const userId = (req as any).userId;
        return userId ? `ai:user:${userId}` : `ai:ip:${req.ip}`;
      },
      message: 'Too many AI requests. Please try again later.',
      standardHeaders: true,
    }).middleware();
  }

  // Authentication endpoint rate limiting (10 attempts per IP per hour)
  static authRateLimit() {
    return new RateLimiter({
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 10,
      keyGenerator: (req: Request) => `auth:ip:${req.ip}`,
      message: 'Too many authentication attempts. Please try again later.',
      standardHeaders: true,
      skipSuccessfulRequests: true, // Don't count successful logins
    }).middleware();
  }

  // Create custom rate limiter
  static custom(config: RateLimitConfig, store?: RateLimitStore) {
    return new RateLimiter(config, store).middleware();
  }
}

// Rate limit store implementations
export class RedisRateLimitStore implements RateLimitStore {
  constructor(private redisClient: any) {}

  async get(key: string): Promise<RateLimitInfo | null> {
    try {
      const data = await this.redisClient.get(`ratelimit:${key}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Redis rate limit get error', {
        key,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  async set(key: string, value: RateLimitInfo): Promise<void> {
    try {
      const ttl = Math.ceil((value.resetTime - Date.now()) / 1000);
      if (ttl > 0) {
        await this.redisClient.setex(
          `ratelimit:${key}`,
          ttl,
          JSON.stringify(value)
        );
      }
    } catch (error) {
      logger.error('Redis rate limit set error', {
        key,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  async increment(key: string): Promise<RateLimitInfo> {
    const existing = await this.get(key);
    if (!existing) {
      const info: RateLimitInfo = {
        limit: 0,
        remaining: 0,
        resetTime: 0,
        used: 1,
      };
      await this.set(key, info);
      return info;
    }

    existing.used += 1;
    existing.remaining = Math.max(0, existing.limit - existing.used);
    await this.set(key, existing);
    return existing;
  }

  async reset(key: string): Promise<void> {
    try {
      await this.redisClient.del(`ratelimit:${key}`);
    } catch (error) {
      logger.error('Redis rate limit reset error', {
        key,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}