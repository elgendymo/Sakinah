import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  surveyValidationErrorHandler,
  autoSaveErrorHandler,
  surveyProgressErrorHandler,
  surveyResultsErrorHandler,
  globalSurveyErrorHandler,
  withSurveyErrorHandling
} from '@/infrastructure/middleware/surveyErrorHandling';
import { ErrorCode } from '@/shared/errors';
import { Result } from '@/shared/result';

// Mock dependencies
vi.mock('@/shared/errors', () => ({
  ErrorCode: {
    INVALID_LIKERT_SCORE: 'invalid_likert_score',
    SURVEY_NOTE_TOO_LONG: 'survey_note_too_long',
    REFLECTION_TOO_SHORT: 'reflection_too_short',
    REFLECTION_TOO_LONG: 'reflection_too_long',
    SURVEY_RESPONSE_INVALID: 'survey_response_invalid',
    VALIDATION_ERROR: 'validation_error',
    AUTO_SAVE_FAILED: 'auto_save_failed',
    STATE_SYNC_ERROR: 'state_sync_error',
    SURVEY_PHASE_ACCESS_DENIED: 'survey_phase_access_denied',
    SURVEY_ALREADY_COMPLETED: 'survey_already_completed',
    INVALID_PHASE_PROGRESSION: 'invalid_phase_progression',
    SURVEY_NOT_FOUND: 'survey_not_found',
    SURVEY_PROGRESS_ERROR: 'survey_progress_error',
    RESULTS_GENERATION_FAILED: 'results_generation_failed',
    AI_ANALYSIS_FAILED: 'ai_analysis_failed',
    RESULTS_NOT_FOUND: 'results_not_found',
    SERVER_ERROR: 'server_error',
    TIMEOUT_ERROR: 'timeout_error',
    NETWORK_ERROR: 'network_error',
    DATABASE_ERROR: 'database_error',
    UNAUTHORIZED: 'unauthorized'
  },
  createAppError: vi.fn((code, message, originalError, context) => {
    const error = new Error(message) as any;
    error.code = code;
    error.originalError = originalError;
    error.context = context;
    return error;
  }),
  handleExpressError: vi.fn((error, traceId) => ({
    response: {
      ok: false,
      errorCode: error.code,
      message: error.message,
      traceId
    },
    status: 500,
    headers: { 'X-Trace-Id': traceId }
  })),
  getExpressTraceId: vi.fn(() => 'test-trace-id'),
  createRequestLogger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }))
}));

describe('Survey Error Handling Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      path: '/api/v1/onboarding/phase1',
      method: 'POST',
      body: {},
      userId: 'test-user-id'
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      json: vi.fn()
    };

    mockNext = vi.fn();
  });

  describe('surveyValidationErrorHandler', () => {
    it('should handle Zod validation errors for survey endpoints', () => {
      const zodError = {
        name: 'ZodError',
        errors: [
          {
            path: ['envyScore'],
            message: 'Invalid input'
          },
          {
            path: ['envyNote'],
            message: 'String must contain at most 1000 character(s)'
          }
        ]
      };

      surveyValidationErrorHandler(zodError, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          validationErrors: expect.arrayContaining([
            expect.objectContaining({
              field: 'envyScore',
              code: 'invalid_likert_score'
            }),
            expect.objectContaining({
              field: 'envyNote',
              code: 'survey_note_too_long'
            })
          ])
        })
      );
    });

    it('should map reflection validation errors correctly', () => {
      const zodError = {
        name: 'ZodError',
        errors: [
          {
            path: ['strongestStruggle'],
            message: 'String must contain at least 10 character(s)'
          },
          {
            path: ['dailyHabit'],
            message: 'String must contain at most 500 character(s)'
          }
        ]
      };

      surveyValidationErrorHandler(zodError, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          validationErrors: expect.arrayContaining([
            expect.objectContaining({
              field: 'strongestStruggle',
              code: 'reflection_too_short'
            }),
            expect.objectContaining({
              field: 'dailyHabit',
              code: 'reflection_too_long'
            })
          ])
        })
      );
    });

    it('should pass non-survey validation errors to next handler', () => {
      const nonSurveyError = new Error('Regular error');
      mockReq.path = '/api/v1/habits'; // Non-survey endpoint

      surveyValidationErrorHandler(nonSurveyError, mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(nonSurveyError);
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it('should pass non-Zod errors to next handler', () => {
      const regularError = new Error('Not a Zod error');

      surveyValidationErrorHandler(regularError, mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(regularError);
      expect(mockRes.json).not.toHaveBeenCalled();
    });
  });

  describe('autoSaveErrorHandler', () => {
    it('should handle successful auto-save operations', async () => {
      const successfulOperation = vi.fn().mockResolvedValue(Result.ok({ saved: true }));
      const middleware = autoSaveErrorHandler(successfulOperation);

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it('should handle network-related auto-save failures', async () => {
      const networkError = Result.error(new Error('ECONNREFUSED: Connection refused'));
      const failedOperation = vi.fn().mockResolvedValue(networkError);
      const middleware = autoSaveErrorHandler(failedOperation);

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          autoSaveStatus: 'failed',
          recommendation: expect.stringContaining('network')
        })
      );
    });

    it('should handle database-related auto-save failures', async () => {
      const dbError = Result.error(new Error('database constraint violation'));
      const failedOperation = vi.fn().mockResolvedValue(dbError);
      const middleware = autoSaveErrorHandler(failedOperation);

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          autoSaveStatus: 'sync_error',
          recommendation: expect.stringContaining('refresh')
        })
      );
    });

    it('should handle generic auto-save failures', async () => {
      const genericError = Result.error(new Error('Generic failure'));
      const failedOperation = vi.fn().mockResolvedValue(genericError);
      const middleware = autoSaveErrorHandler(failedOperation);

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          autoSaveStatus: 'failed',
          recommendation: expect.stringContaining('manually')
        })
      );
    });

    it('should handle unexpected errors in auto-save operations', async () => {
      const throwingOperation = vi.fn().mockRejectedValue(new Error('Unexpected error'));
      const middleware = autoSaveErrorHandler(throwingOperation);

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('surveyProgressErrorHandler', () => {
    it('should handle phase access denied errors', () => {
      mockReq.surveyProgressError = {
        type: 'PHASE_ACCESS_DENIED',
        currentPhase: 2,
        requiredPhase: 1,
        nextAvailablePhase: 1
      };

      surveyProgressErrorHandler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errorCode: 'survey_phase_access_denied',
          progressInfo: expect.objectContaining({
            currentPhase: 2,
            requiredPhase: 1,
            nextAvailablePhase: 1
          })
        })
      );
    });

    it('should handle survey already completed errors', () => {
      mockReq.surveyProgressError = {
        type: 'SURVEY_COMPLETED',
        currentPhase: 4
      };

      surveyProgressErrorHandler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errorCode: 'survey_already_completed'
        })
      );
    });

    it('should handle invalid progression errors', () => {
      mockReq.surveyProgressError = {
        type: 'INVALID_PROGRESSION',
        currentPhase: 3,
        requiredPhase: 2
      };

      surveyProgressErrorHandler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errorCode: 'invalid_phase_progression'
        })
      );
    });

    it('should handle survey not found errors', () => {
      mockReq.surveyProgressError = {
        type: 'SURVEY_NOT_FOUND'
      };

      surveyProgressErrorHandler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errorCode: 'survey_not_found'
        })
      );
    });

    it('should handle unknown progress error types', () => {
      mockReq.surveyProgressError = {
        type: 'UNKNOWN_ERROR'
      };

      surveyProgressErrorHandler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errorCode: 'survey_progress_error'
        })
      );
    });

    it('should pass through when no progress error exists', () => {
      surveyProgressErrorHandler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });
  });

  describe('surveyResultsErrorHandler', () => {
    it('should enhance results generation failure errors', () => {
      const originalJson = mockRes.json;

      surveyResultsErrorHandler(mockReq as Request, mockRes as Response, mockNext);

      // Simulate an error response
      const errorResponse = {
        ok: false,
        errorCode: 'results_generation_failed',
        message: 'Original message'
      };

      mockRes.json!(errorResponse);

      expect(errorResponse.message).toContain('spiritual assessment results');
      expect(errorResponse.recommendation).toContain('try again');
    });

    it('should enhance AI analysis failure errors', () => {
      const originalJson = mockRes.json;

      surveyResultsErrorHandler(mockReq as Request, mockRes as Response, mockNext);

      const errorResponse = {
        ok: false,
        errorCode: 'ai_analysis_failed',
        message: 'AI failed'
      };

      mockRes.json!(errorResponse);

      expect(errorResponse.message).toContain('temporarily unavailable');
      expect(errorResponse.recommendation).toContain('basic results');
    });

    it('should enhance results not found errors', () => {
      const originalJson = mockRes.json;

      surveyResultsErrorHandler(mockReq as Request, mockRes as Response, mockNext);

      const errorResponse = {
        ok: false,
        errorCode: 'results_not_found',
        message: 'Not found'
      };

      mockRes.json!(errorResponse);

      expect(errorResponse.message).toContain('complete all survey phases');
      expect(errorResponse.recommendation).toContain('Tazkiyah Discovery Survey');
    });

    it('should not modify non-error responses', () => {
      surveyResultsErrorHandler(mockReq as Request, mockRes as Response, mockNext);

      const successResponse = {
        ok: true,
        data: { results: 'success' }
      };

      mockRes.json!(successResponse);

      expect(successResponse.message).toBeUndefined();
      expect(successResponse.recommendation).toBeUndefined();
    });
  });

  describe('globalSurveyErrorHandler', () => {
    it('should handle survey-specific errors', () => {
      const surveyError = new Error('Survey specific error');
      mockReq.path = '/api/v1/onboarding/phase1';

      globalSurveyErrorHandler(surveyError, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          surveyContext: expect.objectContaining({
            path: '/api/v1/onboarding/phase1',
            phase: 1
          })
        })
      );
    });

    it('should map timeout errors correctly', () => {
      const timeoutError = new Error('Request timeout');
      mockReq.path = '/api/v1/onboarding/phase2';

      globalSurveyErrorHandler(timeoutError, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errorCode: 'timeout_error',
          message: expect.stringContaining('too long')
        })
      );
    });

    it('should map network errors correctly', () => {
      const networkError = new Error('ECONNREFUSED connection failed');

      globalSurveyErrorHandler(networkError, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errorCode: 'network_error',
          message: expect.stringContaining('connection failed')
        })
      );
    });

    it('should map database errors correctly', () => {
      const dbError = new Error('database connection failed');

      globalSurveyErrorHandler(dbError, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errorCode: 'database_error',
          message: expect.stringContaining('saving your survey data')
        })
      );
    });

    it('should map unauthorized errors correctly', () => {
      const authError = { code: 'UNAUTHORIZED', message: 'Unauthorized access' };

      globalSurveyErrorHandler(authError, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errorCode: 'unauthorized',
          message: expect.stringContaining('session has expired')
        })
      );
    });

    it('should pass non-survey errors to next handler', () => {
      const nonSurveyError = new Error('Non-survey error');
      mockReq.path = '/api/v1/habits'; // Non-survey endpoint

      globalSurveyErrorHandler(nonSurveyError, mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(nonSurveyError);
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it('should identify correct phase from path', () => {
      const testCases = [
        { path: '/api/v1/onboarding/phase1', expectedPhase: 1 },
        { path: '/api/v1/onboarding/phase2', expectedPhase: 2 },
        { path: '/api/v1/onboarding/reflection', expectedPhase: 3 },
        { path: '/api/v1/onboarding/results', expectedPhase: 4 }
      ];

      testCases.forEach(({ path, expectedPhase }) => {
        mockReq.path = path;
        const error = new Error('Test error');

        globalSurveyErrorHandler(error, mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            surveyContext: expect.objectContaining({
              phase: expectedPhase
            })
          })
        );
      });
    });
  });

  describe('withSurveyErrorHandling', () => {
    it('should handle successful operations', async () => {
      const successResult = Result.success({ data: 'success' });
      const operation = vi.fn().mockResolvedValue(successResult);
      const context = { operationType: 'test', userId: 'user123' };

      const wrappedOperation = withSurveyErrorHandling(operation, context);
      const result = await wrappedOperation();

      expect(Result.isOk(result)).toBe(true);
      expect(operation).toHaveBeenCalled();
    });

    it('should handle failed operations with Result.error', async () => {
      const errorResult = Result.error(new Error('Operation failed'));
      const operation = vi.fn().mockResolvedValue(errorResult);
      const context = { operationType: 'test', phase: 1, userId: 'user123' };

      const wrappedOperation = withSurveyErrorHandling(operation, context);
      const result = await wrappedOperation();

      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.error.code).toBe('survey_progress_error');
        expect(result.error.message).toContain('test failed');
        expect(result.error.context).toEqual(context);
      }
    });

    it('should handle operations that throw errors', async () => {
      const thrownError = new Error('Unexpected error');
      const operation = vi.fn().mockRejectedValue(thrownError);
      const context = { operationType: 'test', userId: 'user123' };

      const wrappedOperation = withSurveyErrorHandling(operation, context);
      const result = await wrappedOperation();

      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.error.code).toBe('server_error');
        expect(result.error.message).toContain('Unexpected error during test');
        expect(result.error.originalError).toBe(thrownError);
      }
    });
  });
});