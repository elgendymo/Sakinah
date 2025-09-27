import { Router } from 'express';
import { authMiddleware, AuthRequest } from '@/infrastructure/auth/middleware';
import { AIExplainInputSchema } from '@sakinah/types';
import { ValidationError } from '@/shared/errors';
import { getAIProvider } from '@/infrastructure/ai/factory';

const router = Router();

router.post('/explain', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const parseResult = AIExplainInputSchema.safeParse(req.body);

    if (!parseResult.success) {
      throw new ValidationError(parseResult.error.errors[0].message);
    }

    const { struggle } = parseResult.data;
    const ai = getAIProvider();
    const response = await ai.explain(struggle);

    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;