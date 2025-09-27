import { Router } from 'express';
import { authMiddleware, AuthRequest } from '@/infrastructure/auth/middleware';
import { AIExplainInputSchema } from '@sakinah/types';
import {
  handleExpressError,
  getExpressTraceId,
  createSuccessResponse,
  createRequestLogger
} from '@/shared/errors';
import { validateBody } from '@/infrastructure/middleware/validation';
import { getAIProvider } from '@/infrastructure/ai/factory';

const router = Router();

router.post('/explain', authMiddleware, validateBody(AIExplainInputSchema), async (req: AuthRequest, res): Promise<void> => {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId, req.userId);

  try {
    const { struggle } = req.body;
      requestLogger.info('AI explain request', {
      strugggleLength: struggle?.length || 0
    });

    const ai = getAIProvider();
    const aiResponse = await ai.explain(struggle);

    requestLogger.info('AI explain completed successfully', { concept: struggle });
    const response = createSuccessResponse(aiResponse, traceId);
    res.status(200).json(response);
  } catch (error) {
    requestLogger.error('AI explain error', { error: error instanceof Error ? error.message : String(error) }, error instanceof Error ? error : undefined);
    const { response, status, headers } = handleExpressError(error, traceId);
    res.status(status).set(headers).json(response);
  }
});

export default router;