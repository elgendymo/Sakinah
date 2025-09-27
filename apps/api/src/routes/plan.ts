import { Router } from 'express';
import { z } from 'zod';
import { container } from 'tsyringe';
import { authMiddleware, AuthRequest } from '@/infrastructure/auth/middleware';
import {
  handleExpressError,
  getExpressTraceId,
  createSuccessResponse,
  createRequestLogger
} from '@/shared/errors';
import { validateBody, validateParams } from '@/infrastructure/middleware/validation';
import { PlanRepository } from '@/infrastructure/repos/PlanRepository';

const createPlanSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  goals: z.array(z.string()).optional(),
  targetDays: z.number().int().positive().optional()
});

const archivePlanParamsSchema = z.object({
  id: z.string().min(1, 'Plan ID is required')
});

const router = Router();

router.get('/active', authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId, req.userId);

  try {
    const userId = req.userId!;

    requestLogger.info('Fetching active plans', { traceId, userId });

    const planRepo = container.resolve(PlanRepository);
    const plans = await planRepo.getActivePlans(userId);

    requestLogger.info('Active plans fetched successfully', { traceId, userId, planCount: plans.length });
    const response = createSuccessResponse({ plans }, traceId);
    res.status(200).json(response);
  } catch (error) {
    const { response, status, headers } = handleExpressError(error, traceId);
    requestLogger.error('Error fetching active plans:', { error, traceId });
    res.status(status).set(headers as any).json(response);
  }
});

router.post('/', authMiddleware, validateBody(createPlanSchema), async (req: AuthRequest, res): Promise<void> => {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId, req.userId);

  try {
    const userId = req.userId!;
    const planData = req.body;

    requestLogger.info('Creating new plan', { traceId, userId, planTitle: planData.title });

    const planRepo = container.resolve(PlanRepository);
    const plan = await planRepo.createPlan({
      ...planData,
      userId,
    });

    requestLogger.info('Plan created successfully', { traceId, userId, planId: plan.id });
    const response = createSuccessResponse({ plan }, traceId);
    res.status(201).json(response);
  } catch (error) {
    const { response, status, headers } = handleExpressError(error, traceId);
    requestLogger.error('Error creating plan:', { error, traceId });
    res.status(status).set(headers as any).json(response);
  }
});

router.patch('/:id/archive', authMiddleware, validateParams(archivePlanParamsSchema), async (req: AuthRequest, res): Promise<void> => {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId, req.userId);

  try {
    const { id } = req.params;
    const userId = req.userId!;

    requestLogger.info('Archiving plan', { traceId, userId, planId: id });

    const planRepo = container.resolve(PlanRepository);
    await planRepo.archivePlan(id);

    requestLogger.info('Plan archived successfully', { traceId, userId, planId: id });
    const response = createSuccessResponse({ message: 'Plan archived successfully' }, traceId);
    res.status(200).json(response);
  } catch (error) {
    const { response, status, headers } = handleExpressError(error, traceId);
    requestLogger.error('Error archiving plan:', { error, traceId });
    res.status(status).set(headers as any).json(response);
  }
});

export default router;