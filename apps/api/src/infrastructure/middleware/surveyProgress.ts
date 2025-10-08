import { Request, Response, NextFunction } from 'express';
import { container } from 'tsyringe';
import {
  ErrorCode,
  createAppError,
  getExpressTraceId,
  logger,
  handleExpressError
} from '@/shared/errors';
import { Result } from '@/shared/result';
import { ValidateSurveyProgressUseCase } from '@/application/usecases/ValidateSurveyProgressUseCase';
import { AuthRequest } from '@/infrastructure/auth/middleware';

export interface SurveyProgressRequest extends AuthRequest {
  surveyProgress?: {
    canAccess: boolean;
    currentPhase: number;
    nextAvailablePhase: number;
    redirectToPhase?: number;
    message?: string;
    progress: any;
  };
}

/**
 * Middleware to validate survey progress and enforce phase progression rules
 * Should be used after authMiddleware for onboarding survey routes
 */
export function surveyProgressMiddleware(requiredPhase: number) {
  return async (
    req: SurveyProgressRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const traceId = getExpressTraceId(req);

    try {
      // Ensure user is authenticated
      if (!req.userId) {
        logger.warn('Survey progress middleware: User not authenticated', {
          traceId,
          path: req.path
        });
        throw createAppError(ErrorCode.UNAUTHORIZED, 'Authentication required for survey access');
      }

      const validateProgressUseCase = container.resolve(ValidateSurveyProgressUseCase);
      const validationResult = await validateProgressUseCase.execute({
        userId: req.userId,
        targetPhase: requiredPhase
      });

      if (Result.isError(validationResult)) {
        logger.error('Survey progress validation failed', {
          traceId,
          userId: req.userId,
          targetPhase: requiredPhase,
          error: validationResult.error.message
        });

        const { response, status, headers } = handleExpressError(
          createAppError(ErrorCode.SURVEY_PROGRESS_ERROR, 'Failed to validate survey progress'),
          traceId
        );
        res.status(status).set(headers).json(response);
        return;
      }

      const validation = validationResult.value;

      // Check if user can access the requested phase
      if (!validation.canAccess) {
        logger.warn('Survey progress middleware: Phase access denied', {
          traceId,
          userId: req.userId,
          targetPhase: requiredPhase,
          currentPhase: validation.currentPhase,
          nextAvailablePhase: validation.nextAvailablePhase,
          message: validation.message
        });

        // Return structured error response with redirect information
        const errorResponse = {
          error: {
            code: ErrorCode.SURVEY_PHASE_ACCESS_DENIED,
            message: validation.message || 'Access to this survey phase is not allowed',
            context: {
              currentPhase: validation.currentPhase,
              targetPhase: requiredPhase,
              nextAvailablePhase: validation.nextAvailablePhase,
              redirectToPhase: validation.redirectToPhase,
              progress: validation.progress
            }
          },
          traceId
        };

        res.status(403).json(errorResponse);
        return;
      }

      // Attach survey progress information to request for downstream handlers
      req.surveyProgress = validation;

      logger.debug('Survey progress validation successful', {
        traceId,
        userId: req.userId,
        targetPhase: requiredPhase,
        currentPhase: validation.currentPhase,
        canAccess: validation.canAccess
      });

      next();
    } catch (error) {
      logger.error('Survey progress middleware error', {
        traceId,
        userId: req.userId,
        targetPhase: requiredPhase,
        error: error instanceof Error ? error.message : String(error)
      });

      const { response, status, headers } = handleExpressError(error, traceId);
      res.status(status).set(headers).json(response);
    }
  };
}

/**
 * Middleware factory for different survey phases
 */
export const surveyPhaseMiddleware = {
  welcome: surveyProgressMiddleware(0),
  phase1: surveyProgressMiddleware(1),
  phase2: surveyProgressMiddleware(2),
  reflection: surveyProgressMiddleware(3),
  results: surveyProgressMiddleware(4)
};

/**
 * Middleware to check if survey is completed
 * Use this to prevent access to survey phases after completion
 */
export async function surveyCompletionCheckMiddleware(
  req: SurveyProgressRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const traceId = getExpressTraceId(req);

  try {
    if (!req.userId) {
      throw createAppError(ErrorCode.UNAUTHORIZED, 'Authentication required');
    }

    const validateProgressUseCase = container.resolve(ValidateSurveyProgressUseCase);
    const progressResult = await validateProgressUseCase.getCurrentProgress(req.userId);

    if (Result.isError(progressResult)) {
      logger.error('Failed to check survey completion status', {
        traceId,
        userId: req.userId,
        error: progressResult.error.message
      });
      throw createAppError(ErrorCode.DATABASE_ERROR, 'Failed to check survey status');
    }

    const { progress } = progressResult.value;

    // If survey is already completed, return completion status
    if (progress.isCompleted && req.path !== '/results') {
      logger.info('Survey already completed, redirecting to results', {
        traceId,
        userId: req.userId,
        currentPath: req.path
      });

      const completionResponse = {
        status: 'completed',
        message: 'Survey has already been completed',
        redirect: '/onboarding/results',
        progress: progress,
        traceId
      };

      res.status(200).json(completionResponse);
      return;
    }

    next();
  } catch (error) {
    logger.error('Survey completion check middleware error', {
      traceId,
      userId: req.userId,
      error: error instanceof Error ? error.message : String(error)
    });

    const { response, status, headers } = handleExpressError(error, traceId);
    res.status(status).set(headers).json(response);
  }
}