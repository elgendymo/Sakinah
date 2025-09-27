import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { EnhancedApiClient } from '../../lib/services/EnhancedApiClient';
import { ApiRequestError } from '../../lib/net/apiFetch.client';
import { ErrorCode } from '../../lib/constants/errorCodes';
import { errorService, RecoveryAction } from '../../lib/services/ErrorService';

// Mock the ErrorService
vi.mock('../../lib/services/ErrorService', () => ({
  errorService: {
    handleError: vi.fn(),
    queueOfflineRequest: vi.fn()
  },
  RecoveryAction: {
    RETRY: 'RETRY',
    REFRESH_TOKEN: 'REFRESH_TOKEN',
    QUEUE_OFFLINE: 'QUEUE_OFFLINE',
    USE_CACHED_DATA: 'USE_CACHED_DATA',
    REDIRECT_LOGIN: 'REDIRECT_LOGIN',
    SHOW_ERROR: 'SHOW_ERROR',
    FALLBACK: 'FALLBACK',
    IGNORE: 'IGNORE'
  }
}));

// Mock fetch
global.fetch = vi.fn();

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock window.location
const locationMock = {
  href: '',
  pathname: '/test',
  search: '?param=value'
};
Object.defineProperty(window, 'location', { value: locationMock, writable: true });

describe('EnhancedApiClient', () => {
  let apiClient: EnhancedApiClient;
  const baseUrl = 'https://api.example.com';

  beforeEach(() => {
    vi.clearAllMocks();
    apiClient = new EnhancedApiClient(baseUrl);

    // Reset fetch mock
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: 'test' }),
      headers: new Map([['content-type', 'application/json']])
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Successful requests', () => {
    it('should make successful GET request', async () => {
      const mockResponse = { data: 'test response' };
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
        headers: new Map([['content-type', 'application/json']])
      });

      const result = await apiClient.get('/test');

      expect(fetch).toHaveBeenCalledWith(
        `${baseUrl}/test`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should make successful POST request with body', async () => {
      const requestData = { name: 'test' };
      const mockResponse = { id: 1, ...requestData };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
        headers: new Map([['content-type', 'application/json']])
      });

      const result = await apiClient.post('/users', requestData);

      expect(fetch).toHaveBeenCalledWith(
        `${baseUrl}/users`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(requestData),
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should include authorization header when authToken provided', async () => {
      const authToken = 'test-token';

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
        headers: new Map([['content-type', 'application/json']])
      });

      await apiClient.get('/protected', { authToken });

      expect(fetch).toHaveBeenCalledWith(
        `${baseUrl}/protected`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': `Bearer ${authToken}`
          })
        })
      );
    });

    it('should handle non-JSON responses', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
        headers: new Map([['content-type', 'text/plain']])
      });

      const result = await apiClient.get('/text');

      expect(result).toEqual({});
    });
  });

  describe('Error handling', () => {
    it('should handle HTTP error responses', async () => {
      const errorResponse = {
        errorCode: 'NOT_FOUND',
        message: 'Resource not found'
      };

      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.resolve(errorResponse),
        clone: () => ({
          json: () => Promise.resolve(errorResponse)
        })
      });

      // Mock ErrorService to return show error action
      (errorService.handleError as any).mockResolvedValue({
        success: false,
        action: RecoveryAction.SHOW_ERROR,
        message: 'Resource not found'
      });

      await expect(apiClient.get('/not-found')).rejects.toThrow(ApiRequestError);
    });

    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValue(new TypeError('Failed to fetch'));

      // Mock ErrorService to return queue offline action
      (errorService.handleError as any).mockResolvedValue({
        success: false,
        action: RecoveryAction.QUEUE_OFFLINE,
        message: 'Request queued for offline sync'
      });

      (errorService.queueOfflineRequest as any).mockReturnValue('queue-id-123');

      await expect(apiClient.get('/test', { offlineQueueable: true }))
        .rejects.toThrow('Request queued for offline sync');
    });

    it('should handle timeout errors', async () => {
      // Mock a delayed response that exceeds timeout
      (global.fetch as any).mockImplementation(() =>
        new Promise(resolve => setTimeout(resolve, 100))
      );

      // Mock ErrorService to return retry action
      (errorService.handleError as any).mockResolvedValue({
        success: true,
        action: RecoveryAction.RETRY,
        retryAfter: 1000
      });

      await expect(apiClient.get('/test', { timeout: 50 }))
        .rejects.toThrow(ApiRequestError);
    });

    it('should retry requests when ErrorService returns RETRY action', async () => {
      let attemptCount = 0;
      (global.fetch as any).mockImplementation(() => {
        attemptCount++;
        if (attemptCount === 1) {
          return Promise.reject(new TypeError('Failed to fetch'));
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: 'success on retry' }),
          headers: new Map([['content-type', 'application/json']])
        });
      });

      // Mock ErrorService to return retry on first call
      (errorService.handleError as any)
        .mockResolvedValueOnce({
          success: true,
          action: RecoveryAction.RETRY,
          retryAfter: 10
        });

      const result = await apiClient.get('/test');

      expect(attemptCount).toBe(2);
      expect(result).toEqual({ data: 'success on retry' });
    });

    it('should handle token refresh scenario', async () => {
      let attemptCount = 0;
      (global.fetch as any).mockImplementation(() => {
        attemptCount++;
        if (attemptCount === 1) {
          return Promise.resolve({
            ok: false,
            status: 401,
            statusText: 'Unauthorized',
            json: () => Promise.resolve({ errorCode: 'UNAUTHORIZED' }),
            clone: () => ({
              json: () => Promise.resolve({ errorCode: 'UNAUTHORIZED' })
            })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: 'success after token refresh' }),
          headers: new Map([['content-type', 'application/json']])
        });
      });

      // Mock ErrorService to return refresh token action
      (errorService.handleError as any)
        .mockResolvedValueOnce({
          success: true,
          action: RecoveryAction.REFRESH_TOKEN,
          message: 'Token refreshed'
        });

      const result = await apiClient.get('/protected');

      expect(attemptCount).toBe(2);
      expect(result).toEqual({ data: 'success after token refresh' });
    });

    it('should use cached data when available', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Server error'));

      const cachedData = { data: 'cached response' };
      (errorService.handleError as any).mockResolvedValue({
        success: true,
        action: RecoveryAction.USE_CACHED_DATA,
        fallbackData: cachedData
      });

      const result = await apiClient.get('/test');

      expect(result).toEqual(cachedData);
    });

    it('should handle login redirect', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({ errorCode: 'UNAUTHORIZED' }),
        clone: () => ({
          json: () => Promise.resolve({ errorCode: 'UNAUTHORIZED' })
        })
      });

      (errorService.handleError as any).mockResolvedValue({
        success: false,
        action: RecoveryAction.REDIRECT_LOGIN,
        message: 'Please log in'
      });

      await expect(apiClient.get('/protected')).rejects.toThrow();

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'sakinah_return_url',
        '/test?param=value'
      );
    });
  });

  describe('Request management', () => {
    it('should track active requests', async () => {
      (global.fetch as any).mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({}),
          headers: new Map([['content-type', 'application/json']])
        }), 10))
      );

      const requestPromise = apiClient.get('/test');

      expect(apiClient.getActiveRequestCount()).toBe(1);

      await requestPromise;

      expect(apiClient.getActiveRequestCount()).toBe(0);
    });

    it('should cancel all active requests', async () => {
      const abortSpy = vi.fn();
      const mockAbortController = {
        abort: abortSpy,
        signal: new AbortController().signal
      };

      global.AbortController = vi.fn(() => mockAbortController) as any;

      (global.fetch as any).mockImplementation(() =>
        new Promise(() => {}) // Never resolves
      );

      // Start a request
      const requestPromise = apiClient.get('/test');

      // Cancel all requests
      apiClient.cancelAllRequests();

      expect(abortSpy).toHaveBeenCalled();
      expect(apiClient.getActiveRequestCount()).toBe(0);
    });
  });

  describe('HTTP method convenience methods', () => {
    beforeEach(() => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
        headers: new Map([['content-type', 'application/json']])
      });
    });

    it('should handle PUT requests', async () => {
      const data = { name: 'updated' };
      await apiClient.put('/users/1', data);

      expect(fetch).toHaveBeenCalledWith(
        `${baseUrl}/users/1`,
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(data)
        })
      );
    });

    it('should handle DELETE requests', async () => {
      await apiClient.delete('/users/1');

      expect(fetch).toHaveBeenCalledWith(
        `${baseUrl}/users/1`,
        expect.objectContaining({
          method: 'DELETE'
        })
      );
    });

    it('should handle PATCH requests', async () => {
      const data = { name: 'patched' };
      await apiClient.patch('/users/1', data);

      expect(fetch).toHaveBeenCalledWith(
        `${baseUrl}/users/1`,
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(data)
        })
      );
    });
  });

  describe('Context and tracing', () => {
    it('should include correlation ID in headers', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
        headers: new Map([['content-type', 'application/json']])
      });

      await apiClient.get('/test', {
        context: {
          operation: 'testOperation',
          component: 'TestComponent'
        }
      });

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Trace-ID': expect.stringMatching(/^req_\d+_[a-z0-9]{9}$/)
          })
        })
      );
    });

    it('should pass context to ErrorService', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Test error'));

      (errorService.handleError as any).mockResolvedValue({
        success: false,
        action: RecoveryAction.SHOW_ERROR
      });

      const context = {
        operation: 'testOperation',
        component: 'TestComponent'
      };

      await expect(apiClient.get('/test', { context })).rejects.toThrow();

      expect(errorService.handleError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          ...context,
          operation: 'GET /test',
          correlationId: expect.stringMatching(/^req_\d+_[a-z0-9]{9}$/)
        })
      );
    });
  });

  describe('Configuration options', () => {
    it('should disable ErrorService when useErrorService is false', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Test error'));

      await expect(apiClient.get('/test', { useErrorService: false }))
        .rejects.toThrow();

      expect(errorService.handleError).not.toHaveBeenCalled();
    });

    it('should disable offline queueing when offlineQueueable is false', async () => {
      (global.fetch as any).mockRejectedValue(new TypeError('Failed to fetch'));

      (errorService.handleError as any).mockResolvedValue({
        success: false,
        action: RecoveryAction.QUEUE_OFFLINE
      });

      await expect(apiClient.get('/test', { offlineQueueable: false }))
        .rejects.toThrow();

      expect(errorService.queueOfflineRequest).not.toHaveBeenCalled();
    });

    it('should respect custom timeout', async () => {
      const customTimeout = 100;

      (global.fetch as any).mockImplementation(() =>
        new Promise(resolve => setTimeout(resolve, customTimeout + 50))
      );

      await expect(apiClient.get('/test', { timeout: customTimeout }))
        .rejects.toThrow('Request timeout');
    });

    it('should respect custom max retries', async () => {
      let attemptCount = 0;
      (global.fetch as any).mockImplementation(() => {
        attemptCount++;
        return Promise.reject(new TypeError('Failed to fetch'));
      });

      (errorService.handleError as any).mockResolvedValue({
        success: true,
        action: RecoveryAction.RETRY,
        retryAfter: 10
      });

      await expect(apiClient.get('/test', { maxRetries: 1 }))
        .rejects.toThrow();

      // Should attempt initial request + 1 retry = 2 total attempts
      expect(attemptCount).toBeLessThanOrEqual(2);
    });
  });
});