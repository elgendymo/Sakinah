import { Router } from 'express';
import { z } from 'zod';
import { container } from 'tsyringe';
import { authMiddleware, AuthRequest } from '@/infrastructure/auth/middleware';
import {
  ErrorCode,
  createAppError,
  handleExpressError,
  getExpressTraceId,
  createSuccessResponse,
  createRequestLogger
} from '@/shared/errors';
import { validateBody, validateParams, validateQuery } from '@/infrastructure/middleware/validation';
import { ManageJournalUseCase } from '@/application/usecases/ManageJournalUseCase';

const journalQuerySchema = z.object({
  search: z.string().optional()
});

const createJournalSchema = z.object({
  content: z.string().min(1, 'Content is required'),
  tags: z.array(z.string()).optional()
});

const journalParamsSchema = z.object({
  id: z.string().min(1, 'Journal ID is required')
});

const router = Router();

router.get('/', authMiddleware, validateQuery(journalQuerySchema), async (req: AuthRequest, res): Promise<void> => {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId, req.userId);

  try {
    const userId = req.userId!;
    const { search } = req.query;

    requestLogger.info('Fetching journal entries (v2)', {
      hasSearch: !!search
    });

    const useCase = container.resolve(ManageJournalUseCase);
    const result = await useCase.getUserEntries(userId, search as string);

    if ('error' in result && result.error) {
      requestLogger.error('Error fetching journal entries', { error: result.error.message });
      throw createAppError(ErrorCode.VALIDATION_ERROR, result.error.message);
    }

    if (result.ok) {
      requestLogger.info('Journal entries fetched successfully (v2)', {
        entriesCount: result.value.length
      });
      const response = createSuccessResponse({
        entries: result.value.map(e => e.toDTO())
      }, traceId);
      res.status(200).json(response);
      return;
    }

    requestLogger.error('Unknown error in journal retrieval');
    throw createAppError(ErrorCode.SERVER_ERROR, 'Unknown error occurred while fetching journal entries');
  } catch (error) {
    requestLogger.error('Error fetching journal entries (v2):', { error: error instanceof Error ? error.message : String(error) }, error instanceof Error ? error : undefined);
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

    requestLogger.info('Creating journal entry (v2)', {
      contentLength: content.length,
      tagsCount: tags?.length || 0
    });

    const useCase = container.resolve(ManageJournalUseCase);
    const result = await useCase.createEntry({
      userId,
      content,
      tags
    });

    if ('error' in result && result.error) {
      requestLogger.error('Error creating journal entry', { error: result.error.message });
      throw createAppError(ErrorCode.VALIDATION_ERROR, result.error.message);
    }

    if (result.ok) {
      requestLogger.info('Journal entry created successfully (v2)', { entryId: result.value.id });
      const response = createSuccessResponse({
        entry: result.value.toDTO()
      }, traceId);
      res.status(201).json(response);
      return;
    }

    requestLogger.error('Unknown error in journal creation');
    throw createAppError(ErrorCode.SERVER_ERROR, 'Unknown error occurred while creating journal entry');
  } catch (error) {
    requestLogger.error('Error creating journal entry (v2):', { error: error instanceof Error ? error.message : String(error) }, error instanceof Error ? error : undefined);
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

    requestLogger.info('Deleting journal entry (v2)', { entryId: id });

    const useCase = container.resolve(ManageJournalUseCase);
    const result = await useCase.deleteEntry(id, userId);

    if ('error' in result && result.error) {
      requestLogger.error('Error deleting journal entry', { error: result.error.message });
      throw createAppError(ErrorCode.VALIDATION_ERROR, result.error.message);
    }

    if (result.ok) {
      requestLogger.info('Journal entry deleted successfully (v2)', { entryId: id });
      const response = createSuccessResponse({
        message: 'Journal entry deleted successfully'
      }, traceId);
      res.status(200).json(response);
      return;
    }

    requestLogger.error('Unknown error in journal deletion');
    throw createAppError(ErrorCode.SERVER_ERROR, 'Unknown error occurred while deleting journal entry');
  } catch (error) {
    requestLogger.error('Error deleting journal entry (v2):', { error: error instanceof Error ? error.message : String(error) }, error instanceof Error ? error : undefined);
    const { response, status, headers } = handleExpressError(error, traceId);
    res.status(status).set(headers).json(response);
  }
});

export default router;