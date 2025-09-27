import { Router } from 'express';
import { authMiddleware, AuthRequest } from '@/infrastructure/auth/middleware';
import { JournalRepository } from '@/infrastructure/repos/JournalRepository';

const router = Router();
const journalRepo = new JournalRepository();

router.get('/', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const {
      search,
      tags,
      page,
      limit,
      sortBy,
      sortOrder
    } = req.query;

    // Parse and validate query parameters
    const filters: any = {};

    if (search) filters.search = search as string;
    if (tags) {
      filters.tags = typeof tags === 'string'
        ? tags.split(',').map(t => t.trim()).filter(Boolean)
        : tags as string[];
    }
    if (page) filters.page = parseInt(page as string, 10) || 1;
    if (limit) filters.limit = parseInt(limit as string, 10) || 20;
    if (sortBy) filters.sortBy = sortBy as 'createdAt' | 'content';
    if (sortOrder) filters.sortOrder = sortOrder as 'asc' | 'desc';

    const result = await journalRepo.getUserEntries(userId, filters);
    res.json(result);
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

router.put('/:id', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const { content, tags } = req.body;

    const entry = await journalRepo.updateEntry(id, userId, {
      content,
      tags,
    });

    res.json({ entry });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    await journalRepo.deleteEntry(id, userId);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;