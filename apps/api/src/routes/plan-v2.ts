import { Router } from 'express';
import { container } from 'tsyringe';
import { authMiddleware, AuthRequest } from '@/infrastructure/auth/middleware';
import { IPlanRepository } from '@/domain/repositories';
import { UserId } from '@/domain/value-objects/UserId';

const router = Router();

router.get('/active', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const planRepo = container.resolve<IPlanRepository>('IPlanRepository');
    const result = await planRepo.findByUserId(new UserId(userId));

    if ('error' in result && result.error) {
      return res.status(400).json({ error: result.error.message });
    }

    if (result.ok) {
      const activePlans = result.value.filter(plan => plan.status === 'active');
      return res.json({ plans: activePlans.map(p => p.toDTO()) });
    }

    return res.status(500).json({ error: 'Unknown error' });
  } catch (error) {
    return next(error);
  }
});

export default router;