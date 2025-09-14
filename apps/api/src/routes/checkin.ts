import { Router } from 'express';
import { authMiddleware, AuthRequest } from '@/infrastructure/auth/middleware';
import { CreateCheckinInputSchema } from '@sakinah/types';
import { ValidationError } from '@/shared/errors';
import { logCheckin } from '@/application/logCheckin';

const router = Router();

router.post('/', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const parseResult = CreateCheckinInputSchema.safeParse(req.body);

    if (!parseResult.success) {
      throw new ValidationError(parseResult.error.errors[0].message);
    }

    const userId = req.userId!;
    const result = await logCheckin({
      userId,
      ...parseResult.data,
    });

    if (!result.ok) {
      throw (result as any).error;
    }

    res.json({ checkin: result.value });
  } catch (error) {
    next(error);
  }
});

export default router;