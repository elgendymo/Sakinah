import { Request, Response, NextFunction } from 'express';
import { container } from 'tsyringe';
import {
  surveyProgressMiddleware,
  surveyPhaseMiddleware,
  surveyCompletionCheckMiddleware,
  SurveyProgressRequest
} from '@/infrastructure/middleware/surveyProgress';
import { ValidateSurveyProgressUseCase } from '@/application/usecases/ValidateSurveyProgressUseCase';
import { SurveyProgress } from '@/domain/entities/SurveyProgress';
import { Result } from '@/shared/result';
import { ErrorCode } from '@/shared/errors/errorCodes';

// Mock dependencies
jest.mock('tsyringe');
jest.mock('@/shared/errors', () => ({
  getExpressTraceId: jest.fn(() => 'test-trace-id'),
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn()
  },
  createAppError: jest.fn((code, message) => ({
    code,
    message,
    statusCode: code === ErrorCode.UNAUTHORIZED ? 401 : 500
  })),
  handleExpressError: jest.fn((error, traceId) => ({
    response: { error: { code: error.code, message: error.message }, traceId },
    status: error.statusCode || 500,
    headers: {}
  })),
  ErrorCode
}));

describe('Survey Progress Middleware', () => {
  let mockValidateProgressUseCase: jest.Mocked<ValidateSurveyProgressUseCase>;
  let mockRequest: Partial<SurveyProgressRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    // Setup mocks
    mockValidateProgressUseCase = {
      execute: jest.fn(),
      getCurrentProgress: jest.fn(),
      advanceToNextPhase: jest.fn()
    } as any;

    mockRequest = {
      userId: 'test-user-id',
      path: '/api/v1/onboarding/phase1'
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis()
    };

    mockNext = jest.fn();

    // Mock container.resolve
    (container.resolve as jest.Mock).mockReturnValue(mockValidateProgressUseCase);

    jest.clearAllMocks();
  });

  describe('surveyProgressMiddleware', () => {
    it('should allow access when user can access the required phase', async () => {
      const mockValidation = {
        canAccess: true,
        currentPhase: 1,
        nextAvailablePhase: 2,
        progress: {
          userId: 'test-user-id',
          currentPhase: 1,
          phase1Completed: false
        }
      };

      mockValidateProgressUseCase.execute.mockResolvedValue(Result.ok(mockValidation));

      const middleware = surveyProgressMiddleware(1);
      await middleware(mockRequest as SurveyProgressRequest, mockResponse as Response, mockNext);

      expect(mockValidateProgressUseCase.execute).toHaveBeenCalledWith({
        userId: 'test-user-id',
        targetPhase: 1
      });
      expect(mockRequest.surveyProgress).toEqual(mockValidation);
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should deny access when user cannot access the required phase', async () => {
      const mockValidation = {
        canAccess: false,
        currentPhase: 0,
        nextAvailablePhase: 1,
        redirectToPhase: 0,
        message: 'Phase 1 must be completed before accessing Phase 2',
        progress: {
          userId: 'test-user-id',
          currentPhase: 0,
          phase1Completed: false
        }
      };

      mockValidateProgressUseCase.execute.mockResolvedValue(Result.ok(mockValidation));

      const middleware = surveyProgressMiddleware(2);
      await middleware(mockRequest as SurveyProgressRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: ErrorCode.SURVEY_PHASE_ACCESS_DENIED,
          message: 'Phase 1 must be completed before accessing Phase 2',
          context: {
            currentPhase: 0,
            targetPhase: 2,
            nextAvailablePhase: 1,
            redirectToPhase: 0,
            progress: mockValidation.progress
          }
        },
        traceId: 'test-trace-id'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return error when user is not authenticated', async () => {
      mockRequest.userId = undefined;

      const middleware = surveyProgressMiddleware(1);
      await middleware(mockRequest as SurveyProgressRequest, mockResponse as Response, mockNext);

      expect(mockValidateProgressUseCase.execute).not.toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle validation use case errors', async () => {
      mockValidateProgressUseCase.execute.mockResolvedValue(
        Result.error(new Error('Database connection failed'))
      );

      const middleware = surveyProgressMiddleware(1);
      await middleware(mockRequest as SurveyProgressRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle unexpected errors gracefully', async () => {
      mockValidateProgressUseCase.execute.mockRejectedValue(new Error('Unexpected error'));

      const middleware = surveyProgressMiddleware(1);
      await middleware(mockRequest as SurveyProgressRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('surveyPhaseMiddleware', () => {
    it('should provide middleware for welcome phase', async () => {
      const mockValidation = {
        canAccess: true,
        currentPhase: 0,
        nextAvailablePhase: 1,
        progress: {}
      };

      mockValidateProgressUseCase.execute.mockResolvedValue(Result.ok(mockValidation));

      await surveyPhaseMiddleware.welcome(
        mockRequest as SurveyProgressRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockValidateProgressUseCase.execute).toHaveBeenCalledWith({
        userId: 'test-user-id',
        targetPhase: 0
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should provide middleware for phase1', async () => {
      const mockValidation = {
        canAccess: true,
        currentPhase: 1,
        nextAvailablePhase: 2,
        progress: {}
      };

      mockValidateProgressUseCase.execute.mockResolvedValue(Result.ok(mockValidation));

      await surveyPhaseMiddleware.phase1(
        mockRequest as SurveyProgressRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockValidateProgressUseCase.execute).toHaveBeenCalledWith({
        userId: 'test-user-id',
        targetPhase: 1
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should provide middleware for phase2', async () => {
      const mockValidation = {
        canAccess: true,
        currentPhase: 2,
        nextAvailablePhase: 3,
        progress: { phase1Completed: true }
      };

      mockValidateProgressUseCase.execute.mockResolvedValue(Result.ok(mockValidation));

      await surveyPhaseMiddleware.phase2(
        mockRequest as SurveyProgressRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockValidateProgressUseCase.execute).toHaveBeenCalledWith({
        userId: 'test-user-id',
        targetPhase: 2
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should provide middleware for reflection phase', async () => {
      const mockValidation = {
        canAccess: true,
        currentPhase: 3,
        nextAvailablePhase: 4,
        progress: { phase1Completed: true, phase2Completed: true }
      };

      mockValidateProgressUseCase.execute.mockResolvedValue(Result.ok(mockValidation));

      await surveyPhaseMiddleware.reflection(
        mockRequest as SurveyProgressRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockValidateProgressUseCase.execute).toHaveBeenCalledWith({
        userId: 'test-user-id',
        targetPhase: 3
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should provide middleware for results phase', async () => {
      const mockValidation = {
        canAccess: true,
        currentPhase: 4,
        nextAvailablePhase: 4,
        progress: {
          phase1Completed: true,
          phase2Completed: true,
          reflectionCompleted: true
        }
      };

      mockValidateProgressUseCase.execute.mockResolvedValue(Result.ok(mockValidation));

      await surveyPhaseMiddleware.results(
        mockRequest as SurveyProgressRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockValidateProgressUseCase.execute).toHaveBeenCalledWith({
        userId: 'test-user-id',
        targetPhase: 4
      });
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('surveyCompletionCheckMiddleware', () => {
    it('should allow access when survey is not completed', async () => {
      const mockProgress = {
        progress: {
          isCompleted: false,
          currentPhase: 1
        }
      };

      mockValidateProgressUseCase.getCurrentProgress.mockResolvedValue(Result.ok(mockProgress));

      await surveyCompletionCheckMiddleware(
        mockRequest as SurveyProgressRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should redirect to results when survey is completed and not on results page', async () => {
      const mockProgress = {
        progress: {
          isCompleted: true,
          currentPhase: 4
        }
      };

      mockValidateProgressUseCase.getCurrentProgress.mockResolvedValue(Result.ok(mockProgress));

      await surveyCompletionCheckMiddleware(
        mockRequest as SurveyProgressRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'completed',
        message: 'Survey has already been completed',
        redirect: '/onboarding/results',
        progress: mockProgress.progress,
        traceId: 'test-trace-id'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow access to results page when survey is completed', async () => {
      mockRequest.path = '/results';
      const mockProgress = {
        progress: {
          isCompleted: true,
          currentPhase: 4
        }
      };

      mockValidateProgressUseCase.getCurrentProgress.mockResolvedValue(Result.ok(mockProgress));

      await surveyCompletionCheckMiddleware(
        mockRequest as SurveyProgressRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should handle errors when fetching survey progress', async () => {
      mockValidateProgressUseCase.getCurrentProgress.mockResolvedValue(
        Result.error(new Error('Database error'))
      );

      await surveyCompletionCheckMiddleware(
        mockRequest as SurveyProgressRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return error when user is not authenticated', async () => {
      mockRequest.userId = undefined;

      await surveyCompletionCheckMiddleware(
        mockRequest as SurveyProgressRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockValidateProgressUseCase.getCurrentProgress).not.toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Integration scenarios', () => {
    it('should handle phase progression correctly', async () => {
      // Test Phase 1 -> Phase 2 progression
      const phase1Complete = {
        canAccess: true,
        currentPhase: 2,
        nextAvailablePhase: 2,
        progress: {
          userId: 'test-user-id',
          currentPhase: 2,
          phase1Completed: true,
          phase2Completed: false
        }
      };

      mockValidateProgressUseCase.execute.mockResolvedValue(Result.ok(phase1Complete));

      const middleware = surveyProgressMiddleware(2);
      await middleware(mockRequest as SurveyProgressRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest.surveyProgress).toEqual(phase1Complete);
    });

    it('should prevent skipping phases', async () => {
      // Try to access Phase 2 without completing Phase 1
      const skipValidation = {
        canAccess: false,
        currentPhase: 0,
        nextAvailablePhase: 1,
        redirectToPhase: 1,
        message: 'Phase 1 must be completed before accessing Phase 2',
        progress: {
          userId: 'test-user-id',
          currentPhase: 0,
          phase1Completed: false
        }
      };

      mockValidateProgressUseCase.execute.mockResolvedValue(Result.ok(skipValidation));

      const middleware = surveyProgressMiddleware(2);
      await middleware(mockRequest as SurveyProgressRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle survey completion flow', async () => {
      // First check completion
      const completedProgress = {
        progress: {
          isCompleted: true,
          currentPhase: 4
        }
      };

      mockValidateProgressUseCase.getCurrentProgress.mockResolvedValue(Result.ok(completedProgress));

      await surveyCompletionCheckMiddleware(
        mockRequest as SurveyProgressRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed',
          redirect: '/onboarding/results'
        })
      );
    });
  });
});