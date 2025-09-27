import { Router } from 'express';
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
import { IPlanRepository } from '@/domain/repositories';
import { UserId } from '@/domain/value-objects/UserId';

const router = Router();

router.get('/active', authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId, req.userId);

  try {
    const userId = req.userId!;

    requestLogger.info('Fetching active plans (v2)');

    const planRepo = container.resolve<IPlanRepository>('IPlanRepository');
    const result = await planRepo.findByUserId(new UserId(userId));

    if ('error' in result && result.error) {
      requestLogger.error('Error fetching plans', { error: result.error.message });
      throw createAppError(ErrorCode.VALIDATION_ERROR, result.error.message);
    }

    if (result.ok) {
      const activePlans = result.value.filter(plan => plan.status === 'active');
      requestLogger.info('Active plans fetched successfully (v2)', {
        planCount: activePlans.length
      });
      const response = createSuccessResponse({
        plans: activePlans.map(p => p.toDTO())
      }, traceId);
      res.status(200).json(response);
      return;
    }

    requestLogger.error('Unknown error in plan retrieval');
    throw createAppError(ErrorCode.SERVER_ERROR, 'Unknown error occurred while fetching plans');
  } catch (error) {
    requestLogger.error('Error fetching active plans (v2):', { error: error instanceof Error ? error.message : String(error) }, error instanceof Error ? error : undefined);
    const { response, status, headers } = handleExpressError(error, traceId);
    res.status(status).set(headers).json(response);
  }
});

export default router;