import express from 'express';
import { z } from 'zod';
import { authMiddleware } from '@/infrastructure/auth/middleware';
import { validateRequest, validateQuery } from '@/infrastructure/middleware/validation';
import { Result } from '@/shared/result';
import {
  CreateIntentionUseCase,
  UpdateIntentionUseCase,
  GetIntentionsUseCase,
  CompleteIntentionUseCase,
  DeleteIntentionUseCase,
  ArchiveIntentionUseCase,
  GetIntentionStatsUseCase
} from '@/application/usecases/intentions';
import { container } from 'tsyringe';
import {
  ErrorCode,
  createAppError,
  handleExpressError,
  getExpressTraceId,
  createSuccessResponse,
  createRequestLogger
} from '@/shared/errors';

const router = express.Router();

// Validation schemas
const createIntentionSchema = z.object({
  text: z.string().min(1, 'Intention text is required').max(500, 'Text must be 500 characters or less'),
  description: z.string().max(2000, 'Description must be 2000 characters or less').optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  targetDate: z.string().datetime().optional(),
  reminder: z.object({
    enabled: z.boolean(),
    time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format. Use HH:MM').optional(),
    daysOfWeek: z.array(z.number().min(0).max(6)).optional()
  }).optional(),
  tags: z.array(z.string().min(1).max(50)).max(10).optional()
});

const updateIntentionSchema = z.object({
  text: z.string().min(1, 'Intention text is required').max(500, 'Text must be 500 characters or less').optional(),
  description: z.string().max(2000, 'Description must be 2000 characters or less').optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  targetDate: z.string().datetime().nullable().optional(),
  reminder: z.object({
    enabled: z.boolean(),
    time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format. Use HH:MM').optional(),
    daysOfWeek: z.array(z.number().min(0).max(6)).optional()
  }).optional(),
  tags: z.array(z.string().min(1).max(50)).max(10).optional()
});

const getIntentionsSchema = z.object({
  status: z.enum(['active', 'completed', 'archived']).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  tags: z.string().transform(str => str.split(',').map(tag => tag.trim())).optional(),
  search: z.string().max(200).optional(),
  targetDateFrom: z.string().datetime().optional(),
  targetDateTo: z.string().datetime().optional(),
  overdueOnly: z.string().transform(str => str === 'true').optional(),
  page: z.string().transform(str => parseInt(str)).refine(num => num > 0, 'Page must be greater than 0').optional(),
  limit: z.string().transform(str => parseInt(str)).refine(num => num > 0 && num <= 100, 'Limit must be between 1 and 100').optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'targetDate', 'priority', 'text']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional()
});

/**
 * @openapi
 * /v2/intentions:
 *   post:
 *     summary: Create a new spiritual intention
 *     description: Create a daily intention for spiritual growth and personal accountability
 *     tags: [Intentions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 500
 *                 description: The intention text
 *                 example: "Read Quran for 15 minutes today"
 *               description:
 *                 type: string
 *                 maxLength: 2000
 *                 description: Optional detailed description
 *                 example: "Focus on Surah Al-Baqarah with reflection"
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high]
 *                 description: Intention priority level
 *                 example: "high"
 *               targetDate:
 *                 type: string
 *                 format: date-time
 *                 description: Target completion date
 *                 example: "2024-01-15T23:59:59.000Z"
 *               reminder:
 *                 type: object
 *                 properties:
 *                   enabled:
 *                     type: boolean
 *                     description: Whether reminder is enabled
 *                   time:
 *                     type: string
 *                     pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$'
 *                     description: Reminder time in HH:MM format
 *                     example: "07:30"
 *                   daysOfWeek:
 *                     type: array
 *                     items:
 *                       type: integer
 *                       minimum: 0
 *                       maximum: 6
 *                     description: Days of week (0=Sunday, 6=Saturday)
 *                     example: [1, 2, 3, 4, 5]
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                   maxLength: 50
 *                 maxItems: 10
 *                 description: Tags for categorizing intentions
 *                 example: ["quran", "morning", "worship"]
 *     responses:
 *       201:
 *         description: Intention created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/IntentionDTO'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/',
  authMiddleware,
  validateRequest(createIntentionSchema),
  async (req: any, res): Promise<void> => {
    const traceId = getExpressTraceId(req);
    const userId = req.userId;
    const requestLogger = createRequestLogger(traceId, userId);

    try {
      const { text, description, priority, targetDate, reminder, tags } = req.body;

      requestLogger.info('Creating new intention', {
        operation: 'createIntention',
        text: text?.substring(0, 50) + (text?.length > 50 ? '...' : ''),
        priority,
        hasReminder: !!reminder,
        tagCount: tags?.length || 0
      });

      const createIntentionUseCase = container.resolve<CreateIntentionUseCase>('CreateIntentionUseCase');
      const result = await createIntentionUseCase.execute({
        userId,
        text,
        description,
        priority,
        targetDate: targetDate ? new Date(targetDate) : undefined,
        reminder,
        tags
      });

      if (Result.isError(result)) {
        const appError = createAppError(
          ErrorCode.VALIDATION_ERROR,
          result.error?.message || 'Failed to create intention'
        );
        const { response, status, headers } = handleExpressError(appError, traceId);
        res.status(status).set(headers).json(response);
        return;
      }

      requestLogger.info('Intention created successfully', {
        operation: 'createIntention',
        intentionId: result.value.id
      });

      const successResponse = createSuccessResponse(result.value.toDTO(), traceId);
      res.status(201).set('X-Trace-Id', traceId).json(successResponse);
    } catch (error) {
      requestLogger.error('Error creating intention', { operation: 'createIntention' }, error as Error);
      const { response, status, headers } = handleExpressError(error, traceId, 'Failed to create intention');
      res.status(status).set(headers).json(response);
    }
  }
);

/**
 * @openapi
 * /v2/intentions:
 *   get:
 *     summary: Get user's intentions with filtering and pagination
 *     description: Retrieve intentions with optional filtering by status, priority, tags, and search
 *     tags: [Intentions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: status
 *         in: query
 *         schema:
 *           type: string
 *           enum: [active, completed, archived]
 *         description: Filter by intention status
 *       - name: priority
 *         in: query
 *         schema:
 *           type: string
 *           enum: [low, medium, high]
 *         description: Filter by priority level
 *       - name: tags
 *         in: query
 *         schema:
 *           type: string
 *         description: Comma-separated list of tags to filter by
 *         example: "quran,prayer,worship"
 *       - name: search
 *         in: query
 *         schema:
 *           type: string
 *           maxLength: 200
 *         description: Search in intention text and description
 *       - name: targetDateFrom
 *         in: query
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter intentions with target date from this date
 *       - name: targetDateTo
 *         in: query
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter intentions with target date until this date
 *       - name: overdueOnly
 *         in: query
 *         schema:
 *           type: boolean
 *         description: Show only overdue intentions
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
 *           enum: [createdAt, updatedAt, targetDate, priority, text]
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
 *         description: Intentions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/IntentionDTO'
 *                 pagination:
 *                   $ref: '#/components/schemas/PaginationInfo'
 */
router.get('/',
  authMiddleware,
  validateQuery(getIntentionsSchema),
  async (req: any, res): Promise<void> => {
    const traceId = getExpressTraceId(req);
    const userId = req.userId;
    const requestLogger = createRequestLogger(traceId, userId);

    try {
      const {
        status,
        priority,
        tags,
        search,
        targetDateFrom,
        targetDateTo,
        overdueOnly,
        page,
        limit,
        sortBy,
        sortOrder
      } = req.query;

      requestLogger.info('Retrieving intentions with filters', {
        operation: 'getIntentions',
        filters: {
          status,
          priority,
          tagCount: tags?.length || 0,
          hasSearch: !!search,
          overdueOnly,
          page: page || 1,
          limit: limit || 20
        }
      });

      const getIntentionsUseCase = container.resolve<GetIntentionsUseCase>('GetIntentionsUseCase');
      const result = await getIntentionsUseCase.execute({
        userId,
        status,
        priority,
        tags,
        search,
        targetDateFrom: targetDateFrom ? new Date(targetDateFrom) : undefined,
        targetDateTo: targetDateTo ? new Date(targetDateTo) : undefined,
        overdueOnly,
        page,
        limit,
        sortBy,
        sortOrder
      });

      if (Result.isError(result)) {
        const appError = createAppError(
          ErrorCode.VALIDATION_ERROR,
          result.error?.message || 'Failed to retrieve intentions'
        );
        const { response, status: errorStatus, headers } = handleExpressError(appError, traceId);
        res.status(errorStatus).set(headers).json(response);
        return;
      }

      const { items, totalCount, page: currentPage, totalPages, hasNext, hasPrevious } = result.value;

      requestLogger.info('Intentions retrieved successfully', {
        operation: 'getIntentions',
        resultCount: items.length,
        totalCount,
        currentPage
      });

      const responseData = {
        data: items.map(intention => intention.toDTO()),
        pagination: {
          currentPage,
          itemsPerPage: items.length,
          totalItems: totalCount,
          totalPages,
          hasNext,
          hasPrevious
        }
      };

      const successResponse = createSuccessResponse(responseData, traceId);
      res.set('X-Trace-Id', traceId).json(successResponse);
    } catch (error) {
      requestLogger.error('Error getting intentions', { operation: 'getIntentions' }, error as Error);
      const { response, status, headers } = handleExpressError(error, traceId, 'Failed to retrieve intentions');
      res.status(status).set(headers).json(response);
    }
  }
);

/**
 * @openapi
 * /v2/intentions/{id}:
 *   put:
 *     summary: Update an intention
 *     description: Update an existing intention's properties
 *     tags: [Intentions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Intention ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 500
 *               description:
 *                 type: string
 *                 maxLength: 2000
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high]
 *               targetDate:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *               reminder:
 *                 type: object
 *                 properties:
 *                   enabled:
 *                     type: boolean
 *                   time:
 *                     type: string
 *                     pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$'
 *                   daysOfWeek:
 *                     type: array
 *                     items:
 *                       type: integer
 *                       minimum: 0
 *                       maximum: 6
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                   maxLength: 50
 *                 maxItems: 10
 *     responses:
 *       200:
 *         description: Intention updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/IntentionDTO'
 */
router.put('/:id',
  authMiddleware,
  validateRequest(updateIntentionSchema),
  async (req: any, res): Promise<void> => {
    const traceId = getExpressTraceId(req);
    const userId = req.userId;
    const { id } = req.params;
    const requestLogger = createRequestLogger(traceId, userId);

    try {
      const { text, description, priority, targetDate, reminder, tags } = req.body;

      requestLogger.info('Updating intention', {
        operation: 'updateIntention',
        intentionId: id,
        fieldsUpdated: {
          text: !!text,
          description: !!description,
          priority: !!priority,
          targetDate: targetDate !== undefined,
          reminder: !!reminder,
          tags: !!tags
        }
      });

      const updateIntentionUseCase = container.resolve<UpdateIntentionUseCase>('UpdateIntentionUseCase');
      const result = await updateIntentionUseCase.execute({
        intentionId: id,
        userId,
        text,
        description,
        priority,
        targetDate: targetDate !== undefined ? (targetDate ? new Date(targetDate) : null) : undefined,
        reminder,
        tags
      });

      if (Result.isError(result)) {
        const appError = createAppError(
          ErrorCode.VALIDATION_ERROR,
          result.error?.message || 'Failed to update intention'
        );
        const { response, status, headers } = handleExpressError(appError, traceId);
        res.status(status).set(headers).json(response);
        return;
      }

      requestLogger.info('Intention updated successfully', {
        operation: 'updateIntention',
        intentionId: id
      });

      const successResponse = createSuccessResponse(result.value.toDTO(), traceId);
      res.set('X-Trace-Id', traceId).json(successResponse);
    } catch (error) {
      requestLogger.error('Error updating intention', {
        operation: 'updateIntention',
        intentionId: id
      }, error as Error);
      const { response, status, headers } = handleExpressError(error, traceId, 'Failed to update intention');
      res.status(status).set(headers).json(response);
    }
  }
);

/**
 * @openapi
 * /v2/intentions/{id}/complete:
 *   post:
 *     summary: Mark an intention as completed
 *     description: Complete an active intention
 *     tags: [Intentions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Intention ID
 *     responses:
 *       200:
 *         description: Intention completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/IntentionDTO'
 *                 message:
 *                   type: string
 *                   example: "Intention completed successfully"
 */
router.post('/:id/complete',
  authMiddleware,
  async (req: any, res): Promise<void> => {
    const traceId = getExpressTraceId(req);
    const userId = req.userId;
    const { id } = req.params;
    const requestLogger = createRequestLogger(traceId, userId);

    try {
      requestLogger.info('Completing intention', {
        operation: 'completeIntention',
        intentionId: id
      });

      const completeIntentionUseCase = container.resolve<CompleteIntentionUseCase>('CompleteIntentionUseCase');
      const result = await completeIntentionUseCase.execute({
        intentionId: id,
        userId
      });

      if (Result.isError(result)) {
        const appError = createAppError(
          ErrorCode.VALIDATION_ERROR,
          result.error?.message || 'Failed to complete intention'
        );
        const { response, status, headers } = handleExpressError(appError, traceId);
        res.status(status).set(headers).json(response);
        return;
      }

      requestLogger.info('Intention completed successfully', {
        operation: 'completeIntention',
        intentionId: id
      });

      const responseData = {
        data: result.value.toDTO(),
        message: 'Intention completed successfully'
      };

      const successResponse = createSuccessResponse(responseData, traceId);
      res.set('X-Trace-Id', traceId).json(successResponse);
    } catch (error) {
      requestLogger.error('Error completing intention', {
        operation: 'completeIntention',
        intentionId: id
      }, error as Error);
      const { response, status, headers } = handleExpressError(error, traceId, 'Failed to complete intention');
      res.status(status).set(headers).json(response);
    }
  }
);

/**
 * @openapi
 * /v2/intentions/{id}/archive:
 *   post:
 *     summary: Archive an intention
 *     description: Archive an intention to remove it from active list
 *     tags: [Intentions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Intention ID
 *     responses:
 *       200:
 *         description: Intention archived successfully
 */
router.post('/:id/archive',
  authMiddleware,
  async (req: any, res): Promise<void> => {
    const traceId = getExpressTraceId(req);
    const userId = req.userId;
    const { id } = req.params;
    const requestLogger = createRequestLogger(traceId, userId);

    try {
      requestLogger.info('Archiving intention', {
        operation: 'archiveIntention',
        intentionId: id
      });

      const archiveIntentionUseCase = container.resolve<ArchiveIntentionUseCase>('ArchiveIntentionUseCase');
      const result = await archiveIntentionUseCase.execute({
        intentionId: id,
        userId
      });

      if (Result.isError(result)) {
        const appError = createAppError(
          ErrorCode.VALIDATION_ERROR,
          result.error?.message || 'Failed to archive intention'
        );
        const { response, status, headers } = handleExpressError(appError, traceId);
        res.status(status).set(headers).json(response);
        return;
      }

      requestLogger.info('Intention archived successfully', {
        operation: 'archiveIntention',
        intentionId: id
      });

      const responseData = {
        data: result.value.toDTO(),
        message: 'Intention archived successfully'
      };

      const successResponse = createSuccessResponse(responseData, traceId);
      res.set('X-Trace-Id', traceId).json(successResponse);
    } catch (error) {
      requestLogger.error('Error archiving intention', {
        operation: 'archiveIntention',
        intentionId: id
      }, error as Error);
      const { response, status, headers } = handleExpressError(error, traceId, 'Failed to archive intention');
      res.status(status).set(headers).json(response);
    }
  }
);

/**
 * @openapi
 * /v2/intentions/{id}:
 *   delete:
 *     summary: Delete an intention
 *     description: Permanently delete an intention
 *     tags: [Intentions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Intention ID
 *     responses:
 *       200:
 *         description: Intention deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Intention deleted successfully"
 */
router.delete('/:id',
  authMiddleware,
  async (req: any, res): Promise<void> => {
    const traceId = getExpressTraceId(req);
    const userId = req.userId;
    const { id } = req.params;
    const requestLogger = createRequestLogger(traceId, userId);

    try {
      requestLogger.info('Deleting intention', {
        operation: 'deleteIntention',
        intentionId: id
      });

      const deleteIntentionUseCase = container.resolve<DeleteIntentionUseCase>('DeleteIntentionUseCase');
      const result = await deleteIntentionUseCase.execute({
        intentionId: id,
        userId
      });

      if (Result.isError(result)) {
        const appError = createAppError(
          ErrorCode.VALIDATION_ERROR,
          result.error?.message || 'Failed to delete intention'
        );
        const { response, status, headers } = handleExpressError(appError, traceId);
        res.status(status).set(headers).json(response);
        return;
      }

      requestLogger.info('Intention deleted successfully', {
        operation: 'deleteIntention',
        intentionId: id
      });

      const responseData = {
        message: 'Intention deleted successfully'
      };

      const successResponse = createSuccessResponse(responseData, traceId);
      res.set('X-Trace-Id', traceId).json(successResponse);
    } catch (error) {
      requestLogger.error('Error deleting intention', {
        operation: 'deleteIntention',
        intentionId: id
      }, error as Error);
      const { response, status, headers } = handleExpressError(error, traceId, 'Failed to delete intention');
      res.status(status).set(headers).json(response);
    }
  }
);

/**
 * @openapi
 * /v2/intentions/stats:
 *   get:
 *     summary: Get intention statistics
 *     description: Retrieve comprehensive statistics about user's intentions
 *     tags: [Intentions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: daysAheadForDueSoon
 *         in: query
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 30
 *           default: 7
 *         description: Number of days ahead to consider for "due soon" intentions
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/IntentionStats'
 */
router.get('/stats',
  authMiddleware,
  async (req: any, res): Promise<void> => {
    const traceId = getExpressTraceId(req);
    const userId = req.userId;
    const requestLogger = createRequestLogger(traceId, userId);

    try {
      const { daysAheadForDueSoon } = req.query;

      requestLogger.info('Retrieving intention statistics', {
        operation: 'getIntentionStats',
        daysAheadForDueSoon: daysAheadForDueSoon || 'default'
      });

      const getStatsUseCase = container.resolve<GetIntentionStatsUseCase>('GetIntentionStatsUseCase');
      const result = await getStatsUseCase.execute({
        userId,
        daysAheadForDueSoon: daysAheadForDueSoon ? parseInt(daysAheadForDueSoon) : undefined
      });

      if (Result.isError(result)) {
        const appError = createAppError(
          ErrorCode.VALIDATION_ERROR,
          result.error?.message || 'Failed to retrieve intention statistics'
        );
        const { response, status, headers } = handleExpressError(appError, traceId);
        res.status(status).set(headers).json(response);
        return;
      }

      requestLogger.info('Intention statistics retrieved successfully', {
        operation: 'getIntentionStats',
        statsRetrieved: true
      });

      const successResponse = createSuccessResponse(result.value, traceId);
      res.set('X-Trace-Id', traceId).json(successResponse);
    } catch (error) {
      requestLogger.error('Error getting intention stats', { operation: 'getIntentionStats' }, error as Error);
      const { response, status, headers } = handleExpressError(error, traceId, 'Failed to retrieve intention statistics');
      res.status(status).set(headers).json(response);
    }
  }
);

export default router;