import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  ErrorService,
  NetworkErrorStrategy,
  AuthErrorStrategy,
  RateLimitErrorStrategy,
  ValidationErrorStrategy,
  ServerErrorStrategy,
  RecoveryAction
} from '../../lib/services/ErrorService';
import { ErrorCode, ErrorSeverity } from '../../lib/constants/errorCodes';
import { UIError } from '../../lib/ui/errorUtils';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

// Mock window.addEventListener
const eventListeners: Record<string, ((event: any) => void)[]> = {};
window.addEventListener = vi.fn((event: string, listener: (event: any) => void) => {
  if (!eventListeners[event]) {
    eventListeners[event] = [];
  }
  eventListeners[event].push(listener);
});

// Mock fetch for token refresh
global.fetch = vi.fn();

describe('ErrorService', () => {
  let errorService: ErrorService;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    errorService = new ErrorService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('ErrorService initialization', () => {
    it('should initialize with default strategies', () => {
      expect(errorService).toBeDefined();
    });

    it('should set up online status monitoring', () => {
      expect(window.addEventListener).toHaveBeenCalledWith('online', expect.any(Function));
      expect(window.addEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
    });
  });

  describe('Error handling', () => {
    it('should handle network errors with retry strategy', async () => {
      const networkError: UIError = {
        code: ErrorCode.NETWORK_ERROR,
        message: 'Network connection failed',
        userMessage: 'Unable to connect to the server',
        severity: ErrorSeverity.HIGH,
        category: 'network',
        timestamp: new Date().toISOString(),
        isRetryable: true,
        actionable: false
      };

      const result = await errorService.handleError(networkError, {
        operation: 'fetchData',
        retryCount: 0
      });

      expect(result.success).toBe(true);
      expect(result.action).toBe(RecoveryAction.RETRY);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('should queue request offline after max retries', async () => {
      const networkError: UIError = {
        code: ErrorCode.NETWORK_ERROR,
        message: 'Network connection failed',
        userMessage: 'Unable to connect to the server',
        severity: ErrorSeverity.HIGH,
        category: 'network',
        timestamp: new Date().toISOString(),
        isRetryable: true,
        actionable: false
      };

      const result = await errorService.handleError(networkError, {
        operation: 'fetchData',
        retryCount: 3 // Max retries exceeded
      });

      expect(result.success).toBe(false);
      expect(result.action).toBe(RecoveryAction.QUEUE_OFFLINE);
      expect(result.requiresUserAction).toBe(false);
    });

    it('should handle validation errors with show error action', async () => {
      const validationError: UIError = {
        code: ErrorCode.INVALID_EMAIL,
        message: 'Invalid email format',
        userMessage: 'Please enter a valid email address',
        severity: ErrorSeverity.LOW,
        category: 'validation',
        timestamp: new Date().toISOString(),
        isRetryable: false,
        actionable: true
      };

      const result = await errorService.handleError(validationError);

      expect(result.success).toBe(false);
      expect(result.action).toBe(RecoveryAction.SHOW_ERROR);
      expect(result.requiresUserAction).toBe(true);
    });
  });

  describe('Offline queue management', () => {
    it('should queue requests for offline processing', () => {
      const requestId = errorService.queueOfflineRequest(
        '/api/test',
        { method: 'POST', body: JSON.stringify({ test: true }) },
        { operation: 'testOperation' }
      );

      expect(requestId).toMatch(/^req_\d+_[a-z0-9]{9}$/);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'sakinah_offline_queue',
        expect.stringContaining(requestId)
      );
    });

    it('should return correct queue status', () => {
      errorService.queueOfflineRequest('/api/test1', { method: 'GET' });
      errorService.queueOfflineRequest('/api/test2', { method: 'POST' });

      const status = errorService.getOfflineQueueStatus();

      expect(status.count).toBe(2);
      expect(status.oldestRequest).toBeDefined();
    });

    it('should clear offline queue', () => {
      errorService.queueOfflineRequest('/api/test', { method: 'GET' });

      errorService.clearOfflineQueue();

      const status = errorService.getOfflineQueueStatus();
      expect(status.count).toBe(0);
    });
  });

  describe('Error listeners', () => {
    it('should add and notify error listeners', async () => {
      const listener = vi.fn();
      errorService.addErrorListener(listener);

      const error: UIError = {
        code: ErrorCode.SERVER_ERROR,
        message: 'Server error',
        userMessage: 'Server is temporarily unavailable',
        severity: ErrorSeverity.HIGH,
        category: 'server',
        timestamp: new Date().toISOString(),
        isRetryable: true,
        actionable: false
      };

      await errorService.handleError(error, { operation: 'test' });

      expect(listener).toHaveBeenCalledWith(error, { operation: 'test' });
    });

    it('should remove error listeners', async () => {
      const listener = vi.fn();
      errorService.addErrorListener(listener);
      errorService.removeErrorListener(listener);

      const error: UIError = {
        code: ErrorCode.SERVER_ERROR,
        message: 'Server error',
        userMessage: 'Server is temporarily unavailable',
        severity: ErrorSeverity.HIGH,
        category: 'server',
        timestamp: new Date().toISOString(),
        isRetryable: true,
        actionable: false
      };

      await errorService.handleError(error);

      expect(listener).not.toHaveBeenCalled();
    });
  });
});

describe('NetworkErrorStrategy', () => {
  let strategy: NetworkErrorStrategy;

  beforeEach(() => {
    strategy = new NetworkErrorStrategy();
  });

  it('should handle network error types', () => {
    const networkError: UIError = {
      code: ErrorCode.NETWORK_ERROR,
      message: 'Network failed',
      userMessage: 'Connection failed',
      severity: ErrorSeverity.HIGH,
      category: 'network',
      timestamp: new Date().toISOString(),
      isRetryable: true,
      actionable: false
    };

    expect(strategy.canHandle(networkError)).toBe(true);
  });

  it('should not handle non-network errors', () => {
    const authError: UIError = {
      code: ErrorCode.UNAUTHORIZED,
      message: 'Unauthorized',
      userMessage: 'Please log in',
      severity: ErrorSeverity.MEDIUM,
      category: 'authentication',
      timestamp: new Date().toISOString(),
      isRetryable: false,
      actionable: true
    };

    expect(strategy.canHandle(authError)).toBe(false);
  });

  it('should implement exponential backoff', async () => {
    const networkError: UIError = {
      code: ErrorCode.NETWORK_ERROR,
      message: 'Network failed',
      userMessage: 'Connection failed',
      severity: ErrorSeverity.HIGH,
      category: 'network',
      timestamp: new Date().toISOString(),
      isRetryable: true,
      actionable: false
    };

    const result1 = await strategy.handle(networkError, { retryCount: 0 });
    const result2 = await strategy.handle(networkError, { retryCount: 1 });
    const result3 = await strategy.handle(networkError, { retryCount: 2 });

    expect(result1.retryAfter).toBeLessThan(result2.retryAfter!);
    expect(result2.retryAfter).toBeLessThan(result3.retryAfter!);
  });

  it('should queue offline after max retries', async () => {
    const networkError: UIError = {
      code: ErrorCode.NETWORK_ERROR,
      message: 'Network failed',
      userMessage: 'Connection failed',
      severity: ErrorSeverity.HIGH,
      category: 'network',
      timestamp: new Date().toISOString(),
      isRetryable: true,
      actionable: false
    };

    const result = await strategy.handle(networkError, { retryCount: 3 });

    expect(result.success).toBe(false);
    expect(result.action).toBe(RecoveryAction.QUEUE_OFFLINE);
  });
});

describe('AuthErrorStrategy', () => {
  let strategy: AuthErrorStrategy;

  beforeEach(() => {
    strategy = new AuthErrorStrategy();
    vi.clearAllMocks();
  });

  it('should handle authentication error types', () => {
    const authError: UIError = {
      code: ErrorCode.UNAUTHORIZED,
      message: 'Unauthorized',
      userMessage: 'Please log in',
      severity: ErrorSeverity.MEDIUM,
      category: 'authentication',
      timestamp: new Date().toISOString(),
      isRetryable: false,
      actionable: true
    };

    expect(strategy.canHandle(authError)).toBe(true);
  });

  it('should handle token refresh for session expired', async () => {
    // Mock successful token refresh
    vi.doMock('@supabase/auth-helpers-nextjs', () => ({
      createClientComponentClient: () => ({
        auth: {
          refreshSession: vi.fn().mockResolvedValue({
            data: { session: { access_token: 'new-token' } },
            error: null
          })
        }
      })
    }));

    const sessionExpiredError: UIError = {
      code: ErrorCode.SESSION_EXPIRED,
      message: 'Session expired',
      userMessage: 'Your session has expired',
      severity: ErrorSeverity.MEDIUM,
      category: 'authentication',
      timestamp: new Date().toISOString(),
      isRetryable: false,
      actionable: true
    };

    const result = await strategy.handle(sessionExpiredError);

    expect(result.action).toBe(RecoveryAction.RETRY);
  });

  it('should redirect to login for forbidden errors', async () => {
    const forbiddenError: UIError = {
      code: ErrorCode.FORBIDDEN,
      message: 'Forbidden',
      userMessage: 'Access denied',
      severity: ErrorSeverity.MEDIUM,
      category: 'authorization',
      timestamp: new Date().toISOString(),
      isRetryable: false,
      actionable: true
    };

    const result = await strategy.handle(forbiddenError);

    expect(result.success).toBe(false);
    expect(result.action).toBe(RecoveryAction.SHOW_ERROR);
    expect(result.requiresUserAction).toBe(true);
  });
});

describe('RateLimitErrorStrategy', () => {
  let strategy: RateLimitErrorStrategy;

  beforeEach(() => {
    strategy = new RateLimitErrorStrategy();
  });

  it('should handle rate limit error types', () => {
    const rateLimitError: UIError = {
      code: ErrorCode.RATE_LIMITED,
      message: 'Rate limited',
      userMessage: 'Too many requests',
      severity: ErrorSeverity.MEDIUM,
      category: 'user_action',
      timestamp: new Date().toISOString(),
      isRetryable: true,
      actionable: false
    };

    expect(strategy.canHandle(rateLimitError)).toBe(true);
  });

  it('should implement progressive backoff for rate limits', async () => {
    const rateLimitError: UIError = {
      code: ErrorCode.RATE_LIMITED,
      message: 'Rate limited',
      userMessage: 'Too many requests',
      severity: ErrorSeverity.MEDIUM,
      category: 'user_action',
      timestamp: new Date().toISOString(),
      isRetryable: true,
      actionable: false
    };

    const result1 = await strategy.handle(rateLimitError, { retryCount: 0 });
    const result2 = await strategy.handle(rateLimitError, { retryCount: 1 });

    expect(result1.retryAfter).toBeLessThan(result2.retryAfter!);
    expect(result1.action).toBe(RecoveryAction.RETRY);
    expect(result2.action).toBe(RecoveryAction.RETRY);
  });

  it('should extract retry-after from error message', async () => {
    const rateLimitError: UIError = {
      code: ErrorCode.RATE_LIMITED,
      message: 'Rate limited. retry-after: 120',
      userMessage: 'Too many requests',
      severity: ErrorSeverity.MEDIUM,
      category: 'user_action',
      timestamp: new Date().toISOString(),
      isRetryable: true,
      actionable: false
    };

    const result = await strategy.handle(rateLimitError);

    expect(result.retryAfter).toBe(120000); // 120 seconds in milliseconds
  });
});

describe('ValidationErrorStrategy', () => {
  let strategy: ValidationErrorStrategy;

  beforeEach(() => {
    strategy = new ValidationErrorStrategy();
  });

  it('should handle validation error types', () => {
    const validationError: UIError = {
      code: ErrorCode.INVALID_EMAIL,
      message: 'Invalid email',
      userMessage: 'Please enter a valid email',
      severity: ErrorSeverity.LOW,
      category: 'validation',
      timestamp: new Date().toISOString(),
      isRetryable: false,
      actionable: true
    };

    expect(strategy.canHandle(validationError)).toBe(true);
  });

  it('should show error message for validation errors', async () => {
    const validationError: UIError = {
      code: ErrorCode.REQUIRED_FIELD,
      message: 'Required field missing',
      userMessage: 'This field is required',
      severity: ErrorSeverity.LOW,
      category: 'validation',
      timestamp: new Date().toISOString(),
      isRetryable: false,
      actionable: true
    };

    const result = await strategy.handle(validationError);

    expect(result.success).toBe(false);
    expect(result.action).toBe(RecoveryAction.SHOW_ERROR);
    expect(result.requiresUserAction).toBe(true);
    expect(result.message).toBe(validationError.userMessage);
  });
});

describe('ServerErrorStrategy', () => {
  let strategy: ServerErrorStrategy;

  beforeEach(() => {
    strategy = new ServerErrorStrategy();
  });

  it('should handle server error types', () => {
    const serverError: UIError = {
      code: ErrorCode.SERVER_ERROR,
      message: 'Internal server error',
      userMessage: 'Server is temporarily unavailable',
      severity: ErrorSeverity.HIGH,
      category: 'server',
      timestamp: new Date().toISOString(),
      isRetryable: true,
      actionable: false
    };

    expect(strategy.canHandle(serverError)).toBe(true);
  });

  it('should retry server errors with progressive delay', async () => {
    const serverError: UIError = {
      code: ErrorCode.DATABASE_ERROR,
      message: 'Database error',
      userMessage: 'Database is temporarily unavailable',
      severity: ErrorSeverity.HIGH,
      category: 'server',
      timestamp: new Date().toISOString(),
      isRetryable: true,
      actionable: false
    };

    const result1 = await strategy.handle(serverError, { retryCount: 0 });
    const result2 = await strategy.handle(serverError, { retryCount: 1 });

    expect(result1.action).toBe(RecoveryAction.RETRY);
    expect(result2.action).toBe(RecoveryAction.RETRY);
    expect(result1.retryAfter).toBeLessThan(result2.retryAfter!);
  });

  it('should show error after max retries', async () => {
    const serverError: UIError = {
      code: ErrorCode.SERVER_ERROR,
      message: 'Server error',
      userMessage: 'Server is temporarily unavailable',
      severity: ErrorSeverity.HIGH,
      category: 'server',
      timestamp: new Date().toISOString(),
      isRetryable: true,
      actionable: false
    };

    const result = await strategy.handle(serverError, { retryCount: 2 });

    expect(result.success).toBe(false);
    expect(result.action).toBe(RecoveryAction.SHOW_ERROR);
  });
});