import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import {
  useEnhancedApi,
  useEnhancedGet,
  useEnhancedPost,
  useOfflineQueue
} from '../../lib/hooks/useEnhancedApi';
import { enhancedApiClient } from '../../lib/services/EnhancedApiClient';
import { errorService, RecoveryAction } from '../../lib/services/ErrorService';
import { ErrorBoundaryProvider } from '../../lib/components/ErrorBoundaryProvider';
import { ErrorCode, ErrorSeverity } from '../../lib/constants/errorCodes';
import { UIError } from '../../lib/ui/errorUtils';

// Mock the enhanced API client
vi.mock('../../lib/services/EnhancedApiClient', () => ({
  enhancedApiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}));

// Mock the error service
vi.mock('../../lib/services/ErrorService', () => ({
  errorService: {
    handleError: vi.fn(),
    getOfflineQueueStatus: vi.fn(),
    clearOfflineQueue: vi.fn()
  },
  RecoveryAction: {
    RETRY: 'RETRY',
    USE_CACHED_DATA: 'USE_CACHED_DATA',
    REDIRECT_LOGIN: 'REDIRECT_LOGIN',
    SHOW_ERROR: 'SHOW_ERROR'
  }
}));

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

// Test wrapper component
const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ErrorBoundaryProvider>
    {children}
  </ErrorBoundaryProvider>
);

describe('useEnhancedApi', () => {
  const mockRequestFn = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequestFn.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic functionality', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(
        () => useEnhancedApi(mockRequestFn),
        { wrapper: TestWrapper }
      );

      expect(result.current.state).toEqual({
        data: null,
        loading: false,
        error: null,
        retryCount: 0
      });
      expect(result.current.isRetryable).toBe(false);
    });

    it('should execute request and update state correctly', async () => {
      const mockData = { id: 1, name: 'test' };
      mockRequestFn.mockResolvedValue(mockData);

      const { result } = renderHook(
        () => useEnhancedApi(mockRequestFn),
        { wrapper: TestWrapper }
      );

      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.state.data).toEqual(mockData);
      expect(result.current.state.loading).toBe(false);
      expect(result.current.state.error).toBe(null);
      expect(mockRequestFn).toHaveBeenCalledTimes(1);
    });

    it('should handle loading state correctly', async () => {
      let resolveRequest: (value: any) => void;
      const requestPromise = new Promise(resolve => {
        resolveRequest = resolve;
      });
      mockRequestFn.mockReturnValue(requestPromise);

      const { result } = renderHook(
        () => useEnhancedApi(mockRequestFn),
        { wrapper: TestWrapper }
      );

      act(() => {
        result.current.execute();
      });

      expect(result.current.state.loading).toBe(true);

      await act(async () => {
        resolveRequest!({ data: 'test' });
        await requestPromise;
      });

      expect(result.current.state.loading).toBe(false);
    });

    it('should execute immediately when immediate option is true', async () => {
      const mockData = { data: 'immediate' };
      mockRequestFn.mockResolvedValue(mockData);

      renderHook(
        () => useEnhancedApi(mockRequestFn, { immediate: true }),
        { wrapper: TestWrapper }
      );

      await waitFor(() => {
        expect(mockRequestFn).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Error handling', () => {
    it('should handle errors and update error state', async () => {
      const mockError = new Error('Test error');
      mockRequestFn.mockRejectedValue(mockError);

      (errorService.handleError as any).mockResolvedValue({
        success: false,
        action: RecoveryAction.SHOW_ERROR
      });

      const { result } = renderHook(
        () => useEnhancedApi(mockRequestFn),
        { wrapper: TestWrapper }
      );

      await act(async () => {
        try {
          await result.current.execute();
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.state.error).toBeTruthy();
      expect(result.current.state.loading).toBe(false);
      expect(result.current.state.retryCount).toBe(1);
    });

    it('should call onError callback when error occurs', async () => {
      const mockError = new Error('Test error');
      const onError = vi.fn();
      mockRequestFn.mockRejectedValue(mockError);

      (errorService.handleError as any).mockResolvedValue({
        success: false,
        action: RecoveryAction.SHOW_ERROR
      });

      const { result } = renderHook(
        () => useEnhancedApi(mockRequestFn, { onError }),
        { wrapper: TestWrapper }
      );

      await act(async () => {
        try {
          await result.current.execute();
        } catch (error) {
          // Expected to throw
        }
      });

      expect(onError).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Test error'
      }));
    });

    it('should retry with cached data when available', async () => {
      const mockError = new Error('Network error');
      const cachedData = { cached: true };
      mockRequestFn.mockRejectedValue(mockError);

      (errorService.handleError as any).mockResolvedValue({
        success: true,
        action: RecoveryAction.USE_CACHED_DATA,
        fallbackData: cachedData
      });

      const { result } = renderHook(
        () => useEnhancedApi(mockRequestFn),
        { wrapper: TestWrapper }
      );

      let returnedData;
      await act(async () => {
        returnedData = await result.current.execute();
      });

      expect(returnedData).toEqual(cachedData);
      expect(result.current.state.data).toEqual(cachedData);
      expect(result.current.state.error).toBe(null);
    });

    it('should handle delayed retry', async () => {
      const mockError = new Error('Network error');
      let callCount = 0;

      mockRequestFn.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(mockError);
        }
        return Promise.resolve({ data: 'success on retry' });
      });

      (errorService.handleError as any).mockResolvedValue({
        success: true,
        action: RecoveryAction.RETRY,
        retryAfter: 100
      });

      const { result } = renderHook(
        () => useEnhancedApi(mockRequestFn),
        { wrapper: TestWrapper }
      );

      await act(async () => {
        try {
          await result.current.execute();
        } catch (error) {
          // First call expected to throw
        }
      });

      // Wait for retry
      await waitFor(() => {
        expect(callCount).toBe(2);
      }, { timeout: 1000 });
    });
  });

  describe('Request management', () => {
    it('should cancel requests when cancel is called', async () => {
      let rejectRequest: (reason: any) => void;
      const requestPromise = new Promise((_, reject) => {
        rejectRequest = reject;
      });
      mockRequestFn.mockReturnValue(requestPromise);

      const { result } = renderHook(
        () => useEnhancedApi(mockRequestFn),
        { wrapper: TestWrapper }
      );

      act(() => {
        result.current.execute();
      });

      expect(result.current.state.loading).toBe(true);

      act(() => {
        result.current.cancel();
      });

      expect(result.current.state.loading).toBe(false);
    });

    it('should reset state when reset is called', async () => {
      const mockData = { data: 'test' };
      mockRequestFn.mockResolvedValue(mockData);

      const { result } = renderHook(
        () => useEnhancedApi(mockRequestFn),
        { wrapper: TestWrapper }
      );

      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.state.data).toBeTruthy();

      act(() => {
        result.current.reset();
      });

      expect(result.current.state).toEqual({
        data: null,
        loading: false,
        error: null,
        retryCount: 0
      });
    });

    it('should retry with last arguments', async () => {
      const mockArgs = ['arg1', 'arg2'];
      mockRequestFn.mockResolvedValue({ success: true });

      const { result } = renderHook(
        () => useEnhancedApi(mockRequestFn),
        { wrapper: TestWrapper }
      );

      await act(async () => {
        await result.current.execute(...mockArgs);
      });

      await act(async () => {
        await result.current.retry();
      });

      expect(mockRequestFn).toHaveBeenCalledTimes(2);
      expect(mockRequestFn).toHaveBeenNthCalledWith(1, ...mockArgs);
      expect(mockRequestFn).toHaveBeenNthCalledWith(2, ...mockArgs);
    });
  });

  describe('Callbacks', () => {
    it('should call onSuccess callback on successful request', async () => {
      const mockData = { data: 'success' };
      const onSuccess = vi.fn();
      mockRequestFn.mockResolvedValue(mockData);

      const { result } = renderHook(
        () => useEnhancedApi(mockRequestFn, { onSuccess }),
        { wrapper: TestWrapper }
      );

      await act(async () => {
        await result.current.execute();
      });

      expect(onSuccess).toHaveBeenCalledWith(mockData);
    });

    it('should call onRetry callback when retry occurs', async () => {
      const onRetry = vi.fn();
      const mockError = new Error('Network error');

      let callCount = 0;
      mockRequestFn.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(mockError);
        }
        return Promise.resolve({ data: 'success' });
      });

      (errorService.handleError as any).mockResolvedValue({
        success: true,
        action: RecoveryAction.RETRY,
        retryAfter: 50
      });

      const { result } = renderHook(
        () => useEnhancedApi(mockRequestFn, { onRetry }),
        { wrapper: TestWrapper }
      );

      await act(async () => {
        try {
          await result.current.execute();
        } catch (error) {
          // First attempt expected to fail
        }
      });

      await waitFor(() => {
        expect(onRetry).toHaveBeenCalledWith(2);
      }, { timeout: 1000 });
    });
  });
});

describe('useEnhancedGet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should make GET request to correct endpoint', async () => {
    const mockData = { data: 'get response' };
    (enhancedApiClient.get as any).mockResolvedValue(mockData);

    const { result } = renderHook(
      () => useEnhancedGet('/api/test'),
      { wrapper: TestWrapper }
    );

    await act(async () => {
      await result.current.execute();
    });

    expect(enhancedApiClient.get).toHaveBeenCalledWith('/api/test', expect.any(Object));
    expect(result.current.state.data).toEqual(mockData);
  });

  it('should pass options to API client', async () => {
    const options = { authToken: 'test-token' };
    (enhancedApiClient.get as any).mockResolvedValue({ data: 'test' });

    const { result } = renderHook(
      () => useEnhancedGet('/api/test', options),
      { wrapper: TestWrapper }
    );

    await act(async () => {
      await result.current.execute();
    });

    expect(enhancedApiClient.get).toHaveBeenCalledWith(
      '/api/test',
      expect.objectContaining(options)
    );
  });
});

describe('useEnhancedPost', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should make POST request with data', async () => {
    const mockData = { id: 1, name: 'test' };
    const postData = { name: 'test' };
    (enhancedApiClient.post as any).mockResolvedValue(mockData);

    const { result } = renderHook(
      () => useEnhancedPost('/api/users'),
      { wrapper: TestWrapper }
    );

    await act(async () => {
      await result.current.post(postData);
    });

    expect(enhancedApiClient.post).toHaveBeenCalledWith(
      '/api/users',
      postData,
      expect.any(Object)
    );
    expect(result.current.state.data).toEqual(mockData);
  });

  it('should not execute immediately by default', () => {
    renderHook(
      () => useEnhancedPost('/api/users'),
      { wrapper: TestWrapper }
    );

    expect(enhancedApiClient.post).not.toHaveBeenCalled();
  });
});

describe('useOfflineQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (errorService.getOfflineQueueStatus as any).mockReturnValue({
      count: 0,
      oldestRequest: undefined
    });
  });

  it('should return queue status', () => {
    const mockStatus = { count: 3, oldestRequest: Date.now() - 1000 };
    (errorService.getOfflineQueueStatus as any).mockReturnValue(mockStatus);

    const { result } = renderHook(() => useOfflineQueue());

    expect(result.current.queueStatus).toEqual(mockStatus);
    expect(result.current.isOnline).toBe(true);
  });

  it('should clear queue when clearQueue is called', () => {
    const { result } = renderHook(() => useOfflineQueue());

    act(() => {
      result.current.clearQueue();
    });

    expect(errorService.clearOfflineQueue).toHaveBeenCalled();
  });

  it('should update status periodically', async () => {
    vi.useFakeTimers();

    const { result } = renderHook(() => useOfflineQueue());

    // Fast-forward time to trigger the interval
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(errorService.getOfflineQueueStatus).toHaveBeenCalled();

    vi.useRealTimers();
  });
});