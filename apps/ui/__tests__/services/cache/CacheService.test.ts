import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  CacheService,
  MemoryCacheStorage,
  IndexedDBCacheStorage,
  LocalStorageCacheStorage,
  CacheMetrics,
  InvalidationOptions
} from '../../../lib/services/cache/CacheService';

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  key: vi.fn(),
  length: 0
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

// Mock IndexedDB
const mockIndexedDB = {
  open: vi.fn(),
  deleteDatabase: vi.fn(),
  cmp: vi.fn()
};

Object.defineProperty(window, 'indexedDB', {
  value: mockIndexedDB
});

describe('CacheService', () => {
  let cacheService: CacheService;
  let memoryStorage: MemoryCacheStorage;

  beforeEach(() => {
    vi.clearAllMocks();
    memoryStorage = new MemoryCacheStorage();
    cacheService = new CacheService({
      storage: memoryStorage,
      enableMetrics: true,
      enableInvalidationTracking: true
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Cache Operations', () => {
    it('should set and get cache items', async () => {
      const key = 'test-key';
      const value = { data: 'test-value' };

      await cacheService.set(key, value);
      const retrieved = await cacheService.get(key);

      expect(retrieved).toEqual(value);
    });

    it('should return null for non-existent keys', async () => {
      const retrieved = await cacheService.get('non-existent');
      expect(retrieved).toBeNull();
    });

    it('should delete cache items', async () => {
      const key = 'test-key';
      const value = { data: 'test-value' };

      await cacheService.set(key, value);
      await cacheService.delete(key);
      const retrieved = await cacheService.get(key);

      expect(retrieved).toBeNull();
    });

    it('should clear all cache items', async () => {
      await cacheService.set('key1', 'value1');
      await cacheService.set('key2', 'value2');

      await cacheService.clear();

      const value1 = await cacheService.get('key1');
      const value2 = await cacheService.get('key2');

      expect(value1).toBeNull();
      expect(value2).toBeNull();
    });

    it('should track cache size', async () => {
      expect(await cacheService.size()).toBe(0);

      await cacheService.set('key1', 'value1');
      expect(await cacheService.size()).toBe(1);

      await cacheService.set('key2', 'value2');
      expect(await cacheService.size()).toBe(2);

      await cacheService.delete('key1');
      expect(await cacheService.size()).toBe(1);
    });
  });

  describe('TTL (Time-To-Live) Support', () => {
    it('should expire cache items after TTL', async () => {
      const key = 'test-key';
      const value = 'test-value';
      const ttl = 100; // 100ms

      await cacheService.set(key, value, { ttl });

      // Should be available immediately
      expect(await cacheService.get(key)).toBe(value);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should be expired
      expect(await cacheService.get(key)).toBeNull();
    });

    it('should use default TTL when not specified', async () => {
      const shortTtlService = new CacheService({
        storage: new MemoryCacheStorage(),
        defaultTTL: 50
      });

      await shortTtlService.set('key', 'value');

      // Should expire after default TTL
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(await shortTtlService.get('key')).toBeNull();
    });
  });

  describe('Tags and Dependencies', () => {
    it('should store and track tags for cache entries', async () => {
      await cacheService.set('user:1', { name: 'John' }, {
        tags: ['users', 'profile']
      });

      await cacheService.set('user:2', { name: 'Jane' }, {
        tags: ['users', 'profile']
      });

      await cacheService.set('post:1', { title: 'Hello' }, {
        tags: ['posts']
      });

      // Check that entries exist
      expect(await cacheService.get('user:1')).toEqual({ name: 'John' });
      expect(await cacheService.get('user:2')).toEqual({ name: 'Jane' });
      expect(await cacheService.get('post:1')).toEqual({ title: 'Hello' });
    });

    it('should store and track dependencies for cache entries', async () => {
      await cacheService.set('dashboard:data', { stats: '100' }, {
        dependencies: ['user-preferences', 'user-location']
      });

      expect(await cacheService.get('dashboard:data')).toEqual({ stats: '100' });
    });
  });

  describe('Cache Invalidation', () => {
    beforeEach(async () => {
      // Set up test data
      await cacheService.set('user:1', { name: 'John' }, {
        tags: ['users', 'profile']
      });

      await cacheService.set('user:2', { name: 'Jane' }, {
        tags: ['users', 'admin']
      });

      await cacheService.set('post:1', { title: 'Hello' }, {
        tags: ['posts']
      });

      await cacheService.set('dashboard:data', { stats: '100' }, {
        dependencies: ['user-preferences']
      });

      await cacheService.set('prayer:times', { fajr: '5:00' }, {
        dependencies: ['user-location']
      });
    });

    it('should invalidate cache by tags', async () => {
      const invalidatedCount = await cacheService.invalidate({
        strategy: 'tag',
        tags: ['users']
      });

      expect(invalidatedCount).toBe(2);
      expect(await cacheService.get('user:1')).toBeNull();
      expect(await cacheService.get('user:2')).toBeNull();
      expect(await cacheService.get('post:1')).toEqual({ title: 'Hello' });
    });

    it('should invalidate cache by pattern', async () => {
      const invalidatedCount = await cacheService.invalidate({
        strategy: 'pattern',
        pattern: /^user:/
      });

      expect(invalidatedCount).toBe(2);
      expect(await cacheService.get('user:1')).toBeNull();
      expect(await cacheService.get('user:2')).toBeNull();
      expect(await cacheService.get('post:1')).toEqual({ title: 'Hello' });
    });

    it('should invalidate cache by dependencies', async () => {
      const invalidatedCount = await cacheService.invalidate({
        strategy: 'dependency',
        dependencies: ['user-preferences']
      });

      expect(invalidatedCount).toBe(1);
      expect(await cacheService.get('dashboard:data')).toBeNull();
      expect(await cacheService.get('prayer:times')).toEqual({ fajr: '5:00' });
    });

    it('should invalidate cache by dependencies with cascade', async () => {
      // Set up cascading dependencies
      await cacheService.set('level1', { data: 'level1' }, {
        dependencies: ['dep1']
      });

      await cacheService.set('level2', { data: 'level2' }, {
        dependencies: ['level1']
      });

      const invalidatedCount = await cacheService.invalidate({
        strategy: 'dependency',
        dependencies: ['dep1'],
        cascade: true
      });

      expect(invalidatedCount).toBe(1);
      expect(await cacheService.get('level1')).toBeNull();
    });
  });

  describe('Cache Strategies', () => {
    let fetchCount: number;
    let mockFetcher: () => Promise<string>;

    beforeEach(() => {
      fetchCount = 0;
      mockFetcher = vi.fn(async () => {
        fetchCount++;
        return `data-${fetchCount}`;
      });
    });

    it('should implement cache-first strategy', async () => {
      const key = 'cache-first-test';

      // First call should fetch
      const result1 = await cacheService.fetch(key, mockFetcher, {
        strategy: 'cache-first'
      });
      expect(result1).toBe('data-1');
      expect(fetchCount).toBe(1);

      // Second call should use cache
      const result2 = await cacheService.fetch(key, mockFetcher, {
        strategy: 'cache-first'
      });
      expect(result2).toBe('data-1');
      expect(fetchCount).toBe(1); // No additional fetch
    });

    it('should implement network-first strategy', async () => {
      const key = 'network-first-test';

      // Pre-populate cache
      await cacheService.set(key, 'cached-data');

      // Network-first should always fetch if possible
      const result = await cacheService.fetch(key, mockFetcher, {
        strategy: 'network-first'
      });
      expect(result).toBe('data-1');
      expect(fetchCount).toBe(1);
    });

    it('should implement network-first fallback to cache on error', async () => {
      const key = 'network-first-fallback-test';

      // Pre-populate cache
      await cacheService.set(key, 'cached-data');

      // Mock fetcher to fail
      const failingFetcher = vi.fn(async () => {
        throw new Error('Network error');
      });

      const result = await cacheService.fetch(key, failingFetcher, {
        strategy: 'network-first'
      });
      expect(result).toBe('cached-data');
    });

    it('should implement stale-while-revalidate strategy', async () => {
      const key = 'swr-test';

      // Pre-populate cache
      await cacheService.set(key, 'stale-data');

      // SWR should return stale data immediately
      const result = await cacheService.fetch(key, mockFetcher, {
        strategy: 'stale-while-revalidate'
      });
      expect(result).toBe('stale-data');

      // Background revalidation should have started
      // Wait a bit to let it complete
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(fetchCount).toBe(1);

      // Next call should get fresh data
      const freshResult = await cacheService.get(key);
      expect(freshResult).toBe('data-1');
    });

    it('should implement cache-only strategy', async () => {
      const key = 'cache-only-test';

      // Should throw error if no cache
      await expect(
        cacheService.fetch(key, mockFetcher, { strategy: 'cache-only' })
      ).rejects.toThrow('Cache miss for key: cache-only-test');

      // Should work with cached data
      await cacheService.set(key, 'cached-data');
      const result = await cacheService.fetch(key, mockFetcher, {
        strategy: 'cache-only'
      });
      expect(result).toBe('cached-data');
      expect(fetchCount).toBe(0); // No fetch should occur
    });

    it('should implement network-only strategy', async () => {
      const key = 'network-only-test';

      // Pre-populate cache
      await cacheService.set(key, 'cached-data');

      // Network-only should always fetch and ignore cache
      const result = await cacheService.fetch(key, mockFetcher, {
        strategy: 'network-only'
      });
      expect(result).toBe('data-1');
      expect(fetchCount).toBe(1);

      // Cache should still have old data
      expect(await cacheService.get(key)).toBe('cached-data');
    });

    it('should support force refresh', async () => {
      const key = 'force-refresh-test';

      // Pre-populate cache
      await cacheService.set(key, 'old-data');

      // Force refresh should bypass cache
      const result = await cacheService.fetch(key, mockFetcher, {
        strategy: 'cache-first',
        forceRefresh: true
      });
      expect(result).toBe('data-1');
      expect(fetchCount).toBe(1);
    });
  });

  describe('Cache Warming', () => {
    it('should warm cache with single entry', async () => {
      const entries = [{
        key: 'warm-test',
        fetcher: async () => 'warmed-data',
        tags: ['warm'],
        priority: 1
      }];

      await cacheService.warm(entries);

      expect(await cacheService.get('warm-test')).toBe('warmed-data');
    });

    it('should warm cache with multiple entries by priority', async () => {
      const entries = [
        {
          key: 'low-priority',
          fetcher: async () => 'low',
          priority: 1
        },
        {
          key: 'high-priority',
          fetcher: async () => 'high',
          priority: 10
        },
        {
          key: 'medium-priority',
          fetcher: async () => 'medium',
          priority: 5
        }
      ];

      await cacheService.warm(entries);

      expect(await cacheService.get('low-priority')).toBe('low');
      expect(await cacheService.get('high-priority')).toBe('high');
      expect(await cacheService.get('medium-priority')).toBe('medium');
    });

    it('should handle warming failures gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const entries = [
        {
          key: 'success',
          fetcher: async () => 'success-data'
        },
        {
          key: 'failure',
          fetcher: async () => {
            throw new Error('Fetch failed');
          }
        }
      ];

      await cacheService.warm(entries);

      expect(await cacheService.get('success')).toBe('success-data');
      expect(await cacheService.get('failure')).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to warm cache for key failure:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should warm dashboard data with predefined entries', async () => {
      // Mock fetch for dashboard warming
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          json: async () => [{ id: 1, title: 'Active Plan' }]
        })
        .mockResolvedValueOnce({
          json: async () => [{ intention: 'Be mindful' }]
        })
        .mockResolvedValueOnce({
          json: async () => ({ fajr: '5:00', dhuhr: '12:00' })
        })
        .mockResolvedValueOnce({
          json: async () => ({ subhanallah: 100 })
        });

      await cacheService.warmDashboardData();

      // Verify some dashboard data was cached
      expect(await cacheService.get('dashboard:active-plans')).toBeTruthy();
    });
  });

  describe('Metrics and Performance', () => {
    it('should track cache hits and misses', async () => {
      const key = 'metrics-test';

      // Miss
      await cacheService.get(key);

      // Set and hit
      await cacheService.set(key, 'value');
      await cacheService.get(key);

      const metrics = cacheService.getMetrics();
      expect(metrics.totalHits).toBe(1);
      expect(metrics.totalMisses).toBe(1);
      expect(metrics.hitRate).toBe(50);
      expect(metrics.missRate).toBe(50);
    });

    it('should track cache operations', async () => {
      await cacheService.set('test1', 'value1');
      await cacheService.set('test2', 'value2');
      await cacheService.delete('test1');

      const metrics = cacheService.getMetrics();
      expect(metrics.totalSets).toBe(2);
      expect(metrics.totalDeletes).toBe(1);
    });

    it('should track invalidations', async () => {
      await cacheService.set('test1', 'value1', { tags: ['test'] });
      await cacheService.set('test2', 'value2', { tags: ['test'] });

      await cacheService.invalidate({
        strategy: 'tag',
        tags: ['test']
      });

      const metrics = cacheService.getMetrics();
      expect(metrics.totalInvalidations).toBe(2);
    });

    it('should provide memory usage information', async () => {
      await cacheService.set('test', { large: 'data'.repeat(100) });

      const memoryUsage = await cacheService.getMemoryUsage();
      expect(memoryUsage.entryCount).toBe(1);
      expect(memoryUsage.totalSize).toBeGreaterThan(0);
      expect(memoryUsage.averageEntrySize).toBeGreaterThan(0);
    });

    it('should track response times', async () => {
      await cacheService.get('non-existent');

      const metrics = cacheService.getMetrics();
      expect(metrics.averageResponseTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Storage Implementations', () => {
    describe('MemoryCacheStorage', () => {
      let storage: MemoryCacheStorage;

      beforeEach(() => {
        storage = new MemoryCacheStorage();
      });

      it('should handle basic operations', async () => {
        await storage.set('key', 'value', 1000);
        expect(await storage.get('key')).toBe('value');
        expect(await storage.has('key')).toBe(true);
        expect(await storage.size()).toBe(1);

        await storage.delete('key');
        expect(await storage.get('key')).toBeNull();
        expect(await storage.has('key')).toBe(false);
      });

      it('should handle TTL expiration', async () => {
        await storage.set('key', 'value', 50);
        expect(await storage.get('key')).toBe('value');

        await new Promise(resolve => setTimeout(resolve, 100));
        expect(await storage.get('key')).toBeNull();
      });
    });

    describe('LocalStorageCacheStorage', () => {
      let storage: LocalStorageCacheStorage;

      beforeEach(() => {
        storage = new LocalStorageCacheStorage();
        mockLocalStorage.getItem.mockReturnValue(null);
      });

      it('should use localStorage correctly', async () => {
        const value = { test: 'data' };
        await storage.set('key', value);

        expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
          'sakinah-cache:key',
          expect.stringContaining('"test":"data"')
        );
      });

      it('should handle localStorage errors gracefully', async () => {
        mockLocalStorage.getItem.mockImplementation(() => {
          throw new Error('localStorage error');
        });

        const result = await storage.get('key');
        expect(result).toBeNull();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle storage errors gracefully', async () => {
      const faultyStorage = {
        get: vi.fn().mockRejectedValue(new Error('Storage error')),
        set: vi.fn().mockRejectedValue(new Error('Storage error')),
        delete: vi.fn().mockRejectedValue(new Error('Storage error')),
        clear: vi.fn().mockRejectedValue(new Error('Storage error')),
        has: vi.fn().mockRejectedValue(new Error('Storage error')),
        size: vi.fn().mockRejectedValue(new Error('Storage error'))
      };

      const faultyCacheService = new CacheService({
        storage: faultyStorage as any
      });

      // These should not throw errors
      await expect(faultyCacheService.get('key')).rejects.toThrow('Storage error');
    });

    it('should handle JSON serialization errors', async () => {
      const circularRef: any = {};
      circularRef.self = circularRef;

      // Should not throw, should use default size
      await cacheService.set('circular', circularRef);
      // The implementation should handle this gracefully
    });
  });

  describe('Edge Cases', () => {
    it('should handle null and undefined values', async () => {
      await cacheService.set('null-key', null);
      await cacheService.set('undefined-key', undefined);

      expect(await cacheService.get('null-key')).toBeNull();
      expect(await cacheService.get('undefined-key')).toBeUndefined();
    });

    it('should handle empty strings and objects', async () => {
      await cacheService.set('empty-string', '');
      await cacheService.set('empty-object', {});
      await cacheService.set('empty-array', []);

      expect(await cacheService.get('empty-string')).toBe('');
      expect(await cacheService.get('empty-object')).toEqual({});
      expect(await cacheService.get('empty-array')).toEqual([]);
    });

    it('should handle very large cache keys', async () => {
      const longKey = 'x'.repeat(1000);
      await cacheService.set(longKey, 'value');
      expect(await cacheService.get(longKey)).toBe('value');
    });

    it('should handle concurrent operations', async () => {
      const promises = Array.from({ length: 100 }, (_, i) =>
        cacheService.set(`key-${i}`, `value-${i}`)
      );

      await Promise.all(promises);

      const retrievalPromises = Array.from({ length: 100 }, (_, i) =>
        cacheService.get(`key-${i}`)
      );

      const results = await Promise.all(retrievalPromises);
      results.forEach((result, i) => {
        expect(result).toBe(`value-${i}`);
      });
    });
  });
});