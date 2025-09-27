import { Router } from 'express';
import { CreatePlanInputSchema } from '@sakinah/types';
import { authMiddleware, AuthRequest } from '@/infrastructure/auth/middleware';
import { ValidationError } from '@/shared/errors';
import { suggestPlan } from '@/application/suggestPlan';
import { Result } from '@/shared/result';

const router = Router();

router.post('/suggest', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const parseResult = CreatePlanInputSchema.safeParse(req.body);

    if (!parseResult.success) {
      throw new ValidationError(parseResult.error.errors[0].message);
    }

    const { mode, input } = parseResult.data;
    const userId = req.userId!;

    const result = await suggestPlan({
      userId,
      mode,
      input,
    });

    if (Result.isError(result)) {
      throw (result as any).error;
    }

    res.json({ plan: result.value });
  } catch (error) {
    next(error);
  }
});

export default router;