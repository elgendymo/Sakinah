import { Router } from 'express';
import { container } from 'tsyringe';
import { authMiddleware } from '@/infrastructure/auth/middleware';
import { validateBody, validateQuery } from '@/infrastructure/middleware/validation';
import {
  ErrorCode,
  createAppError,
  handleExpressError,
  getExpressTraceId,
  createSuccessResponse,
  createRequestLogger
} from '@/shared/errors';
import { IPlanRepository } from '@/domain/repositories';
import { UserId } from '@/domain/value-objects/UserId';
import { PlanId } from '@/domain/value-objects/PlanId';
import { Plan } from '@/domain/entities/Plan';
import { MicroHabit } from '@/domain/entities/MicroHabit';
import { Result } from '@/shared/result';
import { z } from 'zod';

const router = Router();

// Validation schemas
const CreatePlanSchema = z.object({
  kind: z.enum(['takhliyah', 'tahliyah']),
  target: z.string().min(1, 'Target is required'),
  microHabits: z.array(z.object({
    title: z.string().min(1, 'Habit title is required'),
    schedule: z.string().min(1, 'Schedule is required'),
    target: z.number().min(1, 'Habit target must be at least 1').optional()
  })),
  duaIds: z.array(z.string()).optional(),
  contentIds: z.array(z.string()).optional()
});

const UpdatePlanStatusSchema = z.object({
  status: z.enum(['active', 'archived'])
});

const PlanQuerySchema = z.object({
  status: z.enum(['active', 'archived', 'all']).optional(),
  kind: z.enum(['takhliyah', 'tahliyah']).optional(),
  includeContent: z.boolean().optional(),
  includeStats: z.boolean().optional()
});

/**
 * @api {get} /api/v1/plans Get user plans with enhanced filtering
 * @apiVersion 1.0.0
 * @apiName GetPlans
 * @apiGroup Plans
 */
router.get('/', authMiddleware, validateQuery(PlanQuerySchema), async (req, res): Promise<void> => {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId, (req as any).userId);

  try {
    const userId = (req as any).userId;
    const { status = 'all', kind, includeContent = false, includeStats = false } = req.query as z.infer<typeof PlanQuerySchema>;

    const planRepo = container.resolve<IPlanRepository>('IPlanRepository');
    const result = await planRepo.findByUserId(new UserId(userId));

    if (Result.isError(result)) {
      requestLogger.error('Error fetching plans v1', { error: result.error });
      const { response, status: httpStatus, headers } = handleExpressError(
        createAppError(ErrorCode.DATABASE_ERROR, 'Failed to fetch plans'),
        traceId
      );
      res.status(httpStatus).set(headers).json(response);
      return;
    }

    let plans = result.value;

    // Apply filters
    if (status !== 'all') {
      plans = plans.filter(plan => plan.status === status);
    }

    if (kind) {
      plans = plans.filter(plan => plan.kind === kind);
    }

    // Enhance plans with additional data if requested
    const enhancedPlans = await Promise.all(plans.map(async (plan) => {
      let planData: any = plan.toDTO();

      if (includeContent) {
        // TODO: Fetch content details based on contentIds
        planData = { ...planData, contentDetails: [] };
      }

      if (includeStats) {
        // TODO: Calculate plan statistics
        planData = {
          ...planData,
          stats: {
            completedHabits: 0,
            totalHabits: plan.microHabits.length,
            activeDays: 0
          }
        };
      }

      return planData;
    }));

    const successResponse = createSuccessResponse({
      plans: enhancedPlans,
      metadata: {
        total: enhancedPlans.length,
        activeCount: enhancedPlans.filter(p => p.status === 'active').length,
        archivedCount: enhancedPlans.filter(p => p.status === 'archived').length,
        byKind: {
          takhliyah: enhancedPlans.filter(p => p.kind === 'takhliyah').length,
          tahliyah: enhancedPlans.filter(p => p.kind === 'tahliyah').length
        }
      }
    }, traceId);

    requestLogger.info('Plans retrieved successfully', { count: enhancedPlans.length, status, kind });
    res.json(successResponse);
  } catch (error) {
    requestLogger.error('Error fetching plans v1', { error: error instanceof Error ? error.message : String(error) }, error instanceof Error ? error : undefined);
    const { response, status: httpStatus, headers } = handleExpressError(error, traceId);
    res.status(httpStatus).set(headers).json(response);
  }
});

/**
 * @api {get} /api/v1/plans/active Get active plans for dashboard
 * @apiVersion 1.0.0
 * @apiName GetActivePlans
 * @apiGroup Plans
 */
router.get('/active', authMiddleware, async (req, res): Promise<void> => {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId, (req as any).userId);

  try {
    const userId = (req as any).userId;
    const planRepo = container.resolve<IPlanRepository>('IPlanRepository');
    const result = await planRepo.findByUserId(new UserId(userId));

    if (Result.isError(result)) {
      requestLogger.error('Error fetching active plans v1', { error: result.error });
      const { response, status: httpStatus, headers } = handleExpressError(
        createAppError(ErrorCode.DATABASE_ERROR, 'Failed to fetch active plans'),
        traceId
      );
      res.status(httpStatus).set(headers).json(response);
      return;
    }

    const activePlans = result.value
      .filter(plan => plan.status === 'active')
      .map(plan => plan.toDTO());

    const successResponse = createSuccessResponse({
      plans: activePlans,
      metadata: {
        total: activePlans.length,
        lastUpdated: new Date().toISOString()
      }
    }, traceId);

    requestLogger.info('Active plans retrieved successfully', { count: activePlans.length });
    res.json(successResponse);
  } catch (error) {
    requestLogger.error('Error fetching active plans v1', { error: error instanceof Error ? error.message : String(error) }, error instanceof Error ? error : undefined);
    const { response, status: httpStatus, headers } = handleExpressError(error, traceId);
    res.status(httpStatus).set(headers).json(response);
  }
});

/**
 * @api {get} /api/v1/plans/:id Get plan by ID
 * @apiVersion 1.0.0
 * @apiName GetPlan
 * @apiGroup Plans
 */
router.get('/:id', authMiddleware, async (req, res): Promise<void> => {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId, (req as any).userId);

  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    const planRepo = container.resolve<IPlanRepository>('IPlanRepository');
    const result = await planRepo.findById(new PlanId(id));

    if (Result.isError(result)) {
      requestLogger.error('Error fetching plan v1', { error: result.error, traceId });
      const { response, status: httpStatus, headers } = handleExpressError(
        createAppError(ErrorCode.DATABASE_ERROR, 'Failed to fetch plan'),
        traceId
      );
      res.status(httpStatus).set(headers).json(response);
      return;
    }

    if (!result.value) {
      const { response, status: httpStatus, headers } = handleExpressError(
        createAppError(ErrorCode.PLAN_NOT_FOUND, 'Plan not found'),
        traceId
      );
      res.status(httpStatus).set(headers).json(response);
      return;
    }

    const plan = result.value;

    // Verify ownership
    if (plan.userId.toString() !== userId) {
      const { response, status: httpStatus, headers } = handleExpressError(
        createAppError(ErrorCode.UNAUTHORIZED, 'You do not have permission to access this plan'),
        traceId
      );
      res.status(httpStatus).set(headers).json(response);
      return;
    }

    requestLogger.info('Plan retrieved successfully', { planId: id });
    const successResponse = createSuccessResponse({
      plan: plan.toDTO()
    }, traceId);

    res.json(successResponse);
  } catch (error) {
    requestLogger.error('Error fetching plan v1', { error, traceId });
    const { response, status: httpStatus, headers } = handleExpressError(error, traceId);
    res.status(httpStatus).set(headers).json(response);
  }
});

/**
 * @api {post} /api/v1/plans Create a new plan
 * @apiVersion 1.0.0
 * @apiName CreatePlan
 * @apiGroup Plans
 */
router.post('/', authMiddleware, validateBody(CreatePlanSchema), async (req, res): Promise<void> => {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId, (req as any).userId);

  try {
    const userId = (req as any).userId;
    const { kind, target, microHabits, duaIds = [], contentIds = [] } = req.body as z.infer<typeof CreatePlanSchema>;

    const plan = Plan.create({
      userId,
      kind,
      target,
      microHabits: microHabits.map(h =>
        MicroHabit.create(h.title, h.schedule, h.target || 1)
      ),
      duaIds,
      contentIds,
      status: 'active'
    });

    const planRepo = container.resolve<IPlanRepository>('IPlanRepository');
    const result = await planRepo.create(plan);

    if (Result.isError(result)) {
      requestLogger.error('Error creating plan v1', { error: result.error, traceId });
      const { response, status: httpStatus, headers } = handleExpressError(
        createAppError(ErrorCode.DATABASE_ERROR, 'Failed to create plan'),
        traceId
      );
      res.status(httpStatus).set(headers).json(response);
      return;
    }

    const successResponse = createSuccessResponse({
      plan: result.value.toDTO(),
      events: ['plan_created']
    }, traceId);

    requestLogger.info('Plan created successfully', { planId: result.value.id.toString(), kind, target });
    res.status(201).json(successResponse);
  } catch (error) {
    requestLogger.error('Error creating plan v1', { error: error instanceof Error ? error.message : String(error) }, error instanceof Error ? error : undefined);
    const { response, status: httpStatus, headers } = handleExpressError(error, traceId);
    res.status(httpStatus).set(headers).json(response);
  }
});

/**
 * @api {patch} /api/v1/plans/:id/status Update plan status
 * @apiVersion 1.0.0
 * @apiName UpdatePlanStatus
 * @apiGroup Plans
 */
router.patch('/:id/status', authMiddleware, validateBody(UpdatePlanStatusSchema), async (req, res): Promise<void> => {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId, (req as any).userId);

  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { status } = req.body as z.infer<typeof UpdatePlanStatusSchema>;

    const planRepo = container.resolve<IPlanRepository>('IPlanRepository');

    // First, verify the plan exists and user owns it
    const planResult = await planRepo.findById(new PlanId(id));
    if (Result.isError(planResult)) {
      requestLogger.error('Error fetching plan for status update', { error: planResult.error, traceId });
      const { response, status: httpStatus, headers } = handleExpressError(
        createAppError(ErrorCode.DATABASE_ERROR, 'Failed to fetch plan'),
        traceId
      );
      res.status(httpStatus).set(headers).json(response);
      return;
    }

    if (!planResult.value) {
      const { response, status: httpStatus, headers } = handleExpressError(
        createAppError(ErrorCode.PLAN_NOT_FOUND, 'Plan not found'),
        traceId
      );
      res.status(httpStatus).set(headers).json(response);
      return;
    }

    // Verify ownership
    if (planResult.value.userId.toString() !== userId) {
      const { response, status: httpStatus, headers } = handleExpressError(
        createAppError(ErrorCode.UNAUTHORIZED, 'You do not have permission to modify this plan'),
        traceId
      );
      res.status(httpStatus).set(headers).json(response);
      return;
    }

    const result = await planRepo.updateStatus(new PlanId(id), status);

    if (Result.isError(result)) {
      requestLogger.error('Error updating plan status v1', { error: result.error, traceId });
      const { response, status: httpStatus, headers } = handleExpressError(
        createAppError(ErrorCode.DATABASE_ERROR, 'Failed to update plan status'),
        traceId
      );
      res.status(httpStatus).set(headers).json(response);
      return;
    }

    requestLogger.info('Plan status updated successfully', { planId: id, status });
    const successResponse = createSuccessResponse({
      plan: result.value.toDTO(),
      events: [`plan_${status}`]
    }, traceId);

    res.json(successResponse);
  } catch (error) {
    requestLogger.error('Error updating plan status v1', { error, traceId });
    const { response, status: httpStatus, headers } = handleExpressError(error, traceId);
    res.status(httpStatus).set(headers).json(response);
  }
});

/**
 * @api {post} /api/v1/plans/:id/activate Activate a plan
 * @apiVersion 1.0.0
 * @apiName ActivatePlan
 * @apiGroup Plans
 */
router.post('/:id/activate', authMiddleware, async (req, res): Promise<void> => {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId, (req as any).userId);

  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    const planRepo = container.resolve<IPlanRepository>('IPlanRepository');

    // First, verify the plan exists and user owns it
    const planResult = await planRepo.findById(new PlanId(id));
    if (Result.isError(planResult)) {
      requestLogger.error('Error fetching plan for activation', { error: planResult.error, traceId });
      const { response, status: httpStatus, headers } = handleExpressError(
        createAppError(ErrorCode.DATABASE_ERROR, 'Failed to fetch plan'),
        traceId
      );
      res.status(httpStatus).set(headers).json(response);
      return;
    }

    if (!planResult.value) {
      const { response, status: httpStatus, headers } = handleExpressError(
        createAppError(ErrorCode.PLAN_NOT_FOUND, 'Plan not found'),
        traceId
      );
      res.status(httpStatus).set(headers).json(response);
      return;
    }

    // Verify ownership
    if (planResult.value.userId.toString() !== userId) {
      const { response, status: httpStatus, headers } = handleExpressError(
        createAppError(ErrorCode.UNAUTHORIZED, 'You do not have permission to modify this plan'),
        traceId
      );
      res.status(httpStatus).set(headers).json(response);
      return;
    }

    const result = await planRepo.updateStatus(new PlanId(id), 'active');

    if (Result.isError(result)) {
      requestLogger.error('Error activating plan v1', { error: result.error, traceId });
      const { response, status: httpStatus, headers } = handleExpressError(
        createAppError(ErrorCode.DATABASE_ERROR, 'Failed to activate plan'),
        traceId
      );
      res.status(httpStatus).set(headers).json(response);
      return;
    }

    requestLogger.info('Plan activated successfully', { planId: id });
    const successResponse = createSuccessResponse({
      plan: result.value.toDTO(),
      events: ['plan_activated']
    }, traceId);

    res.json(successResponse);
  } catch (error) {
    requestLogger.error('Error activating plan v1', { error, traceId });
    const { response, status: httpStatus, headers } = handleExpressError(error, traceId);
    res.status(httpStatus).set(headers).json(response);
  }
});

/**
 * @api {post} /api/v1/plans/:id/deactivate Deactivate a plan (archive)
 * @apiVersion 1.0.0
 * @apiName DeactivatePlan
 * @apiGroup Plans
 */
router.post('/:id/deactivate', authMiddleware, async (req, res): Promise<void> => {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId, (req as any).userId);

  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    const planRepo = container.resolve<IPlanRepository>('IPlanRepository');

    // First, verify the plan exists and user owns it
    const planResult = await planRepo.findById(new PlanId(id));
    if (Result.isError(planResult)) {
      requestLogger.error('Error fetching plan for deactivation', { error: planResult.error, traceId });
      const { response, status: httpStatus, headers } = handleExpressError(
        createAppError(ErrorCode.DATABASE_ERROR, 'Failed to fetch plan'),
        traceId
      );
      res.status(httpStatus).set(headers).json(response);
      return;
    }

    if (!planResult.value) {
      const { response, status: httpStatus, headers } = handleExpressError(
        createAppError(ErrorCode.PLAN_NOT_FOUND, 'Plan not found'),
        traceId
      );
      res.status(httpStatus).set(headers).json(response);
      return;
    }

    // Verify ownership
    if (planResult.value.userId.toString() !== userId) {
      const { response, status: httpStatus, headers } = handleExpressError(
        createAppError(ErrorCode.UNAUTHORIZED, 'You do not have permission to modify this plan'),
        traceId
      );
      res.status(httpStatus).set(headers).json(response);
      return;
    }

    const result = await planRepo.updateStatus(new PlanId(id), 'archived');

    if (Result.isError(result)) {
      requestLogger.error('Error deactivating plan v1', { error: result.error, traceId });
      const { response, status: httpStatus, headers } = handleExpressError(
        createAppError(ErrorCode.DATABASE_ERROR, 'Failed to deactivate plan'),
        traceId
      );
      res.status(httpStatus).set(headers).json(response);
      return;
    }

    requestLogger.info('Plan deactivated successfully', { planId: id });
    const successResponse = createSuccessResponse({
      plan: result.value.toDTO(),
      events: ['plan_deactivated']
    }, traceId);

    res.json(successResponse);
  } catch (error) {
    requestLogger.error('Error deactivating plan v1', { error, traceId });
    const { response, status: httpStatus, headers } = handleExpressError(error, traceId);
    res.status(httpStatus).set(headers).json(response);
  }
});

/**
 * @api {delete} /api/v1/plans/:id Delete a plan
 * @apiVersion 1.0.0
 * @apiName DeletePlan
 * @apiGroup Plans
 */
router.delete('/:id', authMiddleware, async (req, res): Promise<void> => {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId, (req as any).userId);

  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    const planRepo = container.resolve<IPlanRepository>('IPlanRepository');

    // First, verify the plan exists and user owns it
    const planResult = await planRepo.findById(new PlanId(id));
    if (Result.isError(planResult)) {
      requestLogger.error('Error fetching plan for deletion', { error: planResult.error, traceId });
      const { response, status: httpStatus, headers } = handleExpressError(
        createAppError(ErrorCode.DATABASE_ERROR, 'Failed to fetch plan'),
        traceId
      );
      res.status(httpStatus).set(headers).json(response);
      return;
    }

    if (!planResult.value) {
      const { response, status: httpStatus, headers } = handleExpressError(
        createAppError(ErrorCode.PLAN_NOT_FOUND, 'Plan not found'),
        traceId
      );
      res.status(httpStatus).set(headers).json(response);
      return;
    }

    // Verify ownership
    if (planResult.value.userId.toString() !== userId) {
      const { response, status: httpStatus, headers } = handleExpressError(
        createAppError(ErrorCode.UNAUTHORIZED, 'You do not have permission to delete this plan'),
        traceId
      );
      res.status(httpStatus).set(headers).json(response);
      return;
    }

    // Archive instead of hard delete (soft delete pattern)
    const result = await planRepo.updateStatus(new PlanId(id), 'archived');

    if (Result.isError(result)) {
      requestLogger.error('Error deleting plan v1', { error: result.error, traceId });
      const { response, status: httpStatus, headers } = handleExpressError(
        createAppError(ErrorCode.DATABASE_ERROR, 'Failed to delete plan'),
        traceId
      );
      res.status(httpStatus).set(headers).json(response);
      return;
    }

    requestLogger.info('Plan deleted successfully', { planId: id });
    res.status(204).send();
  } catch (error) {
    requestLogger.error('Error deleting plan v1', { error, traceId });
    const { response, status: httpStatus, headers } = handleExpressError(error, traceId);
    res.status(httpStatus).set(headers).json(response);
  }
});

export default router;