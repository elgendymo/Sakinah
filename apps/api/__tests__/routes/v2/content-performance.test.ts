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

// Generate mock data for performance testing
const generateMockContent = (count: number) => {
  return Array(count).fill(null).map((_, index) => ({
    id: `content-${index.toString().padStart(8, '0')}`,
    type: ['ayah', 'hadith', 'dua', 'note'][index % 4] as ContentType,
    title: `Content Item ${index}`,
    text: `This is the text content for item ${index}. `.repeat(10), // ~300 chars
    arabic_text: index % 2 === 0 ? `النص العربي رقم ${index}` : undefined,
    translation: `Translation for content item ${index}`,
    ref: `Reference ${index}`,
    tags: [
      'patience', 'gratitude', 'tawakkul', 'dhikr', 'prayer',
      'forgiveness', 'charity', 'knowledge', 'taqwa', 'hope'
    ].slice(0, (index % 5) + 1),
    createdAt: new Date(Date.now() - index * 86400000).toISOString() // Different dates
  }));
};

describe('Content API v2 Performance Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    container.registerInstance('IContentRepository', mockContentRepository as IContentRepository);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Response Time Requirements', () => {
    it('should respond within 200ms for standard pagination (20 items)', async () => {
      const mockData = generateMockContent(20);
      mockContentRepository.findWithFilter.mockResolvedValue(Result.ok(mockData));

      const startTime = Date.now();

      await request(app)
        .get('/api/v2/content')
        .expect(200);

      const responseTime = Date.now() - startTime;

      // API should respond within 200ms for 95th percentile (requirement from design doc)
      expect(responseTime).toBeLessThan(200);
    });

    it('should respond within 200ms for maximum pagination (100 items)', async () => {
      const mockData = generateMockContent(100);
      mockContentRepository.findWithFilter.mockResolvedValue(Result.ok(mockData));

      const startTime = Date.now();

      await request(app)
        .get('/api/v2/content?limit=100')
        .expect(200);

      const responseTime = Date.now() - startTime;

      expect(responseTime).toBeLessThan(200);
    });

    it('should respond within 200ms for filtered content', async () => {
      const mockData = generateMockContent(50).filter(item =>
        item.type === 'ayah' && item.tags.includes('patience')
      );
      mockContentRepository.findWithFilter.mockResolvedValue(Result.ok(mockData));

      const startTime = Date.now();

      await request(app)
        .get('/api/v2/content?type=ayah&tags=patience')
        .expect(200);

      const responseTime = Date.now() - startTime;

      expect(responseTime).toBeLessThan(200);
    });

    it('should respond within 100ms for single content retrieval', async () => {
      const mockData = generateMockContent(1)[0];
      mockContentRepository.findById.mockResolvedValue(Result.ok(mockData));

      const startTime = Date.now();

      await request(app)
        .get('/api/v2/content/123e4567-e89b-12d3-a456-426614174000')
        .expect(200);

      const responseTime = Date.now() - startTime;

      // Single item retrieval should be faster
      expect(responseTime).toBeLessThan(100);
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should handle multiple concurrent requests efficiently', async () => {
      const mockData = generateMockContent(20);
      mockContentRepository.findWithFilter.mockResolvedValue(Result.ok(mockData));

      const concurrentRequests = 10;
      const startTime = Date.now();

      // Send multiple concurrent requests
      const promises = Array(concurrentRequests).fill(null).map(() =>
        request(app)
          .get('/api/v2/content')
          .expect(200)
      );

      const responses = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      // All requests should complete
      expect(responses).toHaveLength(concurrentRequests);

      // Average time per request should still be reasonable
      const averageTime = totalTime / concurrentRequests;
      expect(averageTime).toBeLessThan(300); // Allow some overhead for concurrency

      // All responses should be identical
      const firstResponse = responses[0].body;
      responses.forEach(response => {
        expect(response.body).toEqual(firstResponse);
      });
    });

    it('should handle concurrent requests with different parameters', async () => {
      const ayahData = generateMockContent(10).filter(item => item.type === 'ayah');
      const hadithData = generateMockContent(10).filter(item => item.type === 'hadith');
      const duaData = generateMockContent(10).filter(item => item.type === 'dua');

      mockContentRepository.findWithFilter
        .mockResolvedValueOnce(Result.ok(ayahData))
        .mockResolvedValueOnce(Result.ok(hadithData))
        .mockResolvedValueOnce(Result.ok(duaData));

      const startTime = Date.now();

      const promises = [
        request(app).get('/api/v2/content?type=ayah').expect(200),
        request(app).get('/api/v2/content?type=hadith').expect(200),
        request(app).get('/api/v2/content?type=dua').expect(200)
      ];

      const responses = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      expect(totalTime).toBeLessThan(500); // Should complete within 500ms
      expect(responses).toHaveLength(3);
    });
  });

  describe('Memory Usage and Payload Size', () => {
    it('should handle large content payloads efficiently', async () => {
      // Generate content with large text fields
      const largeContent = generateMockContent(50).map(item => ({
        ...item,
        text: 'Large content text. '.repeat(100), // ~2KB per item
        translation: 'Large translation text. '.repeat(50), // ~1KB per item
        arabic_text: 'نص عربي كبير. '.repeat(20) // ~400 bytes per item
      }));

      mockContentRepository.findWithFilter.mockResolvedValue(Result.ok(largeContent));

      const response = await request(app)
        .get('/api/v2/content?limit=50')
        .expect(200);

      // Response should still be reasonable size (under 1MB)
      const responseSize = JSON.stringify(response.body).length;
      expect(responseSize).toBeLessThan(1024 * 1024); // 1MB limit

      // Should contain all requested items
      expect(response.body.data).toHaveLength(50);
    });

    it('should limit maximum items per request for performance', async () => {
      // Attempt to request more than the maximum allowed
      await request(app)
        .get('/api/v2/content?limit=101')
        .expect(400);
    });
  });

  describe('Database Query Optimization', () => {
    it('should call repository with optimized parameters', async () => {
      const mockData = generateMockContent(20);
      mockContentRepository.findWithFilter.mockResolvedValue(Result.ok(mockData));

      await request(app)
        .get('/api/v2/content?tags=patience,gratitude&type=ayah&limit=10&offset=20')
        .expect(200);

      // Verify repository was called with structured filter
      expect(mockContentRepository.findWithFilter).toHaveBeenCalledWith({
        tags: ['patience', 'gratitude'],
        type: 'ayah',
        limit: 10,
        offset: 20
      });

      // Should be called only once (no N+1 queries)
      expect(mockContentRepository.findWithFilter).toHaveBeenCalledTimes(1);
    });

    it('should handle complex tag filtering efficiently', async () => {
      const complexTags = ['patience', 'gratitude', 'tawakkul', 'dhikr', 'prayer'];
      const mockData = generateMockContent(30);
      mockContentRepository.findWithFilter.mockResolvedValue(Result.ok(mockData));

      const startTime = Date.now();

      await request(app)
        .get(`/api/v2/content?tags=${complexTags.join(',')}`)
        .expect(200);

      const responseTime = Date.now() - startTime;

      // Complex filtering should still be fast
      expect(responseTime).toBeLessThan(150);

      expect(mockContentRepository.findWithFilter).toHaveBeenCalledWith({
        tags: complexTags,
        limit: 20,
        offset: 0
      });
    });
  });

  describe('Error Handling Performance', () => {
    it('should handle errors quickly without timeout', async () => {
      mockContentRepository.findWithFilter.mockResolvedValue(
        Result.error({ message: 'Database error', code: 'DB_ERROR' })
      );

      const startTime = Date.now();

      await request(app)
        .get('/api/v2/content')
        .expect(500);

      const responseTime = Date.now() - startTime;

      // Error responses should be fast
      expect(responseTime).toBeLessThan(100);
    });

    it('should handle validation errors efficiently', async () => {
      const startTime = Date.now();

      await request(app)
        .get('/api/v2/content?type=invalid&limit=invalid')
        .expect(400);

      const responseTime = Date.now() - startTime;

      // Validation should be very fast
      expect(responseTime).toBeLessThan(50);

      // Should not call repository for invalid requests
      expect(mockContentRepository.findWithFilter).not.toHaveBeenCalled();
    });
  });

  describe('Stress Testing', () => {
    it('should maintain performance under rapid sequential requests', async () => {
      const mockData = generateMockContent(20);
      mockContentRepository.findWithFilter.mockResolvedValue(Result.ok(mockData));

      const numberOfRequests = 20;
      const maxTimePerRequest = 250; // Allow some variance for sequential requests

      for (let i = 0; i < numberOfRequests; i++) {
        const startTime = Date.now();

        await request(app)
          .get('/api/v2/content?offset=' + (i * 20))
          .expect(200);

        const responseTime = Date.now() - startTime;
        expect(responseTime).toBeLessThan(maxTimePerRequest);
      }
    });

    it('should handle edge case requests efficiently', async () => {
      // Test various edge cases
      const edgeCases = [
        '/api/v2/content?limit=1&offset=0',
        '/api/v2/content?limit=100&offset=9900',
        '/api/v2/content?tags=very-rare-tag',
        '/api/v2/content?type=note&tags=patience,gratitude,tawakkul,dhikr,prayer'
      ];

      mockContentRepository.findWithFilter.mockResolvedValue(Result.ok([]));

      for (const endpoint of edgeCases) {
        const startTime = Date.now();

        await request(app)
          .get(endpoint)
          .expect(200);

        const responseTime = Date.now() - startTime;
        expect(responseTime).toBeLessThan(200);
      }
    });
  });

  describe('Content Size and Efficiency', () => {
    it('should return reasonable response sizes for different content types', async () => {
      const contentByType = {
        ayah: generateMockContent(20).filter(item => item.type === 'ayah'),
        hadith: generateMockContent(20).filter(item => item.type === 'hadith'),
        dua: generateMockContent(20).filter(item => item.type === 'dua'),
        note: generateMockContent(20).filter(item => item.type === 'note')
      };

      for (const [type, data] of Object.entries(contentByType)) {
        mockContentRepository.findWithFilter.mockResolvedValue(Result.ok(data));

        const response = await request(app)
          .get(`/api/v2/content?type=${type}`)
          .expect(200);

        const responseSize = JSON.stringify(response.body).length;

        // Each response should be under 100KB for 20 items
        expect(responseSize).toBeLessThan(100 * 1024);

        // Should have proper structure
        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('pagination');
      }
    });

    it('should optimize response structure for minimal overhead', async () => {
      const mockData = generateMockContent(1);
      mockContentRepository.findWithFilter.mockResolvedValue(Result.ok(mockData));

      const response = await request(app)
        .get('/api/v2/content?limit=1')
        .expect(200);

      // Response should only contain necessary fields
      const requiredFields = ['data', 'pagination'];
      const responseKeys = Object.keys(response.body);

      expect(responseKeys).toEqual(expect.arrayContaining(requiredFields));
      expect(responseKeys.length).toBe(requiredFields.length);

      // Pagination should be minimal
      const pagination = response.body.pagination;
      expect(Object.keys(pagination)).toEqual(['limit', 'offset']);
    });
  });
});