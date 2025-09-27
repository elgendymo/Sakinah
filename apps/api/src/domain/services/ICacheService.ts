export interface ICacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<boolean>;
  del(key: string): Promise<boolean>;
  exists(key: string): Promise<boolean>;
  invalidatePattern(pattern: string): Promise<number>;
  invalidateUserCache(userId: string): Promise<number>;
  getStats(): Promise<CacheStats>;
}

export interface CacheStats {
  hits: number;
  misses: number;
  keys: number;
  memoryUsage?: string;
  connectionStatus: string;
}

export interface CacheOptions {
  ttlSeconds?: number;
  tags?: string[];
  compression?: boolean;
}