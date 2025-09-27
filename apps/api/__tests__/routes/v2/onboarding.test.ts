import request from 'supertest';
import express from 'express';
import { container } from 'tsyringe';
import onboardingRouter from '../../../src/routes/v2/onboarding';
import { IOnboardingRepository } from '../../../src/domain/repositories/IOnboardingRepository';
import { OnboardingEntity, OnboardingStep } from '../../../src/domain/entities/Onboarding';
import { UserId } from '../../../src/domain/value-objects/UserId';
import { OnboardingId } from '../../../src/domain/value-objects/OnboardingId';
import { Result } from '../../../src/shared/result';

import { vi } from 'vitest';

// Mock dependencies
const mockOnboardingRepository = {
  create: vi.fn(),
  getByUserId: vi.fn(),
  getById: vi.fn(),
  update: vi.fn(),
  upsert: vi.fn(),
  completeStep: vi.fn(),
  skipStep: vi.fn(),
  moveToStep: vi.fn(),
  markCompleted: vi.fn(),
  delete: vi.fn(),
  getCompletionStats: vi.fn(),
  getIncompleteAfterDays: vi.fn()
};

// Mock authentication middleware
vi.mock('../../../src/infrastructure/auth/middleware', () => ({
  authMiddleware: (req: any, res: any, next: any) => {
    req.userId = 'test-user-id';
    next();
  }
}));

// Mock container
vi.mock('tsyringe', () => ({
  container: {
    resolve: vi.fn()
  }
}));

describe('Onboarding Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/', onboardingRouter);

    // Mock container resolve
    (container.resolve as any).mockImplementation((token: string) => {
      if (token === 'IOnboardingRepository') {
        return mockOnboardingRepository;
      }
      return null;
    });

    // Reset all mocks
    vi.clearAllMocks();
  });

  describe('GET /', () => {
    it('should return existing onboarding status', async () => {
      const mockOnboarding = OnboardingEntity.createNew('test-user-id');
      mockOnboarding.completeStep('welcome');

      mockOnboardingRepository.getByUserId.mockResolvedValue(
        Result.ok(mockOnboarding)
      );

      const response = await request(app).get('/');

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.progress).toBeDefined();
      expect(response.body.data.currentStep).toBe('language');
      expect(mockOnboardingRepository.getByUserId).toHaveBeenCalledWith(
        expect.any(UserId)
      );
    });

    it('should create new onboarding if none exists', async () => {
      const newOnboarding = OnboardingEntity.createNew('test-user-id');

      mockOnboardingRepository.getByUserId.mockResolvedValue(Result.ok(null));
      mockOnboardingRepository.create.mockResolvedValue(Result.ok(newOnboarding));

      const response = await request(app).get('/');

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.progress).toBeDefined();
      expect(response.body.data.currentStep).toBe('welcome');
      expect(mockOnboardingRepository.create).toHaveBeenCalled();
    });

    it('should handle repository errors', async () => {
      mockOnboardingRepository.getByUserId.mockResolvedValue(
        Result.error(new Error('Database error'))
      );

      const response = await request(app).get('/');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to fetch onboarding status');
    });
  });

  describe('GET /steps', () => {
    it('should return onboarding steps configuration', async () => {
      const response = await request(app).get('/steps');

      expect(response.status).toBe(200);
      expect(response.body.steps).toBeDefined();
      expect(response.body.flow).toBeDefined();
      expect(response.body.steps.welcome).toBeDefined();
      expect(response.body.flow).toContain('welcome');
      expect(response.body.flow).toContain('language');
    });
  });

  describe('POST /complete-step', () => {
    it('should complete a step successfully', async () => {
      const mockOnboarding = OnboardingEntity.createNew('test-user-id');
      mockOnboarding.completeStep('welcome');

      mockOnboardingRepository.completeStep.mockResolvedValue(
        Result.ok(mockOnboarding)
      );

      const stepData = {
        step: 'welcome',
        data: { welcomeCompleted: true }
      };

      const response = await request(app)
        .post('/complete-step')
        .send(stepData);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.progress).toBeDefined();
      expect(response.body.message).toContain('completed successfully');
      expect(mockOnboardingRepository.completeStep).toHaveBeenCalledWith(
        expect.any(UserId),
        'welcome',
        { welcomeCompleted: true }
      );
    });

    it('should complete language step with language data', async () => {
      const mockOnboarding = OnboardingEntity.createNew('test-user-id');
      mockOnboarding.completeStep('language', { language: 'ar' });

      mockOnboardingRepository.completeStep.mockResolvedValue(
        Result.ok(mockOnboarding)
      );

      const stepData = {
        step: 'language',
        data: { language: 'ar' }
      };

      const response = await request(app)
        .post('/complete-step')
        .send(stepData);

      expect(response.status).toBe(200);
      expect(response.body.data.languageSelected).toBe('ar');
      expect(mockOnboardingRepository.completeStep).toHaveBeenCalledWith(
        expect.any(UserId),
        'language',
        { language: 'ar' }
      );
    });

    it('should complete location step with location data', async () => {
      const mockOnboarding = OnboardingEntity.createNew('test-user-id');
      const locationData = {
        lat: 40.7128,
        lng: -74.0060,
        city: 'New York',
        country: 'USA'
      };
      mockOnboarding.completeStep('location', { location: locationData });

      mockOnboardingRepository.completeStep.mockResolvedValue(
        Result.ok(mockOnboarding)
      );

      const stepData = {
        step: 'location',
        data: { location: locationData }
      };

      const response = await request(app)
        .post('/complete-step')
        .send(stepData);

      expect(response.status).toBe(200);
      expect(response.body.data.locationSet).toBe(true);
      expect(mockOnboardingRepository.completeStep).toHaveBeenCalledWith(
        expect.any(UserId),
        'location',
        { location: locationData }
      );
    });

    it('should validate step data', async () => {
      const invalidStepData = {
        step: 'invalid-step',
        data: {}
      };

      const response = await request(app)
        .post('/complete-step')
        .send(invalidStepData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
    });

    it('should handle repository errors', async () => {
      mockOnboardingRepository.completeStep.mockResolvedValue(
        Result.error(new Error('Failed to complete step'))
      );

      const stepData = {
        step: 'welcome',
        data: { welcomeCompleted: true }
      };

      const response = await request(app)
        .post('/complete-step')
        .send(stepData);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to complete onboarding step');
    });
  });

  describe('POST /skip-step', () => {
    it('should skip a non-required step successfully', async () => {
      const mockOnboarding = OnboardingEntity.createNew('test-user-id');
      mockOnboarding.skipStep('notifications');

      mockOnboardingRepository.skipStep.mockResolvedValue(
        Result.ok(mockOnboarding)
      );

      const skipData = { step: 'notifications' };

      const response = await request(app)
        .post('/skip-step')
        .send(skipData);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('skipped successfully');
      expect(mockOnboardingRepository.skipStep).toHaveBeenCalledWith(
        expect.any(UserId),
        'notifications'
      );
    });

    it('should not allow skipping required steps', async () => {
      const skipData = { step: 'language' };

      const response = await request(app)
        .post('/skip-step')
        .send(skipData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Cannot skip required step');
      expect(response.body.message).toContain('required and cannot be skipped');
    });

    it('should validate step name', async () => {
      const invalidSkipData = { step: 'invalid-step' };

      const response = await request(app)
        .post('/skip-step')
        .send(invalidSkipData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
    });
  });

  describe('POST /move-to-step', () => {
    it('should move to a specific step successfully', async () => {
      const mockOnboarding = OnboardingEntity.createNew('test-user-id');
      mockOnboarding.moveToStep('profile');

      mockOnboardingRepository.moveToStep.mockResolvedValue(
        Result.ok(mockOnboarding)
      );

      const moveData = { step: 'profile' };

      const response = await request(app)
        .post('/move-to-step')
        .send(moveData);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('Moved to step');
      expect(mockOnboardingRepository.moveToStep).toHaveBeenCalledWith(
        expect.any(UserId),
        'profile'
      );
    });

    it('should validate step name', async () => {
      const invalidMoveData = { step: 'invalid-step' };

      const response = await request(app)
        .post('/move-to-step')
        .send(invalidMoveData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
    });
  });

  describe('POST /complete', () => {
    it('should mark onboarding as completed', async () => {
      const mockOnboarding = OnboardingEntity.createNew('test-user-id');
      mockOnboarding.moveToStep('complete');

      mockOnboardingRepository.markCompleted.mockResolvedValue(
        Result.ok(mockOnboarding)
      );

      const response = await request(app).post('/complete');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Onboarding completed successfully');
      expect(mockOnboardingRepository.markCompleted).toHaveBeenCalledWith(
        expect.any(UserId)
      );
    });

    it('should handle repository errors', async () => {
      mockOnboardingRepository.markCompleted.mockResolvedValue(
        Result.error(new Error('Failed to complete onboarding'))
      );

      const response = await request(app).post('/complete');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to complete onboarding');
    });
  });

  describe('DELETE /', () => {
    it('should reset onboarding successfully', async () => {
      mockOnboardingRepository.delete.mockResolvedValue(Result.ok(undefined));

      const response = await request(app).delete('/');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Onboarding reset successfully');
      expect(mockOnboardingRepository.delete).toHaveBeenCalledWith(
        expect.any(UserId)
      );
    });

    it('should handle case when onboarding does not exist', async () => {
      mockOnboardingRepository.delete.mockResolvedValue(
        Result.error(new Error('Onboarding not found'))
      );

      const response = await request(app).delete('/');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Onboarding reset successfully');
    });

    it('should handle other repository errors', async () => {
      mockOnboardingRepository.delete.mockResolvedValue(
        Result.error(new Error('Database connection failed'))
      );

      const response = await request(app).delete('/');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to reset onboarding');
    });
  });

  describe('PATCH /bulk-update', () => {
    it('should update multiple onboarding fields', async () => {
      const mockOnboarding = OnboardingEntity.createNew('test-user-id');

      mockOnboardingRepository.getByUserId.mockResolvedValue(
        Result.ok(mockOnboarding)
      );
      mockOnboardingRepository.upsert.mockResolvedValue(
        Result.ok(mockOnboarding)
      );

      const updateData = {
        currentStep: 'location',
        languageSelected: 'ar',
        locationSet: true,
        dataCollected: {
          language: 'ar',
          location: { lat: 40.7128, lng: -74.0060 }
        }
      };

      const response = await request(app)
        .patch('/bulk-update')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Onboarding updated successfully');
      expect(mockOnboardingRepository.upsert).toHaveBeenCalled();
    });

    it('should create new onboarding if none exists', async () => {
      const newOnboarding = OnboardingEntity.createNew('test-user-id');

      mockOnboardingRepository.getByUserId.mockResolvedValue(Result.ok(null));
      mockOnboardingRepository.upsert.mockResolvedValue(Result.ok(newOnboarding));

      const updateData = {
        currentStep: 'language',
        languageSelected: 'en'
      };

      const response = await request(app)
        .patch('/bulk-update')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Onboarding updated successfully');
    });

    it('should handle repository errors', async () => {
      mockOnboardingRepository.getByUserId.mockResolvedValue(
        Result.error(new Error('Database error'))
      );

      const updateData = {
        currentStep: 'language'
      };

      const response = await request(app)
        .patch('/bulk-update')
        .send(updateData);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to fetch onboarding');
    });
  });

  describe('Authentication', () => {
    beforeEach(() => {
      // Reset authentication mock
      vi.clearAllMocks();
    });

    it('should require authentication for all endpoints', async () => {
      // Mock missing userId (unauthenticated request)
      vi.doMock('../../../src/infrastructure/auth/middleware', () => ({
        authMiddleware: (req: any, res: any, next: any) => {
          // No userId set
          next();
        }
      }));

      const endpoints = [
        { method: 'get', path: '/' },
        { method: 'get', path: '/steps' },
        { method: 'post', path: '/complete-step' },
        { method: 'post', path: '/skip-step' },
        { method: 'post', path: '/move-to-step' },
        { method: 'post', path: '/complete' },
        { method: 'delete', path: '/' },
        { method: 'patch', path: '/bulk-update' }
      ];

      for (const endpoint of endpoints) {
        const response = await (request(app) as any)[endpoint.method](endpoint.path)
          .send({});

        expect(response.status).toBe(500);
        expect(response.body.error).toBe('User not authenticated');
      }
    });
  });

  describe('Validation', () => {
    it('should validate location coordinates', async () => {
      const invalidLocationData = {
        step: 'location',
        data: {
          location: {
            lat: 200, // Invalid latitude
            lng: -74.0060
          }
        }
      };

      const response = await request(app)
        .post('/complete-step')
        .send(invalidLocationData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
    });

    it('should validate prayer calculation method', async () => {
      const invalidMethodData = {
        step: 'prayer-calculation',
        data: {
          prayerCalculationMethod: 'invalid-method'
        }
      };

      const response = await request(app)
        .post('/complete-step')
        .send(invalidMethodData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
    });

    it('should validate reminder time format', async () => {
      const invalidTimeData = {
        step: 'notifications',
        data: {
          notificationSettings: {
            reminderTime: '25:30' // Invalid time format
          }
        }
      };

      const response = await request(app)
        .post('/complete-step')
        .send(invalidTimeData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
    });

    it('should validate display theme options', async () => {
      const invalidThemeData = {
        step: 'display',
        data: {
          displaySettings: {
            theme: 'invalid-theme'
          }
        }
      };

      const response = await request(app)
        .post('/complete-step')
        .send(invalidThemeData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
    });
  });
});