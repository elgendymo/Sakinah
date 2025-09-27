import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '@/infrastructure/auth/middleware';
import {
  handleExpressError,
  getExpressTraceId,
  createSuccessResponse,
  createRequestLogger
} from '@/shared/errors';
import { validateBody, validateParams, validateQuery } from '@/infrastructure/middleware/validation';
import { JournalRepository } from '@/infrastructure/repos/JournalRepository';

const journalQuerySchema = z.object({
  search: z.string().optional(),
  tags: z.union([z.string(), z.array(z.string())]).optional(),
  page: z.string().transform(val => parseInt(val, 10) || 1).optional(),
  limit: z.string().transform(val => parseInt(val, 10) || 20).optional(),
  sortBy: z.enum(['createdAt', 'content']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional()
});

const createJournalSchema = z.object({
  content: z.string().min(1, 'Content is required'),
  tags: z.array(z.string()).optional()
});

const updateJournalSchema = z.object({
  content: z.string().min(1, 'Content is required').optional(),
  tags: z.array(z.string()).optional()
});

const journalParamsSchema = z.object({
  id: z.string().min(1, 'Journal ID is required')
});

const router = Router();
const journalRepo = new JournalRepository();

router.get('/', authMiddleware, validateQuery(journalQuerySchema), async (req: AuthRequest, res): Promise<void> => {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId, req.userId);

  try {
    const userId = req.userId!;
    const filters = req.query;

    // Handle tags parsing for string input
    if (filters.tags && typeof filters.tags === 'string') {
      filters.tags = filters.tags.split(',').map(t => t.trim()).filter(Boolean);
    }

    requestLogger.info('Fetching journal entries', {
      filters: {
        search: filters.search,
        tagsCount: filters.tags ? (Array.isArray(filters.tags) ? filters.tags.length : 1) : 0,
        page: filters.page,
        limit: filters.limit
      }
    });

    const result = await journalRepo.getUserEntries(userId, filters);

    requestLogger.info('Journal entries fetched successfully', {
      entriesCount: result.entries?.length || 0,
      totalCount: result.pagination?.total || 0
    });
    const response = createSuccessResponse(result, traceId);
    res.status(200).json(response);
  } catch (error) {
    requestLogger.error('Error fetching journal entries:', { error: error instanceof Error ? error.message : String(error) }, error instanceof Error ? error : undefined);
    const { response, status, headers } = handleExpressError(error, traceId);
    res.status(status).set(headers).json(response);
  }
});

router.post('/', authMiddleware, validateBody(createJournalSchema), async (req: AuthRequest, res): Promise<void> => {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId, req.userId);

  try {
    const userId = req.userId!;
    const { content, tags } = req.body;

    requestLogger.info('Creating journal entry', {
      contentLength: content.length,
      tagsCount: tags?.length || 0
    });

    const entry = await journalRepo.createEntry({
      userId,
      content,
      tags,
    });

    requestLogger.info('Journal entry created successfully', { entryId: entry.id });
    const response = createSuccessResponse({ entry }, traceId);
    res.status(201).json(response);
  } catch (error) {
    requestLogger.error('Error creating journal entry:', { error: error instanceof Error ? error.message : String(error) }, error instanceof Error ? error : undefined);
    const { response, status, headers } = handleExpressError(error, traceId);
    res.status(status).set(headers).json(response);
  }
});

router.put('/:id', authMiddleware, validateParams(journalParamsSchema), validateBody(updateJournalSchema), async (req: AuthRequest, res): Promise<void> => {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId, req.userId);

  try {
    const userId = req.userId!;
    const { id } = req.params;
    const { content, tags } = req.body;

    requestLogger.info('Updating journal entry', {
      entryId: id,
      contentLength: content?.length,
      tagsCount: tags?.length || 0
    });

    const entry = await journalRepo.updateEntry(id, userId, {
      content,
      tags,
    });

    requestLogger.info('Journal entry updated successfully', { entryId: id });
    const response = createSuccessResponse({ entry }, traceId);
    res.status(200).json(response);
  } catch (error) {
    requestLogger.error('Error updating journal entry:', { error: error instanceof Error ? error.message : String(error) }, error instanceof Error ? error : undefined);
    const { response, status, headers } = handleExpressError(error, traceId);
    res.status(status).set(headers).json(response);
  }
});

router.delete('/:id', authMiddleware, validateParams(journalParamsSchema), async (req: AuthRequest, res): Promise<void> => {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId, req.userId);

  try {
    const userId = req.userId!;
    const { id } = req.params;

    requestLogger.info('Deleting journal entry', { entryId: id });

    await journalRepo.deleteEntry(id, userId);

    requestLogger.info('Journal entry deleted successfully', { entryId: id });
    const response = createSuccessResponse({ message: 'Journal entry deleted successfully' }, traceId);
    res.status(200).json(response);
  } catch (error) {
    requestLogger.error('Error deleting journal entry:', { error: error instanceof Error ? error.message : String(error) }, error instanceof Error ? error : undefined);
    const { response, status, headers } = handleExpressError(error, traceId);
    res.status(status).set(headers).json(response);
  }
});

export default router;