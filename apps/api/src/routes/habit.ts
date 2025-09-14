import { Router } from 'express';
import { authMiddleware, AuthRequest } from '@/infrastructure/auth/middleware';
import { ToggleHabitInputSchema } from '@sakinah/types';
import { ValidationError } from '@/shared/errors';
import { toggleHabit } from '@/application/toggleHabit';

const router = Router();

router.post('/:id/toggle', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const parseResult = ToggleHabitInputSchema.safeParse(req.body);

    if (!parseResult.success) {
      throw new ValidationError(parseResult.error.errors[0].message);
    }

    const userId = req.userId!;
    const habitId = req.params.id;
    const { completed } = parseResult.data;

    const result = await toggleHabit({
      userId,
      habitId,
      completed,
    });

    if (!result.ok) {
      throw (result as any).error;
    }

    res.json({ streakCount: result.value.streakCount });
  } catch (error) {
    next(error);
  }
});

export default router;