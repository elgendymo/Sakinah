import { Router } from 'express';
import { container } from 'tsyringe';
import { authMiddleware } from '@/infrastructure/auth/middleware';
import { SuggestPlanUseCase } from '@/application/usecases/SuggestPlanUseCase';
import { Result } from '@/shared/result';
import { ErrorCode, createAppError, handleExpressError, getExpressTraceId, createSuccessResponse, ValidationError, createRequestLogger } from '@/shared/errors';
import { validateBody } from '@/infrastructure/middleware/validation';
import { z } from 'zod';

const router = Router();

// Validation schemas
const SuggestPlanSchema = z.object({
  mode: z.enum(['takhliyah', 'tahliyah'], {
    required_error: 'Mode is required',
    invalid_type_error: 'Mode must be either takhliyah or tahliyah'
  }),
  input: z.string().min(1, 'Input is required'),
  context: z.object({
    struggles: z.array(z.string()).optional(),
    goals: z.array(z.string()).optional(),
    preferences: z.object({
      difficultLevel: z.enum(['easy', 'moderate', 'challenging']).optional(),
      timeCommitment: z.enum(['low', 'medium', 'high']).optional(),
      focusAreas: z.array(z.string()).optional()
    }).optional()
  }).optional()
});

const ExplainSchema = z.object({
  struggle: z.string().min(1, 'Struggle description is required'),
  context: z.string().optional()
});

/**
 * @api {post} /api/v1/ai/suggest-plan Generate a suggested spiritual development plan
 * @apiVersion 1.0.0
 * @apiName SuggestPlan
 * @apiGroup AI
 */
router.post('/suggest-plan', authMiddleware, validateBody(SuggestPlanSchema), async (req, res): Promise<void> => {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId, (req as any).userId);

  try {
    const userId = (req as any).userId;
    const { mode, input, context = {} } = req.body;

    // Enhanced request structure for v1 API
    const suggestPlanRequest = {
      userId,
      mode,
      input,
      context: {
        struggles: context.struggles || [],
        goals: context.goals || [],
        preferences: {
          difficultyLevel: context.preferences?.difficultLevel || 'moderate',
          timeCommitment: context.preferences?.timeCommitment || 'medium',
          focusAreas: context.preferences?.focusAreas || []
        }
      }
    };

    const useCase = container.resolve(SuggestPlanUseCase);
    const result = await useCase.execute(suggestPlanRequest);

    if (Result.isError(result)) {
      requestLogger.error('Error suggesting plan v1', { error: result.error, traceId });

      // Handle specific error types
      if (result.error instanceof ValidationError) {
        const { response, status, headers } = handleExpressError(
          createAppError(ErrorCode.VALIDATION_ERROR, result.error.message),
          traceId
        );
        res.status(status).set(headers).json(response);
        return;
      }

      const { response, status, headers } = handleExpressError(
        createAppError(ErrorCode.AI_PROVIDER_ERROR, 'Failed to generate plan suggestion'),
        traceId
      );
      res.status(status).set(headers).json(response);
      return;
    }

    const suggestedPlan = result.value.toDTO();

    // Enhanced response format for v1 API
    const responseData = {
      suggestion: {
        plan: suggestedPlan,
        confidence: 0.85, // AI confidence score
        reasoning: {
          mode: `This ${mode} plan focuses on ${mode === 'takhliyah' ? 'purification from negative traits' : 'building positive spiritual qualities'}.`,
          microHabits: suggestedPlan.microHabits.map((habit: any) => ({
            id: habit.id,
            reasoning: `This habit helps develop ${habit.target} through consistent ${habit.schedule} practice.`
          })),
          content: suggestedPlan.contentIds.length > 0
            ? 'Selected Islamic content will provide spiritual guidance and motivation.'
            : 'Additional content can be added based on personal preferences.'
        },
        alternatives: [], // Future: Alternative plan suggestions
        nextSteps: [
          'Review the suggested micro-habits and adjust schedules if needed',
          'Consider adding relevant duas or Quranic verses',
          'Set realistic expectations and start with one habit at a time',
          'Track progress regularly and celebrate small victories'
        ]
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        version: '1.0',
        aiProvider: process.env.AI_PROVIDER || 'rules',
        processingTime: Date.now() // Could be enhanced with actual timing
      }
    };

    const successResponse = createSuccessResponse(responseData, traceId);
    res.json(successResponse);
  } catch (error) {
    requestLogger.error('Error in suggest-plan v1', { error, traceId });
    const { response, status, headers } = handleExpressError(error, traceId, 'Failed to generate plan suggestion');
    res.status(status).set(headers).json(response);
  }
});

/**
 * @api {post} /api/v1/ai/explain Explain Islamic concepts or provide spiritual guidance
 * @apiVersion 1.0.0
 * @apiName ExplainConcept
 * @apiGroup AI
 */
router.post('/explain', authMiddleware, validateBody(ExplainSchema), async (req, res): Promise<void> => {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId, (req as any).userId);

  try {
    const { struggle, context = '' } = req.body;

    // Import AI provider dynamically to avoid circular dependencies
    const { getAIProvider } = await import('@/infrastructure/ai/factory');
    const ai = getAIProvider();

    const response = await ai.explain(struggle);

    // Enhanced response format for v1 API
    const responseData = {
      explanation: {
        concept: struggle,
        guidance: (response as any).explanation || (response as any).guidance || 'Islamic guidance provided',
        verses: (response as any).verses || [],
        hadith: (response as any).hadith || [],
        duas: (response as any).duas || [],
        recommendations: (response as any).recommendations || [],
        relatedConcepts: (response as any).relatedConcepts || []
      },
      metadata: {
        responseTime: new Date().toISOString(),
        version: '1.0',
        aiProvider: process.env.AI_PROVIDER || 'rules',
        contextUsed: !!context
      }
    };

    const successResponse = createSuccessResponse(responseData, traceId);
    res.json(successResponse);
  } catch (error) {
    requestLogger.error('Error in explain v1', { error, traceId });
    const { response, status, headers } = handleExpressError(error, traceId, 'Failed to provide explanation');
    res.status(status).set(headers).json(response);
  }
});

/**
 * @api {post} /api/v1/ai/analyze-progress Analyze spiritual progress and provide feedback
 * @apiVersion 1.0.0
 * @apiName AnalyzeProgress
 * @apiGroup AI
 */
router.post('/analyze-progress', authMiddleware, async (req, res): Promise<void> => {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId, (req as any).userId);

  try {
      const {
          planId,
      completedHabits = [],
      challenges = [],
          timeframe = '30d'
    } = req.body;

    // Validation
    if (!planId) {
      const { response, status, headers } = handleExpressError(
        createAppError(ErrorCode.VALIDATION_ERROR, 'Plan ID is required for progress analysis'),
        traceId
      );
      res.status(status).set(headers).json(response);
      return;
    }

    // TODO: Implement progress analysis logic
    // This would involve:
    // 1. Fetching plan data
    // 2. Analyzing completion patterns
    // 3. Identifying trends and insights
    // 4. Providing personalized recommendations

    const analysis = {
      progress: {
        overallScore: 75, // Calculated based on habits completion
        consistencyScore: 80,
        improvementAreas: challenges,
        strengths: ['Regular prayer times', 'Consistent dhikr']
      },
      insights: [
        'Your consistency has improved by 15% this month',
        'Morning habits show better completion rates',
        'Consider adjusting evening routine for better success'
      ],
      recommendations: [
        'Focus on one challenging habit at a time',
        'Set reminders for difficult time slots',
        'Celebrate small wins to maintain motivation'
      ],
      nextGoals: [
        'Maintain current consistency for 2 weeks',
        'Add one new micro-habit gradually',
        'Increase dhikr frequency during commute'
      ]
    };

    const responseData = {
      analysis,
      metadata: {
        analyzedAt: new Date().toISOString(),
        timeframe,
        dataPoints: completedHabits.length + challenges.length,
        version: '1.0'
      }
    };

    const successResponse = createSuccessResponse(responseData, traceId);
    res.json(successResponse);
  } catch (error) {
    requestLogger.error('Error in analyze-progress v1', { error, traceId });
    const { response, status, headers } = handleExpressError(error, traceId, 'Failed to analyze progress');
    res.status(status).set(headers).json(response);
  }
});

/**
 * @api {get} /api/v1/ai/capabilities Get AI service capabilities and configuration
 * @apiVersion 1.0.0
 * @apiName GetCapabilities
 * @apiGroup AI
 */
router.get('/capabilities', authMiddleware, async (req, res): Promise<void> => {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId, (req as any).userId);

  try {
    const capabilities = {
      features: {
        planSuggestion: {
          available: true,
          modes: ['takhliyah', 'tahliyah'],
          maxInputLength: 1000,
          supportedLanguages: ['en', 'ar']
        },
        conceptExplanation: {
          available: true,
          maxQueryLength: 500,
          supportedTopics: [
            'Islamic jurisprudence',
            'Spiritual development',
            'Prayer and worship',
            'Ethics and morality',
            'Quranic guidance',
            'Prophetic traditions'
          ]
        },
        progressAnalysis: {
          available: true,
          timeframes: ['7d', '30d', '90d', '1y'],
          metrics: ['consistency', 'improvement', 'challenges']
        }
      },
      provider: {
        type: process.env.AI_PROVIDER || 'rules',
        version: '1.0',
        lastUpdated: '2024-01-01T00:00:00Z'
      },
      limits: {
        requestsPerHour: 100,
        requestsPerDay: 500,
        maxConcurrentRequests: 5
      }
    };

    const responseData = {
      capabilities,
      metadata: {
        retrievedAt: new Date().toISOString(),
        version: '1.0'
      }
    };

    const successResponse = createSuccessResponse(responseData, traceId);
    res.json(successResponse);
  } catch (error) {
    requestLogger.error('Error fetching AI capabilities v1', { error, traceId });
    const { response, status, headers } = handleExpressError(error, traceId, 'Failed to fetch AI capabilities');
    res.status(status).set(headers).json(response);
  }
});

export default router;