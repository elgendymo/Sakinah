import { CacheFactory } from '../factory';
import { CacheOptions } from '../ICacheProvider';
import { logger } from '../../../shared/logger';

export interface CacheableOptions extends CacheOptions {
  key?: string | ((...args: any[]) => string);
  condition?: (...args: any[]) => boolean;
}

/**
 * Decorator to cache method results
 * @param options Cache options including TTL, tags, and key generation
 */
export function Cacheable(options: CacheableOptions = {}) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // Check condition
      if (options.condition && !options.condition(...args)) {
        return originalMethod.apply(this, args);
      }

      // Generate cache key
      const cacheKey = getCacheKey(target.constructor.name, propertyName, options.key, args);

      try {
        const cache = await CacheFactory.create();

        // Try to get from cache
        const cached = await cache.get(cacheKey);
        if (cached !== null) {
          return cached;
        }

        // Execute method and cache result
        const result = await originalMethod.apply(this, args);

        // Only cache non-null results
        if (result !== null && result !== undefined) {
          await cache.set(cacheKey, result, options.ttl);
        }

        return result;
      } catch (error) {
        logger.error('Cache decorator error', { error, method: propertyName });
        // Fall back to executing the method
        return originalMethod.apply(this, args);
      }
    };

    return descriptor;
  };
}

/**
 * Decorator to evict cache entries
 * @param options Eviction options
 */
export function CacheEvict(options: { key?: string | ((...args: any[]) => string); tags?: string[] } = {}) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const result = await originalMethod.apply(this, args);

      try {
        const cache = await CacheFactory.create();

        if (options.tags) {
          await cache.invalidatePattern(`*${options.tags.join('*')}*`);
        }

        if (options.key) {
          const cacheKey = getCacheKey(target.constructor.name, propertyName, options.key, args);
          await cache.del(cacheKey);
        }
      } catch (error) {
        logger.error('Cache evict error', { error, method: propertyName });
      }

      return result;
    };

    return descriptor;
  };
}

function getCacheKey(
  className: string,
  methodName: string,
  keyOption?: string | ((...args: any[]) => string),
  args?: any[]
): string {
  if (typeof keyOption === 'function' && args) {
    return keyOption(...args);
  }

  if (typeof keyOption === 'string') {
    return keyOption;
  }

  // Default key generation
  const argsKey = args ? JSON.stringify(args) : '';
  return `${className}:${methodName}:${argsKey}`;
}