import { Request, Response, NextFunction } from 'express';
import { AuthenticationError } from '@/shared/errors';
import { DatabaseFactory } from '../database/factory';

export interface AuthRequest extends Request {
  userId?: string;
}

export async function authMiddleware(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // For local development (unless Supabase explicitly enabled), skip auth and use a test user ID
    const isLocalDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production';
    const useSupabase = process.env.USE_SUPABASE === 'true' || process.env.DB_BACKEND?.toLowerCase() === 'supabase';

    if (isLocalDev && !useSupabase) {
      req.userId = 'test-user-123';
      return next();
    }

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('No token provided');
    }

    const token = authHeader.substring(7);

    // For Supabase authentication, we need to get the Supabase client
    // This will only be reached if Supabase is explicitly enabled in development or in production
    const connectionInfo = DatabaseFactory.getConnectionInfo();

    if (connectionInfo.backend === 'auto' && !connectionInfo.supabaseReady) {
      throw new AuthenticationError('Authentication service not configured');
    }

    // Import and use Supabase only when needed
    const { supabase } = await import('../db/supabase');

    if (!supabase) {
      throw new AuthenticationError('Authentication service not available');
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      throw new AuthenticationError('Invalid token');
    }

    req.userId = user.id;
    next();
  } catch (error) {
    next(error);
  }
}