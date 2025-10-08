import { Request, Response, NextFunction } from 'express';
import {
  ErrorCode,
  createAppError,
  handleExpressError,
  getExpressTraceId,
  createRequestLogger
} from '@/shared/errors';
import { Result } from '@/shared/result';

/**
 * Middleware to handle survey-specific validation errors
 */
export function surveyValidationErrorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId, (req as any).userId);

  // Check if this is a Zod validation error from survey endpoints
  if (err.name === 'ZodError' && req.path.includes('/onboarding/')) {
    requestLogger.error('Survey validation error', { error: err, path: req.path, traceId });

    // Map Zod errors to survey-specific error codes
    const zodErrors = err.errors || [];
    const surveyErrors = zodErrors.map((zodError: any) => {
      const path = zodError.path.join('.');
      const message = zodError.message;

      // Map specific field validation errors
      if (path.includes('Score')) {
        return {
          field: path,
          message: 'Please select a rating between 1 and 5',
          code: ErrorCode.INVALID_LIKERT_SCORE
        };
      }

      if (path.includes('Note')) {
        return {
          field: path,
          message: 'Note is too long (maximum 1000 characters)',
          code: ErrorCode.SURVEY_NOTE_TOO_LONG
        };
      }

      if (path === 'strongestStruggle' || path === 'dailyHabit') {
        if (message.includes('too small')) {
          return {
            field: path,
            message: 'Reflection must be at least 10 characters',
            code: ErrorCode.REFLECTION_TOO_SHORT
          };
        }
        if (message.includes('too big')) {
          return {
            field: path,
            message: 'Reflection cannot exceed 500 characters',
            code: ErrorCode.REFLECTION_TOO_LONG
          };
        }
      }

      return {
        field: path,
        message: message,
        code: ErrorCode.SURVEY_RESPONSE_INVALID
      };
    });

    const errorMessage = `Survey validation failed: ${surveyErrors.map(e => `${e.field}: ${e.message}`).join(', ')}`;
    const primaryErrorCode = surveyErrors[0]?.code || ErrorCode.VALIDATION_ERROR;

    const { response, status, headers } = handleExpressError(
      createAppError(primaryErrorCode, errorMessage),
      traceId
    );

    res.status(status).set(headers).json({
      ...response,
      validationErrors: surveyErrors
    });
    return;
  }

  // Pass non-survey validation errors to next handler
  next(err);
}

/**
 * Middleware to handle survey auto-save failures
 */
export function autoSaveErrorHandler(
  operation: () => Promise<Result<any, Error>>
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const traceId = getExpressTraceId(req);
    const requestLogger = createRequestLogger(traceId, (req as any).userId);

    try {
      const result = await operation();

      if (Result.isError(result)) {
        requestLogger.error('Auto-save operation failed', {
          error: result.error,
          path: req.path,
          traceId
        });

        // Check if this is a network/connection related error
        if (result.error.message.includes('ECONNREFUSED') ||
            result.error.message.includes('ETIMEDOUT') ||
            result.error.message.includes('network')) {

          const { response, status, headers } = handleExpressError(
            createAppError(ErrorCode.AUTO_SAVE_FAILED, 'Auto-save failed due to network issues. Your data may not be saved.'),
            traceId
          );

          res.status(status).set(headers).json({
            ...response,
            autoSaveStatus: 'failed',
            recommendation: 'Please try submitting manually or check your internet connection'
          });
          return;
        }

        // Handle database-related auto-save errors
        if (result.error.message.includes('database') ||
            result.error.message.includes('constraint')) {

          const { response, status, headers } = handleExpressError(
            createAppError(ErrorCode.STATE_SYNC_ERROR, 'There was an issue syncing your progress. Please refresh and try again.'),
            traceId
          );

          res.status(status).set(headers).json({
            ...response,
            autoSaveStatus: 'sync_error',
            recommendation: 'Please refresh the page and try again'
          });
          return;
        }

        // Generic auto-save error
        const { response, status, headers } = handleExpressError(
          createAppError(ErrorCode.AUTO_SAVE_FAILED, result.error.message),
          traceId
        );

        res.status(status).set(headers).json({
          ...response,
          autoSaveStatus: 'failed',
          recommendation: 'Please try submitting manually'
        });
        return;
      }

      // Success - continue to next middleware
      next();
    } catch (error) {
      requestLogger.error('Unexpected error in auto-save handler', { error, traceId });
      next(error);
    }
  };
}

/**
 * Middleware to handle survey progress validation errors
 */
export function surveyProgressErrorHandler(req: Request, res: Response, next: NextFunction): void {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId, (req as any).userId);

  // Check if survey progress validation failed
  if ((req as any).surveyProgressError) {
    const progressError = (req as any).surveyProgressError;
    requestLogger.error('Survey progress validation failed', {
      error: progressError,
      path: req.path,
      traceId
    });

    let errorCode: ErrorCode;
    let message: string;

    switch (progressError.type) {
      case 'PHASE_ACCESS_DENIED':
        errorCode = ErrorCode.SURVEY_PHASE_ACCESS_DENIED;
        message = 'You need to complete the previous phase before continuing';
        break;
      case 'SURVEY_COMPLETED':
        errorCode = ErrorCode.SURVEY_ALREADY_COMPLETED;
        message = 'You have already completed this survey. Check your results page';
        break;
      case 'INVALID_PROGRESSION':
        errorCode = ErrorCode.INVALID_PHASE_PROGRESSION;
        message = 'Please complete the phases in order. You cannot skip ahead';
        break;
      case 'SURVEY_NOT_FOUND':
        errorCode = ErrorCode.SURVEY_NOT_FOUND;
        message = 'Your survey was not found. Please start a new assessment';
        break;
      default:
        errorCode = ErrorCode.SURVEY_PROGRESS_ERROR;
        message = 'There was an issue with your survey progress. Please try refreshing the page';
    }

    const { response, status, headers } = handleExpressError(
      createAppError(errorCode, message),
      traceId
    );

    res.status(status).set(headers).json({
      ...response,
      progressInfo: {
        currentPhase: progressError.currentPhase,
        requiredPhase: progressError.requiredPhase,
        nextAvailablePhase: progressError.nextAvailablePhase
      }
    });
    return;
  }

  next();
}

/**
 * Middleware to handle survey results generation errors
 */
export function surveyResultsErrorHandler(req: Request, res: Response, next: NextFunction): void {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId, (req as any).userId);

  // This middleware can be used as a wrapper for results endpoints
  const originalSend = res.json;

  res.json = function(data: any) {
    // Check if this is an error response related to results generation
    if (data.ok === false && req.path.includes('/results')) {
      requestLogger.error('Survey results error detected', {
        errorCode: data.errorCode,
        path: req.path,
        traceId
      });

      // Enhance error response with helpful context
      if (data.errorCode === ErrorCode.RESULTS_GENERATION_FAILED) {
        data.message = 'We encountered an issue generating your spiritual assessment results. Your responses have been saved safely.';
        data.recommendation = 'Please try again in a few moments, or contact support if the issue persists';
      } else if (data.errorCode === ErrorCode.AI_ANALYSIS_FAILED) {
        data.message = 'Our spiritual guidance analysis is temporarily unavailable. Your responses have been saved.';
        data.recommendation = 'Your basic results are available, but detailed recommendations may be limited';
      } else if (data.errorCode === ErrorCode.RESULTS_NOT_FOUND) {
        data.message = 'Your assessment results are not available yet. Please complete all survey phases first.';
        data.recommendation = 'Make sure you have completed all phases of the Tazkiyah Discovery Survey';
      }
    }

    return originalSend.call(this, data);
  };

  next();
}

/**
 * Global survey error handler - catches all unhandled survey-related errors
 */
export function globalSurveyErrorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId, (req as any).userId);

  // Only handle errors from survey endpoints
  if (!req.path.includes('/onboarding/')) {
    return next(err);
  }

  requestLogger.error('Unhandled survey error', {
    error: err,
    path: req.path,
    method: req.method,
    body: req.body,
    traceId
  });

  // Map common error types to survey-specific codes
  let errorCode: ErrorCode = ErrorCode.SERVER_ERROR;
  let message = 'An unexpected error occurred during your survey. Please try again.';

  if (err.message.includes('timeout')) {
    errorCode = ErrorCode.TIMEOUT_ERROR;
    message = 'The survey request took too long. Please check your connection and try again.';
  } else if (err.message.includes('network') || err.message.includes('ECONNREFUSED')) {
    errorCode = ErrorCode.NETWORK_ERROR;
    message = 'Network connection failed. Please check your internet connection and try again.';
  } else if (err.message.includes('database') || err.message.includes('db')) {
    errorCode = ErrorCode.DATABASE_ERROR;
    message = 'There was a problem saving your survey data. Please try again.';
  } else if (err.code === 'UNAUTHORIZED') {
    errorCode = ErrorCode.UNAUTHORIZED;
    message = 'Your session has expired. Please sign in again to continue your survey.';
  }

  const { response, status, headers } = handleExpressError(
    createAppError(errorCode, message),
    traceId
  );

  res.status(status).set(headers).json({
    ...response,
    surveyContext: {
      path: req.path,
      phase: req.path.includes('phase1') ? 1 : req.path.includes('phase2') ? 2 : req.path.includes('reflection') ? 3 : 4,
      recommendation: 'Your progress has been saved. You can continue where you left off.'
    }
  });
}

/**
 * Utility function to wrap survey operations with error handling
 */
export function withSurveyErrorHandling<T>(
  operation: () => Promise<Result<T, Error>>,
  context: {
    operationType: string;
    phase?: number;
    userId?: string;
  }
) {
  return async (): Promise<Result<T, Error>> => {
    try {
      const result = await operation();

      if (Result.isError(result)) {
        // Log survey-specific operation failure
        console.error(`Survey ${context.operationType} failed`, {
          phase: context.phase,
          userId: context.userId,
          error: result.error.message
        });

        // Return enhanced error with survey context
        return Result.error(createAppError(
          ErrorCode.SURVEY_PROGRESS_ERROR,
          `${context.operationType} failed: ${result.error.message}`,
          result.error,
          context
        ));
      }

      return result;
    } catch (error) {
      console.error(`Unexpected error in survey ${context.operationType}`, {
        phase: context.phase,
        userId: context.userId,
        error
      });

      return Result.error(createAppError(
        ErrorCode.SERVER_ERROR,
        `Unexpected error during ${context.operationType}`,
        error as Error,
        context
      ));
    }
  };
}