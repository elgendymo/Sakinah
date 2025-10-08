import { Router } from 'express';
import { container } from 'tsyringe';
import { z } from 'zod';
import { authMiddleware } from '@/infrastructure/auth/middleware';
import { validateBody } from '@/infrastructure/middleware/validation';
import {
  surveyPhaseMiddleware,
  surveyCompletionCheckMiddleware
} from '@/infrastructure/middleware/surveyProgress';
import { SubmitPhase1UseCase } from '@/application/usecases/SubmitPhase1UseCase';
import { SubmitPhase2UseCase } from '@/application/usecases/SubmitPhase2UseCase';
import { SubmitReflectionUseCase } from '@/application/usecases/SubmitReflectionUseCase';
import { ValidateSurveyProgressUseCase } from '@/application/usecases/ValidateSurveyProgressUseCase';
import { GenerateResultsUseCase } from '@/application/usecases/GenerateResultsUseCase';
import { CreateHabitsFromSurveyUseCase } from '@/application/usecases/CreateHabitsFromSurveyUseCase';
import { ISurveyRepository } from '@/domain/repositories/ISurveyRepository';
import { UserId } from '@/domain/value-objects/UserId';
import { Result } from '@/shared/result';
import {
  ErrorCode,
  createAppError,
  handleExpressError,
  getExpressTraceId,
  createSuccessResponse,
  createRequestLogger
} from '@/shared/errors';

const router = Router();

// Helper function to get user ID from request
function getUserIdFromRequest(req: any): string {
  if (!req.userId) {
    throw createAppError(ErrorCode.UNAUTHORIZED, 'User not authenticated');
  }
  return req.userId;
}

// Validation schemas based on design document
const Phase1Schema = z.object({
  envyScore: z.number().int().min(1).max(5),
  envyNote: z.string().max(1000).optional(),
  arroganceScore: z.number().int().min(1).max(5),
  arroganceNote: z.string().max(1000).optional(),
  selfDeceptionScore: z.number().int().min(1).max(5),
  selfDeceptionNote: z.string().max(1000).optional(),
  lustScore: z.number().int().min(1).max(5),
  lustNote: z.string().max(1000).optional()
});

const Phase2Schema = z.object({
  angerScore: z.number().int().min(1).max(5),
  angerNote: z.string().max(1000).optional(),
  maliceScore: z.number().int().min(1).max(5),
  maliceNote: z.string().max(1000).optional(),
  backbitingScore: z.number().int().min(1).max(5),
  backbitingNote: z.string().max(1000).optional(),
  suspicionScore: z.number().int().min(1).max(5),
  suspicionNote: z.string().max(1000).optional(),
  loveOfDunyaScore: z.number().int().min(1).max(5),
  loveOfDunyaNote: z.string().max(1000).optional(),
  lazinessScore: z.number().int().min(1).max(5),
  lazinessNote: z.string().max(1000).optional(),
  despairScore: z.number().int().min(1).max(5),
  despairNote: z.string().max(1000).optional()
});

const ReflectionSchema = z.object({
  strongestStruggle: z.string().min(10, 'Must be at least 10 characters').max(500, 'Cannot exceed 500 characters'),
  dailyHabit: z.string().min(10, 'Must be at least 10 characters').max(500, 'Cannot exceed 500 characters')
});

/**
 * @api {get} /api/v1/onboarding/welcome Survey introduction endpoint
 * @apiVersion 1.0.0
 * @apiName WelcomePhase
 * @apiGroup Onboarding
 * @apiDescription Provides survey introduction and purpose for Tazkiyah and habit plans
 */
router.get('/welcome', authMiddleware, surveyPhaseMiddleware.welcome, async (req, res): Promise<void> => {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId, (req as any).userId);

  try {
    requestLogger.info('Fetching survey welcome information');

    // Static welcome data based on requirements
    const welcomeData = {
      title: 'Tazkiyah Discovery Survey',
      titleAr: 'استبيان قراءة النفس',
      description: 'This spiritual self-assessment will help create personalized Tazkiyah and habit plans for your spiritual development.',
      descriptionAr: 'هذا التقييم الروحي الذاتي سيساعد في إنشاء خطط التزكية والعادات الشخصية لتطويرك الروحي.',
      purpose: [
        'Identify areas for spiritual purification (Takhliyah)',
        'Discover opportunities for virtue cultivation (Tahliyah)',
        'Generate personalized habit recommendations',
        'Create a structured spiritual development plan'
      ],
      phases: [
        { number: 1, name: 'Inner Heart Diseases', questions: 4 },
        { number: 2, name: 'Behavioral Manifestations', questions: 7 },
        { number: 3, name: 'Reflection & Personal Goals', questions: 2 },
        { number: 4, name: 'Results & Recommendations', questions: 0 }
      ],
      estimatedTime: '10-15 minutes',
      privacy: 'All responses are completely private and used only for generating your personal recommendations.'
    };

    const response = createSuccessResponse({
      welcome: welcomeData,
      metadata: {
        currentStep: 1,
        totalSteps: 4,
        progressPercentage: 0
      }
    }, traceId);

    res.json(response);
  } catch (error) {
    requestLogger.error('Error in welcome endpoint', { error, traceId });
    const { response, status, headers } = handleExpressError(error, traceId, 'Failed to load welcome information');
    res.status(status).set(headers).json(response);
  }
});

/**
 * @api {post} /api/v1/onboarding/phase1 Submit Phase 1 responses
 * @apiVersion 1.0.0
 * @apiName SubmitPhase1
 * @apiGroup Onboarding
 * @apiDescription Submit Phase 1 survey responses (Inner Heart Diseases)
 */
router.post('/phase1', authMiddleware, surveyCompletionCheckMiddleware, surveyPhaseMiddleware.phase1, validateBody(Phase1Schema), async (req, res): Promise<void> => {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId, (req as any).userId);

  try {
    const userId = getUserIdFromRequest(req);
    const phase1Data = req.body;

    requestLogger.info('Submitting Phase 1 responses', { userId, questionCount: 4 });

    const useCase = container.resolve(SubmitPhase1UseCase);
    const result = await useCase.execute({ userId, phase1Data });

    if (Result.isError(result)) {
      requestLogger.error('Phase 1 submission failed', { error: result.error, traceId });

      const { response, status, headers } = handleExpressError(
        createAppError(ErrorCode.VALIDATION_ERROR, result.error.message),
        traceId
      );
      res.status(status).set(headers).json(response);
      return;
    }

    const responseData = {
      phase1: {
        completed: true,
        submittedAt: new Date().toISOString(),
        nextPhase: 2
      },
      progress: result.value.progress,
      navigation: {
        canProceed: result.value.nextPhaseAvailable,
        nextUrl: '/api/v1/onboarding/phase2',
        currentStep: 2,
        totalSteps: 4,
        progressPercentage: 25
      }
    };

    const successResponse = createSuccessResponse(responseData, traceId);
    res.json(successResponse);
  } catch (error) {
    requestLogger.error('Error in Phase 1 submission', { error, traceId });
    const { response, status, headers } = handleExpressError(error, traceId, 'Failed to submit Phase 1 responses');
    res.status(status).set(headers).json(response);
  }
});

/**
 * @api {post} /api/v1/onboarding/phase2 Submit Phase 2 responses
 * @apiVersion 1.0.0
 * @apiName SubmitPhase2
 * @apiGroup Onboarding
 * @apiDescription Submit Phase 2 survey responses (Behavioral Manifestations)
 */
router.post('/phase2', authMiddleware, surveyCompletionCheckMiddleware, surveyPhaseMiddleware.phase2, validateBody(Phase2Schema), async (req, res): Promise<void> => {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId, (req as any).userId);

  try {
    const userId = getUserIdFromRequest(req);
    const phase2Data = req.body;

    requestLogger.info('Submitting Phase 2 responses', { userId, questionCount: 7 });

    const useCase = container.resolve(SubmitPhase2UseCase);
    const result = await useCase.execute({ userId, phase2Data });

    if (Result.isError(result)) {
      requestLogger.error('Phase 2 submission failed', { error: result.error, traceId });

      const { response, status, headers } = handleExpressError(
        createAppError(ErrorCode.VALIDATION_ERROR, result.error.message),
        traceId
      );
      res.status(status).set(headers).json(response);
      return;
    }

    const responseData = {
      phase2: {
        completed: true,
        submittedAt: new Date().toISOString(),
        nextPhase: 3
      },
      progress: result.value.progress,
      navigation: {
        canProceed: result.value.nextPhaseAvailable,
        nextUrl: '/api/v1/onboarding/reflection',
        currentStep: 3,
        totalSteps: 4,
        progressPercentage: 50
      }
    };

    const successResponse = createSuccessResponse(responseData, traceId);
    res.json(successResponse);
  } catch (error) {
    requestLogger.error('Error in Phase 2 submission', { error, traceId });
    const { response, status, headers } = handleExpressError(error, traceId, 'Failed to submit Phase 2 responses');
    res.status(status).set(headers).json(response);
  }
});

/**
 * @api {post} /api/v1/onboarding/reflection Submit reflection responses
 * @apiVersion 1.0.0
 * @apiName SubmitReflection
 * @apiGroup Onboarding
 * @apiDescription Submit reflection phase responses with text length validation
 */
router.post('/reflection', authMiddleware, surveyCompletionCheckMiddleware, surveyPhaseMiddleware.reflection, validateBody(ReflectionSchema), async (req, res): Promise<void> => {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId, (req as any).userId);

  try {
    const userId = getUserIdFromRequest(req);
    const reflectionData = req.body;

    requestLogger.info('Submitting reflection responses', { userId });

    const useCase = container.resolve(SubmitReflectionUseCase);
    const result = await useCase.execute({ userId, reflectionData });

    if (Result.isError(result)) {
      requestLogger.error('Reflection submission failed', { error: result.error, traceId });

      const { response, status, headers } = handleExpressError(
        createAppError(ErrorCode.VALIDATION_ERROR, result.error.message),
        traceId
      );
      res.status(status).set(headers).json(response);
      return;
    }

    // Create simplified AI preview as per requirements
    const aiPreview = {
      personalizedHabits: [
        'Morning dhikr practice (5 minutes daily)',
        'Evening self-reflection journal (10 minutes)',
        'Weekly Quran study session (30 minutes)'
      ],
      takhliyahFocus: ['Remove negative traits based on high scores'],
      tahliyahFocus: ['Cultivate positive qualities based on reflection']
    };

    const responseData = {
      reflection: {
        completed: true,
        submittedAt: new Date().toISOString(),
        nextPhase: 4
      },
      aiPreview,
      progress: result.value.progress,
      navigation: {
        canProceed: result.value.resultsAvailable,
        nextUrl: '/api/v1/onboarding/results',
        currentStep: 4,
        totalSteps: 4,
        progressPercentage: 75
      }
    };

    const successResponse = createSuccessResponse(responseData, traceId);
    res.json(successResponse);
  } catch (error) {
    requestLogger.error('Error in reflection submission', { error, traceId });
    const { response, status, headers } = handleExpressError(error, traceId, 'Failed to submit reflection responses');
    res.status(status).set(headers).json(response);
  }
});

/**
 * @api {get} /api/v1/onboarding/results Get survey results and generate recommendations
 * @apiVersion 1.0.0
 * @apiName GetResults
 * @apiGroup Onboarding
 * @apiDescription Generate and return survey results with personalized recommendations
 */
router.get('/results', authMiddleware, surveyPhaseMiddleware.results, async (req, res): Promise<void> => {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId, (req as any).userId);

  try {
    const userId = getUserIdFromRequest(req);
    requestLogger.info('Generating survey results', { userId });

    const useCase = container.resolve(GenerateResultsUseCase);
    const result = await useCase.execute({ userId });

    if (Result.isError(result)) {
      requestLogger.error('Results generation failed', { error: result.error, traceId });

      const { response, status, headers } = handleExpressError(
        result.error,
        traceId
      );
      res.status(status).set(headers).json(response);
      return;
    }

    const responseData = {
      results: result.value.results.toDTO(),
      metadata: {
        generatedAt: result.value.results.generatedAt.toISOString(),
        version: '1.0',
        completedAt: new Date().toISOString(),
        progressPercentage: 100
      },
      exportOptions: result.value.exportOptions
    };

    const successResponse = createSuccessResponse(responseData, traceId);
    res.json(successResponse);
  } catch (error) {
    requestLogger.error('Error generating results', { error, traceId });
    const { response, status, headers } = handleExpressError(error, traceId, 'Failed to generate survey results');
    res.status(status).set(headers).json(response);
  }
});

/**
 * @api {get} /api/v1/onboarding/progress Get current survey progress
 * @apiVersion 1.0.0
 * @apiName GetProgress
 * @apiGroup Onboarding
 * @apiDescription Get user's current survey progress and completion status
 */
router.get('/progress', authMiddleware, async (req, res): Promise<void> => {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId, (req as any).userId);

  try {
    const userId = getUserIdFromRequest(req);
    requestLogger.info('Fetching survey progress', { userId });

    const useCase = container.resolve(ValidateSurveyProgressUseCase);
    const result = await useCase.getCurrentProgress(userId);

    if (Result.isError(result)) {
      requestLogger.error('Progress fetch failed', { error: result.error, traceId });

      const { response, status, headers } = handleExpressError(
        createAppError(ErrorCode.DATABASE_ERROR, 'Failed to fetch survey progress'),
        traceId
      );
      res.status(status).set(headers).json(response);
      return;
    }

    const progress = result.value.progress;

    const responseData = {
      progress: progress,
      navigation: {
        currentPhase: progress.currentPhase,
        nextAvailablePhase: progress.nextAvailablePhase,
        phaseUrls: {
          1: '/api/v1/onboarding/phase1',
          2: '/api/v1/onboarding/phase2',
          3: '/api/v1/onboarding/reflection',
          4: '/api/v1/onboarding/results'
        }
      },
      metadata: {
        version: '1.0',
        fetchedAt: new Date().toISOString()
      }
    };

    const successResponse = createSuccessResponse(responseData, traceId);
    res.json(successResponse);
  } catch (error) {
    requestLogger.error('Error fetching progress', { error, traceId });
    const { response, status, headers } = handleExpressError(error, traceId, 'Failed to fetch survey progress');
    res.status(status).set(headers).json(response);
  }
});

/**
 * @api {get} /api/v1/onboarding/export/pdf/:resultId Export results as PDF
 * @apiVersion 1.0.0
 * @apiName ExportResultsPDF
 * @apiGroup Onboarding
 * @apiDescription Export survey results as PDF document
 */
router.get('/export/pdf/:resultId', authMiddleware, async (req, res): Promise<void> => {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId, (req as any).userId);

  try {
    const userId = getUserIdFromRequest(req);
    const { resultId } = req.params;

    requestLogger.info('Exporting results as PDF', { userId, resultId });

    const surveyRepo = container.resolve<ISurveyRepository>('ISurveyRepository');
    const result = await surveyRepo.getSurveyResult(new UserId(userId));

    if (Result.isError(result) || !result.value) {
      const { response, status, headers } = handleExpressError(
        createAppError(ErrorCode.NOT_FOUND, 'Survey results not found'),
        traceId
      );
      res.status(status).set(headers).json(response);
      return;
    }

    // For now, return JSON formatted for PDF generation
    // In a real implementation, you would use a PDF library like puppeteer or jsPDF
    const pdfData = {
      title: 'Tazkiyah Discovery Survey Results',
      generatedAt: new Date().toISOString(),
      user: userId,
      results: result.value.toDTO()
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="tazkiyah-results.json"');
    res.json(pdfData);

  } catch (error) {
    requestLogger.error('Error exporting PDF', { error, traceId });
    const { response, status, headers } = handleExpressError(error, traceId, 'Failed to export PDF');
    res.status(status).set(headers).json(response);
  }
});

/**
 * @api {get} /api/v1/onboarding/export/json/:resultId Export results as JSON
 * @apiVersion 1.0.0
 * @apiName ExportResultsJSON
 * @apiGroup Onboarding
 * @apiDescription Export survey results as JSON document
 */
router.get('/export/json/:resultId', authMiddleware, async (req, res): Promise<void> => {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId, (req as any).userId);

  try {
    const userId = getUserIdFromRequest(req);
    const { resultId } = req.params;

    requestLogger.info('Exporting results as JSON', { userId, resultId });

    const surveyRepo = container.resolve<ISurveyRepository>('ISurveyRepository');
    const result = await surveyRepo.getSurveyResult(new UserId(userId));

    if (Result.isError(result) || !result.value) {
      const { response, status, headers } = handleExpressError(
        createAppError(ErrorCode.NOT_FOUND, 'Survey results not found'),
        traceId
      );
      res.status(status).set(headers).json(response);
      return;
    }

    const exportData = {
      metadata: {
        title: 'Tazkiyah Discovery Survey Results',
        exportedAt: new Date().toISOString(),
        version: '1.0',
        format: 'JSON'
      },
      results: result.value.toDTO()
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="tazkiyah-results.json"');
    res.json(exportData);

  } catch (error) {
    requestLogger.error('Error exporting JSON', { error, traceId });
    const { response, status, headers } = handleExpressError(error, traceId, 'Failed to export JSON');
    res.status(status).set(headers).json(response);
  }
});

/**
 * @api {post} /api/v1/onboarding/integrate-habits Create habits from survey results
 * @apiVersion 1.0.0
 * @apiName IntegrateHabits
 * @apiGroup Onboarding
 * @apiDescription Create habits in the existing tracking system from survey personalized recommendations
 */
router.post('/integrate-habits', authMiddleware, async (req, res): Promise<void> => {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId, (req as any).userId);

  try {
    const userId = getUserIdFromRequest(req);
    const { planId } = req.body; // Optional: specify existing plan ID

    requestLogger.info('Starting survey-to-habits integration', { userId, planId });

    const useCase = container.resolve(CreateHabitsFromSurveyUseCase);
    const result = await useCase.execute({
      userId,
      surveyResultId: userId, // Using userId as survey result identifier
      planId,
      traceId
    });

    if (Result.isError(result)) {
      requestLogger.error('Habit integration failed', { error: result.error, traceId });

      const { response, status, headers } = handleExpressError(
        createAppError(ErrorCode.SERVER_ERROR, result.error.message),
        traceId
      );
      res.status(status).set(headers).json(response);
      return;
    }

    const responseData = {
      integration: {
        completed: true,
        totalHabitsCreated: result.value.totalHabitsCreated,
        planId: result.value.planId,
        completedAt: new Date().toISOString()
      },
      createdHabits: result.value.createdHabits,
      navigation: {
        habitsUrl: '/habits',
        dashboardUrl: '/dashboard',
        planUrl: `/tazkiyah?planId=${result.value.planId}`
      },
      metadata: {
        version: '1.0',
        integrationMethod: 'survey-to-habits'
      }
    };

    requestLogger.info('Survey-to-habits integration completed successfully', {
      totalHabitsCreated: result.value.totalHabitsCreated,
      planId: result.value.planId
    });

    const successResponse = createSuccessResponse(responseData, traceId);
    res.json(successResponse);
  } catch (error) {
    requestLogger.error('Error in habit integration', { error, traceId });
    const { response, status, headers } = handleExpressError(error, traceId, 'Failed to integrate habits from survey results');
    res.status(status).set(headers).json(response);
  }
});

export default router;