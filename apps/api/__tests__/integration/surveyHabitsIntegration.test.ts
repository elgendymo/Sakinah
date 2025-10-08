import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { Express } from 'express';
import { container } from 'tsyringe';
import { CreateHabitsFromSurveyUseCase } from '@/application/usecases/CreateHabitsFromSurveyUseCase';
import { Result } from '@/shared/result';

// Mock the use case
const mockCreateHabitsFromSurveyUseCase = {
  execute: vi.fn()
};

// Mock container resolution
vi.mock('tsyringe', () => ({
  container: {
    resolve: vi.fn()
  }
}));

// Mock auth middleware
vi.mock('@/infrastructure/auth/middleware', () => ({
  authMiddleware: (req: any, _res: any, next: any) => {
    req.userId = 'test-user-123';
    next();
  }
}));

describe('Survey Habits Integration API', () => {
  let app: Express;

  beforeEach(async () => {
    // Clear all mocks
    vi.clearAllMocks();

    // Mock container resolution
    vi.mocked(container.resolve).mockImplementation((token: any) => {
      if (token === CreateHabitsFromSurveyUseCase) {
        return mockCreateHabitsFromSurveyUseCase;
      }
      throw new Error(`Unknown token: ${token}`);
    });

    // Create express app with our routes
    const express = await import('express');
    app = express.default();
    app.use(express.default.json());

    // Import and use the onboarding routes
    const onboardingRouter = await import('@/routes/v1/onboarding');
    app.use('/api/v1/onboarding', onboardingRouter.default);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('POST /api/v1/onboarding/integrate-habits', () => {
    it('should successfully integrate habits from survey results', async () => {
      // Arrange
      const mockResponse = {
        createdHabits: [
          {
            id: 'habit-1',
            title: 'Morning Dhikr',
            planId: 'plan-123',
            targetDisease: 'envy'
          },
          {
            id: 'habit-2',
            title: 'Evening Reflection',
            planId: 'plan-123',
            targetDisease: 'arrogance'
          }
        ],
        planId: 'plan-123',
        totalHabitsCreated: 2
      };

      mockCreateHabitsFromSurveyUseCase.execute.mockResolvedValue(
        Result.success(mockResponse)
      );

      // Act
      const response = await request(app)
        .post('/api/v1/onboarding/integrate-habits')
        .send({})
        .expect(200);

      // Assert
      expect(response.body).toMatchObject({
        success: true,
        data: {
          integration: {
            completed: true,
            totalHabitsCreated: 2,
            planId: 'plan-123',
            completedAt: expect.any(String)
          },
          createdHabits: mockResponse.createdHabits,
          navigation: {
            habitsUrl: '/habits',
            dashboardUrl: '/dashboard',
            planUrl: '/tazkiyah?planId=plan-123'
          },
          metadata: {
            version: '1.0',
            integrationMethod: 'survey-to-habits'
          }
        },
        metadata: expect.objectContaining({
          traceId: expect.any(String)
        })
      });

      // Verify use case was called correctly
      expect(mockCreateHabitsFromSurveyUseCase.execute).toHaveBeenCalledWith({
        userId: 'test-user-123',
        surveyResultId: 'test-user-123',
        planId: undefined,
        traceId: expect.any(String)
      });
    });

    it('should support custom plan ID', async () => {
      // Arrange
      const customPlanId = 'custom-plan-456';
      const mockResponse = {
        createdHabits: [
          {
            id: 'habit-1',
            title: 'Morning Dhikr',
            planId: customPlanId,
            targetDisease: 'envy'
          }
        ],
        planId: customPlanId,
        totalHabitsCreated: 1
      };

      mockCreateHabitsFromSurveyUseCase.execute.mockResolvedValue(
        Result.success(mockResponse)
      );

      // Act
      const response = await request(app)
        .post('/api/v1/onboarding/integrate-habits')
        .send({ planId: customPlanId })
        .expect(200);

      // Assert
      expect(response.body.data.integration.planId).toBe(customPlanId);
      expect(response.body.data.navigation.planUrl).toBe(`/tazkiyah?planId=${customPlanId}`);

      // Verify use case was called with custom plan ID
      expect(mockCreateHabitsFromSurveyUseCase.execute).toHaveBeenCalledWith({
        userId: 'test-user-123',
        surveyResultId: 'test-user-123',
        planId: customPlanId,
        traceId: expect.any(String)
      });
    });

    it('should handle case with no habits created', async () => {
      // Arrange
      const mockResponse = {
        createdHabits: [],
        planId: '',
        totalHabitsCreated: 0
      };

      mockCreateHabitsFromSurveyUseCase.execute.mockResolvedValue(
        Result.success(mockResponse)
      );

      // Act
      const response = await request(app)
        .post('/api/v1/onboarding/integrate-habits')
        .send({})
        .expect(200);

      // Assert
      expect(response.body.data.integration.totalHabitsCreated).toBe(0);
      expect(response.body.data.createdHabits).toEqual([]);
      expect(response.body.data.integration.planId).toBe('');
    });

    it('should handle use case errors', async () => {
      // Arrange
      const errorMessage = 'Survey results not found';
      mockCreateHabitsFromSurveyUseCase.execute.mockResolvedValue(
        Result.error(new Error(errorMessage))
      );

      // Act
      const response = await request(app)
        .post('/api/v1/onboarding/integrate-habits')
        .send({})
        .expect(500);

      // Assert
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: errorMessage
        },
        metadata: expect.objectContaining({
          traceId: expect.any(String)
        })
      });
    });

    it('should handle unexpected errors', async () => {
      // Arrange
      mockCreateHabitsFromSurveyUseCase.execute.mockRejectedValue(
        new Error('Unexpected database error')
      );

      // Act
      const response = await request(app)
        .post('/api/v1/onboarding/integrate-habits')
        .send({})
        .expect(500);

      // Assert
      expect(response.body).toMatchObject({
        success: false,
        error: expect.objectContaining({
          message: expect.stringContaining('Failed to integrate habits')
        }),
        metadata: expect.objectContaining({
          traceId: expect.any(String)
        })
      });
    });

    it('should require authentication', async () => {
      // Arrange - Mock auth middleware to simulate unauthenticated request
      vi.doMock('@/infrastructure/auth/middleware', () => ({
        authMiddleware: (_req: any, res: any, _next: any) => {
          res.status(401).json({
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Authentication required'
            }
          });
        }
      }));

      // Re-import the app with mocked auth
      const express = await import('express');
      const newApp = express.default();
      newApp.use(express.default.json());
      const onboardingRouter = await import('@/routes/v1/onboarding');
      newApp.use('/api/v1/onboarding', onboardingRouter.default);

      // Act
      const response = await request(newApp)
        .post('/api/v1/onboarding/integrate-habits')
        .send({})
        .expect(401);

      // Assert
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    });

    it('should include proper logging and tracing', async () => {
      // Arrange
      const mockResponse = {
        createdHabits: [
          {
            id: 'habit-1',
            title: 'Morning Dhikr',
            planId: 'plan-123',
            targetDisease: 'envy'
          }
        ],
        planId: 'plan-123',
        totalHabitsCreated: 1
      };

      mockCreateHabitsFromSurveyUseCase.execute.mockResolvedValue(
        Result.success(mockResponse)
      );

      // Act
      const response = await request(app)
        .post('/api/v1/onboarding/integrate-habits')
        .send({})
        .expect(200);

      // Assert
      expect(response.body.metadata.traceId).toBeDefined();
      expect(typeof response.body.metadata.traceId).toBe('string');

      // Verify use case was called with traceId
      expect(mockCreateHabitsFromSurveyUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          traceId: expect.any(String)
        })
      );
    });

    it('should return proper content type and structure', async () => {
      // Arrange
      const mockResponse = {
        createdHabits: [],
        planId: 'plan-123',
        totalHabitsCreated: 0
      };

      mockCreateHabitsFromSurveyUseCase.execute.mockResolvedValue(
        Result.success(mockResponse)
      );

      // Act
      const response = await request(app)
        .post('/api/v1/onboarding/integrate-habits')
        .send({})
        .expect(200);

      // Assert
      expect(response.headers['content-type']).toMatch(/application\/json/);

      // Verify response structure
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('metadata');
      expect(response.body.data).toHaveProperty('integration');
      expect(response.body.data).toHaveProperty('createdHabits');
      expect(response.body.data).toHaveProperty('navigation');
      expect(response.body.data).toHaveProperty('metadata');
      expect(response.body.metadata).toHaveProperty('traceId');
      expect(response.body.metadata).toHaveProperty('timestamp');
    });
  });
});