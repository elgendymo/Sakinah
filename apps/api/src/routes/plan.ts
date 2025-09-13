import { Router } from 'express';
import { authMiddleware, AuthRequest } from '@/infrastructure/auth/middleware';
import { PlanRepository } from '@/infrastructure/repos/PlanRepository';

const router = Router();
const planRepo = new PlanRepository();

router.get('/active', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const plans = await planRepo.getActivePlans(userId);
    res.json({ plans });
  } catch (error) {
    next(error);
  }
});

router.post('/', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const plan = await planRepo.createPlan({
      ...req.body,
      userId,
    });
    res.json({ plan });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/archive', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    await planRepo.archivePlan(id, userId);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;