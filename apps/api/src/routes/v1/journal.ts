import { Router } from 'express';
import { z } from 'zod';
import { container } from 'tsyringe';
import { authMiddleware, AuthRequest } from '@/infrastructure/auth/middleware';
import { validateBody, validateQuery } from '@/infrastructure/middleware/validation';
import { ManageJournalUseCase } from '@/application/usecases/ManageJournalUseCase';
import {
  ErrorCode,
  createAppError,
  handleExpressError,
  getExpressTraceId,
  createSuccessResponse,
  createRequestLogger
} from '@/shared/errors';
import { Result } from '@/shared/result';

const router = Router();

// Validation schemas
const getJournalEntriesQuerySchema = z.object({
  search: z.string().optional(),
  tags: z.string().optional(),
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('20'),
  sortBy: z.enum(['createdAt', 'content']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
});

const createJournalEntryBodySchema = z.object({
  content: z.string().min(1, 'Content cannot be empty').max(5000, 'Content must be 5000 characters or less'),
  tags: z.array(z.string().max(50, 'Each tag must be 50 characters or less')).max(10, 'Maximum 10 tags allowed').optional()
});

const updateJournalEntryBodySchema = z.object({
  content: z.string().min(1, 'Content cannot be empty').max(5000, 'Content must be 5000 characters or less').optional(),
  tags: z.array(z.string().max(50, 'Each tag must be 50 characters or less')).max(10, 'Maximum 10 tags allowed').optional()
});

const searchJournalEntriesQuerySchema = z.object({
  q: z.string().min(1, 'Search query cannot be empty'),
  tags: z.string().optional(),
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('20')
});

/**
 * @api {get} /api/v1/journal Get user journal entries with search and filtering
 * @apiVersion 1.0.0
 * @apiName GetJournalEntries
 * @apiGroup Journal
 * @apiParam {String} [search] Search term to filter entries by content or tags
 * @apiParam {String} [tags] Comma-separated list of tags to filter by
 * @apiParam {Number} [page=1] Page number for pagination
 * @apiParam {Number} [limit=20] Number of entries per page (max 100)
 * @apiParam {String} [sortBy=createdAt] Sort field (createdAt, content)
 * @apiParam {String} [sortOrder=desc] Sort order (asc, desc)
 */
router.get('/', authMiddleware, validateQuery(getJournalEntriesQuerySchema), async (req: AuthRequest, res): Promise<void> => {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId, req.userId);

  try {
    const userId = req.userId!;
    const {
      search,
      tags,
      page,
      limit,
      sortBy,
      sortOrder
    } = req.query as z.infer<typeof getJournalEntriesQuerySchema>;

    // Validate pagination parameters
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const offset = (pageNum - 1) * limitNum;

    const useCase = container.resolve(ManageJournalUseCase);
    const result = await useCase.getUserEntries(userId, search);

    if (Result.isError(result)) {
      requestLogger.error('Error fetching journal entries v1', { error: result.error, traceId });
      const { response, status } = handleExpressError(
        createAppError(ErrorCode.SERVER_ERROR, 'Failed to fetch journal entries'),
        traceId
      );
      res.status(status).json(response);
      return;
    }

    let entries = result.value;

    // Apply tag filtering if specified
    if (tags) {
      const tagList = tags.split(',').map(tag => tag.trim().toLowerCase()).filter(Boolean);
      if (tagList.length > 0) {
        entries = entries.filter(entry =>
          tagList.some(tag => entry.tags.includes(tag))
        );
      }
    }

    // Apply sorting
    entries.sort((a, b) => {
      let aVal: any, bVal: any;

      switch (sortBy) {
        case 'content':
          aVal = a.content.toLowerCase();
          bVal = b.content.toLowerCase();
          break;
        case 'createdAt':
        default:
          aVal = a.createdAt.getTime();
          bVal = b.createdAt.getTime();
          break;
      }

      if (sortOrder === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });

    // Calculate pagination
    const total = entries.length;
    const totalPages = Math.ceil(total / limitNum);
    const paginatedEntries = entries.slice(offset, offset + limitNum);

    // Transform to DTOs
    const entriesDTO = paginatedEntries.map(entry => entry.toDTO());

    const responseData = {
      entries: entriesDTO,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1
      },
      filters: {
        search: search || null,
        tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : null,
        sortBy,
        sortOrder
      }
    };

    const successResponse = createSuccessResponse(responseData, traceId);
    res.json(successResponse);

  } catch (error) {
    requestLogger.error('Unexpected error in get journal entries v1', { error, traceId });
    const { response, status } = handleExpressError(error, traceId);
    res.status(status).json(response);
  }
});

/**
 * @api {get} /api/v1/journal/:id Get specific journal entry
 * @apiVersion 1.0.0
 * @apiName GetJournalEntry
 * @apiGroup Journal
 * @apiParam {String} id Journal entry ID
 */
router.get('/:id', authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId, req.userId);

  try {
    const userId = req.userId!;
    const { id } = req.params;

    const useCase = container.resolve(ManageJournalUseCase);
    const result = await useCase.getEntry(id);

    if (Result.isError(result)) {
      requestLogger.error('Error fetching journal entry v1', { error: result.error, traceId });
      const { response, status } = handleExpressError(
        createAppError(ErrorCode.SERVER_ERROR, 'Failed to fetch journal entry'),
        traceId
      );
      res.status(status).json(response);
      return;
    }

    if (!result.value) {
      const { response, status } = handleExpressError(
        createAppError(ErrorCode.NOT_FOUND, 'Journal entry not found'),
        traceId
      );
      res.status(status).json(response);
      return;
    }

    // Check ownership
    if (result.value.userId.toString() !== userId) {
      const { response, status } = handleExpressError(
        createAppError(ErrorCode.UNAUTHORIZED, 'Access denied to this journal entry'),
        traceId
      );
      res.status(status).json(response);
      return;
    }

    const responseData = {
      entry: result.value.toDTO()
    };

    const successResponse = createSuccessResponse(responseData, traceId);
    res.json(successResponse);

  } catch (error) {
    requestLogger.error('Unexpected error in get journal entry v1', { error, traceId });
    const { response, status } = handleExpressError(error, traceId);
    res.status(status).json(response);
  }
});

/**
 * @api {post} /api/v1/journal Create new journal entry
 * @apiVersion 1.0.0
 * @apiName CreateJournalEntry
 * @apiGroup Journal
 * @apiParam {String} content Entry content (required, max 5000 characters)
 * @apiParam {String[]} [tags] Array of tags (max 10 tags, each max 50 characters)
 */
router.post('/', authMiddleware, validateBody(createJournalEntryBodySchema), async (req: AuthRequest, res): Promise<void> => {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId, req.userId);

  try {
    const userId = req.userId!;
    const { content, tags } = req.body as z.infer<typeof createJournalEntryBodySchema>;

    const useCase = container.resolve(ManageJournalUseCase);
    const result = await useCase.createEntry({
      userId,
      content: content.trim(),
      tags: tags ? tags.map((tag: string) => tag.trim()).filter(Boolean) : undefined
    });

    if (Result.isError(result)) {
      requestLogger.error('Error creating journal entry v1', { error: result.error, traceId });

      if (result.error.message.includes('cannot be empty')) {
        const { response, status } = handleExpressError(
          createAppError(ErrorCode.VALIDATION_ERROR, result.error.message),
          traceId
        );
        res.status(status).json(response);
        return;
      }

      const { response, status } = handleExpressError(
        createAppError(ErrorCode.SERVER_ERROR, 'Failed to create journal entry'),
        traceId
      );
      res.status(status).json(response);
      return;
    }

    const responseData = {
      entry: result.value.toDTO()
    };

    const successResponse = createSuccessResponse(responseData, traceId);
    res.status(201).json(successResponse);

  } catch (error) {
    requestLogger.error('Unexpected error in create journal entry v1', { error, traceId });
    const { response, status } = handleExpressError(error, traceId);
    res.status(status).json(response);
  }
});

/**
 * @api {put} /api/v1/journal/:id Update journal entry
 * @apiVersion 1.0.0
 * @apiName UpdateJournalEntry
 * @apiGroup Journal
 * @apiParam {String} id Journal entry ID
 * @apiParam {String} [content] Updated content (max 5000 characters)
 * @apiParam {String[]} [tags] Updated tags array (max 10 tags, each max 50 characters)
 */
router.put('/:id', authMiddleware, validateBody(updateJournalEntryBodySchema), async (req: AuthRequest, res): Promise<void> => {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId, req.userId);

  try {
    const userId = req.userId!;
    const { id } = req.params;
    const { content, tags } = req.body as z.infer<typeof updateJournalEntryBodySchema>;

    const useCase = container.resolve(ManageJournalUseCase);
    const result = await useCase.updateEntry({
      id,
      userId,
      content: content ? content.trim() : undefined,
      tags: tags ? tags.map((tag: string) => tag.trim()).filter(Boolean) : undefined
    });

    if (Result.isError(result)) {
      requestLogger.error('Error updating journal entry v1', { error: result.error, traceId });

      if (result.error.message.includes('not found')) {
        const { response, status } = handleExpressError(
          createAppError(ErrorCode.NOT_FOUND, 'Journal entry not found'),
          traceId
        );
        res.status(status).json(response);
        return;
      }

      if (result.error.message.includes('Unauthorized')) {
        const { response, status } = handleExpressError(
          createAppError(ErrorCode.UNAUTHORIZED, 'Access denied to this journal entry'),
          traceId
        );
        res.status(status).json(response);
        return;
      }

      if (result.error.message.includes('cannot be empty')) {
        const { response, status } = handleExpressError(
          createAppError(ErrorCode.VALIDATION_ERROR, result.error.message),
          traceId
        );
        res.status(status).json(response);
        return;
      }

      const { response, status } = handleExpressError(
        createAppError(ErrorCode.SERVER_ERROR, 'Failed to update journal entry'),
        traceId
      );
      res.status(status).json(response);
      return;
    }

    const responseData = {
      entry: result.value.toDTO()
    };

    const successResponse = createSuccessResponse(responseData, traceId);
    res.json(successResponse);

  } catch (error) {
    requestLogger.error('Unexpected error in update journal entry v1', { error, traceId });
    const { response, status } = handleExpressError(error, traceId);
    res.status(status).json(response);
  }
});

/**
 * @api {delete} /api/v1/journal/:id Delete journal entry
 * @apiVersion 1.0.0
 * @apiName DeleteJournalEntry
 * @apiGroup Journal
 * @apiParam {String} id Journal entry ID
 */
router.delete('/:id', authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId, req.userId);

  try {
    const userId = req.userId!;
    const { id } = req.params;

    const useCase = container.resolve(ManageJournalUseCase);
    const result = await useCase.deleteEntry(id, userId);

    if (Result.isError(result)) {
      requestLogger.error('Error deleting journal entry v1', { error: result.error, traceId });

      if (result.error.message.includes('not found')) {
        const { response, status } = handleExpressError(
          createAppError(ErrorCode.NOT_FOUND, 'Journal entry not found'),
          traceId
        );
        res.status(status).json(response);
        return;
      }

      if (result.error.message.includes('Unauthorized')) {
        const { response, status } = handleExpressError(
          createAppError(ErrorCode.UNAUTHORIZED, 'Access denied to this journal entry'),
          traceId
        );
        res.status(status).json(response);
        return;
      }

      const { response, status } = handleExpressError(
        createAppError(ErrorCode.SERVER_ERROR, 'Failed to delete journal entry'),
        traceId
      );
      res.status(status).json(response);
      return;
    }

    res.status(204).send();

  } catch (error) {
    requestLogger.error('Unexpected error in delete journal entry v1', { error, traceId });
    const { response, status } = handleExpressError(error, traceId);
    res.status(status).json(response);
  }
});

/**
 * @api {get} /api/v1/journal/search Search journal entries
 * @apiVersion 1.0.0
 * @apiName SearchJournalEntries
 * @apiGroup Journal
 * @apiParam {String} q Search query
 * @apiParam {String} [tags] Comma-separated list of tags to filter by
 * @apiParam {Number} [page=1] Page number for pagination
 * @apiParam {Number} [limit=20] Number of entries per page (max 50)
 */
router.get('/search', authMiddleware, validateQuery(searchJournalEntriesQuerySchema), async (req: AuthRequest, res): Promise<void> => {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId, req.userId);

  try {
    const userId = req.userId!;
    const {
      q: query,
      tags,
      page,
      limit
    } = req.query as z.infer<typeof searchJournalEntriesQuerySchema>;

    const searchTerm = query.trim();

    // Validate pagination parameters
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 20));
    const offset = (pageNum - 1) * limitNum;

    const useCase = container.resolve(ManageJournalUseCase);
    const result = await useCase.getUserEntries(userId, searchTerm);

    if (Result.isError(result)) {
      requestLogger.error('Error searching journal entries v1', { error: result.error, traceId });
      const { response, status } = handleExpressError(
        createAppError(ErrorCode.SERVER_ERROR, 'Failed to search journal entries'),
        traceId
      );
      res.status(status).json(response);
      return;
    }

    let entries = result.value;

    // Apply tag filtering if specified
    if (tags) {
      const tagList = tags.split(',').map(tag => tag.trim().toLowerCase()).filter(Boolean);
      if (tagList.length > 0) {
        entries = entries.filter(entry =>
          tagList.some(tag => entry.tags.includes(tag))
        );
      }
    }

    // Sort by relevance (entries with query in content first, then by creation date)
    entries.sort((a, b) => {
      const aContentMatch = a.content.toLowerCase().includes(searchTerm.toLowerCase());
      const bContentMatch = b.content.toLowerCase().includes(searchTerm.toLowerCase());

      if (aContentMatch && !bContentMatch) return -1;
      if (!aContentMatch && bContentMatch) return 1;

      // If both match or both don't match, sort by creation date (newest first)
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    // Calculate pagination
    const total = entries.length;
    const totalPages = Math.ceil(total / limitNum);
    const paginatedEntries = entries.slice(offset, offset + limitNum);

    // Transform to DTOs
    const entriesDTO = paginatedEntries.map(entry => entry.toDTO());

    const responseData = {
      entries: entriesDTO,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1
      },
      search: {
        query: searchTerm,
        tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : null
      }
    };

    const successResponse = createSuccessResponse(responseData, traceId);
    res.json(successResponse);

  } catch (error) {
    requestLogger.error('Unexpected error in search journal entries v1', { error, traceId });
    const { response, status } = handleExpressError(error, traceId);
    res.status(status).json(response);
  }
});

export default router;