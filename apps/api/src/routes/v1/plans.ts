import { Router } from 'express';
import { container } from 'tsyringe';
import { authMiddleware } from '@/infrastructure/auth/middleware';
import { logger } from '../../shared/logger';
import { IPlanRepository } from '@/domain/repositories';
import { UserId } from '@/domain/value-objects/UserId';
import { PlanId } from '@/domain/value-objects/PlanId';
import { Plan, PlanKind } from '@/domain/entities/Plan';
import { MicroHabit } from '@/domain/entities/MicroHabit';
import { Result } from '@/shared/result';
import { ValidationError } from '@/shared/errors';
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
router.get('/', authMiddleware, async (req, res): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const queryResult = PlanQuerySchema.safeParse(req.query);

    if (!queryResult.success) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: queryResult.error.errors
        }
      });
      return;
    }

    const { status = 'all', kind, includeContent = false, includeStats = false } = queryResult.data;

    const planRepo = container.resolve<IPlanRepository>('IPlanRepository');
    const result = await planRepo.findByUserId(new UserId(userId));

    if (Result.isError(result)) {
      logger.error('Error fetching plans v1', result.error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch plans'
        }
      });
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

    res.json({
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
    });
  } catch (error) {
    logger.error('Error fetching plans v1', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch plans'
      }
    });
  }
});

/**
 * @api {get} /api/v1/plans/active Get active plans for dashboard
 * @apiVersion 1.0.0
 * @apiName GetActivePlans
 * @apiGroup Plans
 */
router.get('/active', authMiddleware, async (req, res): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const planRepo = container.resolve<IPlanRepository>('IPlanRepository');
    const result = await planRepo.findByUserId(new UserId(userId));

    if (Result.isError(result)) {
      logger.error('Error fetching active plans v1', result.error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch active plans'
        }
      });
      return;
    }

    const activePlans = result.value
      .filter(plan => plan.status === 'active')
      .map(plan => plan.toDTO());

    res.json({
      plans: activePlans,
      metadata: {
        total: activePlans.length,
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error fetching active plans v1', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch active plans'
      }
    });
  }
});

/**
 * @api {get} /api/v1/plans/:id Get plan by ID
 * @apiVersion 1.0.0
 * @apiName GetPlan
 * @apiGroup Plans
 */
router.get('/:id', authMiddleware, async (req, res): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    const planRepo = container.resolve<IPlanRepository>('IPlanRepository');
    const result = await planRepo.findById(new PlanId(id));

    if (Result.isError(result)) {
      logger.error('Error fetching plan v1', result.error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch plan'
        }
      });
      return;
    }

    if (!result.value) {
      res.status(404).json({
        error: {
          code: 'PLAN_NOT_FOUND',
          message: 'Plan not found'
        }
      });
      return;
    }

    const plan = result.value;

    // Verify ownership
    if (plan.userId.toString() !== userId) {
      res.status(403).json({
        error: {
          code: 'ACCESS_DENIED',
          message: 'You do not have permission to access this plan'
        }
      });
      return;
    }

    res.json({
      plan: plan.toDTO()
    });
  } catch (error) {
    logger.error('Error fetching plan v1', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch plan'
      }
    });
  }
});

/**
 * @api {post} /api/v1/plans Create a new plan
 * @apiVersion 1.0.0
 * @apiName CreatePlan
 * @apiGroup Plans
 */
router.post('/', authMiddleware, async (req, res): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const parseResult = CreatePlanSchema.safeParse(req.body);

    if (!parseResult.success) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid plan data',
          details: parseResult.error.errors
        }
      });
      return;
    }

    const { kind, target, microHabits, duaIds = [], contentIds = [] } = parseResult.data;

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
      logger.error('Error creating plan v1', result.error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create plan'
        }
      });
      return;
    }

    res.status(201).json({
      plan: result.value.toDTO(),
      events: ['plan_created']
    });
  } catch (error) {
    logger.error('Error creating plan v1', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create plan'
      }
    });
  }
});

/**
 * @api {patch} /api/v1/plans/:id/status Update plan status
 * @apiVersion 1.0.0
 * @apiName UpdatePlanStatus
 * @apiGroup Plans
 */
router.patch('/:id/status', authMiddleware, async (req, res): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const parseResult = UpdatePlanStatusSchema.safeParse(req.body);

    if (!parseResult.success) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid status data',
          details: parseResult.error.errors
        }
      });
      return;
    }

    const { status } = parseResult.data;

    const planRepo = container.resolve<IPlanRepository>('IPlanRepository');

    // First, verify the plan exists and user owns it
    const planResult = await planRepo.findById(new PlanId(id));
    if (Result.isError(planResult)) {
      logger.error('Error fetching plan for status update', planResult.error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch plan'
        }
      });
      return;
    }

    if (!planResult.value) {
      res.status(404).json({
        error: {
          code: 'PLAN_NOT_FOUND',
          message: 'Plan not found'
        }
      });
      return;
    }

    // Verify ownership
    if (planResult.value.userId.toString() !== userId) {
      res.status(403).json({
        error: {
          code: 'ACCESS_DENIED',
          message: 'You do not have permission to modify this plan'
        }
      });
      return;
    }

    const result = await planRepo.updateStatus(new PlanId(id), status);

    if (Result.isError(result)) {
      logger.error('Error updating plan status v1', result.error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update plan status'
        }
      });
      return;
    }

    res.json({
      plan: result.value.toDTO(),
      events: [`plan_${status}`]
    });
  } catch (error) {
    logger.error('Error updating plan status v1', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update plan status'
      }
    });
  }
});

/**
 * @api {post} /api/v1/plans/:id/activate Activate a plan
 * @apiVersion 1.0.0
 * @apiName ActivatePlan
 * @apiGroup Plans
 */
router.post('/:id/activate', authMiddleware, async (req, res): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    const planRepo = container.resolve<IPlanRepository>('IPlanRepository');

    // First, verify the plan exists and user owns it
    const planResult = await planRepo.findById(new PlanId(id));
    if (Result.isError(planResult)) {
      logger.error('Error fetching plan for activation', planResult.error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch plan'
        }
      });
      return;
    }

    if (!planResult.value) {
      res.status(404).json({
        error: {
          code: 'PLAN_NOT_FOUND',
          message: 'Plan not found'
        }
      });
      return;
    }

    // Verify ownership
    if (planResult.value.userId.toString() !== userId) {
      res.status(403).json({
        error: {
          code: 'ACCESS_DENIED',
          message: 'You do not have permission to modify this plan'
        }
      });
      return;
    }

    const result = await planRepo.updateStatus(new PlanId(id), 'active');

    if (Result.isError(result)) {
      logger.error('Error activating plan v1', result.error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to activate plan'
        }
      });
      return;
    }

    res.json({
      plan: result.value.toDTO(),
      events: ['plan_activated']
    });
  } catch (error) {
    logger.error('Error activating plan v1', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to activate plan'
      }
    });
  }
});

/**
 * @api {post} /api/v1/plans/:id/deactivate Deactivate a plan (archive)
 * @apiVersion 1.0.0
 * @apiName DeactivatePlan
 * @apiGroup Plans
 */
router.post('/:id/deactivate', authMiddleware, async (req, res): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    const planRepo = container.resolve<IPlanRepository>('IPlanRepository');

    // First, verify the plan exists and user owns it
    const planResult = await planRepo.findById(new PlanId(id));
    if (Result.isError(planResult)) {
      logger.error('Error fetching plan for deactivation', planResult.error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch plan'
        }
      });
      return;
    }

    if (!planResult.value) {
      res.status(404).json({
        error: {
          code: 'PLAN_NOT_FOUND',
          message: 'Plan not found'
        }
      });
      return;
    }

    // Verify ownership
    if (planResult.value.userId.toString() !== userId) {
      res.status(403).json({
        error: {
          code: 'ACCESS_DENIED',
          message: 'You do not have permission to modify this plan'
        }
      });
      return;
    }

    const result = await planRepo.updateStatus(new PlanId(id), 'archived');

    if (Result.isError(result)) {
      logger.error('Error deactivating plan v1', result.error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to deactivate plan'
        }
      });
      return;
    }

    res.json({
      plan: result.value.toDTO(),
      events: ['plan_deactivated']
    });
  } catch (error) {
    logger.error('Error deactivating plan v1', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to deactivate plan'
      }
    });
  }
});

/**
 * @api {delete} /api/v1/plans/:id Delete a plan
 * @apiVersion 1.0.0
 * @apiName DeletePlan
 * @apiGroup Plans
 */
router.delete('/:id', authMiddleware, async (req, res): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    const planRepo = container.resolve<IPlanRepository>('IPlanRepository');

    // First, verify the plan exists and user owns it
    const planResult = await planRepo.findById(new PlanId(id));
    if (Result.isError(planResult)) {
      logger.error('Error fetching plan for deletion', planResult.error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch plan'
        }
      });
      return;
    }

    if (!planResult.value) {
      res.status(404).json({
        error: {
          code: 'PLAN_NOT_FOUND',
          message: 'Plan not found'
        }
      });
      return;
    }

    // Verify ownership
    if (planResult.value.userId.toString() !== userId) {
      res.status(403).json({
        error: {
          code: 'ACCESS_DENIED',
          message: 'You do not have permission to delete this plan'
        }
      });
      return;
    }

    // Archive instead of hard delete (soft delete pattern)
    const result = await planRepo.updateStatus(new PlanId(id), 'archived');

    if (Result.isError(result)) {
      logger.error('Error deleting plan v1', result.error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete plan'
        }
      });
      return;
    }

    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting plan v1', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete plan'
      }
    });
  }
});

export default router;