import { logger } from '@/shared/logger';

export interface CacheConfig {
  enabled: boolean;
  type: 'redis' | 'memory' | 'disabled';
  redis?: {
    url: string;
    keyPrefix: string;
    connectTimeout: number;
    retryAttempts: number;
    retryDelay: number;
  };
  memory?: {
    maxSize: number;
    ttlMs: number;
  };
  defaultTtl: number;
}

export function getCacheConfig(): CacheConfig {
  const cacheEnabled = process.env.CACHE_ENABLED !== 'false';

  // Default to memory cache in development environments (when NODE_ENV is not 'production')
  // Only use Redis in production or when explicitly set
  const isProduction = process.env.NODE_ENV === 'production';
  const defaultCacheType = isProduction ? 'redis' : 'memory';
  const cacheType = process.env.CACHE_TYPE as 'redis' | 'memory' | 'disabled' || defaultCacheType;
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  // In development without Redis, fall back to memory cache or disable caching
  let effectiveCacheType = cacheType;

  if (cacheType === 'redis' && process.env.NODE_ENV === 'development') {
    // Check if Redis is available (we'll do this during initialization)
    effectiveCacheType = 'redis'; // Assume Redis for now, will fallback during runtime
  }

  const config: CacheConfig = {
    enabled: cacheEnabled,
    type: effectiveCacheType,
    defaultTtl: parseInt(process.env.CACHE_DEFAULT_TTL || '300'), // 5 minutes

    redis: {
      url: redisUrl,
      keyPrefix: process.env.REDIS_KEY_PREFIX || 'sakinah',
      connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT || '5000'),
      retryAttempts: parseInt(process.env.REDIS_RETRY_ATTEMPTS || '3'),
      retryDelay: parseInt(process.env.REDIS_RETRY_DELAY || '1000')
    },

    memory: {
      maxSize: parseInt(process.env.MEMORY_CACHE_MAX_SIZE || '1000'),
      ttlMs: parseInt(process.env.MEMORY_CACHE_TTL || '300000') // 5 minutes
    }
  };

  logger.info('Cache configuration:', {
    enabled: config.enabled,
    type: config.type,
    redisUrl: config.redis?.url,
    keyPrefix: config.redis?.keyPrefix
  });

  return config;
}

export const cacheConfig = getCacheConfig();