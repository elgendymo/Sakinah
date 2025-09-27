import { Router } from 'express';
import { authMiddleware, AuthRequest } from '@/infrastructure/auth/middleware';
import { CreateCheckinInputSchema } from '@sakinah/types';
import {
  ErrorCode,
  createAppError,
  handleExpressError,
  getExpressTraceId,
  createSuccessResponse,
  createRequestLogger
} from '@/shared/errors';
import { validateBody } from '@/infrastructure/middleware/validation';
import { logCheckin } from '@/application/logCheckin';
import { Result } from '@/shared/result';

const router = Router();

router.post('/', authMiddleware, validateBody(CreateCheckinInputSchema), async (req: AuthRequest, res): Promise<void> => {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId, req.userId);

  try {
    const userId = req.userId!;
    const checkinData = req.body;

    requestLogger.info('Creating checkin', {
      mood: checkinData.mood,
      gratefulnessLevel: checkinData.gratefulnessLevel
    });

    const result = await logCheckin({
      userId,
      ...checkinData,
    });

    if (Result.isError(result)) {
      requestLogger.error('Checkin creation failed', { error: result.error });
      throw createAppError(ErrorCode.SERVER_ERROR, 'Failed to create checkin');
    }

    requestLogger.info('Checkin created successfully', { checkinId: result.value.id });
    const response = createSuccessResponse({ checkin: result.value }, traceId);
    res.status(201).json(response);
  } catch (error) {
    requestLogger.error('Checkin creation error', { error: error instanceof Error ? error.message : String(error) }, error instanceof Error ? error : undefined);
    const { response, status, headers } = handleExpressError(error, traceId);
    res.status(status).set(headers).json(response);
  }
});

export default router;