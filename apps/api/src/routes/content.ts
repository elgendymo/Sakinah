import { Router } from 'express';
import { ContentRepository } from '@/infrastructure/repos/ContentRepository';

const router = Router();
const contentRepo = new ContentRepository();

router.get('/', async (req, res, next) => {
  try {
    const { tags, type } = req.query;

    const tagArray = typeof tags === 'string' ? tags.split(',') : undefined;
    const typeFilter = type as 'ayah' | 'hadith' | 'dua' | 'note' | undefined;

    const items = await contentRepo.getContent({
      tags: tagArray,
      type: typeFilter,
    });

    res.json({ items });
  } catch (error) {
    next(error);
  }
});

export default router;