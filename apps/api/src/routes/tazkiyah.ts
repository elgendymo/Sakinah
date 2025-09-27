import { Router } from 'express';
import { CreatePlanInputSchema } from '@sakinah/types';
import { authMiddleware, AuthRequest } from '@/infrastructure/auth/middleware';
import {
  ErrorCode,
  createAppError,
  handleExpressError,
  getExpressTraceId,
  createSuccessResponse,
  createRequestLogger
} from '@/shared/errors';
import { validateBody } from '@/infrastructure/middleware/validation';
import { suggestPlan } from '@/application/suggestPlan';
import { Result } from '@/shared/result';

const router = Router();

router.post('/suggest', authMiddleware, validateBody(CreatePlanInputSchema), async (req: AuthRequest, res): Promise<void> => {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId, req.userId);

  try {
    const { mode, input } = req.body;
    const userId = req.userId!;

    requestLogger.info('Suggesting tazkiyah plan', {
      mode,
      inputLength: input?.length || 0
    });

    const result = await suggestPlan({
      userId,
      mode,
      input,
    });

    if (Result.isError(result)) {
      requestLogger.error('Plan suggestion failed', { error: result.error });
      throw createAppError(ErrorCode.SERVER_ERROR, 'Failed to generate plan suggestion');
    }

    requestLogger.info('Plan suggestion completed successfully', { mode });
    const response = createSuccessResponse({ plan: result.value }, traceId);
    res.status(200).json(response);
  } catch (error) {
    requestLogger.error('Tazkiyah plan suggestion error', { error: error instanceof Error ? error.message : String(error) }, error instanceof Error ? error : undefined);
    const { response, status, headers } = handleExpressError(error, traceId);
    res.status(status).set(headers).json(response);
  }
});

export default router;