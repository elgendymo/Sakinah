import { injectable, inject } from 'tsyringe';
import { QueryBus, QueryHandler, Query } from '@/application/cqrs/queries/base/Query';
import { ICacheService } from '@/domain/services/ICacheService';
import { logger } from '@/shared/logger';

export interface QueryCacheOptions {
  cache?: boolean;
  cacheTime?: number; // in milliseconds
  cacheKey?: string;
  userSpecific?: boolean;
}

@injectable()
export class QueryBusImpl implements QueryBus {
  private handlers = new Map<string, QueryHandler<Query, any>>();

  constructor(
    @inject('ICacheService') private cacheService?: ICacheService
  ) {}

  register<TQuery extends Query, TResult = any>(
    queryType: string,
    handler: QueryHandler<TQuery, TResult>
  ): void {
    this.handlers.set(queryType, handler as QueryHandler<Query, any>);
  }

  async dispatch<TQuery extends Query, TResult = any>(
    query: TQuery,
    options?: QueryCacheOptions
  ): Promise<TResult> {
    const queryType = query.constructor.name;
    const handler = this.handlers.get(queryType);

    if (!handler) {
      throw new Error(`No handler registered for query ${queryType}`);
    }

    // Check cache if caching is enabled and cache service is available
    if (options?.cache && this.cacheService) {
      const cacheKey = this.generateCacheKey(queryType, query, options);
      const cached = await this.cacheService.get<TResult>(cacheKey);

      if (cached !== null) {
        logger.debug(`Cache hit for query ${queryType}`);
        return cached;
      }

      // Execute query and cache result
      logger.debug(`Cache miss for query ${queryType}, executing handler`);
      const result = await handler.handle(query);

      if (result !== null && result !== undefined) {
        const ttlSeconds = options.cacheTime ? Math.floor(options.cacheTime / 1000) : 300;
        await this.cacheService.set(cacheKey, result, ttlSeconds);
      }

      return result;
    }

    // Execute without caching
    return handler.handle(query);
  }

  private generateCacheKey<TQuery extends Query>(
    queryType: string,
    query: TQuery,
    options?: QueryCacheOptions
  ): string {
    if (options?.cacheKey) {
      return options.cacheKey;
    }

    // Create a cache key based on query type and properties
    const queryProps = this.extractQueryProperties(query);
    const propsHash = Buffer.from(JSON.stringify(queryProps)).toString('base64');

    return `query:${queryType}:${propsHash}`;
  }

  private extractQueryProperties<TQuery extends Query>(query: TQuery): Record<string, any> {
    const props: Record<string, any> = {};

    // Extract all non-function properties from the query
    for (const [key, value] of Object.entries(query)) {
      if (typeof value !== 'function' && key !== 'constructor') {
        props[key] = value;
      }
    }

    return props;
  }

  getRegisteredQueryTypes(): string[] {
    return Array.from(this.handlers.keys());
  }

  async getCacheStats(): Promise<any> {
    if (!this.cacheService) {
      return { queries: this.handlers.size, cached: 0, cacheEnabled: false };
    }

    try {
      const stats = await this.cacheService.getStats();
      return {
        queries: this.handlers.size,
        ...stats,
        cacheEnabled: true
      };
    } catch (error) {
      logger.error('Error getting cache stats:', error);
      return { queries: this.handlers.size, cached: 0, cacheEnabled: false, error: error.message };
    }
  }

  async invalidateCache(pattern?: string): Promise<number> {
    if (!this.cacheService) {
      logger.warn('Cache service not available for invalidation');
      return 0;
    }

    try {
      const searchPattern = pattern || 'query:*';
      const deletedCount = await this.cacheService.invalidatePattern(searchPattern);
      logger.info(`Invalidated ${deletedCount} cached queries`);
      return deletedCount;
    } catch (error) {
      logger.error('Error invalidating cache:', error);
      return 0;
    }
  }

  async invalidateCacheForUser(userId: string): Promise<number> {
    if (!this.cacheService) {
      logger.warn('Cache service not available for user cache invalidation');
      return 0;
    }

    try {
      const deletedCount = await this.cacheService.invalidateUserCache(userId);
      logger.info(`Invalidated ${deletedCount} cached entries for user ${userId}`);
      return deletedCount;
    } catch (error) {
      logger.error(`Error invalidating cache for user ${userId}:`, error);
      return 0;
    }
  }

  // Advanced caching methods

  async warmupQueries(commonQueries: Array<{query: Query, options?: QueryCacheOptions}>): Promise<void> {
    if (!this.cacheService) {
      logger.warn('Cache service not available for query warmup');
      return;
    }

    logger.info(`Warming up ${commonQueries.length} common queries...`);

    const warmupPromises = commonQueries.map(async ({query, options}) => {
      try {
        await this.dispatch(query, { ...options, cache: true });
      } catch (error) {
        logger.error(`Error warming up query ${query.constructor.name}:`, error);
      }
    });

    await Promise.all(warmupPromises);
    logger.info('Query warmup completed');
  }

  async preloadUserQueries(userId: string, queryTypes: string[]): Promise<void> {
    if (!this.cacheService) {
      logger.warn('Cache service not available for user query preloading');
      return;
    }

    logger.info(`Preloading queries for user ${userId}: ${queryTypes.join(', ')}`);

    // This would typically involve creating common queries for the user
    // For now, just log the intent
    logger.info(`User query preloading placeholder for ${userId}`);
  }
}

export class QueryCacheCleanupService {
  private cleanupInterval?: NodeJS.Timeout;

  constructor(private queryBus: QueryBusImpl) {}

  start(intervalMinutes = 30): void {
    if (this.cleanupInterval) {
      return; // Already started
    }

    const intervalMs = intervalMinutes * 60 * 1000;

    this.cleanupInterval = setInterval(async () => {
      try {
        logger.debug('Running query cache cleanup...');
        const stats = await this.queryBus.getCacheStats();
        logger.debug(`Current cache stats: ${JSON.stringify(stats)}`);
      } catch (error) {
        logger.error('Error during cache cleanup:', error);
      }
    }, intervalMs);

    logger.info(`Query cache cleanup service started (interval: ${intervalMinutes} minutes)`);
  }

  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
      logger.info('Query cache cleanup service stopped');
    }
  }
}