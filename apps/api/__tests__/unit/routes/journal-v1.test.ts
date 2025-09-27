import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { Request, Response } from 'express';
import request from 'supertest';
import express from 'express';

// Mock all dependencies before importing
vi.mock('../../../src/infrastructure/auth/middleware');
vi.mock('tsyringe');
vi.mock('../../../src/application/usecases/ManageJournalUseCase');
vi.mock('../../../src/shared/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}));

// Now import after mocking
import { container } from 'tsyringe';
import journalRouter from '../../../src/routes/v1/journal';
import { ManageJournalUseCase } from '../../../src/application/usecases/ManageJournalUseCase';
import { JournalEntry } from '../../../src/domain/entities/JournalEntry';
import { Result } from '../../../src/shared/result';
import { authMiddleware } from '../../../src/infrastructure/auth/middleware';

describe('Journal V1 Routes', () => {
  let app: express.Application;
  let mockUseCase: Partial<ManageJournalUseCase>;
  let mockAuthMiddleware: Mock;
  let mockContainer: Mock;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    // Mock auth middleware to add userId to request
    mockAuthMiddleware = vi.fn((req: any, res: Response, next: any) => {
      req.userId = 'test-user-id';
      next();
    });
    (authMiddleware as Mock).mockImplementation(mockAuthMiddleware);

    // Mock use case
    mockUseCase = {
      getUserEntries: vi.fn(),
      getEntry: vi.fn(),
      createEntry: vi.fn(),
      updateEntry: vi.fn(),
      deleteEntry: vi.fn()
    };

    // Mock container
    mockContainer = vi.fn().mockReturnValue(mockUseCase);
    (container.resolve as Mock).mockImplementation(mockContainer);

    app.use('/api/v1/journal', journalRouter);
  });

  // Helper function to create mock journal entries
  const createMockEntry = (overrides: Partial<any> = {}) => {
    return JournalEntry.create({
      id: 'test-id',
      userId: 'test-user-id',
      content: 'Test journal content',
      tags: ['spirituality', 'reflection'],
      createdAt: new Date('2023-01-01'),
      ...overrides
    });
  };

  describe('GET /api/v1/journal', () => {
    it('should get user journal entries with default parameters', async () => {
      const entries = [
        createMockEntry({ id: '1', content: 'Entry 1' }),
        createMockEntry({ id: '2', content: 'Entry 2' })
      ];

      (mockUseCase.getUserEntries as Mock).mockResolvedValue(Result.ok(entries));

      const response = await request(app)
        .get('/api/v1/journal')
        .expect(200);

      expect(response.body).toMatchObject({
        entries: expect.arrayContaining([
          expect.objectContaining({ id: '1', content: 'Entry 1' }),
          expect.objectContaining({ id: '2', content: 'Entry 2' })
        ]),
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false
        },
        filters: {
          search: null,
          tags: null,
          sortBy: 'createdAt',
          sortOrder: 'desc'
        }
      });

      expect(mockUseCase.getUserEntries).toHaveBeenCalledWith('test-user-id', undefined);
    });

    it('should filter entries by search term', async () => {
      const entries = [
        createMockEntry({ id: '1', content: 'Prayer reflection' }),
        createMockEntry({ id: '2', content: 'Daily gratitude' })
      ];

      (mockUseCase.getUserEntries as Mock).mockResolvedValue(Result.ok(entries));

      const response = await request(app)
        .get('/api/v1/journal?search=prayer')
        .expect(200);

      expect(response.body.filters.search).toBe('prayer');
      expect(mockUseCase.getUserEntries).toHaveBeenCalledWith('test-user-id', 'prayer');
    });

    it('should filter entries by tags', async () => {
      const entries = [
        createMockEntry({ id: '1', tags: ['prayer', 'morning'] }),
        createMockEntry({ id: '2', tags: ['gratitude', 'evening'] }),
        createMockEntry({ id: '3', tags: ['prayer', 'dhikr'] })
      ];

      (mockUseCase.getUserEntries as Mock).mockResolvedValue(Result.ok(entries));

      const response = await request(app)
        .get('/api/v1/journal?tags=prayer,morning')
        .expect(200);

      expect(response.body.filters.tags).toEqual(['prayer', 'morning']);
      // Should return entries that have any of the specified tags
      expect(response.body.entries.length).toBe(2); // entries 1 and 3 have 'prayer'
    });

    it('should handle pagination parameters', async () => {
      const entries = Array.from({ length: 25 }, (_, i) =>
        createMockEntry({ id: `${i + 1}`, content: `Entry ${i + 1}` })
      );

      (mockUseCase.getUserEntries as Mock).mockResolvedValue(Result.ok(entries));

      const response = await request(app)
        .get('/api/v1/journal?page=2&limit=10')
        .expect(200);

      expect(response.body.pagination).toMatchObject({
        page: 2,
        limit: 10,
        total: 25,
        totalPages: 3,
        hasNextPage: true,
        hasPrevPage: true
      });

      // Should return entries 11-20 (second page)
      expect(response.body.entries.length).toBe(10);
    });

    it('should handle sorting parameters', async () => {
      const entries = [
        createMockEntry({ id: '1', content: 'Alpha content', createdAt: new Date('2023-01-01') }),
        createMockEntry({ id: '2', content: 'Beta content', createdAt: new Date('2023-01-02') })
      ];

      (mockUseCase.getUserEntries as Mock).mockResolvedValue(Result.ok(entries));

      const response = await request(app)
        .get('/api/v1/journal?sortBy=content&sortOrder=asc')
        .expect(200);

      expect(response.body.filters.sortBy).toBe('content');
      expect(response.body.filters.sortOrder).toBe('asc');
      expect(response.body.entries[0].content).toBe('Alpha content');
      expect(response.body.entries[1].content).toBe('Beta content');
    });

    it('should validate and correct invalid pagination parameters', async () => {
      const entries = [createMockEntry()];
      (mockUseCase.getUserEntries as Mock).mockResolvedValue(Result.ok(entries));

      const response = await request(app)
        .get('/api/v1/journal?page=-1&limit=1000')
        .expect(200);

      expect(response.body.pagination.page).toBe(1); // Corrected from -1
      expect(response.body.pagination.limit).toBe(100); // Capped at 100
    });

    it('should handle use case errors', async () => {
      (mockUseCase.getUserEntries as Mock).mockResolvedValue(
        Result.error(new Error('Database connection failed'))
      );

      const response = await request(app)
        .get('/api/v1/journal')
        .expect(500);

      expect(response.body).toMatchObject({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch journal entries'
        }
      });
    });
  });

  describe('GET /api/v1/journal/:id', () => {
    it('should get specific journal entry', async () => {
      const entry = createMockEntry({ id: 'specific-id', content: 'Specific entry' });
      (mockUseCase.getEntry as Mock).mockResolvedValue(Result.ok(entry));

      const response = await request(app)
        .get('/api/v1/journal/specific-id')
        .expect(200);

      expect(response.body).toMatchObject({
        entry: expect.objectContaining({
          id: 'specific-id',
          content: 'Specific entry'
        })
      });

      expect(mockUseCase.getEntry).toHaveBeenCalledWith('specific-id');
    });

    it('should return 404 for non-existent entry', async () => {
      (mockUseCase.getEntry as Mock).mockResolvedValue(Result.ok(null));

      const response = await request(app)
        .get('/api/v1/journal/non-existent')
        .expect(404);

      expect(response.body).toMatchObject({
        error: {
          code: 'NOT_FOUND',
          message: 'Journal entry not found'
        }
      });
    });

    it('should return 403 for unauthorized access', async () => {
      const entry = createMockEntry({ userId: 'different-user-id' });
      (mockUseCase.getEntry as Mock).mockResolvedValue(Result.ok(entry));

      const response = await request(app)
        .get('/api/v1/journal/unauthorized-id')
        .expect(403);

      expect(response.body).toMatchObject({
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied to this journal entry'
        }
      });
    });

    it('should handle use case errors', async () => {
      (mockUseCase.getEntry as Mock).mockResolvedValue(
        Result.error(new Error('Database error'))
      );

      const response = await request(app)
        .get('/api/v1/journal/error-id')
        .expect(500);

      expect(response.body).toMatchObject({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch journal entry'
        }
      });
    });
  });

  describe('POST /api/v1/journal', () => {
    it('should create new journal entry with valid data', async () => {
      const entry = createMockEntry({ content: 'New journal entry' });
      (mockUseCase.createEntry as Mock).mockResolvedValue(Result.ok(entry));

      const response = await request(app)
        .post('/api/v1/journal')
        .send({
          content: 'New journal entry',
          tags: ['reflection', 'spiritual']
        })
        .expect(201);

      expect(response.body).toMatchObject({
        entry: expect.objectContaining({
          content: 'New journal entry'
        })
      });

      expect(mockUseCase.createEntry).toHaveBeenCalledWith({
        userId: 'test-user-id',
        content: 'New journal entry',
        tags: ['reflection', 'spiritual']
      });
    });

    it('should validate required content field', async () => {
      const response = await request(app)
        .post('/api/v1/journal')
        .send({})
        .expect(400);

      expect(response.body).toMatchObject({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Content is required and must be a string',
          field: 'content'
        }
      });
    });

    it('should validate content is not empty', async () => {
      const response = await request(app)
        .post('/api/v1/journal')
        .send({ content: '   ' })
        .expect(400);

      expect(response.body).toMatchObject({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Content cannot be empty',
          field: 'content'
        }
      });
    });

    it('should validate content length limit', async () => {
      const longContent = 'a'.repeat(5001);

      const response = await request(app)
        .post('/api/v1/journal')
        .send({ content: longContent })
        .expect(400);

      expect(response.body).toMatchObject({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Content must be 5000 characters or less',
          field: 'content'
        }
      });
    });

    it('should validate tags array format', async () => {
      const response = await request(app)
        .post('/api/v1/journal')
        .send({
          content: 'Valid content',
          tags: 'not-an-array'
        })
        .expect(400);

      expect(response.body).toMatchObject({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Tags must be an array',
          field: 'tags'
        }
      });
    });

    it('should validate maximum number of tags', async () => {
      const tooManyTags = Array.from({ length: 11 }, (_, i) => `tag${i}`);

      const response = await request(app)
        .post('/api/v1/journal')
        .send({
          content: 'Valid content',
          tags: tooManyTags
        })
        .expect(400);

      expect(response.body).toMatchObject({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Maximum 10 tags allowed',
          field: 'tags'
        }
      });
    });

    it('should validate individual tag length', async () => {
      const longTag = 'a'.repeat(51);

      const response = await request(app)
        .post('/api/v1/journal')
        .send({
          content: 'Valid content',
          tags: [longTag]
        })
        .expect(400);

      expect(response.body).toMatchObject({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Each tag must be a string of 50 characters or less',
          field: 'tags'
        }
      });
    });

    it('should handle use case validation errors', async () => {
      (mockUseCase.createEntry as Mock).mockResolvedValue(
        Result.error(new Error('Journal content cannot be empty'))
      );

      const response = await request(app)
        .post('/api/v1/journal')
        .send({ content: 'Valid content' })
        .expect(400);

      expect(response.body).toMatchObject({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Journal content cannot be empty',
          field: 'content'
        }
      });
    });

    it('should handle use case internal errors', async () => {
      (mockUseCase.createEntry as Mock).mockResolvedValue(
        Result.error(new Error('Database connection failed'))
      );

      const response = await request(app)
        .post('/api/v1/journal')
        .send({ content: 'Valid content' })
        .expect(500);

      expect(response.body).toMatchObject({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create journal entry'
        }
      });
    });
  });

  describe('PUT /api/v1/journal/:id', () => {
    it('should update journal entry with valid data', async () => {
      const updatedEntry = createMockEntry({
        id: 'update-id',
        content: 'Updated content'
      });
      (mockUseCase.updateEntry as Mock).mockResolvedValue(Result.ok(updatedEntry));

      const response = await request(app)
        .put('/api/v1/journal/update-id')
        .send({
          content: 'Updated content',
          tags: ['updated', 'tags']
        })
        .expect(200);

      expect(response.body).toMatchObject({
        entry: expect.objectContaining({
          content: 'Updated content'
        })
      });

      expect(mockUseCase.updateEntry).toHaveBeenCalledWith({
        id: 'update-id',
        userId: 'test-user-id',
        content: 'Updated content',
        tags: ['updated', 'tags']
      });
    });

    it('should update only provided fields', async () => {
      const updatedEntry = createMockEntry({ id: 'update-id' });
      (mockUseCase.updateEntry as Mock).mockResolvedValue(Result.ok(updatedEntry));

      await request(app)
        .put('/api/v1/journal/update-id')
        .send({ content: 'Only content updated' })
        .expect(200);

      expect(mockUseCase.updateEntry).toHaveBeenCalledWith({
        id: 'update-id',
        userId: 'test-user-id',
        content: 'Only content updated',
        tags: undefined
      });
    });

    it('should validate content format', async () => {
      const response = await request(app)
        .put('/api/v1/journal/update-id')
        .send({ content: 123 })
        .expect(400);

      expect(response.body).toMatchObject({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Content must be a string',
          field: 'content'
        }
      });
    });

    it('should handle not found entries', async () => {
      (mockUseCase.updateEntry as Mock).mockResolvedValue(
        Result.error(new Error('Journal entry not found'))
      );

      const response = await request(app)
        .put('/api/v1/journal/not-found')
        .send({ content: 'Updated content' })
        .expect(404);

      expect(response.body).toMatchObject({
        error: {
          code: 'NOT_FOUND',
          message: 'Journal entry not found'
        }
      });
    });

    it('should handle unauthorized updates', async () => {
      (mockUseCase.updateEntry as Mock).mockResolvedValue(
        Result.error(new Error('Unauthorized'))
      );

      const response = await request(app)
        .put('/api/v1/journal/unauthorized-id')
        .send({ content: 'Updated content' })
        .expect(403);

      expect(response.body).toMatchObject({
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied to this journal entry'
        }
      });
    });
  });

  describe('DELETE /api/v1/journal/:id', () => {
    it('should delete journal entry successfully', async () => {
      (mockUseCase.deleteEntry as Mock).mockResolvedValue(Result.ok(undefined));

      await request(app)
        .delete('/api/v1/journal/delete-id')
        .expect(204);

      expect(mockUseCase.deleteEntry).toHaveBeenCalledWith('delete-id', 'test-user-id');
    });

    it('should handle not found entries', async () => {
      (mockUseCase.deleteEntry as Mock).mockResolvedValue(
        Result.error(new Error('Journal entry not found'))
      );

      const response = await request(app)
        .delete('/api/v1/journal/not-found')
        .expect(404);

      expect(response.body).toMatchObject({
        error: {
          code: 'NOT_FOUND',
          message: 'Journal entry not found'
        }
      });
    });

    it('should handle unauthorized deletions', async () => {
      (mockUseCase.deleteEntry as Mock).mockResolvedValue(
        Result.error(new Error('Unauthorized'))
      );

      const response = await request(app)
        .delete('/api/v1/journal/unauthorized-id')
        .expect(403);

      expect(response.body).toMatchObject({
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied to this journal entry'
        }
      });
    });
  });

  describe('GET /api/v1/journal/search', () => {
    it('should search journal entries with query', async () => {
      const entries = [
        createMockEntry({ id: '1', content: 'Morning prayer reflection' }),
        createMockEntry({ id: '2', content: 'Evening gratitude' })
      ];

      (mockUseCase.getUserEntries as Mock).mockResolvedValue(Result.ok(entries));

      const response = await request(app)
        .get('/api/v1/journal/search?q=prayer')
        .expect(200);

      expect(response.body).toMatchObject({
        entries: expect.any(Array),
        pagination: expect.any(Object),
        search: {
          query: 'prayer',
          tags: null
        }
      });

      // Should sort by relevance (content match first)
      expect(response.body.entries[0].content).toContain('prayer');

      expect(mockUseCase.getUserEntries).toHaveBeenCalledWith('test-user-id', 'prayer');
    });

    it('should require search query', async () => {
      const response = await request(app)
        .get('/api/v1/journal/search')
        .expect(400);

      expect(response.body).toMatchObject({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Search query (q) is required',
          field: 'q'
        }
      });
    });

    it('should not allow empty search query', async () => {
      const response = await request(app)
        .get('/api/v1/journal/search?q=   ')
        .expect(400);

      expect(response.body).toMatchObject({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Search query cannot be empty',
          field: 'q'
        }
      });
    });

    it('should handle search with tag filtering', async () => {
      const entries = [
        createMockEntry({
          id: '1',
          content: 'Prayer time',
          tags: ['prayer', 'morning']
        }),
        createMockEntry({
          id: '2',
          content: 'Prayer reflection',
          tags: ['prayer', 'evening']
        })
      ];

      (mockUseCase.getUserEntries as Mock).mockResolvedValue(Result.ok(entries));

      const response = await request(app)
        .get('/api/v1/journal/search?q=prayer&tags=morning')
        .expect(200);

      expect(response.body.search).toMatchObject({
        query: 'prayer',
        tags: ['morning']
      });

      // Should return only entries with 'morning' tag
      expect(response.body.entries.length).toBe(1);
      expect(response.body.entries[0].tags).toContain('morning');
    });

    it('should handle search pagination', async () => {
      const entries = Array.from({ length: 25 }, (_, i) =>
        createMockEntry({
          id: `${i + 1}`,
          content: `Prayer entry ${i + 1}`
        })
      );

      (mockUseCase.getUserEntries as Mock).mockResolvedValue(Result.ok(entries));

      const response = await request(app)
        .get('/api/v1/journal/search?q=prayer&page=2&limit=10')
        .expect(200);

      expect(response.body.pagination).toMatchObject({
        page: 2,
        limit: 10,
        total: 25,
        totalPages: 3,
        hasNextPage: true,
        hasPrevPage: true
      });

      expect(response.body.entries.length).toBe(10);
    });

    it('should limit search pagination', async () => {
      const entries = [createMockEntry()];
      (mockUseCase.getUserEntries as Mock).mockResolvedValue(Result.ok(entries));

      const response = await request(app)
        .get('/api/v1/journal/search?q=test&limit=100')
        .expect(200);

      // Should cap limit at 50 for search
      expect(response.body.pagination.limit).toBe(50);
    });

    it('should handle search errors', async () => {
      (mockUseCase.getUserEntries as Mock).mockResolvedValue(
        Result.error(new Error('Search service unavailable'))
      );

      const response = await request(app)
        .get('/api/v1/journal/search?q=test')
        .expect(500);

      expect(response.body).toMatchObject({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to search journal entries'
        }
      });
    });
  });

  describe('Authentication', () => {
    it('should require authentication for all endpoints', async () => {
      // Reset mock to simulate no authentication
      (authMiddleware as Mock).mockImplementation((req: any, res: Response, next: any) => {
        res.status(401).json({ error: 'Unauthorized' });
      });

      const testApp = express();
      testApp.use(express.json());
      testApp.use('/api/v1/journal', journalRouter);

      await request(testApp)
        .get('/api/v1/journal')
        .expect(401);

      await request(testApp)
        .post('/api/v1/journal')
        .send({ content: 'test' })
        .expect(401);

      await request(testApp)
        .put('/api/v1/journal/test-id')
        .send({ content: 'test' })
        .expect(401);

      await request(testApp)
        .delete('/api/v1/journal/test-id')
        .expect(401);

      await request(testApp)
        .get('/api/v1/journal/search?q=test')
        .expect(401);
    });
  });
});

// Helper function tests
describe('Journal V1 Route Helpers', () => {
  describe('Pagination Validation', () => {
    it('should validate and correct pagination parameters', () => {
      const validatePagination = (page: string, limit: string, maxLimit: number = 100) => {
        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(maxLimit, Math.max(1, parseInt(limit) || 20));
        return { page: pageNum, limit: limitNum };
      };

      expect(validatePagination('0', '0')).toEqual({ page: 1, limit: 1 });
      expect(validatePagination('-5', '-10')).toEqual({ page: 1, limit: 1 });
      expect(validatePagination('invalid', 'invalid')).toEqual({ page: 1, limit: 20 });
      expect(validatePagination('2', '50')).toEqual({ page: 2, limit: 50 });
      expect(validatePagination('1', '200')).toEqual({ page: 1, limit: 100 });
      expect(validatePagination('1', '200', 50)).toEqual({ page: 1, limit: 50 });
    });
  });

  describe('Sort Validation', () => {
    it('should validate sort parameters', () => {
      const validateSort = (sortBy: string, sortOrder: string) => {
        const validSortFields = ['createdAt', 'content'];
        const validSortOrders = ['asc', 'desc'];

        const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
        const sortDirection = validSortOrders.includes(sortOrder) ? sortOrder : 'desc';

        return { sortBy: sortField, sortOrder: sortDirection };
      };

      expect(validateSort('invalid', 'invalid')).toEqual({
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });

      expect(validateSort('content', 'asc')).toEqual({
        sortBy: 'content',
        sortOrder: 'asc'
      });

      expect(validateSort('createdAt', 'desc')).toEqual({
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });
    });
  });

  describe('Tag Filtering', () => {
    it('should filter entries by tags', () => {
      const mockEntries = [
        { tags: ['prayer', 'morning'] },
        { tags: ['gratitude', 'evening'] },
        { tags: ['prayer', 'dhikr'] },
        { tags: ['reflection'] }
      ];

      const filterByTags = (entries: any[], tagString: string) => {
        if (!tagString) return entries;

        const tagList = tagString.split(',')
          .map(tag => tag.trim().toLowerCase())
          .filter(Boolean);

        if (tagList.length === 0) return entries;

        return entries.filter(entry =>
          tagList.some(tag => entry.tags.includes(tag))
        );
      };

      expect(filterByTags(mockEntries, 'prayer')).toHaveLength(2);
      expect(filterByTags(mockEntries, 'prayer,gratitude')).toHaveLength(3);
      expect(filterByTags(mockEntries, 'nonexistent')).toHaveLength(0);
      expect(filterByTags(mockEntries, '')).toHaveLength(4);
    });
  });
});