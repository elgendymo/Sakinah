/**
 * Cache Storage Strategy Interface
 */
export interface CacheStorage {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  has(key: string): Promise<boolean>;
  size(): Promise<number>;
}

/**
 * In-Memory Cache Storage
 *
 * Simple memory-based cache storage
 */
export class MemoryCacheStorage implements CacheStorage {
  private cache: Map<string, { value: any; expires: number }> = new Map();

  public async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key);

    if (!item) return null;

    if (item.expires > 0 && item.expires < Date.now()) {
      this.cache.delete(key);
      return null;
    }

    return item.value as T;
  }

  public async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const expires = ttl ? Date.now() + ttl : 0;
    this.cache.set(key, { value, expires });
  }

  public async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  public async clear(): Promise<void> {
    this.cache.clear();
  }

  public async has(key: string): Promise<boolean> {
    const item = this.cache.get(key);
    if (!item) return false;

    if (item.expires > 0 && item.expires < Date.now()) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  public async size(): Promise<number> {
    // Clean up expired items first
    for (const [key, item] of this.cache.entries()) {
      if (item.expires > 0 && item.expires < Date.now()) {
        this.cache.delete(key);
      }
    }
    return this.cache.size;
  }
}

/**
 * IndexedDB Cache Storage
 *
 * Browser IndexedDB-based cache storage for larger datasets
 */
export class IndexedDBCacheStorage implements CacheStorage {
  private dbName: string;
  private storeName: string;
  private db: IDBDatabase | null = null;

  constructor(dbName: string = 'sakinah-cache', storeName: string = 'cache-store') {
    this.dbName = dbName;
    this.storeName = storeName;
  }

  private async getDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'key' });
        }
      };
    });
  }

  public async get<T>(key: string): Promise<T | null> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result;

        if (!result) {
          resolve(null);
          return;
        }

        if (result.expires > 0 && result.expires < Date.now()) {
          this.delete(key);
          resolve(null);
          return;
        }

        resolve(result.value as T);
      };
    });
  }

  public async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const db = await this.getDB();
    const expires = ttl ? Date.now() + ttl : 0;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put({ key, value, expires });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  public async delete(key: string): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  public async clear(): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  public async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }

  public async size(): Promise<number> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.count();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }
}

/**
 * Local Storage Cache Storage
 *
 * Browser localStorage-based cache storage
 */
export class LocalStorageCacheStorage implements CacheStorage {
  private prefix: string;

  constructor(prefix: string = 'sakinah-cache:') {
    this.prefix = prefix;
  }

  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  public async get<T>(key: string): Promise<T | null> {
    try {
      const item = localStorage.getItem(this.getKey(key));
      if (!item) return null;

      const parsed = JSON.parse(item);

      if (parsed.expires > 0 && parsed.expires < Date.now()) {
        localStorage.removeItem(this.getKey(key));
        return null;
      }

      return parsed.value as T;
    } catch {
      return null;
    }
  }

  public async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const expires = ttl ? Date.now() + ttl : 0;
    const item = JSON.stringify({ value, expires });
    localStorage.setItem(this.getKey(key), item);
  }

  public async delete(key: string): Promise<void> {
    localStorage.removeItem(this.getKey(key));
  }

  public async clear(): Promise<void> {
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith(this.prefix)) {
        localStorage.removeItem(key);
      }
    }
  }

  public async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }

  public async size(): Promise<number> {
    const keys = Object.keys(localStorage);
    return keys.filter(key => key.startsWith(this.prefix)).length;
  }
}

/**
 * Cache Strategy Type
 */
export type CacheStrategy = 'cache-first' | 'network-first' | 'stale-while-revalidate' | 'cache-only' | 'network-only';

/**
 * Cache Invalidation Strategy
 */
export type InvalidationStrategy = 'pattern' | 'tag' | 'dependency' | 'manual';

/**
 * Cache Entry Metadata
 */
export interface CacheEntryMetadata {
  key: string;
  tags?: string[];
  dependencies?: string[];
  createdAt: number;
  lastAccessed: number;
  accessCount: number;
  size: number;
}

/**
 * Cache Invalidation Options
 */
export interface InvalidationOptions {
  strategy: InvalidationStrategy;
  pattern?: string | RegExp;
  tags?: string[];
  dependencies?: string[];
  cascade?: boolean;
}

/**
 * Cache Service Configuration
 */
export interface CacheServiceConfig {
  storage?: CacheStorage;
  defaultTTL?: number;
  maxSize?: number;
  strategy?: CacheStrategy;
  enableMetrics?: boolean;
  enableInvalidationTracking?: boolean;
  maxMemoryUsage?: number; // in bytes
  compressionThreshold?: number; // compress entries larger than this size
}

/**
 * Unified Cache Service
 *
 * Provides caching with multiple storage strategies and cache strategies
 * Enhanced with advanced invalidation patterns, metrics, and performance monitoring
 */
export class CacheService {
  private storage: CacheStorage;
  private defaultTTL: number;
  private maxSize: number;
  private strategy: CacheStrategy;
  private metadata: Map<string, CacheEntryMetadata> = new Map();
  private tagIndex: Map<string, Set<string>> = new Map(); // tag -> keys
  private dependencyIndex: Map<string, Set<string>> = new Map(); // dependency -> keys
  private metrics: CacheMetrics;
  private enableMetrics: boolean;
  private enableInvalidationTracking: boolean;
  private maxMemoryUsage: number;

  constructor(config: CacheServiceConfig = {}) {
    this.storage = config.storage || new MemoryCacheStorage();
    this.defaultTTL = config.defaultTTL || 300000; // 5 minutes default
    this.maxSize = config.maxSize || 100;
    this.strategy = config.strategy || 'cache-first';
    this.enableMetrics = config.enableMetrics ?? true;
    this.enableInvalidationTracking = config.enableInvalidationTracking ?? true;
    this.maxMemoryUsage = config.maxMemoryUsage || 50 * 1024 * 1024; // 50MB default
    this.metrics = new CacheMetrics();
  }

  /**
   * Get item from cache with access tracking
   */
  public async get<T>(key: string): Promise<T | null> {
    const value = await this.storage.get<T>(key);

    // Update access metadata
    if (value !== null && this.enableInvalidationTracking) {
      const metadata = this.metadata.get(key);
      if (metadata) {
        metadata.lastAccessed = Date.now();
        metadata.accessCount++;
        this.metadata.set(key, metadata);
      }
    }

    // Update metrics
    if (this.enableMetrics) {
      this.metrics.recordGet(key, value !== null);
    }

    return value;
  }

  /**
   * Set item in cache with enhanced metadata tracking
   */
  public async set<T>(
    key: string,
    value: T,
    options: {
      ttl?: number;
      tags?: string[];
      dependencies?: string[];
    } = {}
  ): Promise<void> {
    const { ttl = this.defaultTTL, tags = [], dependencies = [] } = options;

    // Check cache size and evict if necessary
    const size = await this.storage.size();
    if (size >= this.maxSize) {
      await this.evictOldest();
    }

    // Calculate entry size for memory tracking
    const entrySize = this.calculateEntrySize(value);

    // Track metadata
    if (this.enableInvalidationTracking) {
      const metadata: CacheEntryMetadata = {
        key,
        tags,
        dependencies,
        createdAt: Date.now(),
        lastAccessed: Date.now(),
        accessCount: 0,
        size: entrySize
      };

      this.metadata.set(key, metadata);

      // Update tag index
      tags.forEach(tag => {
        if (!this.tagIndex.has(tag)) {
          this.tagIndex.set(tag, new Set());
        }
        this.tagIndex.get(tag)!.add(key);
      });

      // Update dependency index
      dependencies.forEach(dep => {
        if (!this.dependencyIndex.has(dep)) {
          this.dependencyIndex.set(dep, new Set());
        }
        this.dependencyIndex.get(dep)!.add(key);
      });
    }

    // Update metrics
    if (this.enableMetrics) {
      this.metrics.recordSet(key, entrySize);
    }

    return this.storage.set(key, value, ttl);
  }

  /**
   * Delete item from cache with metadata cleanup
   */
  public async delete(key: string): Promise<void> {
    // Clean up metadata and indexes
    const metadata = this.metadata.get(key);
    if (metadata) {
      // Remove from tag index
      metadata.tags?.forEach(tag => {
        const taggedKeys = this.tagIndex.get(tag);
        if (taggedKeys) {
          taggedKeys.delete(key);
          if (taggedKeys.size === 0) {
            this.tagIndex.delete(tag);
          }
        }
      });

      // Remove from dependency index
      metadata.dependencies?.forEach(dep => {
        const dependentKeys = this.dependencyIndex.get(dep);
        if (dependentKeys) {
          dependentKeys.delete(key);
          if (dependentKeys.size === 0) {
            this.dependencyIndex.delete(dep);
          }
        }
      });

      this.metadata.delete(key);
    }

    // Update metrics
    if (this.enableMetrics) {
      this.metrics.recordDelete(key);
    }

    return this.storage.delete(key);
  }

  /**
   * Clear all cache
   */
  public async clear(): Promise<void> {
    return this.storage.clear();
  }

  /**
   * Check if key exists in cache
   */
  public async has(key: string): Promise<boolean> {
    return this.storage.has(key);
  }

  /**
   * Get cache size
   */
  public async size(): Promise<number> {
    return this.storage.size();
  }

  /**
   * Implement cache strategy for fetching with enhanced options
   */
  public async fetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: {
      ttl?: number;
      strategy?: CacheStrategy;
      tags?: string[];
      dependencies?: string[];
      forceRefresh?: boolean;
      backgroundRefresh?: boolean;
    } = {}
  ): Promise<T> {
    const {
      strategy = this.strategy,
      ttl = this.defaultTTL,
      tags = [],
      dependencies = [],
      forceRefresh = false,
      backgroundRefresh = false
    } = options;

    // Force refresh bypasses cache
    if (forceRefresh) {
      const fresh = await fetcher();
      await this.set(key, fresh, { ttl, tags, dependencies });
      return fresh;
    }

    switch (strategy) {
      case 'cache-first':
        return this.cacheFirst(key, fetcher, { ttl, tags, dependencies });

      case 'network-first':
        return this.networkFirst(key, fetcher, { ttl, tags, dependencies });

      case 'stale-while-revalidate':
        return this.staleWhileRevalidate(key, fetcher, { ttl, tags, dependencies, backgroundRefresh });

      case 'cache-only':
        return this.cacheOnly(key);

      case 'network-only':
        return this.networkOnly(fetcher);

      default:
        return this.cacheFirst(key, fetcher, { ttl, tags, dependencies });
    }
  }

  /**
   * Cache-first strategy
   */
  private async cacheFirst<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: { ttl: number; tags?: string[]; dependencies?: string[] }
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const fresh = await fetcher();
    await this.set(key, fresh, options);
    return fresh;
  }

  /**
   * Network-first strategy
   */
  private async networkFirst<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: { ttl: number; tags?: string[]; dependencies?: string[] }
  ): Promise<T> {
    try {
      const fresh = await fetcher();
      await this.set(key, fresh, options);
      return fresh;
    } catch (error) {
      const cached = await this.get<T>(key);
      if (cached !== null) return cached;
      throw error;
    }
  }

  /**
   * Stale-while-revalidate strategy
   */
  private async staleWhileRevalidate<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: {
      ttl: number;
      tags?: string[];
      dependencies?: string[];
      backgroundRefresh?: boolean;
    }
  ): Promise<T> {
    const cached = await this.get<T>(key);

    // Return stale data immediately if available
    if (cached !== null) {
      // Revalidate in background (unless explicitly disabled)
      if (options.backgroundRefresh !== false) {
        fetcher().then(fresh => {
          this.set(key, fresh, options);
        }).catch(() => {
          // Silently fail background update
        });
      }

      return cached;
    }

    // No cache, fetch fresh
    const fresh = await fetcher();
    await this.set(key, fresh, options);
    return fresh;
  }

  /**
   * Cache-only strategy
   */
  private async cacheOnly<T>(key: string): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached === null) {
      throw new Error(`Cache miss for key: ${key}`);
    }
    return cached;
  }

  /**
   * Network-only strategy
   */
  private async networkOnly<T>(fetcher: () => Promise<T>): Promise<T> {
    return fetcher();
  }

  /**
   * Evict oldest cache entry (simple LRU)
   */
  private async evictOldest(): Promise<void> {
    // For now, just clear 10% of cache
    // In production, implement proper LRU eviction
    const size = await this.size();
    const toEvict = Math.ceil(size * 0.1);

    if (toEvict > 0) {
      // This would need proper implementation based on storage type
      // For now, we'll just clear if over max size
      if (size >= this.maxSize) {
        await this.clear();
      }
    }
  }

  /**
   * Advanced cache invalidation with multiple strategies
   */
  public async invalidate(options: InvalidationOptions): Promise<number> {
    let invalidatedCount = 0;

    switch (options.strategy) {
      case 'pattern':
        invalidatedCount = await this.invalidateByPattern(options.pattern!);
        break;

      case 'tag':
        invalidatedCount = await this.invalidateByTags(options.tags!);
        break;

      case 'dependency':
        invalidatedCount = await this.invalidateByDependencies(options.dependencies!, options.cascade);
        break;

      case 'manual':
        // Manual invalidation requires specific keys
        break;
    }

    if (this.enableMetrics) {
      this.metrics.recordInvalidation(options.strategy, invalidatedCount);
    }

    return invalidatedCount;
  }

  /**
   * Invalidate cache entries by pattern
   */
  private async invalidateByPattern(pattern: string | RegExp): Promise<number> {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    const keysToInvalidate: string[] = [];

    for (const [key] of this.metadata) {
      if (regex.test(key)) {
        keysToInvalidate.push(key);
      }
    }

    await Promise.all(keysToInvalidate.map(key => this.delete(key)));
    return keysToInvalidate.length;
  }

  /**
   * Invalidate cache entries by tags
   */
  private async invalidateByTags(tags: string[]): Promise<number> {
    const keysToInvalidate = new Set<string>();

    tags.forEach(tag => {
      const taggedKeys = this.tagIndex.get(tag);
      if (taggedKeys) {
        taggedKeys.forEach(key => keysToInvalidate.add(key));
      }
    });

    await Promise.all(Array.from(keysToInvalidate).map(key => this.delete(key)));
    return keysToInvalidate.size;
  }

  /**
   * Invalidate cache entries by dependencies
   */
  private async invalidateByDependencies(dependencies: string[], cascade = false): Promise<number> {
    const keysToInvalidate = new Set<string>();
    const processedDependencies = new Set<string>();

    const processDependency = (dep: string) => {
      if (processedDependencies.has(dep)) return;
      processedDependencies.add(dep);

      const dependentKeys = this.dependencyIndex.get(dep);
      if (dependentKeys) {
        dependentKeys.forEach(key => {
          keysToInvalidate.add(key);

          // If cascading, treat each key as a dependency
          if (cascade) {
            const metadata = this.metadata.get(key);
            if (metadata && metadata.dependencies) {
              metadata.dependencies.forEach(processDependency);
            }
          }
        });
      }
    };

    dependencies.forEach(processDependency);

    await Promise.all(Array.from(keysToInvalidate).map(key => this.delete(key)));
    return keysToInvalidate.size;
  }

  /**
   * Get cache statistics and performance metrics
   */
  public getMetrics(): CacheMetricsData {
    return this.metrics.getMetrics();
  }

  /**
   * Get memory usage information
   */
  public async getMemoryUsage(): Promise<{
    totalSize: number;
    entryCount: number;
    averageEntrySize: number;
    memoryUsagePercentage: number;
  }> {
    const entryCount = await this.size();
    const totalSize = Array.from(this.metadata.values())
      .reduce((sum, meta) => sum + meta.size, 0);

    return {
      totalSize,
      entryCount,
      averageEntrySize: entryCount > 0 ? totalSize / entryCount : 0,
      memoryUsagePercentage: (totalSize / this.maxMemoryUsage) * 100
    };
  }

  /**
   * Calculate the size of a cache entry
   */
  private calculateEntrySize(value: any): number {
    try {
      return JSON.stringify(value).length * 2; // Approximate UTF-16 encoding
    } catch {
      return 1024; // Default size if serialization fails
    }
  }

  /**
   * Warm cache with prefetched data and intelligent scheduling
   */
  public async warm<T>(
    entries: Array<{
      key: string;
      fetcher: () => Promise<T>;
      ttl?: number;
      tags?: string[];
      dependencies?: string[];
      priority?: number;
    }>
  ): Promise<void> {
    // Sort by priority (higher numbers first)
    const sortedEntries = entries.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    // Process in batches to avoid overwhelming the system
    const batchSize = 5;
    for (let i = 0; i < sortedEntries.length; i += batchSize) {
      const batch = sortedEntries.slice(i, i + batchSize);
      const promises = batch.map(async ({ key, fetcher, ttl, tags, dependencies }) => {
        try {
          const data = await fetcher();
          await this.set(key, data, { ttl, tags, dependencies });
        } catch (error) {
          console.error(`Failed to warm cache for key ${key}:`, error);
        }
      });

      await Promise.all(promises);
    }
  }

  /**
   * Intelligent cache warming for dashboard data
   */
  public async warmDashboardData(): Promise<void> {
    const dashboardWarmingEntries = [
      {
        key: 'dashboard:active-plans',
        fetcher: async () => {
          // This would be replaced with actual API call
          return fetch('/api/v1/plans/active').then(r => r.json());
        },
        ttl: 600000, // 10 minutes
        tags: ['dashboard', 'plans'],
        priority: 10
      },
      {
        key: 'dashboard:today-intentions',
        fetcher: async () => {
          const today = new Date().toISOString().split('T')[0];
          return fetch(`/api/v1/intentions?date=${today}`).then(r => r.json());
        },
        ttl: 300000, // 5 minutes
        tags: ['dashboard', 'intentions'],
        dependencies: ['user-preferences'],
        priority: 9
      },
      {
        key: 'dashboard:prayer-times',
        fetcher: async () => {
          // Get user location from preferences first
          return fetch('/api/v1/prayer-times').then(r => r.json());
        },
        ttl: 86400000, // 24 hours
        tags: ['dashboard', 'prayer-times'],
        dependencies: ['user-location'],
        priority: 8
      },
      {
        key: 'dashboard:dhikr-counts',
        fetcher: async () => {
          const today = new Date().toISOString().split('T')[0];
          return fetch(`/api/v1/dhikr?date=${today}`).then(r => r.json());
        },
        ttl: 180000, // 3 minutes
        tags: ['dashboard', 'dhikr'],
        priority: 7
      }
    ];

    await this.warm(dashboardWarmingEntries);
  }
}

/**
 * Cache Performance Metrics
 */
export interface CacheMetricsData {
  hitRate: number;
  missRate: number;
  totalHits: number;
  totalMisses: number;
  totalSets: number;
  totalDeletes: number;
  totalInvalidations: number;
  averageResponseTime: number;
  memoryUsage: number;
  evictionCount: number;
}

/**
 * Cache Metrics Collector
 */
export class CacheMetrics {
  private hits = 0;
  private misses = 0;
  private sets = 0;
  private deletes = 0;
  private invalidations = 0;
  private responseTimes: number[] = [];
  private memoryUsage = 0;
  private evictions = 0;

  public recordGet(_key: string, hit: boolean): void {
    const startTime = performance.now();

    if (hit) {
      this.hits++;
    } else {
      this.misses++;
    }

    const responseTime = performance.now() - startTime;
    this.responseTimes.push(responseTime);

    // Keep only last 100 response times for average calculation
    if (this.responseTimes.length > 100) {
      this.responseTimes.shift();
    }
  }

  public recordSet(_key: string, size: number): void {
    this.sets++;
    this.memoryUsage += size;
  }

  public recordDelete(_key: string): void {
    this.deletes++;
  }

  public recordInvalidation(_strategy: InvalidationStrategy, count: number): void {
    this.invalidations += count;
  }

  public recordEviction(): void {
    this.evictions++;
  }

  public getMetrics(): CacheMetricsData {
    const totalRequests = this.hits + this.misses;
    const hitRate = totalRequests > 0 ? (this.hits / totalRequests) * 100 : 0;
    const missRate = totalRequests > 0 ? (this.misses / totalRequests) * 100 : 0;
    const averageResponseTime = this.responseTimes.length > 0
      ? this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length
      : 0;

    return {
      hitRate,
      missRate,
      totalHits: this.hits,
      totalMisses: this.misses,
      totalSets: this.sets,
      totalDeletes: this.deletes,
      totalInvalidations: this.invalidations,
      averageResponseTime,
      memoryUsage: this.memoryUsage,
      evictionCount: this.evictions
    };
  }

  public reset(): void {
    this.hits = 0;
    this.misses = 0;
    this.sets = 0;
    this.deletes = 0;
    this.invalidations = 0;
    this.responseTimes = [];
    this.memoryUsage = 0;
    this.evictions = 0;
  }
}

/**
 * Create cache service based on environment
 */
export function createCacheService(): CacheService {
  if (typeof window === 'undefined') {
    // Server-side: use memory cache
    return new CacheService({
      storage: new MemoryCacheStorage(),
      strategy: 'network-first',
      enableMetrics: true
    });
  }

  // Client-side: use IndexedDB for large data, localStorage for small
  try {
    if ('indexedDB' in window) {
      return new CacheService({
        storage: new IndexedDBCacheStorage(),
        strategy: 'cache-first',
        enableMetrics: true,
        enableInvalidationTracking: true
      });
    }
  } catch {
    // IndexedDB not available
  }

  // Fallback to localStorage
  try {
    if ('localStorage' in window) {
      return new CacheService({
        storage: new LocalStorageCacheStorage(),
        strategy: 'cache-first',
        enableMetrics: true
      });
    }
  } catch {
    // LocalStorage not available
  }

  // Final fallback to memory
  return new CacheService({
    storage: new MemoryCacheStorage(),
    strategy: 'cache-first',
    enableMetrics: true
  });
}