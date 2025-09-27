import express, { Request, Response } from 'express';
import { container } from 'tsyringe';
import { validateQuery } from '@/infrastructure/middleware/validation';
import { IContentRepository, ContentFilter } from '@/domain/repositories';
import { ContentType } from '@sakinah/types';
import { z } from 'zod';
import { logger } from '@/shared/logger';
import { Result } from '@/shared/result';

// Extend Request interface to include correlationId (added by middleware)
interface ExtendedRequest extends Request {
  correlationId?: string;
}

const router = express.Router();

// Validation schema for content filtering
const getContentQuerySchema = z.object({
  tags: z.string().optional(),
  type: z.enum(['ayah', 'hadith', 'dua', 'note']).optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0)
});

/**
 * @openapi
 * /v2/content:
 *   get:
 *     summary: Get spiritual content with enhanced filtering
 *     description: Retrieve Quranic verses, Hadith, duas, and spiritual notes with advanced filtering capabilities including tags, content type, and pagination.
 *     tags: [Content]
 *     parameters:
 *       - name: tags
 *         in: query
 *         description: Comma-separated list of tags to filter content (e.g., "patience,gratitude,tawakkul")
 *         schema:
 *           type: string
 *           example: "patience,gratitude"
 *       - name: type
 *         in: query
 *         description: Content type filter
 *         schema:
 *           type: string
 *           enum: [ayah, hadith, dua, note]
 *           example: "ayah"
 *       - name: limit
 *         in: query
 *         description: Maximum number of items to return (1-100)
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *           example: 20
 *       - name: offset
 *         in: query
 *         description: Number of items to skip for pagination
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *           example: 0
 *     responses:
 *       200:
 *         description: Content retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ContentSnippet'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     limit:
 *                       type: integer
 *                       description: Items per page
 *                     offset:
 *                       type: integer
 *                       description: Items skipped
 *                     total:
 *                       type: integer
 *                       description: Total available items (if known)
 *             examples:
 *               quranic_verses:
 *                 summary: Quranic verses about patience
 *                 value:
 *                   data:
 *                     - id: "123e4567-e89b-12d3-a456-426614174000"
 *                       type: "ayah"
 *                       text: "And give good tidings to the patient"
 *                       ref: "Quran 2:155"
 *                       tags: ["patience", "trust", "trial"]
 *                       createdAt: "2024-01-01T00:00:00Z"
 *                   pagination:
 *                     limit: 20
 *                     offset: 0
 *               hadith_collection:
 *                 summary: Hadith about gratitude
 *                 value:
 *                   data:
 *                     - id: "456e7890-e89b-12d3-a456-426614174001"
 *                       type: "hadith"
 *                       text: "He who does not thank people, does not thank Allah"
 *                       ref: "Sunan At-Tirmidhi 1955"
 *                       tags: ["gratitude", "character", "social"]
 *                       createdAt: "2024-01-01T00:00:00Z"
 *                   pagination:
 *                     limit: 20
 *                     offset: 0
 *       400:
 *         description: Invalid query parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "INVALID_QUERY_PARAMETERS"
 *                 message:
 *                   type: string
 *                   example: "Invalid content type. Must be one of: ayah, hadith, dua, note"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "INTERNAL_SERVER_ERROR"
 *                 message:
 *                   type: string
 *                   example: "Failed to retrieve content"
 */
router.get('/',
  validateQuery(getContentQuerySchema),
  async (req: ExtendedRequest, res: Response): Promise<void> => {
    try {
      const query = req.query;
      const tagsString = query.tags as string | undefined;
      const tags = tagsString ? tagsString.split(',').map(tag => tag.trim()).filter(Boolean) : undefined;
      const type = query.type as ContentType | undefined;
      const limit = Number(query.limit) || 20;
      const offset = Number(query.offset) || 0;

      logger.info('Content request received', {
        tags,
        type,
        limit,
        offset,
        correlationId: req.correlationId || 'unknown'
      });

      const contentRepository = container.resolve<IContentRepository>('IContentRepository');

      const filter: ContentFilter = {
        tags,
        type,
        limit,
        offset
      };

      const result = await contentRepository.findWithFilter(filter);

      if (Result.isError(result)) {
        logger.error('Failed to retrieve content', {
          error: result.error.message || 'Unknown error',
          filter,
          correlationId: req.correlationId || 'unknown'
        });

        res.status(500).json({
          error: 'CONTENT_RETRIEVAL_FAILED',
          message: 'Failed to retrieve content'
        });
        return;
      }

      const content = result.value;

      logger.info('Content retrieved successfully', {
        itemCount: content.length,
        filter,
        correlationId: req.correlationId || 'unknown'
      });

      res.json({
        data: content,
        pagination: {
          limit,
          offset,
          // Note: We could add total count here if needed in the future
          // This would require a separate database query or count method
        }
      });
    } catch (error) {
      logger.error('Unexpected error in content endpoint', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        correlationId: req.correlationId || 'unknown'
      });

      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve content'
      });
    }
  }
);

/**
 * @openapi
 * /v2/content/{id}:
 *   get:
 *     summary: Get content by ID
 *     description: Retrieve a specific piece of spiritual content by its unique identifier
 *     tags: [Content]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Unique identifier of the content
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Content retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/ContentSnippet'
 *             example:
 *               data:
 *                 id: "123e4567-e89b-12d3-a456-426614174000"
 *                 type: "ayah"
 *                 text: "And give good tidings to the patient"
 *                 ref: "Quran 2:155"
 *                 tags: ["patience", "trust", "trial"]
 *                 createdAt: "2024-01-01T00:00:00Z"
 *       404:
 *         description: Content not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "CONTENT_NOT_FOUND"
 *                 message:
 *                   type: string
 *                   example: "Content with the specified ID was not found"
 *       400:
 *         description: Invalid UUID format
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "INVALID_UUID"
 *                 message:
 *                   type: string
 *                   example: "Invalid content ID format"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "INTERNAL_SERVER_ERROR"
 *                 message:
 *                   type: string
 *                   example: "Failed to retrieve content"
 */
router.get('/:id', async (req: ExtendedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Basic UUID validation
    try {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        res.status(400).json({
          error: 'INVALID_UUID',
          message: 'Invalid content ID format'
        });
        return;
      }
    } catch (validationError) {
      res.status(400).json({
        error: 'INVALID_UUID',
        message: 'Invalid content ID format'
      });
      return;
    }

    logger.info('Content by ID request received', {
      contentId: id,
      correlationId: req.correlationId || 'unknown'
    });

    const contentRepository = container.resolve<IContentRepository>('IContentRepository');

    const result = await contentRepository.findById(id);

    if (Result.isError(result)) {
      logger.error('Failed to retrieve content by ID', {
        error: result.error.message || 'Unknown error',
        contentId: id,
        correlationId: req.correlationId || 'unknown'
      });

      res.status(500).json({
        error: 'CONTENT_RETRIEVAL_FAILED',
        message: 'Failed to retrieve content'
      });
      return;
    }

    if (!result.value) {
      logger.info('Content not found', {
        contentId: id,
        correlationId: req.correlationId || 'unknown'
      });

      res.status(404).json({
        error: 'CONTENT_NOT_FOUND',
        message: 'Content with the specified ID was not found'
      });
      return;
    }

    logger.info('Content retrieved successfully by ID', {
      contentId: id,
      contentType: result.value.type,
      correlationId: req.correlationId || 'unknown'
    });

    res.json({
      data: result.value
    });
  } catch (error) {
    logger.error('Unexpected error in content by ID endpoint', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      contentId: req.params.id,
      correlationId: req.correlationId || 'unknown'
    });

    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to retrieve content'
    });
  }
});

export default router;