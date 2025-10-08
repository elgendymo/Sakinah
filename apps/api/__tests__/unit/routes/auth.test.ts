import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import authRoutes from '@/routes/auth';
import { validateRequest } from '@/infrastructure/middleware/validation';

// Mock dependencies
vi.mock('@/infrastructure/database/factory');
vi.mock('@/infrastructure/db/supabase');
vi.mock('@/shared/errors');
vi.mock('@/infrastructure/middleware/validation', () => ({
  validateRequest: vi.fn(() => (req: any, res: any, next: any) => next())
}));

const app = express();
app.use(express.json());
app.use('/auth', authRoutes);

// Mock Supabase client
const mockSupabase = {
  auth: {
    admin: {
      createUser: vi.fn()
    },
    signInWithPassword: vi.fn()
  },
  from: vi.fn(() => ({
    upsert: vi.fn()
  }))
};

describe('Auth Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = 'test';
    process.env.USE_SUPABASE = 'false';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /auth/signup', () => {
    const validSignupData = {
      email: 'test@example.com',
      password: 'password123',
      firstName: 'John',
      gender: 'male'
    };

    it('should create user successfully in development mode', async () => {
      const response = await request(app)
        .post('/auth/signup')
        .send(validSignupData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('Development mode');
      expect(response.body.data.userId).toBe('12345678-1234-4567-8901-123456789012');
      expect(response.body.data.redirectTo).toBe('/onboarding/welcome');
    });

    it('should return 400 for missing required fields', async () => {
      const invalidData = {
        email: 'test@example.com',
        // missing password, firstName, gender
      };

      // Mock validation to fail
      vi.mocked(validateRequest).mockImplementationOnce(() =>
        (req: any, res: any, next: any) => {
          res.status(400).json({ error: { message: 'Validation failed' } });
        }
      );

      const response = await request(app)
        .post('/auth/signup')
        .send(invalidData);

      expect(response.status).toBe(400);
    });

    it('should handle Supabase user creation when enabled', async () => {
      process.env.USE_SUPABASE = 'true';

      // Mock successful user creation
      mockSupabase.auth.admin.createUser.mockResolvedValue({
        data: {
          user: {
            id: 'supabase-user-id',
            email: 'test@example.com'
          }
        },
        error: null
      });

      // Mock successful table update
      mockSupabase.from.mockReturnValue({
        upsert: vi.fn().mockResolvedValue({ error: null })
      });

      // Mock the dynamic import
      vi.doMock('@/infrastructure/db/supabase', () => ({
        supabase: mockSupabase
      }));

      const response = await request(app)
        .post('/auth/signup')
        .send(validSignupData);

      expect(response.status).toBe(201);
      expect(mockSupabase.auth.admin.createUser).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        email_confirm: true,
        user_metadata: {
          first_name: 'John',
          gender: 'male'
        }
      });
    });

    it('should handle Supabase creation errors', async () => {
      process.env.USE_SUPABASE = 'true';

      mockSupabase.auth.admin.createUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'User already exists' }
      });

      vi.doMock('@/infrastructure/db/supabase', () => ({
        supabase: mockSupabase
      }));

      const response = await request(app)
        .post('/auth/signup')
        .send(validSignupData);

      expect(response.status).toBe(500);
    });
  });

  describe('POST /auth/login', () => {
    const validLoginData = {
      email: 'test@example.com',
      password: 'password123'
    };

    it('should login successfully in development mode', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send(validLoginData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('Development mode');
      expect(response.body.data.accessToken).toBe('mock-access-token-for-dev');
      expect(response.body.data.user.email).toBe('test@example.com');
    });

    it('should return 400 for missing credentials', async () => {
      const invalidData = {
        email: 'test@example.com'
        // missing password
      };

      vi.mocked(validateRequest).mockImplementationOnce(() =>
        (req: any, res: any, next: any) => {
          res.status(400).json({ error: { message: 'Password is required' } });
        }
      );

      const response = await request(app)
        .post('/auth/login')
        .send(invalidData);

      expect(response.status).toBe(400);
    });

    it('should handle successful Supabase login', async () => {
      process.env.USE_SUPABASE = 'true';

      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: {
            id: 'user-id',
            email: 'test@example.com'
          },
          session: {
            access_token: 'access-token',
            refresh_token: 'refresh-token'
          }
        },
        error: null
      });

      vi.doMock('@/infrastructure/db/supabase', () => ({
        supabase: mockSupabase
      }));

      const response = await request(app)
        .post('/auth/login')
        .send(validLoginData);

      expect(response.status).toBe(200);
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      });
    });

    it('should handle invalid credentials', async () => {
      process.env.USE_SUPABASE = 'true';

      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' }
      });

      vi.doMock('@/infrastructure/db/supabase', () => ({
        supabase: mockSupabase
      }));

      const response = await request(app)
        .post('/auth/login')
        .send(validLoginData);

      expect(response.status).toBe(401);
    });
  });

  describe('POST /auth/login/magic-link', () => {
    it('should send magic link in development mode', async () => {
      const response = await request(app)
        .post('/auth/login/magic-link')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('Magic link sent');
    });

    it('should handle Supabase magic link when enabled', async () => {
      process.env.USE_SUPABASE = 'true';

      mockSupabase.auth.signInWithOtp = vi.fn().mockResolvedValue({
        error: null
      });

      vi.doMock('@/infrastructure/db/supabase', () => ({
        supabase: mockSupabase
      }));

      const response = await request(app)
        .post('/auth/login/magic-link')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(200);
      expect(mockSupabase.auth.signInWithOtp).toHaveBeenCalledWith({
        email: 'test@example.com',
        options: {
          emailRedirectTo: 'http://localhost:3000/auth/callback'
        }
      });
    });
  });

  describe('POST /auth/verify', () => {
    it('should verify token in development mode', async () => {
      const response = await request(app)
        .post('/auth/verify')
        .send({ token: 'mock-token' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.id).toBe('12345678-1234-4567-8901-123456789012');
    });

    it('should handle token verification with Supabase', async () => {
      process.env.USE_SUPABASE = 'true';

      mockSupabase.auth.getUser = vi.fn().mockResolvedValue({
        data: {
          user: {
            id: 'user-id',
            email: 'test@example.com'
          }
        },
        error: null
      });

      vi.doMock('@/infrastructure/db/supabase', () => ({
        supabase: mockSupabase
      }));

      const response = await request(app)
        .post('/auth/verify')
        .send({ token: 'valid-token' });

      expect(response.status).toBe(200);
      expect(mockSupabase.auth.getUser).toHaveBeenCalledWith('valid-token');
    });

    it('should reject invalid token', async () => {
      process.env.USE_SUPABASE = 'true';

      mockSupabase.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' }
      });

      vi.doMock('@/infrastructure/db/supabase', () => ({
        supabase: mockSupabase
      }));

      const response = await request(app)
        .post('/auth/verify')
        .send({ token: 'invalid-token' });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout successfully in development mode', async () => {
      const response = await request(app)
        .post('/auth/logout');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Logged out successfully');
    });

    it('should handle logout without auth header', async () => {
      const response = await request(app)
        .post('/auth/logout');

      expect(response.status).toBe(200);
      expect(response.body.data.message).toBe('Logged out successfully');
    });

    it('should handle Supabase logout', async () => {
      process.env.USE_SUPABASE = 'true';

      mockSupabase.auth.admin.signOut = vi.fn().mockResolvedValue({
        error: null
      });

      vi.doMock('@/infrastructure/db/supabase', () => ({
        supabase: mockSupabase
      }));

      const response = await request(app)
        .post('/auth/logout')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(mockSupabase.auth.admin.signOut).toHaveBeenCalledWith('valid-token');
    });
  });
});