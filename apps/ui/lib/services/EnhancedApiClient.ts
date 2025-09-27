import { ErrorCode } from '../constants/errorCodes';
import { normalizeErrorCode } from '../ui/errorMap';
import { errorService, ErrorContext, RecoveryAction } from './ErrorService';
import { ApiRequestError } from '../net/apiFetch.client';

/**
 * Enhanced API Request Options with error handling capabilities
 */
export interface EnhancedApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
  maxRetries?: number;
  authToken?: string;
  useErrorService?: boolean;
  offlineQueueable?: boolean;
  cacheKey?: string;
  context?: Omit<ErrorContext, 'retryCount'>;
}

/**
 * Request metadata for tracking and recovery
 */
interface RequestMetadata {
  url: string;
  options: RequestInit;
  traceId: string;
  startTime: number;
  retryCount: number;
  context?: ErrorContext;
}

/**
 * Enhanced API Client with integrated error handling and recovery
 */
export class EnhancedApiClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;
  private defaultTimeout: number = 30000; // 30 seconds
  private activeRequests = new Map<string, AbortController>();

  constructor(baseUrl: string, defaultHeaders: Record<string, string> = {}) {
    this.baseUrl = baseUrl;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...defaultHeaders
    };
  }

  /**
   * Make an API request with comprehensive error handling and recovery
   */
  async request<T>(
    endpoint: string,
    options: EnhancedApiRequestOptions = {}
  ): Promise<T> {
    const {
      method = 'GET',
      headers = {},
      body,
      timeout = this.defaultTimeout,
      maxRetries = 3,
      authToken,
      useErrorService = true,
      offlineQueueable = true,
      cacheKey,
      context = {}
    } = options;

    const traceId = this.generateTraceId();
    const url = `${this.baseUrl}${endpoint}`;

    // Create abort controller for request cancellation
    const abortController = new AbortController();
    this.activeRequests.set(traceId, abortController);

    try {
      return await this.executeRequestWithRecovery<T>({
        url,
        options: this.buildRequestOptions(method, headers, body, authToken, abortController.signal),
        traceId,
        startTime: Date.now(),
        retryCount: 0,
        context: {
          ...context,
          operation: context.operation || `${method} ${endpoint}`,
          correlationId: traceId
        }
      }, {
        timeout,
        maxRetries,
        useErrorService,
        offlineQueueable,
        cacheKey
      });
    } finally {
      this.activeRequests.delete(traceId);
    }
  }

  /**
   * Execute request with automatic error recovery
   */
  private async executeRequestWithRecovery<T>(
    metadata: RequestMetadata,
    options: {
      timeout: number;
      maxRetries: number;
      useErrorService: boolean;
      offlineQueueable: boolean;
      cacheKey?: string;
    }
  ): Promise<T> {
    const { url, options: requestOptions, traceId } = metadata;
    const { timeout, maxRetries, useErrorService, offlineQueueable } = options;

    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new ApiRequestError(
            'Request timeout',
            408,
            traceId,
            ErrorCode.REQUEST_TIMEOUT
          ));
        }, timeout);
      });

      // Make the request with timeout
      const response = await Promise.race([
        fetch(url, requestOptions),
        timeoutPromise
      ]);

      // Handle successful response
      if (response.ok) {
        const data = await this.parseSuccessResponse<T>(response);

        // Log successful request for monitoring
        this.logRequest(metadata, response.status, Date.now() - metadata.startTime);

        return data;
      }

      // Handle error response
      const { errorCode, message, errorBody } = await this.parseErrorResponse(response, traceId);
      const apiError = new ApiRequestError(message, response.status, traceId, errorCode, errorBody);

      return this.handleErrorWithRecovery<T>(apiError, metadata, options);

    } catch (error) {
      // Handle network errors and other exceptions
      if (error instanceof ApiRequestError) {
        return this.handleErrorWithRecovery<T>(error, metadata, options);
      }

      // Convert unknown errors to ApiRequestError
      const networkError = this.createNetworkError(error, traceId);
      return this.handleErrorWithRecovery<T>(networkError, metadata, options);
    }
  }

  /**
   * Handle errors using the ErrorService and implement recovery strategies
   */
  private async handleErrorWithRecovery<T>(
    error: ApiRequestError,
    metadata: RequestMetadata,
    options: {
      timeout: number;
      maxRetries: number;
      useErrorService: boolean;
      offlineQueueable: boolean;
      cacheKey?: string;
    }
  ): Promise<T> {
    const { maxRetries, useErrorService, offlineQueueable } = options;

    // Update context with retry count
    const enhancedContext: ErrorContext = {
      ...metadata.context,
      retryCount: metadata.retryCount,
      originalRequest: metadata.url
    };

    // Use ErrorService for recovery if enabled
    if (useErrorService) {
      try {
        const recoveryResult = await errorService.handleError(error, enhancedContext);

        switch (recoveryResult.action) {
          case RecoveryAction.RETRY:
            if (metadata.retryCount < maxRetries) {
              // Wait for the specified delay
              if (recoveryResult.retryAfter) {
                await this.delay(recoveryResult.retryAfter);
              }

              // Increment retry count and try again
              return this.executeRequestWithRecovery<T>({
                ...metadata,
                retryCount: metadata.retryCount + 1,
                context: enhancedContext
              }, options);
            }
            break;

          case RecoveryAction.REFRESH_TOKEN:
            // Token refresh is handled in the ErrorService
            // Retry the original request
            return this.executeRequestWithRecovery<T>({
              ...metadata,
              retryCount: metadata.retryCount + 1,
              context: enhancedContext
            }, options);

          case RecoveryAction.QUEUE_OFFLINE:
            if (offlineQueueable) {
              const queueId = errorService.queueOfflineRequest(
                metadata.url,
                metadata.options,
                enhancedContext
              );

              // Return a special response indicating the request was queued
              throw new ApiRequestError(
                `Request queued for offline sync (ID: ${queueId})`,
                0,
                metadata.traceId,
                ErrorCode.NETWORK_ERROR,
                { queueId, queued: true }
              );
            }
            break;

          case RecoveryAction.USE_CACHED_DATA:
            if (recoveryResult.fallbackData) {
              return recoveryResult.fallbackData as T;
            }
            break;

          case RecoveryAction.REDIRECT_LOGIN:
            // Handle login redirect
            this.handleLoginRedirect();
            break;

          case RecoveryAction.SHOW_ERROR:
          case RecoveryAction.FALLBACK:
          default:
            // Fall through to throw the error
            break;
        }
      } catch (recoveryError) {
        console.error('Error during recovery:', recoveryError);
        // Continue to throw original error
      }
    }

    // If no recovery was possible, throw the original error
    throw error;
  }

  /**
   * Parse successful response
   */
  private async parseSuccessResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type');

    if (!contentType || !contentType.includes('application/json')) {
      return {} as T;
    }

    try {
      const data = await response.json();
      return data as T;
    } catch (error) {
      console.warn('Failed to parse JSON response:', error);
      return {} as T;
    }
  }

  /**
   * Parse error response from API
   */
  private async parseErrorResponse(response: Response, _traceId: string): Promise<{
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

        // Extract error code from response
        if (bodyObj.errorCode && typeof bodyObj.errorCode === 'string') {
          errorCode = normalizeErrorCode(bodyObj.errorCode);
        } else {
          errorCode = normalizeErrorCode(response.status.toString());
        }

        // Extract message from response
        if (bodyObj.message && typeof bodyObj.message === 'string') {
          message = bodyObj.message;
        } else if (bodyObj.error && typeof bodyObj.error === 'string') {
          message = bodyObj.error;
        }
      } else {
        errorCode = normalizeErrorCode(response.status.toString());
      }
    } catch {
      // Failed to parse JSON, use status code mapping
      errorCode = normalizeErrorCode(response.status.toString());
      errorBody = { statusText: response.statusText };
    }

    return { errorCode, message, errorBody };
  }

  /**
   * Create network error from unknown error
   */
  private createNetworkError(error: unknown, traceId: string): ApiRequestError {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      return new ApiRequestError(
        'Network connection failed',
        0,
        traceId,
        ErrorCode.NETWORK_ERROR
      );
    }

    return new ApiRequestError(
      error instanceof Error ? error.message : 'Unknown network error',
      0,
      traceId,
      ErrorCode.UNKNOWN_ERROR
    );
  }

  /**
   * Build request options
   */
  private buildRequestOptions(
    method: string,
    headers: Record<string, string>,
    body: unknown,
    authToken?: string,
    signal?: AbortSignal
  ): RequestInit {
    const requestHeaders: Record<string, string> = {
      ...this.defaultHeaders,
      ...headers
    };

    if (authToken) {
      requestHeaders['Authorization'] = `Bearer ${authToken}`;
    }

    return {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
      signal
    };
  }

  /**
   * Handle login redirect
   */
  private handleLoginRedirect(): void {
    // Store current URL for return after login
    const returnUrl = window.location.pathname + window.location.search;
    localStorage.setItem('sakinah_return_url', returnUrl);

    // Redirect to login page
    window.location.href = '/login';
  }

  /**
   * Log request for monitoring and analytics
   */
  private logRequest(metadata: RequestMetadata, statusCode: number, duration: number): void {
    // This could be enhanced to send to analytics service
    console.debug('API Request:', {
      url: metadata.url,
      method: metadata.options.method,
      statusCode,
      duration,
      traceId: metadata.traceId,
      retryCount: metadata.retryCount
    });
  }

  /**
   * Generate unique trace ID for request tracking
   */
  private generateTraceId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Delay utility for retry backoff
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cancel all active requests
   */
  public cancelAllRequests(): void {
    this.activeRequests.forEach((controller, traceId) => {
      controller.abort();
      console.debug(`Cancelled request: ${traceId}`);
    });
    this.activeRequests.clear();
  }

  /**
   * Cancel specific request by trace ID
   */
  public cancelRequest(traceId: string): boolean {
    const controller = this.activeRequests.get(traceId);
    if (controller) {
      controller.abort();
      this.activeRequests.delete(traceId);
      console.debug(`Cancelled request: ${traceId}`);
      return true;
    }
    return false;
  }

  /**
   * Get active request count
   */
  public getActiveRequestCount(): number {
    return this.activeRequests.size;
  }

  /**
   * Convenience methods for different HTTP methods
   */
  async get<T>(endpoint: string, options?: Omit<EnhancedApiRequestOptions, 'method'>): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T>(endpoint: string, data?: unknown, options?: Omit<EnhancedApiRequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body: data });
  }

  async put<T>(endpoint: string, data?: unknown, options?: Omit<EnhancedApiRequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body: data });
  }

  async delete<T>(endpoint: string, options?: Omit<EnhancedApiRequestOptions, 'method'>): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  async patch<T>(endpoint: string, data?: unknown, options?: Omit<EnhancedApiRequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'PATCH', body: data });
  }
}

// Create enhanced API client instance
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api';
export const enhancedApiClient = new EnhancedApiClient(API_BASE_URL);

// Export for use in services
export { enhancedApiClient as apiClient };