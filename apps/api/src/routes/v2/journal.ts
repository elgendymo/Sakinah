import express, { Response } from 'express';
import { container } from 'tsyringe';
import { authMiddleware, AuthRequest } from '@/infrastructure/auth/middleware';
import { validateQuery, validateBody } from '@/infrastructure/middleware/validation';
import { ManageJournalUseCase } from '@/application/usecases/ManageJournalUseCase';
import { z } from 'zod';
import { logger } from '@/shared/logger';
import { Result } from '@/shared/result';

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
  try {
    const correlationId = req.correlationId || 'unknown';
    const userId = req.userId!;
    const { search, tags, page, limit, sortBy, sortOrder } = req.query as z.infer<typeof getJournalQuerySchema>;

    logger.info(`[${correlationId}] Getting journal entries for user ${userId}`, {
      search, tags, page, limit, sortBy, sortOrder
    });

    // For now, we'll use the existing use case and implement client-side pagination
    // In a future enhancement, we'd extend the repository to support server-side pagination
    const useCase = container.resolve(ManageJournalUseCase);
    const result = await useCase.getUserEntries(userId, search);

    if ('error' in result && result.error) {
      logger.error(`[${correlationId}] Error getting journal entries: ${result.error.message}`);
      return res.status(400).json({ error: result.error.message });
    }

    if (Result.isError(result)) {
      logger.error(`[${correlationId}] Unknown error getting journal entries`);
      return res.status(500).json({ error: 'Unknown error' });
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

    logger.info(`[${correlationId}] Successfully retrieved ${paginatedEntries.length} entries (page ${page}/${totalPages})`);

    return res.json({
      entries: paginatedEntries,
      pagination
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`[${req.correlationId || 'unknown'}] Error in GET /v2/journal: ${errorMessage}`);
    return res.status(500).json({ error: 'Internal server error' });
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
  try {
    const correlationId = req.correlationId || 'unknown';
    const userId = req.userId!;
    const { content, tags } = req.body as z.infer<typeof createJournalSchema>;

    logger.info(`[${correlationId}] Creating journal entry for user ${userId}`);

    const useCase = container.resolve(ManageJournalUseCase);
    const result = await useCase.createEntry({
      userId,
      content,
      tags
    });

    if ('error' in result && result.error) {
      logger.error(`[${correlationId}] Error creating journal entry: ${result.error.message}`);
      return res.status(400).json({ error: result.error.message });
    }

    if (Result.isError(result)) {
      logger.error(`[${correlationId}] Unknown error creating journal entry`);
      return res.status(500).json({ error: 'Unknown error' });
    }

    logger.info(`[${correlationId}] Successfully created journal entry ${result.value.id}`);

    return res.status(201).json({
      entry: result.value.toDTO()
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`[${req.correlationId || 'unknown'}] Error in POST /v2/journal: ${errorMessage}`);
    return res.status(500).json({ error: 'Internal server error' });
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
  try {
    const correlationId = req.correlationId || 'unknown';
    const userId = req.userId!;
    const { id } = req.params;

    logger.info(`[${correlationId}] Getting journal entry ${id} for user ${userId}`);

    const useCase = container.resolve(ManageJournalUseCase);
    const result = await useCase.getEntry(id);

    if ('error' in result && result.error) {
      logger.error(`[${correlationId}] Error getting journal entry: ${result.error.message}`);
      return res.status(400).json({ error: result.error.message });
    }

    if (Result.isError(result)) {
      logger.error(`[${correlationId}] Unknown error getting journal entry`);
      return res.status(500).json({ error: 'Unknown error' });
    }

    if (!result.value) {
      logger.warn(`[${correlationId}] Journal entry ${id} not found`);
      return res.status(404).json({ error: 'Journal entry not found' });
    }

    // Check if entry belongs to the user
    if (result.value.userId.toString() !== userId) {
      logger.warn(`[${correlationId}] User ${userId} tried to access journal entry ${id} owned by another user`);
      return res.status(404).json({ error: 'Journal entry not found' });
    }

    logger.info(`[${correlationId}] Successfully retrieved journal entry ${id}`);

    return res.json({
      entry: result.value.toDTO()
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`[${req.correlationId || 'unknown'}] Error in GET /v2/journal/:id: ${errorMessage}`);
    return res.status(500).json({ error: 'Internal server error' });
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
  try {
    const correlationId = req.correlationId || 'unknown';
    const userId = req.userId!;
    const { id } = req.params;
    const { content, tags } = req.body as z.infer<typeof updateJournalSchema>;

    logger.info(`[${correlationId}] Updating journal entry ${id} for user ${userId}`);

    const useCase = container.resolve(ManageJournalUseCase);
    const result = await useCase.updateEntry({
      id,
      userId,
      content,
      tags
    });

    if ('error' in result && result.error) {
      logger.error(`[${correlationId}] Error updating journal entry: ${result.error.message}`);
      const statusCode = result.error.message.includes('not found') ? 404 :
                        result.error.message.includes('Unauthorized') ? 403 : 400;
      return res.status(statusCode).json({ error: result.error.message });
    }

    if (Result.isError(result)) {
      logger.error(`[${correlationId}] Unknown error updating journal entry`);
      return res.status(500).json({ error: 'Unknown error' });
    }

    logger.info(`[${correlationId}] Successfully updated journal entry ${id}`);

    return res.json({
      entry: result.value.toDTO()
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`[${req.correlationId || 'unknown'}] Error in PUT /v2/journal/:id: ${errorMessage}`);
    return res.status(500).json({ error: 'Internal server error' });
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
  try {
    const correlationId = req.correlationId || 'unknown';
    const userId = req.userId!;
    const { id } = req.params;

    logger.info(`[${correlationId}] Deleting journal entry ${id} for user ${userId}`);

    const useCase = container.resolve(ManageJournalUseCase);
    const result = await useCase.deleteEntry(id, userId);

    if ('error' in result && result.error) {
      logger.error(`[${correlationId}] Error deleting journal entry: ${result.error.message}`);
      const statusCode = result.error.message.includes('not found') ? 404 :
                        result.error.message.includes('Unauthorized') ? 403 : 400;
      return res.status(statusCode).json({ error: result.error.message });
    }

    if (Result.isError(result)) {
      logger.error(`[${correlationId}] Unknown error deleting journal entry`);
      return res.status(500).json({ error: 'Unknown error' });
    }

    logger.info(`[${correlationId}] Successfully deleted journal entry ${id}`);

    return res.status(204).send();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`[${req.correlationId || 'unknown'}] Error in DELETE /v2/journal/:id: ${errorMessage}`);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;