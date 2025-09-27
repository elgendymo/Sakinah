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

    const {
      status = 'all',
      kind,
      includeContent = false,
      includeStats = false,
      limit = 20,
      offset = 0
    } = queryResult.data;

    const planRepo = container.resolve<IPlanRepository>('IPlanRepository');
    const result = await planRepo.findByUserId(new UserId(userId));

    if (Result.isError(result)) {
      logger.error('Error fetching plans v2', result.error);
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
    res.json({
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
    });
  } catch (error) {
    logger.error('Error fetching plans v2', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch plans'
      }
    });
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
  try {
    const userId = (req as any).userId;
    const planRepo = container.resolve<IPlanRepository>('IPlanRepository');
    const result = await planRepo.findByUserId(new UserId(userId));

    if (Result.isError(result)) {
      logger.error('Error fetching active plans v2', result.error);
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

    // V2 response format
    res.json({
      plans: activePlans,
      metadata: {
        total: activePlans.length,
        lastUpdated: new Date().toISOString(),
        version: '2.0'
      }
    });
  } catch (error) {
    logger.error('Error fetching active plans v2', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch active plans'
      }
    });
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
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    const planRepo = container.resolve<IPlanRepository>('IPlanRepository');
    const result = await planRepo.findById(new PlanId(id));

    if (Result.isError(result)) {
      logger.error('Error fetching plan v2', result.error);
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

    // V2 response format
    res.json({
      plan: plan.toDTO(),
      metadata: {
        version: '2.0',
        lastAccessed: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error fetching plan v2', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch plan'
      }
    });
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
      logger.error('Error creating plan v2', result.error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create plan'
        }
      });
      return;
    }

    // V2 response format
    res.status(201).json({
      plan: result.value.toDTO(),
      events: ['plan_created'],
      metadata: {
        createdAt: new Date().toISOString(),
        version: '2.0'
      }
    });
  } catch (error) {
    logger.error('Error creating plan v2', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create plan'
      }
    });
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
      logger.error('Error activating plan v2', result.error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to activate plan'
        }
      });
      return;
    }

    // V2 response format
    res.json({
      plan: result.value.toDTO(),
      events: ['plan_activated'],
      metadata: {
        activatedAt: new Date().toISOString(),
        version: '2.0'
      }
    });
  } catch (error) {
    logger.error('Error activating plan v2', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to activate plan'
      }
    });
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
      logger.error('Error deactivating plan v2', result.error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to deactivate plan'
        }
      });
      return;
    }

    // V2 response format
    res.json({
      plan: result.value.toDTO(),
      events: ['plan_deactivated'],
      metadata: {
        deactivatedAt: new Date().toISOString(),
        version: '2.0'
      }
    });
  } catch (error) {
    logger.error('Error deactivating plan v2', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to deactivate plan'
      }
    });
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
      logger.error('Error deleting plan v2', result.error);
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
    logger.error('Error deleting plan v2', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete plan'
      }
    });
  }
});

export default router;