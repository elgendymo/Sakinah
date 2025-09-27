import { Router } from 'express';
import { container } from 'tsyringe';
import { authMiddleware, AuthRequest } from '@/infrastructure/auth/middleware';
import { ManageJournalUseCase } from '@/application/usecases/ManageJournalUseCase';
import { logger } from '../../shared/logger';
import { Result } from '@/shared/result';

const router = Router();

/**
 * @api {get} /api/v1/journal Get user journal entries with search and filtering
 * @apiVersion 1.0.0
 * @apiName GetJournalEntries
 * @apiGroup Journal
 * @apiParam {String} [search] Search term to filter entries by content or tags
 * @apiParam {String} [tags] Comma-separated list of tags to filter by
 * @apiParam {Number} [page=1] Page number for pagination
 * @apiParam {Number} [limit=20] Number of entries per page (max 100)
 * @apiParam {String} [sortBy=createdAt] Sort field (createdAt, content)
 * @apiParam {String} [sortOrder=desc] Sort order (asc, desc)
 */
router.get('/', authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  try {
    const userId = req.userId!;
    const {
      search,
      tags,
      page = '1',
      limit = '20',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Validate pagination parameters
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
    const offset = (pageNum - 1) * limitNum;

    // Validate sort parameters
    const validSortFields = ['createdAt', 'content'];
    const validSortOrders = ['asc', 'desc'];
    const sortField = validSortFields.includes(sortBy as string) ? sortBy as string : 'createdAt';
    const sortDirection = validSortOrders.includes(sortOrder as string) ? sortOrder as string : 'desc';

    const useCase = container.resolve(ManageJournalUseCase);
    const result = await useCase.getUserEntries(userId, search as string);

    if (Result.isError(result)) {
      logger.error('Error fetching journal entries v1', result.error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch journal entries'
        }
      });
      return;
    }

    let entries = result.value;

    // Apply tag filtering if specified
    if (tags) {
      const tagList = (tags as string).split(',').map(tag => tag.trim().toLowerCase()).filter(Boolean);
      if (tagList.length > 0) {
        entries = entries.filter(entry =>
          tagList.some(tag => entry.tags.includes(tag))
        );
      }
    }

    // Apply sorting
    entries.sort((a, b) => {
      let aVal: any, bVal: any;

      switch (sortField) {
        case 'content':
          aVal = a.content.toLowerCase();
          bVal = b.content.toLowerCase();
          break;
        case 'createdAt':
        default:
          aVal = a.createdAt.getTime();
          bVal = b.createdAt.getTime();
          break;
      }

      if (sortDirection === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });

    // Calculate pagination
    const total = entries.length;
    const totalPages = Math.ceil(total / limitNum);
    const paginatedEntries = entries.slice(offset, offset + limitNum);

    // Transform to DTOs
    const entriesDTO = paginatedEntries.map(entry => entry.toDTO());

    res.json({
      entries: entriesDTO,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1
      },
      filters: {
        search: search || null,
        tags: tags ? (tags as string).split(',').map(t => t.trim()).filter(Boolean) : null,
        sortBy: sortField,
        sortOrder: sortDirection
      }
    });

  } catch (error) {
    logger.error('Unexpected error in get journal entries v1', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
      }
    });
  }
});

/**
 * @api {get} /api/v1/journal/:id Get specific journal entry
 * @apiVersion 1.0.0
 * @apiName GetJournalEntry
 * @apiGroup Journal
 * @apiParam {String} id Journal entry ID
 */
router.get('/:id', authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const useCase = container.resolve(ManageJournalUseCase);
    const result = await useCase.getEntry(id);

    if (Result.isError(result)) {
      logger.error('Error fetching journal entry v1', result.error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch journal entry'
        }
      });
      return;
    }

    if (!result.value) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Journal entry not found'
        }
      });
      return;
    }

    // Check ownership
    if (result.value.userId.toString() !== userId) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied to this journal entry'
        }
      });
      return;
    }

    res.json({
      entry: result.value.toDTO()
    });

  } catch (error) {
    logger.error('Unexpected error in get journal entry v1', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
      }
    });
  }
});

/**
 * @api {post} /api/v1/journal Create new journal entry
 * @apiVersion 1.0.0
 * @apiName CreateJournalEntry
 * @apiGroup Journal
 * @apiParam {String} content Entry content (required, max 5000 characters)
 * @apiParam {String[]} [tags] Array of tags (max 10 tags, each max 50 characters)
 */
router.post('/', authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  try {
    const userId = req.userId!;
    const { content, tags } = req.body;

    // Validation
    if (!content || typeof content !== 'string') {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Content is required and must be a string',
          field: 'content'
        }
      });
      return;
    }

    if (content.trim().length === 0) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Content cannot be empty',
          field: 'content'
        }
      });
      return;
    }

    if (content.length > 5000) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Content must be 5000 characters or less',
          field: 'content'
        }
      });
      return;
    }

    if (tags && !Array.isArray(tags)) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Tags must be an array',
          field: 'tags'
        }
      });
      return;
    }

    if (tags && tags.length > 10) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Maximum 10 tags allowed',
          field: 'tags'
        }
      });
      return;
    }

    if (tags && tags.some((tag: any) => typeof tag !== 'string' || tag.length > 50)) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Each tag must be a string of 50 characters or less',
          field: 'tags'
        }
      });
      return;
    }

    const useCase = container.resolve(ManageJournalUseCase);
    const result = await useCase.createEntry({
      userId,
      content: content.trim(),
      tags: tags ? tags.map((tag: string) => tag.trim()).filter(Boolean) : undefined
    });

    if (Result.isError(result)) {
      logger.error('Error creating journal entry v1', result.error);

      if (result.error.message.includes('cannot be empty')) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: result.error.message,
            field: 'content'
          }
        });
        return;
      }

      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create journal entry'
        }
      });
      return;
    }

    res.status(201).json({
      entry: result.value.toDTO()
    });

  } catch (error) {
    logger.error('Unexpected error in create journal entry v1', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
      }
    });
  }
});

/**
 * @api {put} /api/v1/journal/:id Update journal entry
 * @apiVersion 1.0.0
 * @apiName UpdateJournalEntry
 * @apiGroup Journal
 * @apiParam {String} id Journal entry ID
 * @apiParam {String} [content] Updated content (max 5000 characters)
 * @apiParam {String[]} [tags] Updated tags array (max 10 tags, each max 50 characters)
 */
router.put('/:id', authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const { content, tags } = req.body;

    // Validation
    if (content !== undefined) {
      if (typeof content !== 'string') {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Content must be a string',
            field: 'content'
          }
        });
        return;
      }

      if (content.trim().length === 0) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Content cannot be empty',
            field: 'content'
          }
        });
        return;
      }

      if (content.length > 5000) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Content must be 5000 characters or less',
            field: 'content'
          }
        });
        return;
      }
    }

    if (tags !== undefined) {
      if (!Array.isArray(tags)) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Tags must be an array',
            field: 'tags'
          }
        });
        return;
      }

      if (tags.length > 10) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Maximum 10 tags allowed',
            field: 'tags'
          }
        });
        return;
      }

      if (tags.some((tag: any) => typeof tag !== 'string' || tag.length > 50)) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Each tag must be a string of 50 characters or less',
            field: 'tags'
          }
        });
        return;
      }
    }

    const useCase = container.resolve(ManageJournalUseCase);
    const result = await useCase.updateEntry({
      id,
      userId,
      content: content ? content.trim() : undefined,
      tags: tags ? tags.map((tag: string) => tag.trim()).filter(Boolean) : undefined
    });

    if (Result.isError(result)) {
      logger.error('Error updating journal entry v1', result.error);

      if (result.error.message.includes('not found')) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Journal entry not found'
          }
        });
        return;
      }

      if (result.error.message.includes('Unauthorized')) {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied to this journal entry'
          }
        });
        return;
      }

      if (result.error.message.includes('cannot be empty')) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: result.error.message,
            field: 'content'
          }
        });
        return;
      }

      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update journal entry'
        }
      });
      return;
    }

    res.json({
      entry: result.value.toDTO()
    });

  } catch (error) {
    logger.error('Unexpected error in update journal entry v1', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
      }
    });
  }
});

/**
 * @api {delete} /api/v1/journal/:id Delete journal entry
 * @apiVersion 1.0.0
 * @apiName DeleteJournalEntry
 * @apiGroup Journal
 * @apiParam {String} id Journal entry ID
 */
router.delete('/:id', authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const useCase = container.resolve(ManageJournalUseCase);
    const result = await useCase.deleteEntry(id, userId);

    if (Result.isError(result)) {
      logger.error('Error deleting journal entry v1', result.error);

      if (result.error.message.includes('not found')) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Journal entry not found'
          }
        });
        return;
      }

      if (result.error.message.includes('Unauthorized')) {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied to this journal entry'
          }
        });
        return;
      }

      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete journal entry'
        }
      });
      return;
    }

    res.status(204).send();

  } catch (error) {
    logger.error('Unexpected error in delete journal entry v1', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
      }
    });
  }
});

/**
 * @api {get} /api/v1/journal/search Search journal entries
 * @apiVersion 1.0.0
 * @apiName SearchJournalEntries
 * @apiGroup Journal
 * @apiParam {String} q Search query
 * @apiParam {String} [tags] Comma-separated list of tags to filter by
 * @apiParam {Number} [page=1] Page number for pagination
 * @apiParam {Number} [limit=20] Number of entries per page (max 50)
 */
router.get('/search', authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  try {
    const userId = req.userId!;
    const {
      q: query,
      tags,
      page = '1',
      limit = '20'
    } = req.query;

    if (!query || typeof query !== 'string') {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Search query (q) is required',
          field: 'q'
        }
      });
      return;
    }

    const searchTerm = query.trim();
    if (searchTerm.length === 0) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Search query cannot be empty',
          field: 'q'
        }
      });
      return;
    }

    // Validate pagination parameters
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string) || 20));
    const offset = (pageNum - 1) * limitNum;

    const useCase = container.resolve(ManageJournalUseCase);
    const result = await useCase.getUserEntries(userId, searchTerm);

    if (Result.isError(result)) {
      logger.error('Error searching journal entries v1', result.error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to search journal entries'
        }
      });
      return;
    }

    let entries = result.value;

    // Apply tag filtering if specified
    if (tags) {
      const tagList = (tags as string).split(',').map(tag => tag.trim().toLowerCase()).filter(Boolean);
      if (tagList.length > 0) {
        entries = entries.filter(entry =>
          tagList.some(tag => entry.tags.includes(tag))
        );
      }
    }

    // Sort by relevance (entries with query in content first, then by creation date)
    entries.sort((a, b) => {
      const aContentMatch = a.content.toLowerCase().includes(searchTerm.toLowerCase());
      const bContentMatch = b.content.toLowerCase().includes(searchTerm.toLowerCase());

      if (aContentMatch && !bContentMatch) return -1;
      if (!aContentMatch && bContentMatch) return 1;

      // If both match or both don't match, sort by creation date (newest first)
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    // Calculate pagination
    const total = entries.length;
    const totalPages = Math.ceil(total / limitNum);
    const paginatedEntries = entries.slice(offset, offset + limitNum);

    // Transform to DTOs
    const entriesDTO = paginatedEntries.map(entry => entry.toDTO());

    res.json({
      entries: entriesDTO,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1
      },
      search: {
        query: searchTerm,
        tags: tags ? (tags as string).split(',').map(t => t.trim()).filter(Boolean) : null
      }
    });

  } catch (error) {
    logger.error('Unexpected error in search journal entries v1', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
      }
    });
  }
});

export default router;