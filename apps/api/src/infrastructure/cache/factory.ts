import { ICacheService } from '@/domain/services/ICacheService';
import { RedisCacheService } from './redis/RedisCacheService';
import { MemoryCacheService } from './memory/MemoryCacheService';
import { cacheConfig } from '../config/cache';
import { logger } from '@/shared/logger';

class NoOpCacheService implements ICacheService {
  async get<T>(_key: string): Promise<T | null> { return null; }
  async set<T>(_key: string, _value: T, _ttlSeconds?: number): Promise<boolean> { return true; }
  async del(_key: string): Promise<boolean> { return true; }
  async exists(_key: string): Promise<boolean> { return false; }
  async invalidatePattern(_pattern: string): Promise<number> { return 0; }
  async invalidateUserCache(_userId: string): Promise<number> { return 0; }
  async getStats() {
    return {
      hits: 0,
      misses: 0,
      keys: 0,
      connectionStatus: 'disabled'
    };
  }
}

export class CacheFactory {
  private static instance: ICacheService | null = null;

  static async create(): Promise<ICacheService> {
    if (this.instance) {
      return this.instance;
    }

    if (!cacheConfig.enabled) {
      logger.info('Cache disabled by configuration');
      this.instance = new NoOpCacheService();
      return this.instance;
    }

    switch (cacheConfig.type) {
      case 'redis':
        return this.createRedisCache();

      case 'memory':
        logger.info('Using memory cache service');
        this.instance = new MemoryCacheService();
        return this.instance;

      case 'disabled':
        logger.info('Cache explicitly disabled');
        this.instance = new NoOpCacheService();
        return this.instance;

      default:
        logger.warn(`Unknown cache type: ${cacheConfig.type}, falling back to memory cache`);
        this.instance = new MemoryCacheService();
        return this.instance;
    }
  }

  private static async createRedisCache(): Promise<ICacheService> {
    try {
      const redisService = new RedisCacheService();

      // Test Redis connection
      logger.info('Testing Redis connection...');
      await this.testRedisConnection(redisService);

      logger.info('Redis cache service initialized successfully');
      this.instance = redisService;
      return redisService;

    } catch (error) {
      logger.warn('Failed to initialize Redis cache, falling back to memory cache:', error.message);

      // Fallback to memory cache
      this.instance = new MemoryCacheService();
      return this.instance;
    }
  }

  private static async testRedisConnection(service: RedisCacheService): Promise<void> {
    // Warm up the Redis service (this will establish connection)
    if ('warmup' in service) {
      await (service as any).warmup();
    }

    // Test basic operations
    const testKey = `test:connection:${Date.now()}`;
    const testValue = 'connection-test';

    const setResult = await service.set(testKey, testValue, 5);
    if (!setResult) {
      throw new Error('Failed to set test value in Redis');
    }

    const getValue = await service.get(testKey);
    if (getValue !== testValue) {
      throw new Error('Failed to get test value from Redis');
    }

    await service.del(testKey);
    logger.info('Redis connection test successful');
  }

  static async getInstance(): Promise<ICacheService> {
    if (!this.instance) {
      this.instance = await this.create();
    }
    return this.instance;
  }

  static async shutdown(): Promise<void> {
    if (this.instance && 'shutdown' in this.instance) {
      await (this.instance as any).shutdown();
      this.instance = null;
    }
  }

  static reset(): void {
    this.instance = null;
  }
}