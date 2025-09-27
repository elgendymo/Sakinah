import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiService, ApiError } from '../../../lib/services/api/ApiService';
import { ApiVersionStrategy } from '../../../lib/services/api/VersionStrategy';
import {
  AuthRequestInterceptor,
  CorrelationIdRequestInterceptor,
  LoggingRequestInterceptor,
  CacheControlResponseInterceptor,
  ErrorLoggingResponseInterceptor
} from '../../../lib/services/api/interceptors';
import {
  SnakeToCamelTransformer,
  CamelToSnakeTransformer,
  DateTransformer,
  SuccessResponseTransformer
} from '../../../lib/services/api/transformers';
import { MemoryCacheStorage, CacheService } from '../../../lib/services/cache/CacheService';
import { ErrorCode } from '../../../lib/constants/errorCodes';

// Mock fetch globally
global.fetch = vi.fn();

describe('ApiService', () => {
  let apiService: ApiService;
  let cacheService: CacheService;

  beforeEach(() => {
    vi.clearAllMocks();
    cacheService = new CacheService({
      storage: new MemoryCacheStorage()
    });

    apiService = new ApiService({
      baseUrl: 'http://api.test.com',
      defaultVersion: 'v1',
      defaultTimeout: 5000,
      defaultRetries: 2,
      cacheService,
      versionStrategy: new ApiVersionStrategy(['v1', 'v2'], 'v1')
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Request Building', () => {
    it('should build versioned endpoint correctly', async () => {
      const mockFetch = global.fetch as any;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: 'test' })
      });

      await apiService.get('/users');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://api.test.com/v1/users',
        expect.any(Object)
      );
    });

    it('should handle query parameters correctly', async () => {
      const mockFetch = global.fetch as any;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: 'test' })
      });

      await apiService.get('/users', {
        params: { page: 1, limit: 10, active: true }
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://api.test.com/v1/users?page=1&limit=10&active=true',
        expect.any(Object)
      );
    });

    it('should add correlation ID to headers', async () => {
      const mockFetch = global.fetch as any;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: 'test' })
      });

      await apiService.get('/users');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Correlation-ID': expect.any(String),
            'X-API-Version': 'v1'
          })
        })
      );
    });
  });

  describe('Authentication', () => {
    it('should add auth token to headers when provided', async () => {
      const mockFetch = global.fetch as any;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: 'test' })
      });

      await apiService.get('/users', { authToken: 'test-token-123' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token-123'
          })
        })
      );
    });

    it('should work with auth interceptor', async () => {
      const mockFetch = global.fetch as any;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: 'test' })
      });

      const getToken = vi.fn().mockResolvedValue('interceptor-token');
      apiService.addRequestInterceptor(new AuthRequestInterceptor(getToken));

      await apiService.get('/users');

      expect(getToken).toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer interceptor-token'
          })
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle 401 Unauthorized errors', async () => {
      const mockFetch = global.fetch as any;
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: new Headers(),
        clone: () => ({
          json: async () => ({
            errorCode: 'UNAUTHORIZED',
            message: 'Invalid token'
          })
        })
      });

      await expect(apiService.get('/users')).rejects.toThrow(ApiError);

      try {
        await apiService.get('/users');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).statusCode).toBe(401);
        expect((error as ApiError).errorCode).toBe(ErrorCode.UNAUTHORIZED);
      }
    });

    it('should handle network errors', async () => {
      const mockFetch = global.fetch as any;
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      await expect(apiService.get('/users')).rejects.toThrow(ApiError);

      try {
        await apiService.get('/users');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).errorCode).toBe(ErrorCode.NETWORK_ERROR);
      }
    });

    it('should handle timeout errors', async () => {
      const mockFetch = global.fetch as any;
      mockFetch.mockImplementationOnce(() =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              status: 200,
              headers: new Headers(),
              json: async () => ({ data: 'test' })
            });
          }, 10000); // Longer than timeout
        })
      );

      const service = new ApiService({
        baseUrl: 'http://api.test.com',
        defaultTimeout: 100 // Very short timeout
      });

      await expect(service.get('/users')).rejects.toThrow(ApiError);

      try {
        await service.get('/users');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).errorCode).toBe(ErrorCode.REQUEST_TIMEOUT);
      }
    });
  });

  describe('Retry Logic', () => {
    it('should retry failed requests', async () => {
      const mockFetch = global.fetch as any;

      // Fail twice, then succeed
      mockFetch
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ data: 'success' })
        });

      const response = await apiService.get('/users');

      expect(response.data).toEqual({ data: 'success' });
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should not retry non-retryable errors', async () => {
      const mockFetch = global.fetch as any;
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: new Headers(),
        clone: () => ({
          json: async () => ({
            errorCode: 'BAD_REQUEST',
            message: 'Invalid request'
          })
        })
      });

      await expect(apiService.get('/users')).rejects.toThrow(ApiError);
      expect(mockFetch).toHaveBeenCalledTimes(1); // No retry
    });

    it('should use exponential backoff for retries', async () => {
      const mockFetch = global.fetch as any;
      const startTime = Date.now();

      mockFetch
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ data: 'success' })
        });

      await apiService.get('/users');

      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeGreaterThan(1000); // At least 1 second due to backoff
    });
  });

  describe('Caching', () => {
    it('should cache GET requests', async () => {
      const mockFetch = global.fetch as any;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: 'cached-data' })
      });

      // First request
      const response1 = await apiService.get('/users');
      expect(response1.cached).toBe(false);
      expect(response1.data).toEqual({ data: 'cached-data' });

      // Second request (should be cached)
      const response2 = await apiService.get('/users');
      expect(response2.cached).toBe(true);
      expect(response2.data).toEqual({ data: 'cached-data' });

      expect(mockFetch).toHaveBeenCalledTimes(1); // Only one actual request
    });

    it('should skip cache when skipCache is true', async () => {
      const mockFetch = global.fetch as any;
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ data: 'first' })
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ data: 'second' })
        });

      // First request
      await apiService.get('/users');

      // Second request with skipCache
      const response = await apiService.get('/users', { skipCache: true });
      expect(response.cached).toBe(false);
      expect(response.data).toEqual({ data: 'second' });

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should not cache non-GET requests', async () => {
      const mockFetch = global.fetch as any;
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ id: 1 })
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ id: 2 })
        });

      // Two POST requests
      await apiService.post('/users', { name: 'test1' });
      await apiService.post('/users', { name: 'test2' });

      expect(mockFetch).toHaveBeenCalledTimes(2); // Both requests made
    });
  });

  describe('Transformers', () => {
    it('should transform request data with CamelToSnakeTransformer', async () => {
      const mockFetch = global.fetch as any;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ success: true })
      });

      const service = new ApiService({
        baseUrl: 'http://api.test.com',
        requestTransformer: new CamelToSnakeTransformer()
      });

      await service.post('/users', {
        firstName: 'John',
        lastName: 'Doe',
        emailAddress: 'john@example.com'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            first_name: 'John',
            last_name: 'Doe',
            email_address: 'john@example.com'
          })
        })
      );
    });

    it('should transform response data with SnakeToCamelTransformer', async () => {
      const mockFetch = global.fetch as any;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          user_id: 123,
          first_name: 'John',
          last_name: 'Doe',
          created_at: '2024-01-01T00:00:00Z'
        })
      });

      const service = new ApiService({
        baseUrl: 'http://api.test.com',
        responseTransformer: new SnakeToCamelTransformer()
      });

      const response = await service.get('/users/123');

      expect(response.data).toEqual({
        userId: 123,
        firstName: 'John',
        lastName: 'Doe',
        createdAt: '2024-01-01T00:00:00Z'
      });
    });

    it('should handle date transformations', async () => {
      const mockFetch = global.fetch as any;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          id: 1,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-02T00:00:00Z'
        })
      });

      const service = new ApiService({
        baseUrl: 'http://api.test.com',
        responseTransformer: new DateTransformer()
      });

      const response = await service.get('/users/1');

      expect(response.data.createdAt).toBeInstanceOf(Date);
      expect(response.data.updatedAt).toBeInstanceOf(Date);
    });

    it('should handle success field transformation', async () => {
      const mockFetch = global.fetch as any;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          success: true,
          data: { id: 1, name: 'Test' }
        })
      });

      const service = new ApiService({
        baseUrl: 'http://api.test.com',
        defaultVersion: 'v2',
        responseTransformer: new SuccessResponseTransformer()
      });

      const response = await service.get('/users/1');

      expect(response.data).toEqual({
        data: { id: 1, name: 'Test' }
      });
      expect(response.data).not.toHaveProperty('success');
    });
  });

  describe('Interceptors', () => {
    it('should apply request interceptors in order', async () => {
      const mockFetch = global.fetch as any;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: 'test' })
      });

      const interceptor1 = {
        intercept: vi.fn((config) => {
          config.headers['X-Custom-1'] = 'value1';
          return config;
        })
      };

      const interceptor2 = {
        intercept: vi.fn((config) => {
          config.headers['X-Custom-2'] = 'value2';
          return config;
        })
      };

      apiService.addRequestInterceptor(interceptor1);
      apiService.addRequestInterceptor(interceptor2);

      await apiService.get('/users');

      expect(interceptor1.intercept).toHaveBeenCalled();
      expect(interceptor2.intercept).toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Custom-1': 'value1',
            'X-Custom-2': 'value2'
          })
        })
      );
    });

    it('should apply response interceptors', async () => {
      const mockFetch = global.fetch as any;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ original: 'data' })
      });

      const interceptor = {
        intercept: vi.fn((response) => {
          response.data.modified = true;
          return response;
        })
      };

      apiService.addResponseInterceptor(interceptor);

      const response = await apiService.get('/users');

      expect(interceptor.intercept).toHaveBeenCalled();
      expect(response.data).toEqual({
        original: 'data',
        modified: true
      });
    });
  });

  describe('HTTP Methods', () => {
    it('should support GET requests', async () => {
      const mockFetch = global.fetch as any;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: 'get' })
      });

      await apiService.get('/users');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should support POST requests', async () => {
      const mockFetch = global.fetch as any;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ id: 1 })
      });

      await apiService.post('/users', { name: 'Test' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'Test' })
        })
      );
    });

    it('should support PUT requests', async () => {
      const mockFetch = global.fetch as any;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ updated: true })
      });

      await apiService.put('/users/1', { name: 'Updated' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ name: 'Updated' })
        })
      );
    });

    it('should support DELETE requests', async () => {
      const mockFetch = global.fetch as any;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        headers: new Headers(),
        json: async () => null
      });

      await apiService.delete('/users/1');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('should support PATCH requests', async () => {
      const mockFetch = global.fetch as any;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ patched: true })
      });

      await apiService.patch('/users/1', { status: 'active' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ status: 'active' })
        })
      );
    });
  });

  describe('Version Strategy', () => {
    it('should use custom version for request', async () => {
      const mockFetch = global.fetch as any;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: 'v2' })
      });

      await apiService.get('/users', { version: 'v2' });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://api.test.com/v2/users',
        expect.any(Object)
      );
    });

    it('should handle endpoints with existing version', async () => {
      const mockFetch = global.fetch as any;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: 'test' })
      });

      await apiService.get('/v2/users');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://api.test.com/v2/users',
        expect.any(Object)
      );
    });
  });
});