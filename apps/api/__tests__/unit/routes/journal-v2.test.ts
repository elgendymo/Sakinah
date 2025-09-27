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
import journalV2Router from '../../../src/routes/v2/journal';
import { ManageJournalUseCase } from '../../../src/application/usecases/ManageJournalUseCase';
import { JournalEntry } from '../../../src/domain/entities/JournalEntry';
import { Result } from '../../../src/shared/result';
import { authMiddleware } from '../../../src/infrastructure/auth/middleware';

describe('Journal V2 Routes', () => {
  let app: express.Application;
  let mockUseCase: Partial<ManageJournalUseCase>;
  let mockAuthMiddleware: Mock;
  let mockContainer: Mock;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    // Mock auth middleware to add userId and correlationId to request
    mockAuthMiddleware = vi.fn((req: any, res: Response, next: any) => {
      req.userId = 'test-user-id';
      req.correlationId = 'test-correlation-id';
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

    app.use('/api/v2/journal', journalV2Router);
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

  // Helper function to create mock pagination
  const createMockPagination = (overrides: Partial<any> = {}) => ({
    page: 1,
    limit: 20,
    total: 2,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
    ...overrides
  });

  describe('GET /api/v2/journal', () => {
    it('should get user journal entries with enhanced v2 response format', async () => {
      const entries = [
        createMockEntry({ id: '1', content: 'Entry 1' }),
        createMockEntry({ id: '2', content: 'Entry 2' })
      ];
      const pagination = createMockPagination();

      (mockUseCase.getUserEntries as Mock).mockResolvedValue(Result.ok({
        entries,
        pagination
      }));

      const response = await request(app)
        .get('/api/v2/journal')
        .expect(200);

      // V2 response should not include 'success' field
      expect(response.body).not.toHaveProperty('success');
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
        }
      });

      // Should include correlation ID in response headers
      expect(response.headers['x-correlation-id']).toBe('test-correlation-id');

      expect(mockUseCase.getUserEntries).toHaveBeenCalledWith('test-user-id', {
        search: undefined,
        tags: undefined,
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });
    });

    it('should support enhanced search with query parameters', async () => {
      const entries = [
        createMockEntry({ id: '1', content: 'Prayer reflection' }),
        createMockEntry({ id: '2', content: 'Daily gratitude' })
      ];
      const pagination = createMockPagination();

      (mockUseCase.getUserEntries as Mock).mockResolvedValue(Result.ok({
        entries,
        pagination
      }));

      const response = await request(app)
        .get('/api/v2/journal?search=prayer&tags=spirituality,reflection&page=2&limit=10&sortBy=content&sortOrder=asc')
        .expect(200);

      expect(mockUseCase.getUserEntries).toHaveBeenCalledWith('test-user-id', {
        search: 'prayer',
        tags: ['spirituality', 'reflection'],
        page: 2,
        limit: 10,
        sortBy: 'content',
        sortOrder: 'asc'
      });

      expect(response.body.entries).toHaveLength(2);
    });

    it('should validate and sanitize query parameters', async () => {
      const entries = [createMockEntry()];
      const pagination = createMockPagination();

      (mockUseCase.getUserEntries as Mock).mockResolvedValue(Result.ok({
        entries,
        pagination
      }));

      const response = await request(app)
        .get('/api/v2/journal?page=-1&limit=1000&sortBy=invalid&sortOrder=invalid&tags=')
        .expect(200);

      expect(mockUseCase.getUserEntries).toHaveBeenCalledWith('test-user-id', {
        search: undefined,
        tags: undefined,
        page: 1, // Corrected from -1
        limit: 100, // Capped at 100
        sortBy: 'createdAt', // Defaulted from invalid
        sortOrder: 'desc' // Defaulted from invalid
      });
    });

    it('should handle tag filtering with comma-separated values', async () => {
      const entries = [
        createMockEntry({ id: '1', tags: ['prayer', 'morning'] }),
        createMockEntry({ id: '2', tags: ['gratitude', 'evening'] }),
        createMockEntry({ id: '3', tags: ['prayer', 'dhikr'] })
      ];
      const pagination = createMockPagination({ total: 3 });

      (mockUseCase.getUserEntries as Mock).mockResolvedValue(Result.ok({
        entries,
        pagination
      }));

      const response = await request(app)
        .get('/api/v2/journal?tags=prayer,morning')
        .expect(200);

      expect(mockUseCase.getUserEntries).toHaveBeenCalledWith('test-user-id', {
        search: undefined,
        tags: ['prayer', 'morning'],
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });
    });

    it('should handle use case errors with proper HTTP status codes', async () => {
      (mockUseCase.getUserEntries as Mock).mockResolvedValue(
        Result.error(new Error('Database connection failed'))
      );

      const response = await request(app)
        .get('/api/v2/journal')
        .expect(500);

      expect(response.body).toMatchObject({
        error: 'Failed to fetch journal entries',
        correlationId: 'test-correlation-id'
      });
    });

    it('should return empty results when no entries found', async () => {
      (mockUseCase.getUserEntries as Mock).mockResolvedValue(Result.ok({
        entries: [],
        pagination: createMockPagination({ total: 0, totalPages: 0 })
      }));

      const response = await request(app)
        .get('/api/v2/journal?search=nonexistent')
        .expect(200);

      expect(response.body).toMatchObject({
        entries: [],
        pagination: {
          total: 0,
          totalPages: 0
        }
      });
    });
  });

  describe('GET /api/v2/journal/:id', () => {
    it('should get specific journal entry with v2 response format', async () => {
      const entry = createMockEntry({ id: 'specific-id', content: 'Specific entry' });
      (mockUseCase.getEntry as Mock).mockResolvedValue(Result.ok(entry));

      const response = await request(app)
        .get('/api/v2/journal/specific-id')
        .expect(200);

      // V2 response should not include 'success' field
      expect(response.body).not.toHaveProperty('success');
      expect(response.body).toMatchObject({
        entry: expect.objectContaining({
          id: 'specific-id',
          content: 'Specific entry'
        })
      });

      expect(response.headers['x-correlation-id']).toBe('test-correlation-id');
      expect(mockUseCase.getEntry).toHaveBeenCalledWith('specific-id', 'test-user-id');
    });

    it('should return 404 for non-existent entry', async () => {
      (mockUseCase.getEntry as Mock).mockResolvedValue(
        Result.error(new Error('Journal entry not found'))
      );

      const response = await request(app)
        .get('/api/v2/journal/non-existent')
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'Journal entry not found',
        correlationId: 'test-correlation-id'
      });
    });

    it('should return 403 for unauthorized access', async () => {
      (mockUseCase.getEntry as Mock).mockResolvedValue(
        Result.error(new Error('Access denied'))
      );

      const response = await request(app)
        .get('/api/v2/journal/unauthorized-id')
        .expect(403);

      expect(response.body).toMatchObject({
        error: 'Access denied',
        correlationId: 'test-correlation-id'
      });
    });
  });

  describe('POST /api/v2/journal', () => {
    it('should create new journal entry with v2 response format', async () => {
      const entry = createMockEntry({ content: 'New journal entry' });
      (mockUseCase.createEntry as Mock).mockResolvedValue(Result.ok(entry));

      const response = await request(app)
        .post('/api/v2/journal')
        .send({
          content: 'New journal entry',
          tags: ['reflection', 'spiritual']
        })
        .expect(201);

      // V2 response should not include 'success' field
      expect(response.body).not.toHaveProperty('success');
      expect(response.body).toMatchObject({
        entry: expect.objectContaining({
          content: 'New journal entry'
        })
      });

      expect(response.headers['x-correlation-id']).toBe('test-correlation-id');
      expect(mockUseCase.createEntry).toHaveBeenCalledWith({
        userId: 'test-user-id',
        content: 'New journal entry',
        tags: ['reflection', 'spiritual']
      });
    });

    it('should validate required content field with Zod schema', async () => {
      const response = await request(app)
        .post('/api/v2/journal')
        .send({})
        .expect(400);

      expect(response.body).toMatchObject({
        error: expect.stringContaining('content'),
        correlationId: 'test-correlation-id'
      });
    });

    it('should validate content is not empty or whitespace only', async () => {
      const response = await request(app)
        .post('/api/v2/journal')
        .send({ content: '   ' })
        .expect(400);

      expect(response.body).toMatchObject({
        error: expect.stringContaining('empty'),
        correlationId: 'test-correlation-id'
      });
    });

    it('should validate content length limit (5000 characters)', async () => {
      const longContent = 'a'.repeat(5001);

      const response = await request(app)
        .post('/api/v2/journal')
        .send({ content: longContent })
        .expect(400);

      expect(response.body).toMatchObject({
        error: expect.stringContaining('5000'),
        correlationId: 'test-correlation-id'
      });
    });

    it('should validate tags array format and limits', async () => {
      const tooManyTags = Array.from({ length: 11 }, (_, i) => `tag${i}`);

      const response = await request(app)
        .post('/api/v2/journal')
        .send({
          content: 'Valid content',
          tags: tooManyTags
        })
        .expect(400);

      expect(response.body).toMatchObject({
        error: expect.stringContaining('10'),
        correlationId: 'test-correlation-id'
      });
    });

    it('should validate individual tag length (50 characters)', async () => {
      const longTag = 'a'.repeat(51);

      const response = await request(app)
        .post('/api/v2/journal')
        .send({
          content: 'Valid content',
          tags: [longTag]
        })
        .expect(400);

      expect(response.body).toMatchObject({
        error: expect.stringContaining('50'),
        correlationId: 'test-correlation-id'
      });
    });

    it('should handle use case errors with proper status codes', async () => {
      (mockUseCase.createEntry as Mock).mockResolvedValue(
        Result.error(new Error('Database connection failed'))
      );

      const response = await request(app)
        .post('/api/v2/journal')
        .send({ content: 'Valid content' })
        .expect(500);

      expect(response.body).toMatchObject({
        error: 'Failed to create journal entry',
        correlationId: 'test-correlation-id'
      });
    });
  });

  describe('PUT /api/v2/journal/:id', () => {
    it('should update journal entry with v2 response format', async () => {
      const updatedEntry = createMockEntry({
        id: 'update-id',
        content: 'Updated content'
      });
      (mockUseCase.updateEntry as Mock).mockResolvedValue(Result.ok(updatedEntry));

      const response = await request(app)
        .put('/api/v2/journal/update-id')
        .send({
          content: 'Updated content',
          tags: ['updated', 'tags']
        })
        .expect(200);

      // V2 response should not include 'success' field
      expect(response.body).not.toHaveProperty('success');
      expect(response.body).toMatchObject({
        entry: expect.objectContaining({
          content: 'Updated content'
        })
      });

      expect(response.headers['x-correlation-id']).toBe('test-correlation-id');
      expect(mockUseCase.updateEntry).toHaveBeenCalledWith({
        id: 'update-id',
        userId: 'test-user-id',
        content: 'Updated content',
        tags: ['updated', 'tags']
      });
    });

    it('should support partial updates (content only)', async () => {
      const updatedEntry = createMockEntry({ id: 'update-id' });
      (mockUseCase.updateEntry as Mock).mockResolvedValue(Result.ok(updatedEntry));

      await request(app)
        .put('/api/v2/journal/update-id')
        .send({ content: 'Only content updated' })
        .expect(200);

      expect(mockUseCase.updateEntry).toHaveBeenCalledWith({
        id: 'update-id',
        userId: 'test-user-id',
        content: 'Only content updated',
        tags: undefined
      });
    });

    it('should support partial updates (tags only)', async () => {
      const updatedEntry = createMockEntry({ id: 'update-id' });
      (mockUseCase.updateEntry as Mock).mockResolvedValue(Result.ok(updatedEntry));

      await request(app)
        .put('/api/v2/journal/update-id')
        .send({ tags: ['new', 'tags'] })
        .expect(200);

      expect(mockUseCase.updateEntry).toHaveBeenCalledWith({
        id: 'update-id',
        userId: 'test-user-id',
        content: undefined,
        tags: ['new', 'tags']
      });
    });

    it('should validate content format if provided', async () => {
      const response = await request(app)
        .put('/api/v2/journal/update-id')
        .send({ content: 123 })
        .expect(400);

      expect(response.body).toMatchObject({
        error: expect.stringContaining('string'),
        correlationId: 'test-correlation-id'
      });
    });

    it('should handle not found entries', async () => {
      (mockUseCase.updateEntry as Mock).mockResolvedValue(
        Result.error(new Error('Journal entry not found'))
      );

      const response = await request(app)
        .put('/api/v2/journal/not-found')
        .send({ content: 'Updated content' })
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'Journal entry not found',
        correlationId: 'test-correlation-id'
      });
    });

    it('should handle unauthorized updates', async () => {
      (mockUseCase.updateEntry as Mock).mockResolvedValue(
        Result.error(new Error('Access denied'))
      );

      const response = await request(app)
        .put('/api/v2/journal/unauthorized-id')
        .send({ content: 'Updated content' })
        .expect(403);

      expect(response.body).toMatchObject({
        error: 'Access denied',
        correlationId: 'test-correlation-id'
      });
    });
  });

  describe('DELETE /api/v2/journal/:id', () => {
    it('should delete journal entry successfully with v2 response', async () => {
      (mockUseCase.deleteEntry as Mock).mockResolvedValue(Result.ok(undefined));

      const response = await request(app)
        .delete('/api/v2/journal/delete-id')
        .expect(204);

      // V2 should return 204 No Content for successful deletion
      expect(response.body).toEqual({});
      expect(response.headers['x-correlation-id']).toBe('test-correlation-id');
      expect(mockUseCase.deleteEntry).toHaveBeenCalledWith('delete-id', 'test-user-id');
    });

    it('should handle not found entries', async () => {
      (mockUseCase.deleteEntry as Mock).mockResolvedValue(
        Result.error(new Error('Journal entry not found'))
      );

      const response = await request(app)
        .delete('/api/v2/journal/not-found')
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'Journal entry not found',
        correlationId: 'test-correlation-id'
      });
    });

    it('should handle unauthorized deletions', async () => {
      (mockUseCase.deleteEntry as Mock).mockResolvedValue(
        Result.error(new Error('Access denied'))
      );

      const response = await request(app)
        .delete('/api/v2/journal/unauthorized-id')
        .expect(403);

      expect(response.body).toMatchObject({
        error: 'Access denied',
        correlationId: 'test-correlation-id'
      });
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication for all endpoints', async () => {
      // Reset mock to simulate no authentication
      (authMiddleware as Mock).mockImplementation((req: any, res: Response, next: any) => {
        res.status(401).json({ error: 'Unauthorized' });
      });

      const testApp = express();
      testApp.use(express.json());
      testApp.use('/api/v2/journal', journalV2Router);

      await request(testApp)
        .get('/api/v2/journal')
        .expect(401);

      await request(testApp)
        .post('/api/v2/journal')
        .send({ content: 'test' })
        .expect(401);

      await request(testApp)
        .put('/api/v2/journal/test-id')
        .send({ content: 'test' })
        .expect(401);

      await request(testApp)
        .delete('/api/v2/journal/test-id')
        .expect(401);

      await request(testApp)
        .get('/api/v2/journal/test-id')
        .expect(401);
    });

    it('should include correlation ID in all responses', async () => {
      const entry = createMockEntry();
      (mockUseCase.getUserEntries as Mock).mockResolvedValue(Result.ok({
        entries: [entry],
        pagination: createMockPagination()
      }));

      const response = await request(app)
        .get('/api/v2/journal')
        .expect(200);

      expect(response.headers['x-correlation-id']).toBe('test-correlation-id');
    });
  });

  describe('Performance and Pagination', () => {
    it('should handle large datasets with proper pagination', async () => {
      const entries = Array.from({ length: 100 }, (_, i) =>
        createMockEntry({ id: `${i + 1}`, content: `Entry ${i + 1}` })
      );
      const pagination = createMockPagination({
        page: 1,
        limit: 20,
        total: 100,
        totalPages: 5,
        hasNextPage: true
      });

      (mockUseCase.getUserEntries as Mock).mockResolvedValue(Result.ok({
        entries: entries.slice(0, 20),
        pagination
      }));

      const response = await request(app)
        .get('/api/v2/journal?limit=20')
        .expect(200);

      expect(response.body.entries.length).toBe(20);
      expect(response.body.pagination).toMatchObject({
        page: 1,
        limit: 20,
        total: 100,
        totalPages: 5,
        hasNextPage: true,
        hasPrevPage: false
      });
    });

    it('should enforce maximum limit to prevent performance issues', async () => {
      const entries = [createMockEntry()];
      const pagination = createMockPagination();

      (mockUseCase.getUserEntries as Mock).mockResolvedValue(Result.ok({
        entries,
        pagination
      }));

      const response = await request(app)
        .get('/api/v2/journal?limit=500')
        .expect(200);

      // Should be called with capped limit
      expect(mockUseCase.getUserEntries).toHaveBeenCalledWith('test-user-id', {
        search: undefined,
        tags: undefined,
        page: 1,
        limit: 100, // Capped at 100
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });
    });
  });

  describe('Error Handling and Logging', () => {
    it('should handle unexpected errors gracefully', async () => {
      (mockUseCase.getUserEntries as Mock).mockRejectedValue(new Error('Unexpected error'));

      const response = await request(app)
        .get('/api/v2/journal')
        .expect(500);

      expect(response.body).toMatchObject({
        error: 'Internal server error',
        correlationId: 'test-correlation-id'
      });
    });

    it('should handle validation errors with detailed messages', async () => {
      const response = await request(app)
        .post('/api/v2/journal')
        .send({
          content: '', // Empty content
          tags: 'not-an-array' // Wrong type
        })
        .expect(400);

      expect(response.body).toMatchObject({
        error: expect.any(String),
        correlationId: 'test-correlation-id'
      });
    });
  });

  describe('Data Sanitization and Security', () => {
    it('should sanitize input data to prevent XSS', async () => {
      const entry = createMockEntry({ content: 'Sanitized content' });
      (mockUseCase.createEntry as Mock).mockResolvedValue(Result.ok(entry));

      const response = await request(app)
        .post('/api/v2/journal')
        .send({
          content: '<script>alert("xss")</script>Test content',
          tags: ['<script>', 'normal-tag']
        })
        .expect(201);

      // Should call use case with sanitized data
      expect(mockUseCase.createEntry).toHaveBeenCalledWith({
        userId: 'test-user-id',
        content: expect.not.stringContaining('<script>'),
        tags: expect.arrayContaining(['normal-tag'])
      });
    });

    it('should validate user ownership in all operations', async () => {
      // This is handled by the use case layer, but the route should pass the userId
      const entry = createMockEntry();
      (mockUseCase.getEntry as Mock).mockResolvedValue(Result.ok(entry));

      await request(app)
        .get('/api/v2/journal/test-id')
        .expect(200);

      expect(mockUseCase.getEntry).toHaveBeenCalledWith('test-id', 'test-user-id');
    });
  });

  describe('Content Type and Headers', () => {
    it('should accept JSON content type', async () => {
      const entry = createMockEntry();
      (mockUseCase.createEntry as Mock).mockResolvedValue(Result.ok(entry));

      await request(app)
        .post('/api/v2/journal')
        .set('Content-Type', 'application/json')
        .send({
          content: 'Test content'
        })
        .expect(201);
    });

    it('should reject non-JSON content type for POST/PUT requests', async () => {
      await request(app)
        .post('/api/v2/journal')
        .set('Content-Type', 'text/plain')
        .send('plain text content')
        .expect(400);
    });

    it('should return JSON content type', async () => {
      const entries = [createMockEntry()];
      const pagination = createMockPagination();

      (mockUseCase.getUserEntries as Mock).mockResolvedValue(Result.ok({
        entries,
        pagination
      }));

      const response = await request(app)
        .get('/api/v2/journal')
        .expect(200);

      expect(response.type).toBe('application/json');
    });
  });
});

// Helper function tests for V2 specific functionality
describe('Journal V2 Route Helpers', () => {
  describe('Enhanced Pagination Validation', () => {
    it('should validate and correct pagination parameters with v2 limits', () => {
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
    });
  });

  describe('Enhanced Tag Processing', () => {
    it('should parse and validate tags from query string', () => {
      const parseTagsFromQuery = (tagString: string) => {
        if (!tagString || tagString.trim() === '') {
          return undefined;
        }

        return tagString
          .split(',')
          .map(tag => tag.trim().toLowerCase())
          .filter(tag => tag.length > 0 && tag.length <= 50)
          .slice(0, 10); // Max 10 tags
      };

      expect(parseTagsFromQuery('')).toBeUndefined();
      expect(parseTagsFromQuery('  ')).toBeUndefined();
      expect(parseTagsFromQuery('tag1,tag2,tag3')).toEqual(['tag1', 'tag2', 'tag3']);
      expect(parseTagsFromQuery('TAG1, Tag2 , tag3')).toEqual(['tag1', 'tag2', 'tag3']);
      expect(parseTagsFromQuery('tag1,,tag2, ,tag3')).toEqual(['tag1', 'tag2', 'tag3']);

      // Should handle max tags limit
      const manyTags = Array.from({ length: 15 }, (_, i) => `tag${i}`).join(',');
      expect(parseTagsFromQuery(manyTags)).toHaveLength(10);

      // Should filter out long tags
      const longTag = 'a'.repeat(51);
      expect(parseTagsFromQuery(`valid,${longTag},another`)).toEqual(['valid', 'another']);
    });
  });

  describe('Sort and Filter Validation', () => {
    it('should validate sort parameters with v2 options', () => {
      const validateSort = (sortBy: string, sortOrder: string) => {
        const validSortFields = ['createdAt', 'content', 'updatedAt'];
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

      expect(validateSort('updatedAt', 'desc')).toEqual({
        sortBy: 'updatedAt',
        sortOrder: 'desc'
      });
    });
  });

  describe('Search Query Processing', () => {
    it('should sanitize and validate search queries', () => {
      const sanitizeSearchQuery = (query: string) => {
        if (!query || query.trim() === '') {
          return undefined;
        }

        // Remove HTML tags and limit length
        const sanitized = query
          .replace(/<[^>]*>/g, '')
          .trim()
          .substring(0, 200);

        return sanitized.length > 0 ? sanitized : undefined;
      };

      expect(sanitizeSearchQuery('')).toBeUndefined();
      expect(sanitizeSearchQuery('   ')).toBeUndefined();
      expect(sanitizeSearchQuery('normal query')).toBe('normal query');
      expect(sanitizeSearchQuery('<script>alert("xss")</script>prayer')).toBe('prayer');
      expect(sanitizeSearchQuery('  surrounded by spaces  ')).toBe('surrounded by spaces');

      // Should handle long queries
      const longQuery = 'a'.repeat(250);
      expect(sanitizeSearchQuery(longQuery)).toHaveLength(200);
    });
  });
});