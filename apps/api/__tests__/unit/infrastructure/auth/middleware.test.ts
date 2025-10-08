import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { authMiddleware, AuthRequest } from '@/infrastructure/auth/middleware';
import { ErrorCode } from '@/shared/errors';

// Mock dependencies
vi.mock('@/shared/errors');
vi.mock('@/infrastructure/database/factory');
vi.mock('@/infrastructure/db/supabase');

const mockLogger = {
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  info: vi.fn()
};

vi.mock('@/shared/errors', () => ({
  ErrorCode: {
    UNAUTHORIZED: 'UNAUTHORIZED',
    SERVER_ERROR: 'SERVER_ERROR'
  },
  createAppError: vi.fn((code: string, message: string) => ({
    code,
    message
  })),
  getExpressTraceId: vi.fn(() => 'test-trace-id'),
  logger: mockLogger
}));

// Mock database factory
const mockDatabaseFactory = {
  getConnectionInfo: vi.fn()
};

vi.mock('@/infrastructure/database/factory', () => ({
  DatabaseFactory: mockDatabaseFactory
}));

// Mock Supabase
const mockSupabase = {
  auth: {
    getUser: vi.fn()
  }
};

describe('Auth Middleware', () => {
  let req: Partial<AuthRequest>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      headers: {},
      path: '/test'
    };
    res = {};
    next = vi.fn();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Development Mode', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
      process.env.USE_SUPABASE = 'false';
      process.env.DB_BACKEND = undefined;
    });

    it('should use mock user ID in development mode', async () => {
      await authMiddleware(req as AuthRequest, res as Response, next);

      expect(req.userId).toBe('12345678-1234-4567-8901-123456789012');
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Using mock authentication for local development',
        expect.objectContaining({
          userId: '12345678-1234-4567-8901-123456789012',
          traceId: 'test-trace-id',
          path: '/test'
        })
      );
      expect(next).toHaveBeenCalled();
    });

    it('should skip mock auth when Supabase is explicitly enabled', async () => {
      process.env.USE_SUPABASE = 'true';

      mockDatabaseFactory.getConnectionInfo.mockReturnValue({
        backend: 'supabase',
        supabaseReady: true
      });

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'supabase-user-id' } },
        error: null
      });

      vi.doMock('@/infrastructure/db/supabase', () => ({
        supabase: mockSupabase
      }));

      req.headers = { authorization: 'Bearer valid-token' };

      await authMiddleware(req as AuthRequest, res as Response, next);

      expect(req.userId).toBe('supabase-user-id');
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Production Mode with Supabase', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
      process.env.USE_SUPABASE = 'true';
      process.env.DB_BACKEND = 'supabase';

      mockDatabaseFactory.getConnectionInfo.mockReturnValue({
        backend: 'supabase',
        supabaseReady: true
      });

      vi.doMock('@/infrastructure/db/supabase', () => ({
        supabase: mockSupabase
      }));
    });

    it('should validate Bearer token and set userId', async () => {
      req.headers = { authorization: 'Bearer valid-jwt-token' };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'authenticated-user-id' } },
        error: null
      });

      await authMiddleware(req as AuthRequest, res as Response, next);

      expect(req.userId).toBe('authenticated-user-id');
      expect(mockSupabase.auth.getUser).toHaveBeenCalledWith('valid-jwt-token');
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Authentication successful',
        expect.objectContaining({
          userId: 'authenticated-user-id',
          traceId: 'test-trace-id',
          path: '/test'
        })
      );
      expect(next).toHaveBeenCalled();
    });

    it('should reject request without Authorization header', async () => {
      req.headers = {};

      await authMiddleware(req as AuthRequest, res as Response, next);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Authentication failed: No bearer token provided',
        expect.objectContaining({
          traceId: 'test-trace-id',
          path: '/test'
        })
      );
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'UNAUTHORIZED',
          message: 'No token provided'
        })
      );
    });

    it('should reject request with invalid Authorization format', async () => {
      req.headers = { authorization: 'InvalidFormat token' };

      await authMiddleware(req as AuthRequest, res as Response, next);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Authentication failed: No bearer token provided',
        expect.objectContaining({
          traceId: 'test-trace-id',
          path: '/test'
        })
      );
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'UNAUTHORIZED',
          message: 'No token provided'
        })
      );
    });

    it('should reject request with invalid JWT token', async () => {
      req.headers = { authorization: 'Bearer invalid-token' };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid JWT' }
      });

      await authMiddleware(req as AuthRequest, res as Response, next);

      expect(mockSupabase.auth.getUser).toHaveBeenCalledWith('invalid-token');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Authentication failed: Invalid token',
        expect.objectContaining({
          traceId: 'test-trace-id',
          path: '/test',
          error: 'Invalid JWT'
        })
      );
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'UNAUTHORIZED',
          message: 'Invalid token'
        })
      );
    });

    it('should handle expired JWT token', async () => {
      req.headers = { authorization: 'Bearer expired-token' };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'JWT expired' }
      });

      await authMiddleware(req as AuthRequest, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'UNAUTHORIZED',
          message: 'Invalid token'
        })
      );
    });

    it('should handle Supabase service unavailable', async () => {
      req.headers = { authorization: 'Bearer valid-token' };

      mockDatabaseFactory.getConnectionInfo.mockReturnValue({
        backend: 'auto',
        supabaseReady: false
      });

      await authMiddleware(req as AuthRequest, res as Response, next);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Authentication service not configured',
        expect.objectContaining({
          traceId: 'test-trace-id',
          backend: 'auto',
          supabaseReady: false
        })
      );
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'SERVER_ERROR',
          message: 'Authentication service not configured'
        })
      );
    });

    it('should handle Supabase client import failure', async () => {
      req.headers = { authorization: 'Bearer valid-token' };

      vi.doMock('@/infrastructure/db/supabase', () => ({
        supabase: null
      }));

      await authMiddleware(req as AuthRequest, res as Response, next);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Authentication service not available',
        expect.objectContaining({
          traceId: 'test-trace-id',
          path: '/test'
        })
      );
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'SERVER_ERROR',
          message: 'Authentication service not available'
        })
      );
    });

    it('should log token verification attempt', async () => {
      req.headers = { authorization: 'Bearer test-token-123' };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      });

      await authMiddleware(req as AuthRequest, res as Response, next);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Attempting to verify token with Supabase',
        expect.objectContaining({
          traceId: 'test-trace-id',
          path: '/test',
          tokenLength: 14 // Length of 'test-token-123'
        })
      );
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
      process.env.USE_SUPABASE = 'true';
    });

    it('should handle unexpected errors gracefully', async () => {
      req.headers = { authorization: 'Bearer valid-token' };

      mockDatabaseFactory.getConnectionInfo.mockImplementation(() => {
        throw new Error('Unexpected database error');
      });

      await authMiddleware(req as AuthRequest, res as Response, next);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Unexpected authentication error',
        expect.objectContaining({
          traceId: 'test-trace-id',
          path: '/test',
          error: 'Unexpected database error'
        })
      );
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should pass through standardized app errors', async () => {
      req.headers = { authorization: 'Bearer valid-token' };

      const appError = {
        code: 'UNAUTHORIZED',
        message: 'Custom auth error'
      };

      mockDatabaseFactory.getConnectionInfo.mockImplementation(() => {
        throw appError;
      });

      await authMiddleware(req as AuthRequest, res as Response, next);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Authentication middleware error',
        expect.objectContaining({
          traceId: 'test-trace-id',
          path: '/test',
          errorCode: 'UNAUTHORIZED',
          message: 'Custom auth error'
        })
      );
      expect(next).toHaveBeenCalledWith(appError);
    });
  });

  describe('Request Context Logging', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
      process.env.USE_SUPABASE = 'true';

      mockDatabaseFactory.getConnectionInfo.mockReturnValue({
        backend: 'supabase',
        supabaseReady: true
      });
    });

    it('should include user agent in warning logs', async () => {
      req.headers = {
        'user-agent': 'Mozilla/5.0 Test Browser'
      };

      await authMiddleware(req as AuthRequest, res as Response, next);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Authentication failed: No bearer token provided',
        expect.objectContaining({
          userAgent: 'Mozilla/5.0 Test Browser'
        })
      );
    });

    it('should include user agent in error logs for invalid tokens', async () => {
      req.headers = {
        authorization: 'Bearer invalid-token',
        'user-agent': 'PostmanRuntime/7.28.0'
      };

      vi.doMock('@/infrastructure/db/supabase', () => ({
        supabase: mockSupabase
      }));

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid JWT signature' }
      });

      await authMiddleware(req as AuthRequest, res as Response, next);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Authentication failed: Invalid token',
        expect.objectContaining({
          userAgent: 'PostmanRuntime/7.28.0'
        })
      );
    });
  });
});