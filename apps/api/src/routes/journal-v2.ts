import { Router } from 'express';
import { container } from 'tsyringe';
import { authMiddleware, AuthRequest } from '@/infrastructure/auth/middleware';
import { ManageJournalUseCase } from '@/application/usecases/ManageJournalUseCase';

const router = Router();

router.get('/', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const { search } = req.query;

    const useCase = container.resolve(ManageJournalUseCase);
    const result = await useCase.getUserEntries(userId, search as string);

    if ('error' in result && result.error) {
      return res.status(400).json({ error: result.error.message });
    }

    if (result.ok) {
      return res.json({ entries: result.value.map(e => e.toDTO()) });
    }

    return res.status(500).json({ error: 'Unknown error' });
  } catch (error) {
    return next(error);
  }
});

router.post('/', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const { content, tags } = req.body;

    const useCase = container.resolve(ManageJournalUseCase);
    const result = await useCase.createEntry({
      userId,
      content,
      tags
    });

    if ('error' in result && result.error) {
      return res.status(400).json({ error: result.error.message });
    }

    if (result.ok) {
      return res.json({ entry: result.value.toDTO() });
    }

    return res.status(500).json({ error: 'Unknown error' });
  } catch (error) {
    return next(error);
  }
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const useCase = container.resolve(ManageJournalUseCase);
    const result = await useCase.deleteEntry(id, userId);

    if ('error' in result && result.error) {
      return res.status(400).json({ error: result.error.message });
    }

    if (result.ok) {
      return res.json({ success: true });
    }

    return res.status(500).json({ error: 'Unknown error' });
  } catch (error) {
    return next(error);
  }
});

export default router;