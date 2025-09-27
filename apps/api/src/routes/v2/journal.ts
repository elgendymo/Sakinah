import express, { Response } from 'express';
import { container } from 'tsyringe';
import { authMiddleware, AuthRequest } from '@/infrastructure/auth/middleware';
import { validateQuery, validateBody } from '@/infrastructure/middleware/validation';
import { ManageJournalUseCase } from '@/application/usecases/ManageJournalUseCase';
import { z } from 'zod';
import { Result } from '@/shared/result';
import { ErrorCode, createAppError, handleExpressError, getExpressTraceId, createSuccessResponse, createRequestLogger } from '@/shared/errors';

// Extend Request interface to include correlationId (added by middleware)
interface ExtendedAuthRequest extends AuthRequest {
  correlationId?: string;
}

const router = express.Router();

// Validation schemas
const getJournalQuerySchema = z.object({
  search: z.string().optional(),
  tags: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'content']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

const createJournalSchema = z.object({
  content: z.string().min(1, 'Content is required'),
  tags: z.array(z.string()).optional()
});

const updateJournalSchema = z.object({
  content: z.string().min(1).optional(),
  tags: z.array(z.string()).optional()
});

/**
 * @openapi
 * /v2/journal:
 *   get:
 *     summary: Get journal entries with enhanced filtering and pagination
 *     description: Retrieve user's journal entries with support for search, tag filtering, pagination, and sorting.
 *     tags: [Journal]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: search
 *         in: query
 *         description: Search term to filter entries by content
 *         schema:
 *           type: string
 *           example: "grateful today"
 *       - name: tags
 *         in: query
 *         description: Comma-separated list of tags to filter entries
 *         schema:
 *           type: string
 *           example: "gratitude,reflection"
 *       - name: page
 *         in: query
 *         description: Page number for pagination (starts from 1)
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - name: limit
 *         in: query
 *         description: Maximum number of entries per page (1-100)
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *       - name: sortBy
 *         in: query
 *         description: Field to sort entries by
 *         schema:
 *           type: string
 *           enum: [createdAt, content]
 *           default: createdAt
 *       - name: sortOrder
 *         in: query
 *         description: Sort order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: Journal entries retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 entries:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       content:
 *                         type: string
 *                       tags:
 *                         type: array
 *                         items:
 *                           type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     hasNextPage:
 *                       type: boolean
 *                     hasPrevPage:
 *                       type: boolean
 *       400:
 *         description: Invalid query parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/', authMiddleware, validateQuery(getJournalQuerySchema), async (req: ExtendedAuthRequest, res: Response) => {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId, req.userId);

  try {
    const userId = req.userId!;
    const { search, tags, page, limit, sortBy, sortOrder } = req.query as z.infer<typeof getJournalQuerySchema>;

    requestLogger.info('Getting journal entries', {
      search, tags, page, limit, sortBy, sortOrder
    });

    // For now, we'll use the existing use case and implement client-side pagination
    // In a future enhancement, we'd extend the repository to support server-side pagination
    const useCase = container.resolve(ManageJournalUseCase);
    const result = await useCase.getUserEntries(userId, search);

    if ('error' in result && result.error) {
      requestLogger.error('Error getting journal entries', { error: result.error.message });
      const { response, status, headers } = handleExpressError(
        createAppError(ErrorCode.VALIDATION_ERROR, result.error.message),
        traceId
      );
      res.status(status).set(headers).json(response);
      return;
    }

    if (Result.isError(result)) {
      requestLogger.error('Unknown error getting journal entries');
      const { response, status, headers } = handleExpressError(
        createAppError(ErrorCode.SERVER_ERROR, 'Failed to get journal entries'),
        traceId
      );
      res.status(status).set(headers).json(response);
      return;
    }

    let entries = result.value.map(e => e.toDTO());

    // Apply tag filtering if specified
    if (tags) {
      const tagList = tags.split(',').map(tag => tag.trim().toLowerCase());
      entries = entries.filter(entry =>
        entry.tags && entry.tags.some(tag =>
          tagList.includes(tag.toLowerCase())
        )
      );
    }

    // Apply sorting
    entries.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'createdAt') {
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortBy === 'content') {
        comparison = a.content.localeCompare(b.content);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    // Apply pagination
    const total = entries.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paginatedEntries = entries.slice(offset, offset + limit);

    const pagination = {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    };

    requestLogger.info('Journal entries retrieved successfully', {
      count: paginatedEntries.length,
      page,
      totalPages,
      total
    });

    const successResponse = createSuccessResponse({
      entries: paginatedEntries,
      pagination
    }, traceId);
    res.json(successResponse);
  } catch (error) {
    requestLogger.error('Error getting journal entries', {
      error: error instanceof Error ? error.message : String(error)
    }, error instanceof Error ? error : undefined);
    const { response, status, headers } = handleExpressError(
      createAppError(ErrorCode.SERVER_ERROR, 'Failed to get journal entries'),
      traceId
    );
    res.status(status).set(headers).json(response);
  }
});

/**
 * @openapi
 * /v2/journal:
 *   post:
 *     summary: Create a new journal entry
 *     description: Create a new journal entry with content and optional tags.
 *     tags: [Journal]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 description: The journal entry content
 *                 example: "Today I felt grateful for the blessings in my life..."
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Optional tags for the journal entry
 *                 example: ["gratitude", "reflection"]
 *             required:
 *               - content
 *     responses:
 *       201:
 *         description: Journal entry created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 entry:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     content:
 *                       type: string
 *                     tags:
 *                       type: array
 *                       items:
 *                         type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Invalid request body
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/', authMiddleware, validateBody(createJournalSchema), async (req: ExtendedAuthRequest, res: Response) => {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId, req.userId);

  try {
    const userId = req.userId!;
    const { content, tags } = req.body as z.infer<typeof createJournalSchema>;

    requestLogger.info('Creating journal entry', { hasContent: !!content, tagsCount: tags?.length || 0 });

    const useCase = container.resolve(ManageJournalUseCase);
    const result = await useCase.createEntry({
      userId,
      content,
      tags
    });

    if ('error' in result && result.error) {
      requestLogger.error('Error creating journal entry', { error: result.error.message });
      const { response, status, headers } = handleExpressError(
        createAppError(ErrorCode.VALIDATION_ERROR, result.error.message),
        traceId
      );
      res.status(status).set(headers).json(response);
      return;
    }

    if (Result.isError(result)) {
      requestLogger.error('Unknown error creating journal entry');
      const { response, status, headers } = handleExpressError(
        createAppError(ErrorCode.SERVER_ERROR, 'Failed to create journal entry'),
        traceId
      );
      res.status(status).set(headers).json(response);
      return;
    }

    requestLogger.info('Journal entry created successfully', { entryId: result.value.id });

    const successResponse = createSuccessResponse({
      entry: result.value.toDTO()
    }, traceId);
    res.status(201).json(successResponse);
  } catch (error) {
    requestLogger.error('Error creating journal entry', {
      error: error instanceof Error ? error.message : String(error)
    }, error instanceof Error ? error : undefined);
    const { response, status, headers } = handleExpressError(
      createAppError(ErrorCode.SERVER_ERROR, 'Failed to create journal entry'),
      traceId
    );
    res.status(status).set(headers).json(response);
  }
});

/**
 * @openapi
 * /v2/journal/{id}:
 *   get:
 *     summary: Get a specific journal entry
 *     description: Retrieve a specific journal entry by ID.
 *     tags: [Journal]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Journal entry ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Journal entry retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 entry:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     content:
 *                       type: string
 *                     tags:
 *                       type: array
 *                       items:
 *                         type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       404:
 *         description: Journal entry not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/:id', authMiddleware, async (req: ExtendedAuthRequest, res: Response) => {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId, req.userId);

  try {
    const userId = req.userId!;
    const { id } = req.params;

    requestLogger.info('Getting journal entry', { entryId: id });

    const useCase = container.resolve(ManageJournalUseCase);
    const result = await useCase.getEntry(id);

    if ('error' in result && result.error) {
      requestLogger.error('Error getting journal entry', { error: result.error.message, entryId: id });
      const { response, status, headers } = handleExpressError(
        createAppError(ErrorCode.VALIDATION_ERROR, result.error.message),
        traceId
      );
      res.status(status).set(headers).json(response);
      return;
    }

    if (Result.isError(result)) {
      requestLogger.error('Unknown error getting journal entry', { entryId: id });
      const { response, status, headers } = handleExpressError(
        createAppError(ErrorCode.SERVER_ERROR, 'Failed to get journal entry'),
        traceId
      );
      res.status(status).set(headers).json(response);
      return;
    }

    if (!result.value) {
      requestLogger.warn('Journal entry not found', { entryId: id });
      const { response, status, headers } = handleExpressError(
        createAppError(ErrorCode.JOURNAL_ENTRY_NOT_FOUND, 'Journal entry not found'),
        traceId
      );
      res.status(status).set(headers).json(response);
      return;
    }

    // Check if entry belongs to the user
    if (result.value.userId.toString() !== userId) {
      requestLogger.warn('User tried to access journal entry owned by another user', { entryId: id });
      const { response, status, headers } = handleExpressError(
        createAppError(ErrorCode.JOURNAL_ENTRY_NOT_FOUND, 'Journal entry not found'),
        traceId
      );
      res.status(status).set(headers).json(response);
      return;
    }

    requestLogger.info('Journal entry retrieved successfully', { entryId: id });

    const successResponse = createSuccessResponse({
      entry: result.value.toDTO()
    }, traceId);
    res.json(successResponse);
  } catch (error) {
    requestLogger.error('Error getting journal entry', {
      error: error instanceof Error ? error.message : String(error),
      entryId: req.params.id
    }, error instanceof Error ? error : undefined);
    const { response, status, headers } = handleExpressError(
      createAppError(ErrorCode.SERVER_ERROR, 'Failed to get journal entry'),
      traceId
    );
    res.status(status).set(headers).json(response);
  }
});

/**
 * @openapi
 * /v2/journal/{id}:
 *   put:
 *     summary: Update a journal entry
 *     description: Update the content and/or tags of an existing journal entry.
 *     tags: [Journal]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Journal entry ID
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 description: Updated journal entry content
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Updated tags for the journal entry
 *     responses:
 *       200:
 *         description: Journal entry updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 entry:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     content:
 *                       type: string
 *                     tags:
 *                       type: array
 *                       items:
 *                         type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Invalid request body
 *       404:
 *         description: Journal entry not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.put('/:id', authMiddleware, validateBody(updateJournalSchema), async (req: ExtendedAuthRequest, res: Response) => {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId, req.userId);

  try {
    const userId = req.userId!;
    const { id } = req.params;
    const { content, tags } = req.body as z.infer<typeof updateJournalSchema>;

    requestLogger.info('Updating journal entry', { entryId: id, hasContent: !!content, tagsCount: tags?.length || 0 });

    const useCase = container.resolve(ManageJournalUseCase);
    const result = await useCase.updateEntry({
      id,
      userId,
      content,
      tags
    });

    if ('error' in result && result.error) {
      requestLogger.error('Error updating journal entry', { error: result.error.message, entryId: id });
      const errorCode = result.error.message.includes('not found') ? ErrorCode.JOURNAL_ENTRY_NOT_FOUND :
                        result.error.message.includes('Unauthorized') ? ErrorCode.UNAUTHORIZED : ErrorCode.VALIDATION_ERROR;
      const { response, status, headers } = handleExpressError(
        createAppError(errorCode, result.error.message),
        traceId
      );
      res.status(status).set(headers).json(response);
      return;
    }

    if (Result.isError(result)) {
      requestLogger.error('Unknown error updating journal entry', { entryId: id });
      const { response, status, headers } = handleExpressError(
        createAppError(ErrorCode.SERVER_ERROR, 'Failed to update journal entry'),
        traceId
      );
      res.status(status).set(headers).json(response);
      return;
    }

    requestLogger.info('Journal entry updated successfully', { entryId: id });

    const successResponse = createSuccessResponse({
      entry: result.value.toDTO()
    }, traceId);
    res.json(successResponse);
  } catch (error) {
    requestLogger.error('Error updating journal entry', {
      error: error instanceof Error ? error.message : String(error),
      entryId: req.params.id
    }, error instanceof Error ? error : undefined);
    const { response, status, headers } = handleExpressError(
      createAppError(ErrorCode.SERVER_ERROR, 'Failed to update journal entry'),
      traceId
    );
    res.status(status).set(headers).json(response);
  }
});

/**
 * @openapi
 * /v2/journal/{id}:
 *   delete:
 *     summary: Delete a journal entry
 *     description: Delete an existing journal entry.
 *     tags: [Journal]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Journal entry ID
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Journal entry deleted successfully
 *       404:
 *         description: Journal entry not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', authMiddleware, async (req: ExtendedAuthRequest, res: Response) => {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId, req.userId);

  try {
    const userId = req.userId!;
    const { id } = req.params;

    requestLogger.info('Deleting journal entry', { entryId: id });

    const useCase = container.resolve(ManageJournalUseCase);
    const result = await useCase.deleteEntry(id, userId);

    if ('error' in result && result.error) {
      requestLogger.error('Error deleting journal entry', { error: result.error.message, entryId: id });
      const errorCode = result.error.message.includes('not found') ? ErrorCode.JOURNAL_ENTRY_NOT_FOUND :
                        result.error.message.includes('Unauthorized') ? ErrorCode.UNAUTHORIZED : ErrorCode.VALIDATION_ERROR;
      const { response, status, headers } = handleExpressError(
        createAppError(errorCode, result.error.message),
        traceId
      );
      res.status(status).set(headers).json(response);
      return;
    }

    if (Result.isError(result)) {
      requestLogger.error('Unknown error deleting journal entry', { entryId: id });
      const { response, status, headers } = handleExpressError(
        createAppError(ErrorCode.SERVER_ERROR, 'Failed to delete journal entry'),
        traceId
      );
      res.status(status).set(headers).json(response);
      return;
    }

    requestLogger.info('Journal entry deleted successfully', { entryId: id });

    res.status(204).send();
  } catch (error) {
    requestLogger.error('Error deleting journal entry', {
      error: error instanceof Error ? error.message : String(error),
      entryId: req.params.id
    }, error instanceof Error ? error : undefined);
    const { response, status, headers } = handleExpressError(
      createAppError(ErrorCode.SERVER_ERROR, 'Failed to delete journal entry'),
      traceId
    );
    res.status(status).set(headers).json(response);
  }
});

export default router;