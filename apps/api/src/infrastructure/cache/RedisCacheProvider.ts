import { ICacheProvider, CacheOptions } from './ICacheProvider';
import { logger } from '../../shared/logger';

// Redis client will be optional dependency
let redis: any;
try {
  redis = require('redis');
} catch (e) {
  logger.debug('Redis not available, falling back to in-memory cache');
}

export class RedisCacheProvider implements ICacheProvider {
  private client: any;
  private connected: boolean = false;

  constructor(private config?: { url?: string; host?: string; port?: number }) {
    if (!redis) {
      logger.warn('Redis module not found, cache will be unavailable');
      return;
    }

    this.initializeClient();
  }

  private async initializeClient() {
    try {
      this.client = redis.createClient({
        url: this.config?.url || process.env.REDIS_URL,
        socket: {
          host: this.config?.host || process.env.REDIS_HOST || 'localhost',
          port: this.config?.port || parseInt(process.env.REDIS_PORT || '6379')
        }
      });

      this.client.on('error', (err: Error) => {
        logger.error('Redis Client Error', err);
        this.connected = false;
      });

      this.client.on('connect', () => {
        logger.info('Connected to Redis');
        this.connected = true;
      });

      await this.client.connect();
    } catch (error) {
      logger.error('Failed to connect to Redis', error);
      this.connected = false;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isAvailable()) return null;

    try {
      const value = await this.client.get(key);
      if (!value) return null;

      logger.debug('Redis cache hit', { key });
      return JSON.parse(value) as T;
    } catch (error) {
      logger.error('Redis get error', { error, key });
      return null;
    }
  }

  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    if (!this.isAvailable()) return;

    try {
      const serialized = JSON.stringify(value);

      if (options?.ttl) {
        await this.client.setEx(key, options.ttl, serialized);
      } else {
        await this.client.set(key, serialized);
      }

      // Handle tags using Redis sets
      if (options?.tags) {
        for (const tag of options.tags) {
          await this.client.sAdd(`tag:${tag}`, key);
        }
      }

      logger.debug('Redis cache set', { key, ttl: options?.ttl, tags: options?.tags });
    } catch (error) {
      logger.error('Redis set error', { error, key });
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.isAvailable()) return;

    try {
      // Get tags associated with this key
      const tags = await this.client.sMembers(`key:tags:${key}`);

      // Remove key from tag sets
      if (tags && tags.length > 0) {
        for (const tag of tags) {
          await this.client.sRem(`tag:${tag}`, key);
        }
        await this.client.del(`key:tags:${key}`);
      }

      await this.client.del(key);
      logger.debug('Redis cache delete', { key });
    } catch (error) {
      logger.error('Redis delete error', { error, key });
    }
  }

  async deleteByPattern(pattern: string): Promise<void> {
    if (!this.isAvailable()) return;

    try {
      const keys = await this.client.keys(pattern);
      if (keys && keys.length > 0) {
        await this.client.del(keys);
      }
      logger.debug('Redis delete by pattern', { pattern, deletedCount: keys.length });
    } catch (error) {
      logger.error('Redis deleteByPattern error', { error, pattern });
    }
  }

  async deleteByTags(tags: string[]): Promise<void> {
    if (!this.isAvailable()) return;

    try {
      const keysToDelete = new Set<string>();

      for (const tag of tags) {
        const keys = await this.client.sMembers(`tag:${tag}`);
        if (keys) {
          for (const key of keys) {
            keysToDelete.add(key);
          }
        }
      }

      if (keysToDelete.size > 0) {
        await this.client.del(Array.from(keysToDelete));

        // Clean up tag sets
        for (const tag of tags) {
          await this.client.del(`tag:${tag}`);
        }
      }

      logger.debug('Redis delete by tags', { tags, deletedCount: keysToDelete.size });
    } catch (error) {
      logger.error('Redis deleteByTags error', { error, tags });
    }
  }

  async flush(): Promise<void> {
    if (!this.isAvailable()) return;

    try {
      await this.client.flushDb();
      logger.debug('Redis cache flushed');
    } catch (error) {
      logger.error('Redis flush error', error);
    }
  }

  isAvailable(): boolean {
    return this.connected && this.client !== undefined;
  }

  async destroy(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.connected = false;
    }
  }
}