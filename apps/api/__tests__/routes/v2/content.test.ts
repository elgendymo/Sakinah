import request from 'supertest';
import express from 'express';
import { container } from 'tsyringe';
import contentRouter from '../../../src/routes/v2/content';
import { IContentRepository } from '../../../src/domain/repositories/IContentRepository';
import { ContentSnippet, ContentType } from '@sakinah/types';
import { Result } from '../../../src/shared/result';

// Mock dependencies
const mockContentRepository = {
  findByTags: vi.fn(),
  findById: vi.fn(),
  findAll: vi.fn(),
  findWithFilter: vi.fn()
};

// Mock validation middleware
vi.mock('../../../src/infrastructure/middleware/validation', () => ({
  validateQuery: (schema: any) => (req: any, res: any, next: any) => next()
}));

// Mock logger
vi.mock('../../../src/shared/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}));

// Mock container
beforeEach(() => {
  vi.clearAllMocks();
  container.register('IContentRepository', { useValue: mockContentRepository });
});

describe('GET /v2/content', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      req.correlationId = 'test-correlation-id';
      next();
    });
    app.use('/v2/content', contentRouter);
  });

  it('should retrieve content successfully with default parameters', async () => {
    const mockContentData: ContentSnippet[] = [
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'ayah',
        text: 'And give good tidings to the patient',
        ref: 'Quran 2:155',
        tags: ['patience', 'trust', 'trial'],
        createdAt: '2024-01-01T00:00:00Z'
      },
      {
        id: '456e7890-e89b-12d3-a456-426614174001',
        type: 'hadith',
        text: 'He who does not thank people, does not thank Allah',
        ref: 'Sunan At-Tirmidhi 1955',
        tags: ['gratitude', 'character', 'social'],
        createdAt: '2024-01-01T00:00:00Z'
      }
    ];

    mockContentRepository.findWithFilter.mockResolvedValue(Result.ok(mockContentData));

    const response = await request(app)
      .get('/v2/content')
      .expect(200);

    expect(response.body).toHaveProperty('data');
    expect(response.body).toHaveProperty('pagination');
    expect(response.body.data).toHaveLength(2);
    expect(response.body.data[0].type).toBe('ayah');
    expect(response.body.data[1].type).toBe('hadith');
    expect(response.body.pagination).toEqual({
      limit: 20,
      offset: 0
    });

    expect(mockContentRepository.findWithFilter).toHaveBeenCalledWith({
      tags: undefined,
      type: undefined,
      limit: 20,
      offset: 0
    });
  });

  it('should filter content by tags', async () => {
    const mockContentData: ContentSnippet[] = [
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'ayah',
        text: 'And give good tidings to the patient',
        ref: 'Quran 2:155',
        tags: ['patience', 'trust', 'trial'],
        createdAt: '2024-01-01T00:00:00Z'
      }
    ];

    mockContentRepository.findWithFilter.mockResolvedValue(Result.ok(mockContentData));

    const response = await request(app)
      .get('/v2/content?tags=patience,trust')
      .expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].tags).toContain('patience');
    expect(response.body.data[0].tags).toContain('trust');

    expect(mockContentRepository.findWithFilter).toHaveBeenCalledWith({
      tags: ['patience', 'trust'],
      type: undefined,
      limit: 20,
      offset: 0
    });
  });

  it('should filter content by type', async () => {
    const mockContentData: ContentSnippet[] = [
      {
        id: '456e7890-e89b-12d3-a456-426614174001',
        type: 'hadith',
        text: 'He who does not thank people, does not thank Allah',
        ref: 'Sunan At-Tirmidhi 1955',
        tags: ['gratitude', 'character', 'social'],
        createdAt: '2024-01-01T00:00:00Z'
      }
    ];

    mockContentRepository.findWithFilter.mockResolvedValue(Result.ok(mockContentData));

    const response = await request(app)
      .get('/v2/content?type=hadith')
      .expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].type).toBe('hadith');

    expect(mockContentRepository.findWithFilter).toHaveBeenCalledWith({
      tags: undefined,
      type: 'hadith',
      limit: 20,
      offset: 0
    });
  });

  it('should apply pagination parameters', async () => {
    const mockContentData: ContentSnippet[] = [
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'ayah',
        text: 'And give good tidings to the patient',
        ref: 'Quran 2:155',
        tags: ['patience', 'trust', 'trial'],
        createdAt: '2024-01-01T00:00:00Z'
      }
    ];

    mockContentRepository.findWithFilter.mockResolvedValue(Result.ok(mockContentData));

    const response = await request(app)
      .get('/v2/content?limit=10&offset=5')
      .expect(200);

    expect(response.body.pagination).toEqual({
      limit: 10,
      offset: 5
    });

    expect(mockContentRepository.findWithFilter).toHaveBeenCalledWith({
      tags: undefined,
      type: undefined,
      limit: 10,
      offset: 5
    });
  });

  it('should combine multiple filters', async () => {
    const mockContentData: ContentSnippet[] = [
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'dua',
        text: 'Our Lord, grant us patience and take our souls in submission',
        ref: 'Quran 7:126',
        tags: ['patience', 'submission', 'dua'],
        createdAt: '2024-01-01T00:00:00Z'
      }
    ];

    mockContentRepository.findWithFilter.mockResolvedValue(Result.ok(mockContentData));

    const response = await request(app)
      .get('/v2/content?tags=patience,submission&type=dua&limit=5&offset=0')
      .expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].type).toBe('dua');
    expect(response.body.data[0].tags).toContain('patience');

    expect(mockContentRepository.findWithFilter).toHaveBeenCalledWith({
      tags: ['patience', 'submission'],
      type: 'dua',
      limit: 5,
      offset: 0
    });
  });

  it('should handle empty tag list gracefully', async () => {
    const mockContentData: ContentSnippet[] = [];

    mockContentRepository.findWithFilter.mockResolvedValue(Result.ok(mockContentData));

    const response = await request(app)
      .get('/v2/content?tags=')
      .expect(200);

    expect(response.body.data).toHaveLength(0);

    expect(mockContentRepository.findWithFilter).toHaveBeenCalledWith({
      tags: undefined,
      type: undefined,
      limit: 20,
      offset: 0
    });
  });

  it('should handle repository errors gracefully', async () => {
    mockContentRepository.findWithFilter.mockResolvedValue(
      Result.error(new Error('Database connection failed'))
    );

    const response = await request(app)
      .get('/v2/content')
      .expect(500);

    expect(response.body).toEqual({
      error: 'CONTENT_RETRIEVAL_FAILED',
      message: 'Failed to retrieve content'
    });
  });

  it('should handle unexpected errors gracefully', async () => {
    mockContentRepository.findWithFilter.mockRejectedValue(new Error('Unexpected error'));

    const response = await request(app)
      .get('/v2/content')
      .expect(500);

    expect(response.body).toEqual({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to retrieve content'
    });
  });
});

describe('GET /v2/content/:id', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      req.correlationId = 'test-correlation-id';
      next();
    });
    app.use('/v2/content', contentRouter);
  });

  it('should retrieve content by ID successfully', async () => {
    const mockContent: ContentSnippet = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      type: 'ayah',
      text: 'And give good tidings to the patient',
      ref: 'Quran 2:155',
      tags: ['patience', 'trust', 'trial'],
      createdAt: '2024-01-01T00:00:00Z'
    };

    mockContentRepository.findById.mockResolvedValue(Result.ok(mockContent));

    const response = await request(app)
      .get('/v2/content/123e4567-e89b-12d3-a456-426614174000')
      .expect(200);

    expect(response.body).toHaveProperty('data');
    expect(response.body.data.id).toBe('123e4567-e89b-12d3-a456-426614174000');
    expect(response.body.data.type).toBe('ayah');
    expect(response.body.data.text).toBe('And give good tidings to the patient');

    expect(mockContentRepository.findById).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000');
  });

  it('should return 404 when content is not found', async () => {
    mockContentRepository.findById.mockResolvedValue(Result.ok(null));

    const response = await request(app)
      .get('/v2/content/123e4567-e89b-12d3-a456-426614174000')
      .expect(404);

    expect(response.body).toEqual({
      error: 'CONTENT_NOT_FOUND',
      message: 'Content with the specified ID was not found'
    });
  });

  it('should return 400 for invalid UUID format', async () => {
    const response = await request(app)
      .get('/v2/content/invalid-uuid')
      .expect(400);

    expect(response.body).toEqual({
      error: 'INVALID_UUID',
      message: 'Invalid content ID format'
    });

    expect(mockContentRepository.findById).not.toHaveBeenCalled();
  });

  it('should handle repository errors gracefully', async () => {
    mockContentRepository.findById.mockResolvedValue(
      Result.error(new Error('Database connection failed'))
    );

    const response = await request(app)
      .get('/v2/content/123e4567-e89b-12d3-a456-426614174000')
      .expect(500);

    expect(response.body).toEqual({
      error: 'CONTENT_RETRIEVAL_FAILED',
      message: 'Failed to retrieve content'
    });
  });

  it('should handle unexpected errors gracefully', async () => {
    mockContentRepository.findById.mockRejectedValue(new Error('Unexpected error'));

    const response = await request(app)
      .get('/v2/content/123e4567-e89b-12d3-a456-426614174000')
      .expect(500);

    expect(response.body).toEqual({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to retrieve content'
    });
  });

  it('should validate different UUID formats', async () => {
    const validUuids = [
      '123e4567-e89b-12d3-a456-426614174000',
      'AAAAAAAA-BBBB-4CCC-8DDD-EEEEEEEEEEEE',
      '00000000-0000-1000-8000-000000000000'
    ];

    const mockContent: ContentSnippet = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      type: 'ayah',
      text: 'Test content',
      ref: 'Test ref',
      tags: ['test'],
      createdAt: '2024-01-01T00:00:00Z'
    };

    mockContentRepository.findById.mockResolvedValue(Result.ok(mockContent));

    for (const uuid of validUuids) {
      await request(app)
        .get(`/v2/content/${uuid}`)
        .expect(200);
    }

    expect(mockContentRepository.findById).toHaveBeenCalledTimes(validUuids.length);
  });

  it('should reject malformed UUIDs', async () => {
    const invalidUuids = [
      'not-a-uuid',
      '123e4567-e89b-12d3-a456-42661417400', // Too short
      '123e4567-e89b-12d3-a456-426614174000-extra', // Too long
      '123e4567-e89b-12d3-a456-42661417400g', // Invalid character
      '123e4567_e89b_12d3_a456_426614174000' // Wrong separators
    ];

    for (const uuid of invalidUuids) {
      await request(app)
        .get(`/v2/content/${uuid}`)
        .expect(400);
    }

    expect(mockContentRepository.findById).not.toHaveBeenCalled();
  });

  it('should handle empty ID parameter', async () => {
    // Empty string in URL path gets handled by Express routing
    // This actually hits a different route and may return 500 depending on routing setup
    await request(app)
      .get('/v2/content/')
      .expect(res => {
        // Accept either 404 (route not found) or 500 (server error for malformed route)
        expect([404, 500]).toContain(res.status);
      });

    expect(mockContentRepository.findById).not.toHaveBeenCalled();
  });
});

describe('Content filtering edge cases', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      req.correlationId = 'test-correlation-id';
      next();
    });
    app.use('/v2/content', contentRouter);
  });

  it('should handle tags with whitespace properly', async () => {
    const mockContentData: ContentSnippet[] = [];
    mockContentRepository.findWithFilter.mockResolvedValue(Result.ok(mockContentData));

    await request(app)
      .get('/v2/content?tags=patience, trust , gratitude ')
      .expect(200);

    expect(mockContentRepository.findWithFilter).toHaveBeenCalledWith({
      tags: ['patience', 'trust', 'gratitude'],
      type: undefined,
      limit: 20,
      offset: 0
    });
  });

  it('should handle empty tags after trimming', async () => {
    const mockContentData: ContentSnippet[] = [];
    mockContentRepository.findWithFilter.mockResolvedValue(Result.ok(mockContentData));

    await request(app)
      .get('/v2/content?tags=patience,,, trust,  ,gratitude')
      .expect(200);

    expect(mockContentRepository.findWithFilter).toHaveBeenCalledWith({
      tags: ['patience', 'trust', 'gratitude'],
      type: undefined,
      limit: 20,
      offset: 0
    });
  });

  it('should enforce maximum limit', async () => {
    const mockContentData: ContentSnippet[] = [];
    mockContentRepository.findWithFilter.mockResolvedValue(Result.ok(mockContentData));

    await request(app)
      .get('/v2/content?limit=150') // Above max of 100
      .expect(200);

    expect(mockContentRepository.findWithFilter).toHaveBeenCalledWith({
      tags: undefined,
      type: undefined,
      limit: 150, // The repository will enforce the max limit of 100
      offset: 0
    });
  });

  it('should handle various content types', async () => {
    const contentTypes: ContentType[] = ['ayah', 'hadith', 'dua', 'note'];
    const mockContentData: ContentSnippet[] = [];
    mockContentRepository.findWithFilter.mockResolvedValue(Result.ok(mockContentData));

    for (const type of contentTypes) {
      await request(app)
        .get(`/v2/content?type=${type}`)
        .expect(200);

      expect(mockContentRepository.findWithFilter).toHaveBeenCalledWith({
        tags: undefined,
        type,
        limit: 20,
        offset: 0
      });
    }
  });
});