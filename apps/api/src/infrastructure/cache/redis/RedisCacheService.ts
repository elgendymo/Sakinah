import { injectable } from 'tsyringe';
import { ICacheService, CacheStats } from '@/domain/services/ICacheService';
import { RedisClient } from './RedisClient';
import { logger } from '@/shared/logger';
import { v4 as uuidv4 } from 'uuid';

@injectable()
export class RedisCacheService implements ICacheService {
  private redis: RedisClient;
  private stats: {hits: number, misses: number} = {hits: 0, misses: 0};
  private instanceId: string;

  constructor() {
    this.redis = RedisClient.getInstance();
    this.instanceId = uuidv4();
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const serialized = await this.redis.get(this.formatKey(key));

      if (serialized === null) {
        this.stats.misses++;
        return null;
      }

      this.stats.hits++;

      try {
        return JSON.parse(serialized) as T;
      } catch {
        // If parsing fails, return the raw string
        return serialized as unknown as T;
      }
    } catch (error) {
      logger.error(`Cache GET error for key ${key}:`, error);
      this.stats.misses++;
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<boolean> {
    try {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);

      const cacheEntry = {
        data: serialized,
        timestamp: Date.now(),
        instanceId: this.instanceId,
        ttl: ttlSeconds
      };

      return await this.redis.set(
        this.formatKey(key),
        JSON.stringify(cacheEntry),
        ttlSeconds
      );
    } catch (error) {
      logger.error(`Cache SET error for key ${key}:`, error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      return await this.redis.del(this.formatKey(key));
    } catch (error) {
      logger.error(`Cache DEL error for key ${key}:`, error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      return await this.redis.exists(this.formatKey(key));
    } catch (error) {
      logger.error(`Cache EXISTS error for key ${key}:`, error);
      return false;
    }
  }

  async invalidatePattern(pattern: string): Promise<number> {
    try {
      const keys = await this.redis.keys(this.formatKey(pattern));

      if (keys.length === 0) {
        return 0;
      }

      // Delete keys in batches to avoid blocking Redis
      const batchSize = 100;
      let deletedCount = 0;

      for (let i = 0; i < keys.length; i += batchSize) {
        const batch = keys.slice(i, i + batchSize);

        const deletePromises = batch.map(key => this.redis.del(key));
        const results = await Promise.all(deletePromises);

        deletedCount += results.filter(Boolean).length;
      }

      logger.info(`Invalidated ${deletedCount} cache keys with pattern: ${pattern}`);
      return deletedCount;
    } catch (error) {
      logger.error(`Cache pattern invalidation error for pattern ${pattern}:`, error);
      return 0;
    }
  }

  async invalidateUserCache(userId: string): Promise<number> {
    const patterns = [
      `user:${userId}:*`,
      `habit:*:user:${userId}`,
      `plan:*:user:${userId}`,
      `query:*:user:${userId}`,
      `stats:user:${userId}:*`
    ];

    let totalDeleted = 0;

    for (const pattern of patterns) {
      const deleted = await this.invalidatePattern(pattern);
      totalDeleted += deleted;
    }

    logger.info(`Invalidated ${totalDeleted} cache entries for user: ${userId}`);
    return totalDeleted;
  }

  async getStats(): Promise<CacheStats> {
    try {
      const keyCount = (await this.redis.keys(this.formatKey('*'))).length;
      const pingSuccess = await this.redis.ping();

      return {
        hits: this.stats.hits,
        misses: this.stats.misses,
        keys: keyCount,
        connectionStatus: pingSuccess ? 'connected' : 'disconnected'
      };
    } catch (error) {
      logger.error('Error getting cache stats:', error);
      return {
        hits: this.stats.hits,
        misses: this.stats.misses,
        keys: 0,
        connectionStatus: 'error'
      };
    }
  }

  // Cache key formatting and namespacing
  private formatKey(key: string): string {
    const prefix = process.env.REDIS_KEY_PREFIX || 'sakinah';
    return `${prefix}:${key}`;
  }

  // Advanced caching methods

  async getMultiple<T>(keys: string[]): Promise<Map<string, T | null>> {
    try {
      const formattedKeys = keys.map(key => this.formatKey(key));
      const values = await this.redis.mget(formattedKeys);

      const result = new Map<string, T | null>();

      keys.forEach((key, index) => {
        const value = values[index];
        if (value === null) {
          this.stats.misses++;
          result.set(key, null);
        } else {
          this.stats.hits++;
          try {
            const parsed = JSON.parse(value);
            result.set(key, parsed.data ? JSON.parse(parsed.data) : parsed);
          } catch {
            result.set(key, value as unknown as T);
          }
        }
      });

      return result;
    } catch (error) {
      logger.error('Cache MGET error:', error);
      return new Map();
    }
  }

  async setMultiple<T>(entries: Array<{key: string, value: T, ttlSeconds?: number}>): Promise<boolean> {
    try {
      // For entries with TTL, we need to set them individually
      const withTtl = entries.filter(entry => entry.ttlSeconds);
      const withoutTtl = entries.filter(entry => !entry.ttlSeconds);

      // Set entries without TTL in batch
      if (withoutTtl.length > 0) {
        const keyValues = withoutTtl.map(({key, value}) => ({
          key: this.formatKey(key),
          value: JSON.stringify({
            data: typeof value === 'string' ? value : JSON.stringify(value),
            timestamp: Date.now(),
            instanceId: this.instanceId
          })
        }));

        await this.redis.mset(keyValues);
      }

      // Set entries with TTL individually
      if (withTtl.length > 0) {
        const ttlPromises = withTtl.map(({key, value, ttlSeconds}) =>
          this.set(key, value, ttlSeconds)
        );
        await Promise.all(ttlPromises);
      }

      return true;
    } catch (error) {
      logger.error('Cache MSET error:', error);
      return false;
    }
  }

  // Specialized methods for common cache patterns

  async cacheQuery<T>(
    queryName: string,
    userId: string,
    parameters: Record<string, any>,
    data: T,
    ttlSeconds = 300
  ): Promise<boolean> {
    const key = `query:${queryName}:user:${userId}:${this.hashParams(parameters)}`;
    return this.set(key, data, ttlSeconds);
  }

  async getCachedQuery<T>(
    queryName: string,
    userId: string,
    parameters: Record<string, any>
  ): Promise<T | null> {
    const key = `query:${queryName}:user:${userId}:${this.hashParams(parameters)}`;
    return this.get<T>(key);
  }

  async cacheEntity<T>(
    entityType: string,
    entityId: string,
    data: T,
    ttlSeconds = 600
  ): Promise<boolean> {
    const key = `entity:${entityType}:${entityId}`;
    return this.set(key, data, ttlSeconds);
  }

  async getCachedEntity<T>(entityType: string, entityId: string): Promise<T | null> {
    const key = `entity:${entityType}:${entityId}`;
    return this.get<T>(key);
  }

  private hashParams(params: Record<string, any>): string {
    // Simple hash for cache key generation
    const sorted = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');

    return Buffer.from(sorted).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
  }

  async warmup(): Promise<void> {
    try {
      await this.redis.connect();
      logger.info('Redis cache service warmed up successfully');
    } catch (error) {
      logger.error('Failed to warm up Redis cache service:', error);
    }
  }

  async shutdown(): Promise<void> {
    try {
      await this.redis.disconnect();
      logger.info('Redis cache service shut down successfully');
    } catch (error) {
      logger.error('Error during Redis cache service shutdown:', error);
    }
  }
}