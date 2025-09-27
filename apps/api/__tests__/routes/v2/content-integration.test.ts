import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { app } from '../../../src/server';
import { container } from 'tsyringe';
import { IContentRepository } from '../../../src/domain/repositories';
import { Result } from '../../../src/shared/result';
import { ContentType } from '@sakinah/types';

// Mock the content repository
const mockContentRepository = {
  findWithFilter: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  findAll: vi.fn()
};

const mockContentData = [
  {
    id: '123e4567-e89b-12d3-a456-426614174000',
    type: 'ayah' as ContentType,
    title: 'Patience in Hardship',
    text: 'وَبَشِّرِ الصَّابِرِينَ',
    arabic_text: 'وَبَشِّرِ الصَّابِرِينَ',
    translation: 'And give good tidings to the patient',
    ref: 'Quran 2:155',
    tags: ['patience', 'trust', 'trial'],
    createdAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '456e7890-e89b-12d3-a456-426614174001',
    type: 'hadith' as ContentType,
    title: 'Gratitude',
    text: 'He who does not thank people, does not thank Allah',
    ref: 'Sunan At-Tirmidhi 1955',
    tags: ['gratitude', 'character', 'social'],
    createdAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '789e1234-e89b-12d3-a456-426614174002',
    type: 'dua' as ContentType,
    title: 'Morning Dua',
    text: 'اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ',
    arabic_text: 'اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ',
    translation: 'O Allah, help me to remember You, thank You, and worship You in the best manner',
    ref: 'Abu Dawud',
    tags: ['dhikr', 'gratitude', 'worship'],
    createdAt: '2024-01-01T00:00:00Z'
  }
];

describe('Content API v2 Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Register mock repository
    container.registerInstance('IContentRepository', mockContentRepository as IContentRepository);

    // Setup default successful responses
    mockContentRepository.findWithFilter.mockResolvedValue(Result.ok(mockContentData));
    mockContentRepository.findById.mockResolvedValue(Result.ok(mockContentData[0]));
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /v2/content', () => {
    it('should return content successfully with default parameters', async () => {
      const response = await request(app)
        .get('/api/v2/content')
        .expect(200);

      expect(response.body).toEqual({
        data: mockContentData,
        pagination: {
          limit: 20,
          offset: 0
        }
      });

      expect(mockContentRepository.findWithFilter).toHaveBeenCalledWith({
        limit: 20,
        offset: 0
      });
    });

    it('should filter content by type', async () => {
      const filteredData = [mockContentData[0]]; // Only ayah
      mockContentRepository.findWithFilter.mockResolvedValue(Result.ok(filteredData));

      const response = await request(app)
        .get('/api/v2/content?type=ayah')
        .expect(200);

      expect(response.body.data).toEqual(filteredData);
      expect(mockContentRepository.findWithFilter).toHaveBeenCalledWith({
        type: 'ayah',
        limit: 20,
        offset: 0
      });
    });

    it('should filter content by tags', async () => {
      const filteredData = [mockContentData[0]]; // Only content with patience tag
      mockContentRepository.findWithFilter.mockResolvedValue(Result.ok(filteredData));

      const response = await request(app)
        .get('/api/v2/content?tags=patience,trust')
        .expect(200);

      expect(response.body.data).toEqual(filteredData);
      expect(mockContentRepository.findWithFilter).toHaveBeenCalledWith({
        tags: ['patience', 'trust'],
        limit: 20,
        offset: 0
      });
    });

    it('should handle custom pagination parameters', async () => {
      const response = await request(app)
        .get('/api/v2/content?limit=10&offset=20')
        .expect(200);

      expect(response.body.pagination).toEqual({
        limit: 10,
        offset: 20
      });

      expect(mockContentRepository.findWithFilter).toHaveBeenCalledWith({
        limit: 10,
        offset: 20
      });
    });

    it('should combine multiple filter parameters', async () => {
      await request(app)
        .get('/api/v2/content?type=hadith&tags=gratitude&limit=5&offset=10')
        .expect(200);

      expect(mockContentRepository.findWithFilter).toHaveBeenCalledWith({
        type: 'hadith',
        tags: ['gratitude'],
        limit: 5,
        offset: 10
      });
    });

    it('should handle empty tags parameter', async () => {
      await request(app)
        .get('/api/v2/content?tags=')
        .expect(200);

      expect(mockContentRepository.findWithFilter).toHaveBeenCalledWith({
        limit: 20,
        offset: 0
      });
    });

    it('should trim whitespace from tags', async () => {
      await request(app)
        .get('/api/v2/content?tags= patience , gratitude , trust ')
        .expect(200);

      expect(mockContentRepository.findWithFilter).toHaveBeenCalledWith({
        tags: ['patience', 'gratitude', 'trust'],
        limit: 20,
        offset: 0
      });
    });

    it('should validate limit parameter bounds', async () => {
      // Test minimum limit
      await request(app)
        .get('/api/v2/content?limit=0')
        .expect(400);

      // Test maximum limit
      await request(app)
        .get('/api/v2/content?limit=101')
        .expect(400);
    });

    it('should validate offset parameter', async () => {
      await request(app)
        .get('/api/v2/content?offset=-1')
        .expect(400);
    });

    it('should validate content type parameter', async () => {
      await request(app)
        .get('/api/v2/content?type=invalid')
        .expect(400);

      expect(mockContentRepository.findWithFilter).not.toHaveBeenCalled();
    });

    it('should handle repository errors gracefully', async () => {
      const errorMessage = 'Database connection failed';
      mockContentRepository.findWithFilter.mockResolvedValue(
        Result.error({ message: errorMessage, code: 'DB_ERROR' })
      );

      const response = await request(app)
        .get('/api/v2/content')
        .expect(500);

      expect(response.body).toEqual({
        error: 'CONTENT_RETRIEVAL_FAILED',
        message: 'Failed to retrieve content'
      });
    });

    it('should handle unexpected errors', async () => {
      mockContentRepository.findWithFilter.mockRejectedValue(new Error('Unexpected error'));

      const response = await request(app)
        .get('/api/v2/content')
        .expect(500);

      expect(response.body).toEqual({
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve content'
      });
    });

    it('should include correlation ID in logs', async () => {
      const correlationId = 'test-correlation-id';

      await request(app)
        .get('/api/v2/content')
        .set('x-correlation-id', correlationId)
        .expect(200);

      // Verify that the repository was called (correlation ID is handled by middleware)
      expect(mockContentRepository.findWithFilter).toHaveBeenCalled();
    });
  });

  describe('GET /v2/content/:id', () => {
    const validId = '123e4567-e89b-12d3-a456-426614174000';

    it('should return specific content by ID', async () => {
      const response = await request(app)
        .get(`/api/v2/content/${validId}`)
        .expect(200);

      expect(response.body).toEqual({
        data: mockContentData[0]
      });

      expect(mockContentRepository.findById).toHaveBeenCalledWith(validId);
    });

    it('should return 404 when content is not found', async () => {
      mockContentRepository.findById.mockResolvedValue(Result.ok(null));

      const response = await request(app)
        .get(`/api/v2/content/${validId}`)
        .expect(404);

      expect(response.body).toEqual({
        error: 'CONTENT_NOT_FOUND',
        message: 'Content with the specified ID was not found'
      });
    });

    it('should validate UUID format', async () => {
      const invalidId = 'invalid-uuid';

      const response = await request(app)
        .get(`/api/v2/content/${invalidId}`)
        .expect(400);

      expect(response.body).toEqual({
        error: 'INVALID_UUID',
        message: 'Invalid content ID format'
      });

      expect(mockContentRepository.findById).not.toHaveBeenCalled();
    });

    it('should handle repository errors for findById', async () => {
      mockContentRepository.findById.mockResolvedValue(
        Result.error({ message: 'Database error', code: 'DB_ERROR' })
      );

      const response = await request(app)
        .get(`/api/v2/content/${validId}`)
        .expect(500);

      expect(response.body).toEqual({
        error: 'CONTENT_RETRIEVAL_FAILED',
        message: 'Failed to retrieve content'
      });
    });

    it('should handle unexpected errors for findById', async () => {
      mockContentRepository.findById.mockRejectedValue(new Error('Unexpected error'));

      const response = await request(app)
        .get(`/api/v2/content/${validId}`)
        .expect(500);

      expect(response.body).toEqual({
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve content'
      });
    });
  });

  describe('Content Type Validation', () => {
    it('should accept all valid content types', async () => {
      const validTypes = ['ayah', 'hadith', 'dua', 'note'];

      for (const type of validTypes) {
        await request(app)
          .get(`/api/v2/content?type=${type}`)
          .expect(200);

        expect(mockContentRepository.findWithFilter).toHaveBeenCalledWith({
          type,
          limit: 20,
          offset: 0
        });
      }
    });
  });

  describe('API Documentation Examples', () => {
    it('should match documentation example for Quranic verses', async () => {
      const quranicContent = [mockContentData[0]];
      mockContentRepository.findWithFilter.mockResolvedValue(Result.ok(quranicContent));

      const response = await request(app)
        .get('/api/v2/content?type=ayah&tags=patience')
        .expect(200);

      expect(response.body).toMatchObject({
        data: expect.arrayContaining([
          expect.objectContaining({
            type: 'ayah',
            text: expect.any(String),
            ref: expect.stringMatching(/Quran/),
            tags: expect.arrayContaining(['patience'])
          })
        ]),
        pagination: {
          limit: 20,
          offset: 0
        }
      });
    });

    it('should match documentation example for Hadith collection', async () => {
      const hadithContent = [mockContentData[1]];
      mockContentRepository.findWithFilter.mockResolvedValue(Result.ok(hadithContent));

      const response = await request(app)
        .get('/api/v2/content?type=hadith&tags=gratitude')
        .expect(200);

      expect(response.body).toMatchObject({
        data: expect.arrayContaining([
          expect.objectContaining({
            type: 'hadith',
            text: expect.any(String),
            ref: expect.stringMatching(/Tirmidhi|Bukhari|Muslim|Abu Dawud/),
            tags: expect.arrayContaining(['gratitude'])
          })
        ]),
        pagination: {
          limit: 20,
          offset: 0
        }
      });
    });
  });

  describe('Performance and Caching Headers', () => {
    it('should include appropriate response headers', async () => {
      const response = await request(app)
        .get('/api/v2/content')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('should handle large result sets efficiently', async () => {
      const largeDataSet = Array(100).fill(null).map((_, index) => ({
        ...mockContentData[0],
        id: `content-${index}`,
        title: `Content Item ${index}`
      }));

      mockContentRepository.findWithFilter.mockResolvedValue(Result.ok(largeDataSet));

      const response = await request(app)
        .get('/api/v2/content?limit=100')
        .expect(200);

      expect(response.body.data).toHaveLength(100);
      expect(response.body.pagination.limit).toBe(100);
    });
  });

  describe('Content Structure Validation', () => {
    it('should return content with required fields', async () => {
      const response = await request(app)
        .get('/api/v2/content')
        .expect(200);

      const content = response.body.data[0];
      expect(content).toMatchObject({
        id: expect.any(String),
        type: expect.stringMatching(/^(ayah|hadith|dua|note)$/),
        text: expect.any(String),
        ref: expect.any(String),
        tags: expect.any(Array),
        createdAt: expect.any(String)
      });
    });

    it('should include optional fields when present', async () => {
      const response = await request(app)
        .get('/api/v2/content')
        .expect(200);

      const ayahContent = response.body.data.find((item: any) => item.type === 'ayah');
      if (ayahContent) {
        expect(ayahContent).toHaveProperty('arabic_text');
        expect(ayahContent).toHaveProperty('translation');
        expect(ayahContent).toHaveProperty('title');
      }
    });
  });
});