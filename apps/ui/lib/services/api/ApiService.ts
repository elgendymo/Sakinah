import { ErrorCode } from '../../constants/errorCodes';
import { normalizeErrorCode } from '../../ui/errorMap';
import { CacheService, InvalidationOptions } from '../cache/CacheService';
import { RequestInterceptor, ResponseInterceptor } from './interceptors';
import { RequestTransformer, ResponseTransformer } from './transformers';

/**
 * Generate unique correlation ID for request tracking
 */
function generateCorrelationId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * API Request Error with enhanced metadata
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly correlationId: string;
  public readonly errorCode: ErrorCode;
  public readonly errorBody?: unknown;
  public readonly timestamp: string;
  public readonly endpoint: string;
  public readonly retryCount: number;

  constructor(
    message: string,
    statusCode: number,
    correlationId: string,
    errorCode: ErrorCode,
    endpoint: string,
    retryCount: number = 0,
    errorBody?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.correlationId = correlationId;
    this.errorCode = errorCode;
    this.endpoint = endpoint;
    this.retryCount = retryCount;
    this.errorBody = errorBody;
    this.timestamp = new Date().toISOString();

    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

/**
 * API Request Configuration
 */
export interface ApiRequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: unknown;
  params?: Record<string, string | number | boolean>;
  timeout?: number;
  retries?: number;
  authToken?: string;
  skipCache?: boolean;
  cacheTTL?: number;
  correlationId?: string;
}

/**
 * API Response wrapper
 */
export interface ApiResponse<T> {
  data: T;
  headers: Headers;
  status: number;
  correlationId: string;
  cached: boolean;
  timestamp: string;
}

/**
 * Service Configuration
 */
export interface ApiServiceConfig {
  baseUrl: string;
  defaultTimeout?: number;
  defaultRetries?: number;
  defaultHeaders?: Record<string, string>;
  cacheService?: CacheService;
  requestInterceptors?: RequestInterceptor[];
  responseInterceptors?: ResponseInterceptor[];
  requestTransformer?: RequestTransformer;
  responseTransformer?: ResponseTransformer;
}

/**
 * Unified API Service
 *
 * Core features:
 * - Request/Response transformation
 * - Request interceptors for auth and correlation IDs
 * - Response interceptors for error handling and caching
 * - Retry logic with exponential backoff
 * - Cache integration
 * - Comprehensive error handling
 */
export class ApiService {
  private baseUrl: string;
  private defaultTimeout: number;
  private defaultRetries: number;
  private defaultHeaders: Record<string, string>;
  private cacheService?: CacheService;
  private requestInterceptors: RequestInterceptor[];
  private responseInterceptors: ResponseInterceptor[];
  private requestTransformer?: RequestTransformer;
  private responseTransformer?: ResponseTransformer;

  constructor(config: ApiServiceConfig) {
    this.baseUrl = config.baseUrl;
    this.defaultTimeout = config.defaultTimeout || 30000;
    this.defaultRetries = config.defaultRetries || 3;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...config.defaultHeaders
    };
    this.cacheService = config.cacheService;
    this.requestInterceptors = config.requestInterceptors || [];
    this.responseInterceptors = config.responseInterceptors || [];
    this.requestTransformer = config.requestTransformer;
    this.responseTransformer = config.responseTransformer;
  }

  /**
   * Add request interceptor
   */
  public addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  /**
   * Add response interceptor
   */
  public addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }

  /**
   * Make an API request with comprehensive features
   */
  public async request<T>(
    endpoint: string,
    config: ApiRequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const {
      method = 'GET',
      headers = {},
      body,
      params,
      timeout = this.defaultTimeout,
      retries = this.defaultRetries,
      authToken,
      skipCache = false,
      cacheTTL = 300000, // 5 minutes default
      correlationId = generateCorrelationId()
    } = config;

    // Build URL with params
    const url = this.buildUrl(endpoint, params);
    const cacheKey = this.buildCacheKey(url, method, body);

    // Check cache for GET requests
    if (method === 'GET' && !skipCache && this.cacheService) {
      const cachedData = await this.cacheService.get<T>(cacheKey);
      if (cachedData) {
        return {
          data: cachedData,
          headers: new Headers(),
          status: 200,
          correlationId,
          cached: true,
          timestamp: new Date().toISOString()
        };
      }
    }

    // Prepare request
    let requestConfig: RequestInit = {
      method,
      headers: {
        ...this.defaultHeaders,
        ...headers,
        'X-Correlation-ID': correlationId,
      }
    };

    if (authToken) {
      requestConfig.headers!['Authorization'] = `Bearer ${authToken}`;
    }

    // Transform request body if needed
    if (body) {
      requestConfig.body = this.requestTransformer
        ? JSON.stringify(this.requestTransformer.transform(body, endpoint))
        : JSON.stringify(body);
    }

    // Apply request interceptors
    for (const interceptor of this.requestInterceptors) {
      requestConfig = await interceptor.intercept(requestConfig, {
        url,
        correlationId,
        endpoint
      });
    }

    // Execute request with retry logic
    let lastError: ApiError | undefined;
    let attemptCount = 0;

    while (attemptCount <= retries) {
      try {
        const response = await this.executeRequest(
          url,
          requestConfig,
          timeout,
          correlationId,
          endpoint
        );

        // Apply response interceptors
        let transformedResponse = response;
        for (const interceptor of this.responseInterceptors) {
          transformedResponse = await interceptor.intercept(transformedResponse, {
            url,
            correlationId,
            endpoint,
            attemptCount
          });
        }

        // Transform response data if needed
        if (this.responseTransformer && transformedResponse.data) {
          transformedResponse.data = this.responseTransformer.transform(
            transformedResponse.data,
            endpoint
          );
        }

        // Cache successful GET requests with enhanced options
        if (method === 'GET' && !skipCache && this.cacheService) {
          // Determine cache tags based on endpoint
          const tags = this.getCacheTagsForEndpoint(endpoint);
          const dependencies = this.getCacheDependenciesForEndpoint(endpoint);

          await this.cacheService.set(cacheKey, transformedResponse.data, {
            ttl: cacheTTL,
            tags,
            dependencies
          });
        }

        return transformedResponse;

      } catch (error) {
        if (error instanceof ApiError) {
          lastError = new ApiError(
            error.message,
            error.statusCode,
            error.correlationId,
            error.errorCode,
            error.endpoint,
            attemptCount,
            error.errorBody
          );

          if (this.shouldNotRetry(error.errorCode, error.statusCode)) {
            throw lastError;
          }
        } else {
          lastError = new ApiError(
            error instanceof Error ? error.message : 'Unknown error',
            0,
            correlationId,
            ErrorCode.UNKNOWN_ERROR,
            endpoint,
            attemptCount
          );
        }

        attemptCount++;

        if (attemptCount <= retries) {
          const delay = this.calculateBackoffDelay(attemptCount);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new ApiError(
      'Request failed after all retries',
      0,
      correlationId,
      ErrorCode.UNKNOWN_ERROR,
      endpoint,
      retries
    );
  }

  /**
   * Execute the actual HTTP request
   */
  private async executeRequest(
    url: string,
    config: RequestInit,
    timeout: number,
    correlationId: string,
    endpoint: string
  ): Promise<ApiResponse<any>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...config,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await this.parseErrorResponse(response);
        throw new ApiError(
          errorData.message,
          response.status,
          correlationId,
          errorData.errorCode,
          endpoint,
          0,
          errorData.errorBody
        );
      }

      const contentType = response.headers.get('content-type');
      let data: any = null;

      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      }

      return {
        data,
        headers: response.headers,
        status: response.status,
        correlationId,
        cached: false,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof ApiError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new ApiError(
            'Request timeout',
            408,
            correlationId,
            ErrorCode.REQUEST_TIMEOUT,
            endpoint
          );
        }

        if (error.message === 'Failed to fetch') {
          throw new ApiError(
            'Network connection failed',
            0,
            correlationId,
            ErrorCode.NETWORK_ERROR,
            endpoint
          );
        }
      }

      throw new ApiError(
        error instanceof Error ? error.message : 'Unknown error',
        0,
        correlationId,
        ErrorCode.UNKNOWN_ERROR,
        endpoint
      );
    }
  }

  /**
   * Parse error response
   */
  private async parseErrorResponse(response: Response): Promise<{
    errorCode: ErrorCode;
    message: string;
    errorBody?: unknown;
  }> {
    let errorBody: unknown;
    let message = `API request failed: ${response.status} ${response.statusText}`;
    let errorCode: ErrorCode;

    try {
      errorBody = await response.clone().json();

      if (errorBody && typeof errorBody === 'object') {
        const bodyObj = errorBody as Record<string, unknown>;

        if (bodyObj.errorCode && typeof bodyObj.errorCode === 'string') {
          errorCode = normalizeErrorCode(bodyObj.errorCode);
        } else {
          errorCode = normalizeErrorCode(response.status.toString());
        }

        if (bodyObj.message && typeof bodyObj.message === 'string') {
          message = bodyObj.message;
        } else if (bodyObj.error && typeof bodyObj.error === 'string') {
          message = bodyObj.error;
        }
      } else {
        errorCode = normalizeErrorCode(response.status.toString());
      }
    } catch {
      errorCode = normalizeErrorCode(response.status.toString());
      errorBody = { statusText: response.statusText };
    }

    return { errorCode, message, errorBody };
  }

  /**
   * Build full URL with base URL and query parameters
   */
  private buildUrl(endpoint: string, params?: Record<string, string | number | boolean>): string {
    const url = new URL(endpoint, this.baseUrl);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    return url.toString();
  }

  /**
   * Build cache key for request
   */
  private buildCacheKey(url: string, method: string, body?: unknown): string {
    const bodyHash = body ? JSON.stringify(body) : '';
    return `${method}:${url}:${bodyHash}`;
  }

  /**
   * Determine if an error should not be retried
   */
  private shouldNotRetry(errorCode: ErrorCode, statusCode: number): boolean {
    const noRetryErrors = [
      ErrorCode.UNAUTHORIZED,
      ErrorCode.FORBIDDEN,
      ErrorCode.NOT_FOUND,
      ErrorCode.BAD_REQUEST,
      ErrorCode.INVALID_INPUT,
      ErrorCode.INVALID_EMAIL,
      ErrorCode.INVALID_FORMAT,
      ErrorCode.REQUIRED_FIELD,
      ErrorCode.EMAIL_ALREADY_EXISTS,
      ErrorCode.RESOURCE_CONFLICT
    ];

    return noRetryErrors.includes(errorCode) || (statusCode >= 400 && statusCode < 500);
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoffDelay(attemptCount: number): number {
    const baseDelay = 1000; // 1 second
    const maxDelay = 10000; // 10 seconds
    const delay = Math.min(baseDelay * Math.pow(2, attemptCount - 1), maxDelay);
    // Add jitter to prevent thundering herd
    return delay + Math.random() * 1000;
  }

  /**
   * Get cache tags for endpoint
   */
  private getCacheTagsForEndpoint(endpoint: string): string[] {
    const tags: string[] = [];

    // Add tags based on endpoint patterns
    if (endpoint.includes('/plans')) tags.push('plans');
    if (endpoint.includes('/habits')) tags.push('habits');
    if (endpoint.includes('/journal')) tags.push('journal');
    if (endpoint.includes('/checkins')) tags.push('checkins');
    if (endpoint.includes('/content')) tags.push('content');
    if (endpoint.includes('/prayer-times')) tags.push('prayer-times');
    if (endpoint.includes('/intentions')) tags.push('intentions');
    if (endpoint.includes('/dhikr')) tags.push('dhikr');
    if (endpoint.includes('/users/preferences')) tags.push('user-preferences');
    if (endpoint.includes('/dashboard') || endpoint.includes('/active')) tags.push('dashboard');

    return tags;
  }

  /**
   * Get cache dependencies for endpoint
   */
  private getCacheDependenciesForEndpoint(endpoint: string): string[] {
    const dependencies: string[] = [];

    // Prayer times depend on user location
    if (endpoint.includes('/prayer-times')) {
      dependencies.push('user-location');
    }

    // Dashboard data depends on user preferences
    if (endpoint.includes('/dashboard') || endpoint.includes('/active')) {
      dependencies.push('user-preferences');
    }

    // Intentions depend on user timezone
    if (endpoint.includes('/intentions')) {
      dependencies.push('user-timezone');
    }

    return dependencies;
  }

  /**
   * Invalidate cache by tags
   */
  public async invalidateCache(options: {
    tags?: string[];
    dependencies?: string[];
    pattern?: string | RegExp;
  }): Promise<number> {
    if (!this.cacheService) return 0;

    let totalInvalidated = 0;

    if (options.tags) {
      totalInvalidated += await this.cacheService.invalidate({
        strategy: 'tag',
        tags: options.tags
      });
    }

    if (options.dependencies) {
      totalInvalidated += await this.cacheService.invalidate({
        strategy: 'dependency',
        dependencies: options.dependencies,
        cascade: true
      });
    }

    if (options.pattern) {
      totalInvalidated += await this.cacheService.invalidate({
        strategy: 'pattern',
        pattern: options.pattern
      });
    }

    return totalInvalidated;
  }

  /**
   * Warm dashboard cache
   */
  public async warmDashboardCache(): Promise<void> {
    if (!this.cacheService) return;

    await this.cacheService.warmDashboardData();
  }

  /**
   * Get cache metrics
   */
  public getCacheMetrics() {
    return this.cacheService?.getMetrics();
  }

  /**
   * Convenience methods
   */
  public async get<T>(endpoint: string, config?: Omit<ApiRequestConfig, 'method'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'GET' });
  }

  public async post<T>(endpoint: string, data?: unknown, config?: Omit<ApiRequestConfig, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'POST', body: data });
  }

  public async put<T>(endpoint: string, data?: unknown, config?: Omit<ApiRequestConfig, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'PUT', body: data });
  }

  public async delete<T>(endpoint: string, config?: Omit<ApiRequestConfig, 'method'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' });
  }

  public async patch<T>(endpoint: string, data?: unknown, config?: Omit<ApiRequestConfig, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'PATCH', body: data });
  }
}