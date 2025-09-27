import { Request, Response, NextFunction } from 'express';
import { container } from 'tsyringe';
import { ICacheService } from '@/domain/services/ICacheService';
import { logger } from '@/shared/logger';

export interface CacheMiddlewareOptions {
  ttlSeconds?: number;
  keyGenerator?: (req: Request) => string;
  condition?: (req: Request) => boolean;
  varyByUser?: boolean;
  tags?: string[];
}

/**
 * HTTP response caching middleware using Redis
 */
export function cacheMiddleware(options: CacheMiddlewareOptions = {}) {
  const {
    ttlSeconds = 300, // 5 minutes default
    keyGenerator,
    condition,
    varyByUser = true
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Check condition if provided
    if (condition && !condition(req)) {
      return next();
    }

    try {
      const cacheService = container.resolve<ICacheService>('ICacheService');
      const cacheKey = keyGenerator ? keyGenerator(req) : generateDefaultCacheKey(req, varyByUser);

      // Try to get cached response
      const cached = await cacheService.get<{data: any, headers: Record<string, string>}>(cacheKey);

      if (cached) {
        logger.debug(`Cache hit for ${req.method} ${req.path}`);

        // Set cached headers
        if (cached.headers) {
          Object.entries(cached.headers).forEach(([key, value]) => {
            res.setHeader(key, value);
          });
        }

        // Add cache headers
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Cache-Key', cacheKey);

        return res.json(cached.data);
      }

      logger.debug(`Cache miss for ${req.method} ${req.path}`);

      // Intercept response
      const originalSend = res.send;
      const originalJson = res.json;

      res.json = function(data: any) {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const responseHeaders = extractCacheableHeaders(res);

          cacheService.set(cacheKey, {
            data,
            headers: responseHeaders
          }, ttlSeconds).catch(error => {
            logger.error(`Failed to cache response for ${cacheKey}:`, error);
          });
        }

        // Add cache headers
        res.setHeader('X-Cache', 'MISS');
        res.setHeader('X-Cache-Key', cacheKey);

        return originalJson.call(this, data);
      };

      res.send = function(data: any) {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const responseHeaders = extractCacheableHeaders(res);

          cacheService.set(cacheKey, {
            data,
            headers: responseHeaders
          }, ttlSeconds).catch(error => {
            logger.error(`Failed to cache response for ${cacheKey}:`, error);
          });
        }

        // Add cache headers
        res.setHeader('X-Cache', 'MISS');
        res.setHeader('X-Cache-Key', cacheKey);

        return originalSend.call(this, data);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error:', error);
      next(); // Continue without caching
    }
  };
}

/**
 * Generate a default cache key for HTTP requests
 */
function generateDefaultCacheKey(req: Request, varyByUser: boolean): string {
  const baseKey = `http:${req.method}:${req.path}`;

  const params = new URLSearchParams();

  // Include query parameters (sorted for consistency)
  const sortedQuery = Object.keys(req.query).sort();
  sortedQuery.forEach(key => {
    const value = req.query[key];
    if (value !== undefined) {
      params.append(key, Array.isArray(value) ? value.join(',') : String(value));
    }
  });

  // Include user ID if requested
  if (varyByUser && (req as any).userId) {
    params.append('userId', (req as any).userId);
  }

  const queryString = params.toString();
  return queryString ? `${baseKey}?${queryString}` : baseKey;
}

/**
 * Extract headers that should be cached
 */
function extractCacheableHeaders(res: Response): Record<string, string> {
  const cacheableHeaders = [
    'content-type',
    'content-encoding',
    'content-language',
    'etag',
    'last-modified'
  ];

  const headers: Record<string, string> = {};

  cacheableHeaders.forEach(headerName => {
    const headerValue = res.getHeader(headerName);
    if (headerValue) {
      headers[headerName] = Array.isArray(headerValue)
        ? headerValue.join(', ')
        : String(headerValue);
    }
  });

  return headers;
}

/**
 * Cache invalidation middleware - invalidates cache patterns after mutation operations
 */
export function cacheInvalidationMiddleware(patterns: string[] | ((req: Request) => string[])) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Store original response methods
    const originalJson = res.json;
    const originalSend = res.send;

    // Override response methods to perform cache invalidation after successful responses
    const performInvalidation = async () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          const cacheService = container.resolve<ICacheService>('ICacheService');
          const invalidationPatterns = Array.isArray(patterns) ? patterns : patterns(req);

          for (const pattern of invalidationPatterns) {
            const deleted = await cacheService.invalidatePattern(pattern);
            logger.info(`Invalidated ${deleted} cache entries for pattern: ${pattern}`);
          }
        } catch (error) {
          logger.error('Cache invalidation error:', error);
        }
      }
    };

    res.json = function(data: any) {
      performInvalidation();
      return originalJson.call(this, data);
    };

    res.send = function(data: any) {
      performInvalidation();
      return originalSend.call(this, data);
    };

    next();
  };
}

/**
 * User-specific cache invalidation for routes that modify user data
 */
export function userCacheInvalidationMiddleware() {
  return cacheInvalidationMiddleware((req: Request) => {
    const userId = (req as any).userId;
    if (!userId) return [];

    return [
      `http:GET:*userId=${userId}*`,
      `query:*:user:${userId}:*`,
      `entity:*:${userId}`,
      `user:${userId}:*`
    ];
  });
}

/**
 * Cache warming middleware - pre-populates cache with common queries
 */
export function cacheWarmingMiddleware(warmupQueries: () => Promise<void>) {
  return async (_req: Request, _res: Response, next: NextFunction) => {
    // Only warm cache occasionally to avoid performance impact
    if (Math.random() < 0.01) { // 1% chance
      warmupQueries().catch(error => {
        logger.error('Cache warming error:', error);
      });
    }

    next();
  };
}