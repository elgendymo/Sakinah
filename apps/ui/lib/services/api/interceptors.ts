import { ApiResponse } from './ApiService';

/**
 * Request Interceptor Context
 */
export interface RequestContext {
  url: string;
  correlationId: string;
  endpoint: string;
}

/**
 * Response Interceptor Context
 */
export interface ResponseContext extends RequestContext {
  attemptCount: number;
}

/**
 * Request Interceptor Interface
 */
export interface RequestInterceptor {
  intercept(config: RequestInit, context: RequestContext): Promise<RequestInit> | RequestInit;
}

/**
 * Response Interceptor Interface
 */
export interface ResponseInterceptor {
  intercept<T>(response: ApiResponse<T>, context: ResponseContext): Promise<ApiResponse<T>> | ApiResponse<T>;
}

/**
 * Authentication Request Interceptor
 *
 * Adds authentication headers and handles token refresh
 */
export class AuthRequestInterceptor implements RequestInterceptor {
  private getToken: () => Promise<string | null> | string | null;
  private refreshToken?: () => Promise<string | null>;

  constructor(
    getToken: () => Promise<string | null> | string | null,
    refreshToken?: () => Promise<string | null>
  ) {
    this.getToken = getToken;
    this.refreshToken = refreshToken;
  }

  public async intercept(config: RequestInit, _context: RequestContext): Promise<RequestInit> {
    const token = await Promise.resolve(this.getToken());

    if (token) {
      config.headers = {
        ...config.headers,
        'Authorization': `Bearer ${token}`
      };
    }

    return config;
  }

  public async handleTokenRefresh(): Promise<string | null> {
    if (!this.refreshToken) return null;
    return this.refreshToken();
  }
}

/**
 * Correlation ID Request Interceptor
 *
 * Ensures correlation ID is present in all requests
 */
export class CorrelationIdRequestInterceptor implements RequestInterceptor {
  public intercept(config: RequestInit, context: RequestContext): RequestInit {
    config.headers = {
      ...config.headers,
      'X-Correlation-ID': context.correlationId,
      'X-Request-ID': `${context.correlationId}-${Date.now()}`
    };

    return config;
  }
}

/**
 * Logging Request Interceptor
 *
 * Logs all outgoing requests for debugging
 */
export class LoggingRequestInterceptor implements RequestInterceptor {
  private logLevel: 'debug' | 'info' | 'warn' | 'error';

  constructor(logLevel: 'debug' | 'info' | 'warn' | 'error' = 'info') {
    this.logLevel = logLevel;
  }

  public intercept(config: RequestInit, context: RequestContext): RequestInit {
    if (this.logLevel === 'debug' || this.logLevel === 'info') {
      console.log(`[API Request] ${config.method} ${context.url}`, {
        correlationId: context.correlationId,
        headers: config.headers,
        body: config.body
      });
    }

    return config;
  }
}

/**
 * Metrics Request Interceptor
 *
 * Tracks request metrics for performance monitoring
 */
export class MetricsRequestInterceptor implements RequestInterceptor {
  private metricsCollector: (metrics: RequestMetrics) => void;

  constructor(metricsCollector: (metrics: RequestMetrics) => void) {
    this.metricsCollector = metricsCollector;
  }

  public intercept(config: RequestInit, context: RequestContext): RequestInit {
    // Add timing header to track request start time
    config.headers = {
      ...config.headers,
      'X-Request-Start': Date.now().toString()
    };

    // Collect request metrics
    this.metricsCollector({
      endpoint: context.endpoint,
      method: config.method || 'GET',
      timestamp: Date.now(),
      correlationId: context.correlationId
    });

    return config;
  }
}

/**
 * Cache Control Response Interceptor
 *
 * Handles cache control headers and caching logic
 */
export class CacheControlResponseInterceptor implements ResponseInterceptor {
  private cacheService?: {
    set: (key: string, value: any, ttl?: number) => Promise<void>;
    get: (key: string) => Promise<any | null>;
  };

  constructor(cacheService?: {
    set: (key: string, value: any, ttl?: number) => Promise<void>;
    get: (key: string) => Promise<any | null>;
  }) {
    this.cacheService = cacheService;
  }

  public async intercept<T>(response: ApiResponse<T>, context: ResponseContext): Promise<ApiResponse<T>> {
    const cacheControl = response.headers.get('Cache-Control');

    if (cacheControl && this.cacheService) {
      const maxAge = this.extractMaxAge(cacheControl);
      if (maxAge > 0) {
        const cacheKey = this.buildCacheKey(context.url);
        await this.cacheService.set(cacheKey, response.data, maxAge * 1000);
      }
    }

    return response;
  }

  private extractMaxAge(cacheControl: string): number {
    const match = cacheControl.match(/max-age=(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  private buildCacheKey(url: string): string {
    return `cache:${url}`;
  }
}

/**
 * Error Logging Response Interceptor
 *
 * Logs error responses for debugging and monitoring
 */
export class ErrorLoggingResponseInterceptor implements ResponseInterceptor {
  public intercept<T>(response: ApiResponse<T>, context: ResponseContext): ApiResponse<T> {
    if (response.status >= 400) {
      console.error(`[API Error] ${context.url}`, {
        status: response.status,
        correlationId: context.correlationId,
        attemptCount: context.attemptCount,
        data: response.data
      });
    }

    return response;
  }
}

/**
 * Retry Response Interceptor
 *
 * Handles retry logic based on response status
 */
export class RetryResponseInterceptor implements ResponseInterceptor {
  private maxRetries: number;
  private retryableStatuses: Set<number>;

  constructor(
    maxRetries: number = 3,
    retryableStatuses: number[] = [408, 429, 500, 502, 503, 504]
  ) {
    this.maxRetries = maxRetries;
    this.retryableStatuses = new Set(retryableStatuses);
  }

  public intercept<T>(response: ApiResponse<T>, context: ResponseContext): ApiResponse<T> {
    if (
      this.retryableStatuses.has(response.status) &&
      context.attemptCount < this.maxRetries
    ) {
      // Mark response for retry (handled by ApiService)
      (response as any).__shouldRetry = true;
    }

    return response;
  }
}

/**
 * Transformation Response Interceptor
 *
 * Transforms response data based on version or format
 */
export class TransformationResponseInterceptor implements ResponseInterceptor {
  private transformer: <T>(data: T, context: ResponseContext) => T;

  constructor(transformer: <T>(data: T, context: ResponseContext) => T) {
    this.transformer = transformer;
  }

  public intercept<T>(response: ApiResponse<T>, context: ResponseContext): ApiResponse<T> {
    if (response.data) {
      response.data = this.transformer(response.data, context);
    }

    return response;
  }
}

/**
 * Performance Response Interceptor
 *
 * Tracks response times and performance metrics
 */
export class PerformanceResponseInterceptor implements ResponseInterceptor {
  private performanceCollector: (metrics: PerformanceMetrics) => void;

  constructor(performanceCollector: (metrics: PerformanceMetrics) => void) {
    this.performanceCollector = performanceCollector;
  }

  public intercept<T>(response: ApiResponse<T>, context: ResponseContext): ApiResponse<T> {
    const requestStart = response.headers.get('X-Request-Start');
    const responseTime = requestStart ? Date.now() - parseInt(requestStart, 10) : 0;

    this.performanceCollector({
      endpoint: context.endpoint,
      correlationId: context.correlationId,
      responseTime,
      status: response.status,
      cached: response.cached,
      attemptCount: context.attemptCount,
      timestamp: Date.now()
    });

    return response;
  }
}

/**
 * Request Metrics Interface
 */
export interface RequestMetrics {
  endpoint: string;
  method: string;
  timestamp: number;
  correlationId: string;
}

/**
 * Performance Metrics Interface
 */
export interface PerformanceMetrics {
  endpoint: string;
  correlationId: string;
  responseTime: number;
  status: number;
  cached: boolean;
  attemptCount: number;
  timestamp: number;
}

/**
 * Interceptor Chain Builder
 *
 * Utility class for building interceptor chains
 */
export class InterceptorChain {
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];

  public addRequestInterceptor(interceptor: RequestInterceptor): this {
    this.requestInterceptors.push(interceptor);
    return this;
  }

  public addResponseInterceptor(interceptor: ResponseInterceptor): this {
    this.responseInterceptors.push(interceptor);
    return this;
  }

  public getRequestInterceptors(): RequestInterceptor[] {
    return [...this.requestInterceptors];
  }

  public getResponseInterceptors(): ResponseInterceptor[] {
    return [...this.responseInterceptors];
  }

  /**
   * Create default interceptor chain for Sakinah application
   */
  public static createDefault(
    getToken?: () => Promise<string | null> | string | null,
    cacheService?: any,
    metricsCollector?: (metrics: RequestMetrics | PerformanceMetrics) => void
  ): InterceptorChain {
    const chain = new InterceptorChain();

    // Add request interceptors
    chain.addRequestInterceptor(new CorrelationIdRequestInterceptor());

    if (getToken) {
      chain.addRequestInterceptor(new AuthRequestInterceptor(getToken));
    }

    if (process.env.NODE_ENV === 'development') {
      chain.addRequestInterceptor(new LoggingRequestInterceptor('debug'));
    }

    if (metricsCollector) {
      chain.addRequestInterceptor(new MetricsRequestInterceptor(metricsCollector as any));
    }

    // Add response interceptors
    if (cacheService) {
      chain.addResponseInterceptor(new CacheControlResponseInterceptor(cacheService));
    }

    if (process.env.NODE_ENV === 'development') {
      chain.addResponseInterceptor(new ErrorLoggingResponseInterceptor());
    }

    if (metricsCollector) {
      chain.addResponseInterceptor(new PerformanceResponseInterceptor(metricsCollector as any));
    }

    chain.addResponseInterceptor(new RetryResponseInterceptor());

    return chain;
  }
}