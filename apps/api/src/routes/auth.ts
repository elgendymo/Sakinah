import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { DatabaseFactory } from '@/infrastructure/database/factory';
import {
  ErrorCode,
  createAppError,
  handleExpressError,
  getExpressTraceId,
  createSuccessResponse,
  createRequestLogger
} from '@/shared/errors';
import { validateRequest } from '@/infrastructure/middleware/validation';
import { SignupRequestSchema } from '@sakinah/types';

const router = Router();

const emailSchema = z.object({
  email: z.string().email('Invalid email format').min(1, 'Email is required')
});

const tokenSchema = z.object({
  token: z.string().min(1, 'Token is required')
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format').min(1, 'Email is required'),
  password: z.string().min(1, 'Password is required')
});

router.post('/signup', validateRequest(SignupRequestSchema), async (req: Request, res: Response): Promise<void> => {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId);

  try {
    const { email, password, firstName, gender } = req.body;

    requestLogger.info('User signup attempt', { email, firstName, gender });

    const isLocalDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production';
    const useSupabase = process.env.USE_SUPABASE === 'true' || process.env.DB_BACKEND?.toLowerCase() === 'supabase';

    if (isLocalDev && !useSupabase) {
      requestLogger.info('Mock signup for development', { email, firstName, gender });

      // Simulate database call to create user with new fields
      const mockUserId = '12345678-1234-4567-8901-123456789012';

      const response = createSuccessResponse({
        message: 'Development mode: User created successfully',
        userId: mockUserId,
        redirectTo: '/onboarding/welcome'
      }, traceId);
      res.status(201).json(response);
      return;
    }

    const connectionInfo = DatabaseFactory.getConnectionInfo();
    if (connectionInfo.backend === 'auto' && !connectionInfo.supabaseReady) {
      throw createAppError(ErrorCode.SERVER_ERROR, 'Authentication service not configured');
    }

    const { supabase } = await import('@/infrastructure/db/supabase');
    if (!supabase) {
      throw createAppError(ErrorCode.SERVER_ERROR, 'Authentication service not available');
    }

    // Create user with email/password authentication in Supabase
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm for onboarding flow
      user_metadata: {
        first_name: firstName,
        gender: gender
      }
    });

    if (error) {
      requestLogger.error('Signup error', { error: error.message });

      // Handle specific error cases
      if (error.message.includes('already registered')) {
        throw createAppError(ErrorCode.CONFLICT, 'User with this email already exists');
      }

      if (error.message.includes('password')) {
        throw createAppError(ErrorCode.VALIDATION_ERROR, 'Password does not meet requirements');
      }

      throw createAppError(ErrorCode.SERVER_ERROR, error.message);
    }

    if (!data.user) {
      throw createAppError(ErrorCode.SERVER_ERROR, 'User creation failed');
    }

    // Update users table with first_name and gender
    const { error: updateError } = await supabase
      .from('users')
      .upsert({
        id: data.user.id,
        first_name: firstName,
        gender: gender,
        created_at: new Date().toISOString()
      });

    if (updateError) {
      requestLogger.error('User profile update error', { error: updateError.message });
      // Don't fail the signup, but log the error
    }

    requestLogger.info('User created successfully', {
      email,
      firstName,
      gender,
      userId: data.user.id
    });

    const response = createSuccessResponse({
      message: 'User created successfully',
      userId: data.user.id,
      redirectTo: '/onboarding/welcome'
    }, traceId);
    res.status(201).json(response);
  } catch (error) {
    requestLogger.error('Signup error', { error: error instanceof Error ? error.message : String(error) }, error instanceof Error ? error : undefined);
    const { response, status, headers } = handleExpressError(error, traceId);
    res.status(status).set(headers).json(response);
  }
});

// Email/Password login endpoint
router.post('/login', validateRequest(loginSchema), async (req: Request, res: Response): Promise<void> => {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId);

  try {
    const { email, password } = req.body;

    requestLogger.info('User login attempt with password', { email });

    const isLocalDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production';
    const useSupabase = process.env.USE_SUPABASE === 'true' || process.env.DB_BACKEND?.toLowerCase() === 'supabase';

    if (isLocalDev && !useSupabase) {
      requestLogger.info('Mock login for development', { email });
      const response = createSuccessResponse({
        message: 'Development mode: Login successful',
        accessToken: 'mock-access-token-for-dev',
        refreshToken: 'mock-refresh-token-for-dev',
        user: {
          id: '12345678-1234-4567-8901-123456789012',
          email: email
        }
      }, traceId);
      res.status(200).json(response);
      return;
    }

    const connectionInfo = DatabaseFactory.getConnectionInfo();
    if (connectionInfo.backend === 'auto' && !connectionInfo.supabaseReady) {
      throw createAppError(ErrorCode.SERVER_ERROR, 'Authentication service not configured');
    }

    const { supabase } = await import('@/infrastructure/db/supabase');
    if (!supabase) {
      throw createAppError(ErrorCode.SERVER_ERROR, 'Authentication service not available');
    }

    // Sign in with email and password
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      requestLogger.error('Login error', { error: error.message });

      // Handle specific error cases
      if (error.message.includes('Invalid login credentials') || error.message.includes('Email not confirmed')) {
        throw createAppError(ErrorCode.UNAUTHORIZED, 'Invalid email or password');
      }

      throw createAppError(ErrorCode.SERVER_ERROR, error.message);
    }

    if (!data.user || !data.session) {
      throw createAppError(ErrorCode.UNAUTHORIZED, 'Login failed');
    }

    requestLogger.info('User logged in successfully', {
      email,
      userId: data.user.id
    });

    const response = createSuccessResponse({
      message: 'Login successful',
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      user: {
        id: data.user.id,
        email: data.user.email
      }
    }, traceId);
    res.status(200).json(response);
  } catch (error) {
    requestLogger.error('Login error', { error: error instanceof Error ? error.message : String(error) }, error instanceof Error ? error : undefined);
    const { response, status, headers } = handleExpressError(error, traceId);
    res.status(status).set(headers).json(response);
  }
});

// Magic link login endpoint (legacy support)
router.post('/login/magic-link', validateRequest(emailSchema), async (req: Request, res: Response): Promise<void> => {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId);

  try {
    const { email } = req.body;

    requestLogger.info('User login attempt', { email });

    const isLocalDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production';
    const useSupabase = process.env.USE_SUPABASE === 'true' || process.env.DB_BACKEND?.toLowerCase() === 'supabase';

    if (isLocalDev && !useSupabase) {
      requestLogger.info('Mock login for development', { email });
      const response = createSuccessResponse({
        message: 'Development mode: Magic link sent',
        token: 'mock-token-for-dev'
      }, traceId);
      res.status(200).json(response);
      return;
    }

    const connectionInfo = DatabaseFactory.getConnectionInfo();
    if (connectionInfo.backend === 'auto' && !connectionInfo.supabaseReady) {
      throw createAppError(ErrorCode.SERVER_ERROR, 'Authentication service not configured');
    }

    const { supabase } = await import('@/infrastructure/db/supabase');
    if (!supabase) {
      throw createAppError(ErrorCode.SERVER_ERROR, 'Authentication service not available');
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: process.env.FRONTEND_URL || 'http://localhost:3000/auth/callback'
      }
    });

    if (error) {
      requestLogger.error('Login error', { error: error.message });
      throw createAppError(ErrorCode.SERVER_ERROR, error.message);
    }

    requestLogger.info('Magic link sent successfully', { email });
    const response = createSuccessResponse({
      message: 'Magic link sent to your email'
    }, traceId);
    res.status(200).json(response);
  } catch (error) {
    requestLogger.error('Login error', { error: error instanceof Error ? error.message : String(error) }, error instanceof Error ? error : undefined);
    const { response, status, headers } = handleExpressError(error, traceId);
    res.status(status).set(headers).json(response);
  }
});

router.post('/verify', validateRequest(tokenSchema), async (req: Request, res: Response): Promise<void> => {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId);

  try {
    const { token } = req.body;

    requestLogger.info('Token verification attempt');

    const isLocalDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production';
    const useSupabase = process.env.USE_SUPABASE === 'true' || process.env.DB_BACKEND?.toLowerCase() === 'supabase';

    if (isLocalDev && !useSupabase) {
      requestLogger.info('Mock token verification for development');
      const response = createSuccessResponse({
        user: {
          id: '12345678-1234-4567-8901-123456789012',
          email: 'dev@sakinah.app'
        }
      }, traceId);
      res.status(200).json(response);
      return;
    }

    const connectionInfo = DatabaseFactory.getConnectionInfo();
    if (connectionInfo.backend === 'auto' && !connectionInfo.supabaseReady) {
      throw createAppError(ErrorCode.SERVER_ERROR, 'Authentication service not configured');
    }

    const { supabase } = await import('@/infrastructure/db/supabase');
    if (!supabase) {
      throw createAppError(ErrorCode.SERVER_ERROR, 'Authentication service not available');
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      requestLogger.warn('Token verification failed', { error: error?.message });
      throw createAppError(ErrorCode.UNAUTHORIZED, 'Invalid or expired token');
    }

    requestLogger.info('Token verified successfully', { userId: user.id, email: user.email });

    const response = createSuccessResponse({
      user: {
        id: user.id,
        email: user.email
      }
    }, traceId);
    res.status(200).json(response);
  } catch (error) {
    requestLogger.error('Token verification error', { error: error instanceof Error ? error.message : String(error) }, error instanceof Error ? error : undefined);
    const { response, status, headers } = handleExpressError(error, traceId);
    res.status(status).set(headers).json(response);
  }
});

router.post('/logout', async (req: Request, res: Response): Promise<void> => {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId);

  try {
    const authHeader = req.headers.authorization;

    requestLogger.info('User logout attempt');

    const isLocalDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production';
    const useSupabase = process.env.USE_SUPABASE === 'true' || process.env.DB_BACKEND?.toLowerCase() === 'supabase';

    if (isLocalDev && !useSupabase) {
      requestLogger.info('Mock logout for development');
      const response = createSuccessResponse({
        message: 'Logged out successfully'
      }, traceId);
      res.status(200).json(response);
      return;
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      requestLogger.info('No auth header found, already logged out');
      const response = createSuccessResponse({
        message: 'Already logged out'
      }, traceId);
      res.status(200).json(response);
      return;
    }

    const token = authHeader.substring(7);

    const connectionInfo = DatabaseFactory.getConnectionInfo();
    if (connectionInfo.backend === 'auto' && !connectionInfo.supabaseReady) {
      throw createAppError(ErrorCode.SERVER_ERROR, 'Authentication service not configured');
    }

    const { supabase } = await import('@/infrastructure/db/supabase');
    if (!supabase) {
      throw createAppError(ErrorCode.SERVER_ERROR, 'Authentication service not available');
    }

    const { error } = await supabase.auth.admin.signOut(token);

    if (error) {
      requestLogger.error('Logout error', { error: error.message });
    }

    requestLogger.info('User logged out successfully');
    const response = createSuccessResponse({
      message: 'Logged out successfully'
    }, traceId);
    res.status(200).json(response);
  } catch (error) {
    requestLogger.error('Logout error', { error: error instanceof Error ? error.message : String(error) }, error instanceof Error ? error : undefined);
    const { response, status, headers } = handleExpressError(error, traceId);
    res.status(status).set(headers).json(response);
  }
});

export default router;