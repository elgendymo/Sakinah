import express from 'express';
import { z } from 'zod';
import { authMiddleware } from '@/infrastructure/auth/middleware';
import { validateRequest } from '@/infrastructure/middleware/validation';
import { Result } from '@/shared/result';
import {
  CreateDhikrSessionUseCase,
  IncrementDhikrCountUseCase,
  GetDhikrSessionsUseCase,
  CompleteDhikrSessionUseCase,
  GetDhikrStatsUseCase,
  GetDhikrTypesUseCase
} from '@/application/usecases/dhikr';
import { container } from 'tsyringe';

const router = express.Router();

// Validation schemas
const createDhikrSessionSchema = z.object({
  dhikrType: z.string().min(1, 'Dhikr type is required').max(100, 'Dhikr type must be 100 characters or less'),
  dhikrText: z.string().min(1, 'Dhikr text is required').max(1000, 'Dhikr text must be 1000 characters or less'),
  targetCount: z.number().int().min(1).max(10000).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
  tags: z.array(z.string().min(1).max(50)).max(10).optional()
});

const incrementCountSchema = z.object({
  increment: z.number().int().min(1).max(1000).optional()
});

const completeSessionSchema = z.object({
  notes: z.string().max(2000, 'Notes must be 2000 characters or less').optional()
});

const getDhikrSessionsSchema = z.object({
  dhikrType: z.string().max(100).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
  tags: z.string().transform(str => str.split(',').map(tag => tag.trim())).optional(),
  page: z.string().transform(str => parseInt(str)).refine(num => num > 0, 'Page must be greater than 0').optional(),
  limit: z.string().transform(str => parseInt(str)).refine(num => num > 0 && num <= 100, 'Limit must be between 1 and 100').optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'date', 'dhikrType', 'count']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional()
});

const getDhikrStatsSchema = z.object({
  dhikrType: z.string().max(100).optional(),
  periodType: z.enum(['daily', 'weekly', 'monthly']).optional(),
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional()
});

const getDhikrTypesSchema = z.object({
  isActive: z.string().transform(str => str === 'true').optional(),
  tags: z.string().transform(str => str.split(',').map(tag => tag.trim())).optional(),
  search: z.string().max(200).optional()
});

/**
 * @openapi
 * /v2/dhikr/sessions:
 *   post:
 *     summary: Create a new dhikr session
 *     description: Start a new dhikr (remembrance) counter session for spiritual practice
 *     tags: [Dhikr]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - dhikrType
 *               - dhikrText
 *             properties:
 *               dhikrType:
 *                 type: string
 *                 maxLength: 100
 *                 description: Type/category of dhikr
 *                 example: "tasbih"
 *               dhikrText:
 *                 type: string
 *                 maxLength: 1000
 *                 description: The dhikr text or phrase
 *                 example: "سُبْحَانَ اللَّهِ"
 *               targetCount:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 10000
 *                 description: Target count for this session
 *                 example: 33
 *               date:
 *                 type: string
 *                 pattern: '^\d{4}-\d{2}-\d{2}$'
 *                 description: Date for the session (defaults to today)
 *                 example: "2024-01-15"
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                   maxLength: 50
 *                 maxItems: 10
 *                 description: Tags for categorizing the session
 *                 example: ["morning", "after-prayer"]
 *     responses:
 *       201:
 *         description: Dhikr session created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/DhikrSessionDTO'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/sessions',
  authMiddleware,
  validateRequest(createDhikrSessionSchema),
  async (req: any, res): Promise<void> => {
    try {
      const userId = req.userId;
      const { dhikrType, dhikrText, targetCount, date, tags } = req.body;

      const createSessionUseCase = container.resolve<CreateDhikrSessionUseCase>('CreateDhikrSessionUseCase');
      const result = await createSessionUseCase.execute({
        userId,
        dhikrType,
        dhikrText,
        targetCount,
        date,
        tags
      });

      if (Result.isError(result)) {
        res.status(400).json({
          error: 'SESSION_CREATION_FAILED',
          message: result.error.message
        });
        return;
      }

      res.status(201).json({
        data: result.value.toDTO()
      });
    } catch (error) {
      console.error('Error creating dhikr session:', error);
      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create dhikr session'
      });
    }
  }
);

/**
 * @openapi
 * /v2/dhikr/sessions:
 *   get:
 *     summary: Get user's dhikr sessions with filtering and pagination
 *     description: Retrieve dhikr sessions with optional filtering by type, date, and tags
 *     tags: [Dhikr]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: dhikrType
 *         in: query
 *         schema:
 *           type: string
 *           maxLength: 100
 *         description: Filter by dhikr type
 *       - name: date
 *         in: query
 *         schema:
 *           type: string
 *           pattern: '^\d{4}-\d{2}-\d{2}$'
 *         description: Filter by specific date
 *       - name: dateFrom
 *         in: query
 *         schema:
 *           type: string
 *           pattern: '^\d{4}-\d{2}-\d{2}$'
 *         description: Filter sessions from this date
 *       - name: dateTo
 *         in: query
 *         schema:
 *           type: string
 *           pattern: '^\d{4}-\d{2}-\d{2}$'
 *         description: Filter sessions until this date
 *       - name: tags
 *         in: query
 *         schema:
 *           type: string
 *         description: Comma-separated list of tags to filter by
 *         example: "morning,after-prayer"
 *       - name: page
 *         in: query
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of items per page
 *       - name: sortBy
 *         in: query
 *         schema:
 *           type: string
 *           enum: [createdAt, updatedAt, date, dhikrType, count]
 *           default: createdAt
 *         description: Field to sort by
 *       - name: sortOrder
 *         in: query
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Dhikr sessions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/DhikrSessionDTO'
 *                 pagination:
 *                   $ref: '#/components/schemas/PaginationInfo'
 */
router.get('/sessions',
  authMiddleware,
  validateRequest(getDhikrSessionsSchema),
  async (req: any, res): Promise<void> => {
    try {
      const userId = req.userId;
      const {
        dhikrType,
        date,
        dateFrom,
        dateTo,
        tags,
        page,
        limit,
        sortBy,
        sortOrder
      } = req.query;

      const getSessionsUseCase = container.resolve<GetDhikrSessionsUseCase>('GetDhikrSessionsUseCase');
      const result = await getSessionsUseCase.execute({
        userId,
        dhikrType,
        date,
        dateFrom,
        dateTo,
        tags,
        page,
        limit,
        sortBy,
        sortOrder
      });

      if (Result.isError(result)) {
        res.status(400).json({
          error: 'SESSIONS_RETRIEVAL_FAILED',
          message: result.error.message
        });
        return;
      }

      const { items, totalCount, page: currentPage, totalPages, hasNext, hasPrevious } = result.value;

      res.json({
        data: items.map(session => session.toDTO()),
        pagination: {
          currentPage,
          itemsPerPage: items.length,
          totalItems: totalCount,
          totalPages,
          hasNext,
          hasPrevious
        }
      });
    } catch (error) {
      console.error('Error getting dhikr sessions:', error);
      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve dhikr sessions'
      });
    }
  }
);

/**
 * @openapi
 * /v2/dhikr/sessions/{id}/increment:
 *   post:
 *     summary: Increment dhikr count
 *     description: Increment the count for an active dhikr session
 *     tags: [Dhikr]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Dhikr session ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               increment:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 1000
 *                 default: 1
 *                 description: Number to increment by
 *     responses:
 *       200:
 *         description: Count incremented successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/DhikrSessionDTO'
 */
router.post('/sessions/:id/increment',
  authMiddleware,
  validateRequest(incrementCountSchema),
  async (req: any, res): Promise<void> => {
    try {
      const userId = req.userId;
      const { id } = req.params;
      const { increment } = req.body;

      const incrementUseCase = container.resolve<IncrementDhikrCountUseCase>('IncrementDhikrCountUseCase');
      const result = await incrementUseCase.execute({
        sessionId: id,
        userId,
        increment
      });

      if (Result.isError(result)) {
        res.status(400).json({
          error: 'INCREMENT_FAILED',
          message: result.error.message
        });
        return;
      }

      res.json({
        data: result.value.toDTO()
      });
    } catch (error) {
      console.error('Error incrementing dhikr count:', error);
      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to increment dhikr count'
      });
    }
  }
);

/**
 * @openapi
 * /v2/dhikr/sessions/{id}/complete:
 *   post:
 *     summary: Complete a dhikr session
 *     description: Mark a dhikr session as completed
 *     tags: [Dhikr]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Dhikr session ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notes:
 *                 type: string
 *                 maxLength: 2000
 *                 description: Optional notes about the session
 *     responses:
 *       200:
 *         description: Session completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/DhikrSessionDTO'
 *                 message:
 *                   type: string
 *                   example: "Dhikr session completed successfully"
 */
router.post('/sessions/:id/complete',
  authMiddleware,
  validateRequest(completeSessionSchema),
  async (req: any, res): Promise<void> => {
    try {
      const userId = req.userId;
      const { id } = req.params;
      const { notes } = req.body;

      const completeSessionUseCase = container.resolve<CompleteDhikrSessionUseCase>('CompleteDhikrSessionUseCase');
      const result = await completeSessionUseCase.execute({
        sessionId: id,
        userId,
        notes
      });

      if (Result.isError(result)) {
        res.status(400).json({
          error: 'COMPLETION_FAILED',
          message: result.error.message
        });
        return;
      }

      res.json({
        data: result.value.toDTO(),
        message: 'Dhikr session completed successfully'
      });
    } catch (error) {
      console.error('Error completing dhikr session:', error);
      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to complete dhikr session'
      });
    }
  }
);

/**
 * @openapi
 * /v2/dhikr/stats:
 *   get:
 *     summary: Get dhikr statistics
 *     description: Retrieve comprehensive statistics about user's dhikr practice
 *     tags: [Dhikr]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: dhikrType
 *         in: query
 *         schema:
 *           type: string
 *           maxLength: 100
 *         description: Filter statistics by dhikr type
 *       - name: periodType
 *         in: query
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly]
 *         description: Period type for statistics
 *       - name: periodStart
 *         in: query
 *         schema:
 *           type: string
 *           pattern: '^\d{4}-\d{2}-\d{2}$'
 *         description: Start date for statistics period
 *       - name: periodEnd
 *         in: query
 *         schema:
 *           type: string
 *           pattern: '^\d{4}-\d{2}-\d{2}$'
 *         description: End date for statistics period
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/DhikrStats'
 */
router.get('/stats',
  authMiddleware,
  validateRequest(getDhikrStatsSchema),
  async (req: any, res): Promise<void> => {
    try {
      const userId = req.userId;
      const { dhikrType, periodType, periodStart, periodEnd } = req.query;

      const getStatsUseCase = container.resolve<GetDhikrStatsUseCase>('GetDhikrStatsUseCase');
      const result = await getStatsUseCase.execute({
        userId,
        dhikrType,
        periodType,
        periodStart,
        periodEnd
      });

      if (Result.isError(result)) {
        res.status(400).json({
          error: 'STATS_RETRIEVAL_FAILED',
          message: result.error.message
        });
        return;
      }

      res.json({
        data: result.value
      });
    } catch (error) {
      console.error('Error getting dhikr stats:', error);
      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve dhikr statistics'
      });
    }
  }
);

/**
 * @openapi
 * /v2/dhikr/types:
 *   get:
 *     summary: Get available dhikr types
 *     description: Retrieve list of available dhikr types and categories
 *     tags: [Dhikr]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: isActive
 *         in: query
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Filter by active status
 *       - name: tags
 *         in: query
 *         schema:
 *           type: string
 *         description: Comma-separated list of tags to filter by
 *       - name: search
 *         in: query
 *         schema:
 *           type: string
 *           maxLength: 200
 *         description: Search in dhikr type name and description
 *     responses:
 *       200:
 *         description: Dhikr types retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/DhikrTypeDTO'
 */
router.get('/types',
  authMiddleware,
  validateRequest(getDhikrTypesSchema),
  async (req: any, res): Promise<void> => {
    try {
      const { isActive, tags, search } = req.query;

      const getTypesUseCase = container.resolve<GetDhikrTypesUseCase>('GetDhikrTypesUseCase');
      const result = await getTypesUseCase.execute({
        isActive,
        tags,
        search
      });

      if (Result.isError(result)) {
        res.status(400).json({
          error: 'TYPES_RETRIEVAL_FAILED',
          message: result.error.message
        });
        return;
      }

      res.json({
        data: result.value.map(type => type.toDTO())
      });
    } catch (error) {
      console.error('Error getting dhikr types:', error);
      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve dhikr types'
      });
    }
  }
);

export default router;