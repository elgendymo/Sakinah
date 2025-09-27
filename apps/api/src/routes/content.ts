import { Router } from 'express';
import { z } from 'zod';
import {
  handleExpressError,
  getExpressTraceId,
  createSuccessResponse,
  createRequestLogger
} from '@/shared/errors';
import { validateQuery } from '@/infrastructure/middleware/validation';
import { ContentRepository } from '@/infrastructure/repos/ContentRepository';

const contentQuerySchema = z.object({
  tags: z.union([z.string(), z.array(z.string())]).optional(),
  type: z.enum(['ayah', 'hadith', 'dua', 'note']).optional()
});

const router = Router();
const contentRepo = new ContentRepository();

router.get('/', validateQuery(contentQuerySchema), async (req, res): Promise<void> => {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId);

  try {
    const { tags, type } = req.query;

    const tagArray = typeof tags === 'string' ? tags.split(',') : Array.isArray(tags) ? tags as string[] : undefined;

    requestLogger.info('Fetching content', {
      tags: tagArray,
      type,
      tagsCount: tagArray?.length || 0
    });

    const items = await contentRepo.getContent({
      tags: tagArray,
      type: type as 'ayah' | 'hadith' | 'dua' | 'note' | undefined,
    });

    requestLogger.info('Content fetched successfully', {
      itemsCount: items.length,
      type
    });
    const response = createSuccessResponse({ items }, traceId);
    res.status(200).json(response);
  } catch (error) {
    requestLogger.error('Error fetching content:', { error: error instanceof Error ? error.message : String(error) }, error instanceof Error ? error : undefined);
    const { response, status, headers } = handleExpressError(error, traceId);
    res.status(status).set(headers).json(response);
  }
});

export default router;