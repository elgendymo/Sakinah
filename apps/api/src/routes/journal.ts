import { Router } from 'express';
import { authMiddleware, AuthRequest } from '@/infrastructure/auth/middleware';
import { JournalRepository } from '@/infrastructure/repos/JournalRepository';

const router = Router();
const journalRepo = new JournalRepository();

router.get('/', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const entries = await journalRepo.getUserEntries(userId);
    res.json({ entries });
  } catch (error) {
    next(error);
  }
});

router.post('/', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const { content, tags } = req.body;

    const entry = await journalRepo.createEntry({
      userId,
      content,
      tags,
    });

    res.json({ entry });
  } catch (error) {
    next(error);
  }
});

export default router;