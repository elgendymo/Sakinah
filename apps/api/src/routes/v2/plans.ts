import { Router } from 'express';
import { container } from 'tsyringe';
import { authMiddleware } from '@/infrastructure/auth/middleware';
import { IPlanRepository } from '@/domain/repositories';
import { UserId } from '@/domain/value-objects/UserId';
import { PlanId } from '@/domain/value-objects/PlanId';
import { Plan } from '@/domain/entities/Plan';
import { MicroHabit } from '@/domain/entities/MicroHabit';
import { Result } from '@/shared/result';
import { z } from 'zod';
import {
  ErrorCode,
  createAppError,
  handleExpressError,
  getExpressTraceId,
  createSuccessResponse,
  createRequestLogger
} from '@/shared/errors';
import { validateQuery, validateBody } from '@/infrastructure/middleware/validation';

const router = Router();

// Validation schemas for v2 API
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
  includeStats: z.boolean().optional(),
  limit: z.number().min(1).max(100).optional(),
  offset: z.number().min(0).optional()
});

/**
 * @swagger
 * /api/v2/plans:
 *   get:
 *     summary: Get user plans with enhanced filtering (v2)
 *     description: Retrieve user's Tazkiyah plans with advanced filtering and pagination
 *     tags: [Plans v2]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, archived, all]
 *         description: Filter by plan status
 *       - in: query
 *         name: kind
 *         schema:
 *           type: string
 *           enum: [takhliyah, tahliyah]
 *         description: Filter by plan type
 *       - in: query
 *         name: includeContent
 *         schema:
 *           type: boolean
 *         description: Include content details
 *       - in: query
 *         name: includeStats
 *         schema:
 *           type: boolean
 *         description: Include plan statistics
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Number of plans to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *         description: Number of plans to skip
 *     responses:
 *       200:
 *         description: Plans retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 plans:
 *                   type: array
 *                   items:
 *                     type: object
 *                 metadata:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     activeCount:
 *                       type: integer
 *                     archivedCount:
 *                       type: integer
 *                     pagination:
 *                       type: object
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/', authMiddleware, validateQuery(PlanQuerySchema), async (req, res): Promise<void> => {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId, (req as any).userId);

  try {
    const userId = (req as any).userId;
    const {
      status = 'all',
      kind,
      includeContent = false,
      includeStats = false,
      limit = 20,
      offset = 0
    } = req.query as z.infer<typeof PlanQuerySchema>;

    const planRepo = container.resolve<IPlanRepository>('IPlanRepository');
    const result = await planRepo.findByUserId(new UserId(userId));

    if (Result.isError(result)) {
      requestLogger.error('Error fetching plans v2', { error: result.error });
      const { response, status: statusCode, headers } = handleExpressError(
        createAppError(ErrorCode.DATABASE_ERROR, 'Failed to fetch plans'),
        traceId
      );
      res.status(statusCode).set(headers).json(response);
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

    const totalPlans = plans.length;

    // Apply pagination
    const paginatedPlans = plans.slice(offset, offset + limit);

    // Enhance plans with additional data if requested
    const enhancedPlans = await Promise.all(paginatedPlans.map(async (plan) => {
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
            activeDays: 0,
            completionRate: 0
          }
        };
      }

      return planData;
    }));

    // V2 response format with enhanced metadata
    const responseData = {
      plans: enhancedPlans,
      metadata: {
        total: totalPlans,
        count: enhancedPlans.length,
        activeCount: plans.filter(p => p.status === 'active').length,
        archivedCount: plans.filter(p => p.status === 'archived').length,
        byKind: {
          takhliyah: plans.filter(p => p.kind === 'takhliyah').length,
          tahliyah: plans.filter(p => p.kind === 'tahliyah').length
        },
        pagination: {
          limit,
          offset,
          hasMore: offset + limit < totalPlans
        },
        version: '2.0'
      }
    };

    requestLogger.info('Plans retrieved successfully', { count: enhancedPlans.length, total: totalPlans });
    const successResponse = createSuccessResponse(responseData, traceId);
    res.json(successResponse);
  } catch (error) {
    requestLogger.error('Error fetching plans v2', { error: error instanceof Error ? error.message : String(error) }, error instanceof Error ? error : undefined);
    const { response, status: statusCode, headers } = handleExpressError(error, traceId);
    res.status(statusCode).set(headers).json(response);
  }
});

/**
 * @swagger
 * /api/v2/plans/active:
 *   get:
 *     summary: Get active plans for dashboard (v2)
 *     description: Retrieve user's active Tazkiyah plans for dashboard display
 *     tags: [Plans v2]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active plans retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 plans:
 *                   type: array
 *                   items:
 *                     type: object
 *                 metadata:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/active', authMiddleware, async (req, res): Promise<void> => {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId, (req as any).userId);

  try {
    const userId = (req as any).userId;
    const planRepo = container.resolve<IPlanRepository>('IPlanRepository');
    const result = await planRepo.findByUserId(new UserId(userId));

    if (Result.isError(result)) {
      requestLogger.error('Error fetching active plans v2', { error: result.error });
      const { response, status: statusCode, headers } = handleExpressError(
        createAppError(ErrorCode.DATABASE_ERROR, 'Failed to fetch active plans'),
        traceId
      );
      res.status(statusCode).set(headers).json(response);
      return;
    }

    const activePlans = result.value
      .filter(plan => plan.status === 'active')
      .map(plan => plan.toDTO());

    // V2 response format
    const responseData = {
      plans: activePlans,
      metadata: {
        total: activePlans.length,
        lastUpdated: new Date().toISOString(),
        version: '2.0'
      }
    };

    requestLogger.info('Active plans retrieved successfully', { count: activePlans.length });
    const successResponse = createSuccessResponse(responseData, traceId);
    res.json(successResponse);
  } catch (error) {
    requestLogger.error('Error fetching active plans v2', { error: error instanceof Error ? error.message : String(error) }, error instanceof Error ? error : undefined);
    const { response, status: statusCode, headers } = handleExpressError(error, traceId);
    res.status(statusCode).set(headers).json(response);
  }
});

/**
 * @swagger
 * /api/v2/plans/{id}:
 *   get:
 *     summary: Get plan by ID (v2)
 *     description: Retrieve a specific plan by its ID
 *     tags: [Plans v2]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Plan ID
 *     responses:
 *       200:
 *         description: Plan retrieved successfully
 *       404:
 *         description: Plan not found
 *       403:
 *         description: Access denied
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
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
      requestLogger.error('Error fetching plan v2', { error: result.error, planId: id });
      const { response, status: statusCode, headers } = handleExpressError(
        createAppError(ErrorCode.DATABASE_ERROR, 'Failed to fetch plan'),
        traceId
      );
      res.status(statusCode).set(headers).json(response);
      return;
    }

    if (!result.value) {
      const { response, status: statusCode, headers } = handleExpressError(
        createAppError(ErrorCode.PLAN_NOT_FOUND, 'Plan not found'),
        traceId
      );
      res.status(statusCode).set(headers).json(response);
      return;
    }

    const plan = result.value;

    // Verify ownership
    if (plan.userId.toString() !== userId) {
      const { response, status: statusCode, headers } = handleExpressError(
        createAppError(ErrorCode.UNAUTHORIZED, 'You do not have permission to access this plan'),
        traceId
      );
      res.status(statusCode).set(headers).json(response);
      return;
    }

    // V2 response format
    const responseData = {
      plan: plan.toDTO(),
      metadata: {
        version: '2.0',
        lastAccessed: new Date().toISOString()
      }
    };

    requestLogger.info('Plan retrieved successfully', { planId: id });
    const successResponse = createSuccessResponse(responseData, traceId);
    res.json(successResponse);
  } catch (error) {
    requestLogger.error('Error fetching plan v2', { error: error instanceof Error ? error.message : String(error), planId: req.params.id }, error instanceof Error ? error : undefined);
    const { response, status: statusCode, headers } = handleExpressError(error, traceId);
    res.status(statusCode).set(headers).json(response);
  }
});

/**
 * @swagger
 * /api/v2/plans:
 *   post:
 *     summary: Create a new plan (v2)
 *     description: Create a new Tazkiyah plan with micro-habits
 *     tags: [Plans v2]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - kind
 *               - target
 *               - microHabits
 *             properties:
 *               kind:
 *                 type: string
 *                 enum: [takhliyah, tahliyah]
 *               target:
 *                 type: string
 *                 description: Main spiritual goal
 *               microHabits:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     title:
 *                       type: string
 *                     schedule:
 *                       type: string
 *                     target:
 *                       type: integer
 *                       minimum: 1
 *               duaIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               contentIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Plan created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
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
      requestLogger.error('Error creating plan v2', { error: result.error, planData: { kind, target } });
      const { response, status: statusCode, headers } = handleExpressError(
        createAppError(ErrorCode.DATABASE_ERROR, 'Failed to create plan'),
        traceId
      );
      res.status(statusCode).set(headers).json(response);
      return;
    }

    // V2 response format
    const responseData = {
      plan: result.value.toDTO(),
      events: ['plan_created'],
      metadata: {
        createdAt: new Date().toISOString(),
        version: '2.0'
      }
    };

    requestLogger.info('Plan created successfully', { planId: result.value.id.toString(), kind, target });
    const successResponse = createSuccessResponse(responseData, traceId);
    res.status(201).json(successResponse);
  } catch (error) {
    requestLogger.error('Error creating plan v2', { error: error instanceof Error ? error.message : String(error) }, error instanceof Error ? error : undefined);
    const { response, status: statusCode, headers } = handleExpressError(error, traceId);
    res.status(statusCode).set(headers).json(response);
  }
});

/**
 * @swagger
 * /api/v2/plans/{id}/activate:
 *   post:
 *     summary: Activate a plan (v2)
 *     description: Activate a plan for use
 *     tags: [Plans v2]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Plan ID
 *     responses:
 *       200:
 *         description: Plan activated successfully
 *       404:
 *         description: Plan not found
 *       403:
 *         description: Access denied
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
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
      requestLogger.error('Error fetching plan for activation', { error: planResult.error, planId: id });
      const { response, status: statusCode, headers } = handleExpressError(
        createAppError(ErrorCode.DATABASE_ERROR, 'Failed to fetch plan'),
        traceId
      );
      res.status(statusCode).set(headers).json(response);
      return;
    }

    if (!planResult.value) {
      const { response, status: statusCode, headers } = handleExpressError(
        createAppError(ErrorCode.PLAN_NOT_FOUND, 'Plan not found'),
        traceId
      );
      res.status(statusCode).set(headers).json(response);
      return;
    }

    // Verify ownership
    if (planResult.value.userId.toString() !== userId) {
      const { response, status: statusCode, headers } = handleExpressError(
        createAppError(ErrorCode.UNAUTHORIZED, 'You do not have permission to modify this plan'),
        traceId
      );
      res.status(statusCode).set(headers).json(response);
      return;
    }

    const result = await planRepo.updateStatus(new PlanId(id), 'active');

    if (Result.isError(result)) {
      requestLogger.error('Error activating plan v2', { error: result.error, planId: id });
      const { response, status: statusCode, headers } = handleExpressError(
        createAppError(ErrorCode.DATABASE_ERROR, 'Failed to activate plan'),
        traceId
      );
      res.status(statusCode).set(headers).json(response);
      return;
    }

    // V2 response format
    const responseData = {
      plan: result.value.toDTO(),
      events: ['plan_activated'],
      metadata: {
        activatedAt: new Date().toISOString(),
        version: '2.0'
      }
    };

    requestLogger.info('Plan activated successfully', { planId: id });
    const successResponse = createSuccessResponse(responseData, traceId);
    res.json(successResponse);
  } catch (error) {
    requestLogger.error('Error activating plan v2', { error: error instanceof Error ? error.message : String(error), planId: req.params.id }, error instanceof Error ? error : undefined);
    const { response, status: statusCode, headers } = handleExpressError(error, traceId);
    res.status(statusCode).set(headers).json(response);
  }
});

/**
 * @swagger
 * /api/v2/plans/{id}/deactivate:
 *   post:
 *     summary: Deactivate a plan (v2)
 *     description: Deactivate (archive) a plan
 *     tags: [Plans v2]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Plan ID
 *     responses:
 *       200:
 *         description: Plan deactivated successfully
 *       404:
 *         description: Plan not found
 *       403:
 *         description: Access denied
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
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
      requestLogger.error('Error fetching plan for deactivation', { error: planResult.error, planId: id });
      const { response, status: statusCode, headers } = handleExpressError(
        createAppError(ErrorCode.DATABASE_ERROR, 'Failed to fetch plan'),
        traceId
      );
      res.status(statusCode).set(headers).json(response);
      return;
    }

    if (!planResult.value) {
      const { response, status: statusCode, headers } = handleExpressError(
        createAppError(ErrorCode.PLAN_NOT_FOUND, 'Plan not found'),
        traceId
      );
      res.status(statusCode).set(headers).json(response);
      return;
    }

    // Verify ownership
    if (planResult.value.userId.toString() !== userId) {
      const { response, status: statusCode, headers } = handleExpressError(
        createAppError(ErrorCode.UNAUTHORIZED, 'You do not have permission to modify this plan'),
        traceId
      );
      res.status(statusCode).set(headers).json(response);
      return;
    }

    const result = await planRepo.updateStatus(new PlanId(id), 'archived');

    if (Result.isError(result)) {
      requestLogger.error('Error deactivating plan v2', { error: result.error, planId: id });
      const { response, status: statusCode, headers } = handleExpressError(
        createAppError(ErrorCode.DATABASE_ERROR, 'Failed to deactivate plan'),
        traceId
      );
      res.status(statusCode).set(headers).json(response);
      return;
    }

    // V2 response format
    const responseData = {
      plan: result.value.toDTO(),
      events: ['plan_deactivated'],
      metadata: {
        deactivatedAt: new Date().toISOString(),
        version: '2.0'
      }
    };

    requestLogger.info('Plan deactivated successfully', { planId: id });
    const successResponse = createSuccessResponse(responseData, traceId);
    res.json(successResponse);
  } catch (error) {
    requestLogger.error('Error deactivating plan v2', { error: error instanceof Error ? error.message : String(error), planId: req.params.id }, error instanceof Error ? error : undefined);
    const { response, status: statusCode, headers } = handleExpressError(error, traceId);
    res.status(statusCode).set(headers).json(response);
  }
});

/**
 * @swagger
 * /api/v2/plans/{id}:
 *   delete:
 *     summary: Delete a plan (v2)
 *     description: Delete a plan (soft delete - archives the plan)
 *     tags: [Plans v2]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Plan ID
 *     responses:
 *       204:
 *         description: Plan deleted successfully
 *       404:
 *         description: Plan not found
 *       403:
 *         description: Access denied
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
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
      requestLogger.error('Error fetching plan for deletion', { error: planResult.error, planId: id });
      const { response, status: statusCode, headers } = handleExpressError(
        createAppError(ErrorCode.DATABASE_ERROR, 'Failed to fetch plan'),
        traceId
      );
      res.status(statusCode).set(headers).json(response);
      return;
    }

    if (!planResult.value) {
      const { response, status: statusCode, headers } = handleExpressError(
        createAppError(ErrorCode.PLAN_NOT_FOUND, 'Plan not found'),
        traceId
      );
      res.status(statusCode).set(headers).json(response);
      return;
    }

    // Verify ownership
    if (planResult.value.userId.toString() !== userId) {
      const { response, status: statusCode, headers } = handleExpressError(
        createAppError(ErrorCode.UNAUTHORIZED, 'You do not have permission to delete this plan'),
        traceId
      );
      res.status(statusCode).set(headers).json(response);
      return;
    }

    // Archive instead of hard delete (soft delete pattern)
    const result = await planRepo.updateStatus(new PlanId(id), 'archived');

    if (Result.isError(result)) {
      requestLogger.error('Error deleting plan v2', { error: result.error, planId: id });
      const { response, status: statusCode, headers } = handleExpressError(
        createAppError(ErrorCode.DATABASE_ERROR, 'Failed to delete plan'),
        traceId
      );
      res.status(statusCode).set(headers).json(response);
      return;
    }

    requestLogger.info('Plan deleted successfully', { planId: id });
    res.status(204).send();
  } catch (error) {
    requestLogger.error('Error deleting plan v2', { error: error instanceof Error ? error.message : String(error), planId: req.params.id }, error instanceof Error ? error : undefined);
    const { response, status: statusCode, headers } = handleExpressError(error, traceId);
    res.status(statusCode).set(headers).json(response);
  }
});

export default router;