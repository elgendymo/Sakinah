import { Request, Response, NextFunction } from 'express';
import {
  ErrorCode,
  createAppError,
  getExpressTraceId,
  logger
} from '@/shared/errors';
import { DatabaseFactory } from '../database/factory';

export interface AuthRequest extends Request {
  userId?: string;
}

export async function authMiddleware(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const traceId = getExpressTraceId(req);

  try {
    // For local development (unless Supabase explicitly enabled), skip auth and use a test user ID
    const isLocalDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production';
    const useSupabase = process.env.USE_SUPABASE === 'true' || process.env.DB_BACKEND?.toLowerCase() === 'supabase';

    if (isLocalDev && !useSupabase) {
      // Use the existing test user UUID for local development testing
      const mockUserId = '12345678-1234-4567-8901-123456789012';
      req.userId = mockUserId;
      logger.debug('Using mock authentication for local development', {
        userId: mockUserId,
        traceId,
        path: req.path
      });
      return next();
    }

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Authentication failed: No bearer token provided', {
        traceId,
        path: req.path,
        userAgent: req.headers['user-agent']
      });
      throw createAppError(ErrorCode.UNAUTHORIZED, 'No token provided');
    }

    const token = authHeader.substring(7);

    // For Supabase authentication, we need to get the Supabase client
    // This will only be reached if Supabase is explicitly enabled in development or in production
    const connectionInfo = DatabaseFactory.getConnectionInfo();

    if (connectionInfo.backend === 'auto' && !connectionInfo.supabaseReady) {
      logger.error('Authentication service not configured', {
        traceId,
        backend: connectionInfo.backend,
        supabaseReady: connectionInfo.supabaseReady
      });
      throw createAppError(ErrorCode.SERVER_ERROR, 'Authentication service not configured');
    }

    // Import and use Supabase only when needed
    const { supabase } = await import('../db/supabase');

    if (!supabase) {
      logger.error('Authentication service not available', {
        traceId,
        path: req.path
      });
      throw createAppError(ErrorCode.SERVER_ERROR, 'Authentication service not available');
    }

    logger.debug('Attempting to verify token with Supabase', {
      traceId,
      path: req.path,
      tokenLength: token.length
    });

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      logger.warn('Authentication failed: Invalid token', {
        traceId,
        path: req.path,
        error: error?.message,
        userAgent: req.headers['user-agent']
      });
      throw createAppError(ErrorCode.UNAUTHORIZED, 'Invalid token');
    }

    req.userId = user.id;
    logger.debug('Authentication successful', {
      userId: user.id,
      traceId,
      path: req.path
    });
    next();
  } catch (error) {
    // Log authentication errors with trace context
    if (error && typeof error === 'object' && 'code' in error) {
      // This is already our standardized error, just pass it along
      const appError = error as { code: ErrorCode; message: string };
      logger.error('Authentication middleware error', {
        traceId,
        path: req.path,
        errorCode: appError.code,
        message: appError.message
      });
    } else {
      // Unexpected error - log it and wrap it
      logger.error('Unexpected authentication error', {
        traceId,
        path: req.path,
        error: error instanceof Error ? error.message : String(error)
      });
    }
    next(error);
  }
}