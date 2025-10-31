import { ErrorCode } from '../constants/errorCodes';
import { normalizeErrorCode } from '../ui/errorMap';
import { getApiBaseUrlWithTrailingSlash } from '@/lib/utils/apiUrl';

/**
 * Generate unique trace ID for request tracking
 */
function generateTraceId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Typed API Request Error
 *
 * Extends the standard Error class with additional metadata
 * for better error handling and debugging
 */
export class ApiRequestError extends Error {
  public readonly statusCode: number;
  public readonly traceId: string;
  public readonly errorCode: ErrorCode;
  public readonly errorBody?: unknown;
  public readonly timestamp: string;

  constructor(
    message: string,
    statusCode: number,
    traceId: string,
    errorCode: ErrorCode,
    errorBody?: unknown
  ) {
    super(message);
    this.name = 'ApiRequestError';
    this.statusCode = statusCode;
    this.traceId = traceId;
    this.errorCode = errorCode;
    this.errorBody = errorBody;
    this.timestamp = new Date().toISOString();

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, ApiRequestError.prototype);
  }
}

/**
 * API Request Options
 */
export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
  retries?: number;
  authToken?: string;
}

/**
 * Parse error response from API
 */
async function parseError(res: Response, _traceId: string): Promise<{
  errorCode: ErrorCode;
  message: string;
  errorBody?: unknown;
}> {
  let errorBody: unknown;
  let message = `API request failed: ${res.status} ${res.statusText}`;
  let errorCode: ErrorCode;

  try {
    errorBody = await res.clone().json();

    if (errorBody && typeof errorBody === 'object') {
      const bodyObj = errorBody as Record<string, unknown>;

      // Extract error code from response
      if (bodyObj.errorCode && typeof bodyObj.errorCode === 'string') {
        errorCode = normalizeErrorCode(bodyObj.errorCode);
      } else {
        errorCode = normalizeErrorCode(res.status.toString());
      }

      // Extract message from response
      if (bodyObj.message && typeof bodyObj.message === 'string') {
        message = bodyObj.message;
      } else if (bodyObj.error && typeof bodyObj.error === 'string') {
        message = bodyObj.error;
      }
    } else {
      errorCode = normalizeErrorCode(res.status.toString());
    }
  } catch {
    // Failed to parse JSON, use status code mapping
    errorCode = normalizeErrorCode(res.status.toString());
    errorBody = { statusText: res.statusText };
  }

  return { errorCode, message, errorBody };
}

/**
 * Enhanced API Fetch Client
 *
 * Features:
 * - Automatic error parsing and mapping
 * - Request/response tracing
 * - Retry logic with exponential backoff
 * - Timeout handling
 * - Type-safe error responses
 * - Authentication handling
 */
export class ApiClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;
  private defaultTimeout: number;

  constructor(baseUrl: string, defaultHeaders: Record<string, string> = {}) {
    this.baseUrl = baseUrl;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...defaultHeaders
    };
    this.defaultTimeout = 30000; // 30 seconds
  }

  /**
   * Make an API request with comprehensive error handling
   */
  async request<T>(
    endpoint: string,
    options: ApiRequestOptions = {}
  ): Promise<T> {
    const {
      method = 'GET',
      headers = {},
      body,
      timeout = this.defaultTimeout,
      retries = 3,
      authToken
    } = options;

    const traceId = generateTraceId();
    const url = `${this.baseUrl}${endpoint}`;

    // Prepare headers
    const requestHeaders: Record<string, string> = {
      ...this.defaultHeaders,
      ...headers,
      'X-Trace-ID': traceId
    };

    if (authToken) {
      requestHeaders['Authorization'] = `Bearer ${authToken}`;
    }

    // Prepare request config
    const requestConfig: RequestInit = {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined
    };

    let lastError: unknown;
    let attemptCount = 0;

    while (attemptCount <= retries) {
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
          fetch(url, requestConfig),
          timeoutPromise
        ]);

        // Handle successful response
        if (response.ok) {
          // Handle empty responses
          const contentType = response.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            return {} as T;
          }

          const data = await response.json();
          return data as T;
        }

        // Handle error response
        const { errorCode, message, errorBody } = await parseError(response, traceId);

        throw new ApiRequestError(
          message,
          response.status,
          traceId,
          errorCode,
          errorBody
        );

      } catch (error) {
        lastError = error;
        attemptCount++;

        // Don't retry certain types of errors
        if (error instanceof ApiRequestError) {
          if (this.shouldNotRetry(error.errorCode) || attemptCount > retries) {
            throw error;
          }
        } else if (error instanceof TypeError && error.message === 'Failed to fetch') {
          // Network error - convert to our error type
          const networkError = new ApiRequestError(
            'Network connection failed',
            0,
            traceId,
            ErrorCode.NETWORK_ERROR
          );

          if (attemptCount > retries) {
            throw networkError;
          }
          lastError = networkError;
        } else {
          // Unknown error type
          const unknownError = new ApiRequestError(
            error instanceof Error ? error.message : 'Unknown error',
            0,
            traceId,
            ErrorCode.UNKNOWN_ERROR
          );

          if (attemptCount > retries) {
            throw unknownError;
          }
          lastError = unknownError;
        }

        // Exponential backoff for retries
        if (attemptCount <= retries) {
          const delay = Math.min(1000 * Math.pow(2, attemptCount - 1), 10000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All retries exhausted
    throw lastError;
  }

  /**
   * Determine if an error should not be retried
   */
  private shouldNotRetry(errorCode: ErrorCode): boolean {
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

    return noRetryErrors.includes(errorCode);
  }

  /**
   * Convenience methods for different HTTP methods
   */
  async get<T>(endpoint: string, options?: Omit<ApiRequestOptions, 'method'>): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T>(endpoint: string, data?: unknown, options?: Omit<ApiRequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body: data });
  }

  async put<T>(endpoint: string, data?: unknown, options?: Omit<ApiRequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body: data });
  }

  async delete<T>(endpoint: string, options?: Omit<ApiRequestOptions, 'method'>): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  async patch<T>(endpoint: string, data?: unknown, options?: Omit<ApiRequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'PATCH', body: data });
  }
}

/**
 * Default API client instance
 */
const API_BASE_URL = getApiBaseUrlWithTrailingSlash();
export const apiClient = new ApiClient(API_BASE_URL);

