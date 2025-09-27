import { injectable } from 'tsyringe';
import { ICacheService, CacheStats } from '@/domain/services/ICacheService';
import { logger } from '@/shared/logger';

interface CacheEntry<T> {
  value: T;
  expiry: number;
  tags?: string[];
}

@injectable()
export class MemoryCacheService implements ICacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private stats = { hits: 0, misses: 0 };
  private maxSize: number;
  private defaultTtl: number;

  constructor() {
    this.maxSize = parseInt(process.env.MEMORY_CACHE_MAX_SIZE || '1000');
    this.defaultTtl = parseInt(process.env.MEMORY_CACHE_TTL || '300'); // 5 minutes in seconds

    // Periodic cleanup of expired entries
    setInterval(() => this.cleanup(), 60000); // Every minute

    logger.info(`Memory cache service initialized (max size: ${this.maxSize})`);
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return entry.value;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<boolean> {
    try {
      // If cache is at max size, remove oldest entry
      if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
        const oldestKey = this.cache.keys().next().value;
        if (oldestKey) {
          this.cache.delete(oldestKey);
        }
      }

      const ttl = ttlSeconds || this.defaultTtl;
      const expiry = Date.now() + (ttl * 1000);

      this.cache.set(key, {
        value,
        expiry
      });

      return true;
    } catch (error) {
      logger.error(`Memory cache SET error for key ${key}:`, error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  async invalidatePattern(pattern: string): Promise<number> {
    let deletedCount = 0;

    // Convert glob pattern to regex
    const regex = this.patternToRegex(pattern);

    for (const [key] of this.cache) {
      if (regex.test(key)) {
        this.cache.delete(key);
        deletedCount++;
      }
    }

    logger.info(`Memory cache: invalidated ${deletedCount} keys with pattern: ${pattern}`);
    return deletedCount;
  }

  async invalidateUserCache(userId: string): Promise<number> {
    const patterns = [
      `user:${userId}:*`,
      `*:user:${userId}*`,
      `*${userId}*`
    ];

    let totalDeleted = 0;
    for (const pattern of patterns) {
      totalDeleted += await this.invalidatePattern(pattern);
    }

    return totalDeleted;
  }

  async getStats(): Promise<CacheStats> {
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      keys: this.cache.size,
      connectionStatus: 'connected',
      memoryUsage: `${this.cache.size}/${this.maxSize} entries`
    };
  }

  private cleanup(): void {
    const now = Date.now();
    let expiredCount = 0;

    for (const [key, entry] of this.cache) {
      if (now > entry.expiry) {
        this.cache.delete(key);
        expiredCount++;
      }
    }

    if (expiredCount > 0) {
      logger.debug(`Memory cache: cleaned up ${expiredCount} expired entries`);
    }
  }

  private patternToRegex(pattern: string): RegExp {
    // Convert glob pattern to regex
    const escaped = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape regex special chars
      .replace(/\*/g, '.*') // Convert * to .*
      .replace(/\?/g, '.'); // Convert ? to .

    return new RegExp(`^${escaped}$`);
  }

  // Additional methods for development/debugging
  clear(): void {
    this.cache.clear();
    logger.info('Memory cache cleared');
  }

  size(): number {
    return this.cache.size;
  }

  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  async warmup(): Promise<void> {
    logger.info('Memory cache service warmed up');
  }

  async shutdown(): Promise<void> {
    this.cache.clear();
    logger.info('Memory cache service shut down');
  }
}