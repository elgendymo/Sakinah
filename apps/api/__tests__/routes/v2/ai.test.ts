import request from 'supertest';
import { Express } from 'express';
import { createApp } from '../../../src/server';
import { container } from '../../../src/infrastructure/di/container';
import { SuggestPlanUseCase } from '../../../src/application/usecases/SuggestPlanUseCase';
import { Result } from '../../../src/shared/result';
import { ValidationError } from '../../../src/shared/errors';

// Mock the DI container
jest.mock('../../../src/infrastructure/di/container');
const mockContainer = container as jest.Mocked<typeof container>;

// Mock the AI provider
jest.mock('../../../src/infrastructure/ai/factory', () => ({
  getAIProvider: jest.fn(() => ({
    explain: jest.fn()
  }))
}));

describe('AI v2 Routes', () => {
  let app: Express;
  let mockSuggestPlanUseCase: jest.Mocked<SuggestPlanUseCase>;
  const mockAuthToken = 'Bearer mock-jwt-token';
  const mockUserId = 'user123';

  beforeAll(async () => {
    app = await createApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock the SuggestPlanUseCase
    mockSuggestPlanUseCase = {
      execute: jest.fn()
    } as any;

    mockContainer.resolve.mockImplementation((token: string) => {
      if (token === 'SuggestPlanUseCase') {
        return mockSuggestPlanUseCase;
      }
      return {};
    });

    // Mock auth middleware to add userId to request
    jest.doMock('../../../src/infrastructure/auth/middleware', () => ({
      authMiddleware: (req: any, res: any, next: any) => {
        req.userId = mockUserId;
        next();
      }
    }));
  });

  describe('POST /api/v2/ai/suggest-plan', () => {
    const validPlanRequest = {
      mode: 'takhliyah',
      input: 'anger',
      context: {
        struggles: ['anger'],
        goals: [],
        preferences: {
          difficultyLevel: 'moderate',
          timeCommitment: 'medium',
          focusAreas: ['anger']
        }
      }
    };

    const mockPlanResponse = {
      id: 'plan123',
      kind: 'takhliyah',
      target: 'anger',
      microHabits: [
        {
          id: 'habit1',
          title: 'Deep breathing when angry',
          schedule: 'As needed',
          target: 3
        }
      ],
      duaIds: ['dua1'],
      contentIds: ['content1'],
      toDTO: () => ({
        id: 'plan123',
        kind: 'takhliyah',
        target: 'anger',
        microHabits: [
          {
            id: 'habit1',
            title: 'Deep breathing when angry',
            schedule: 'As needed',
            target: 3
          }
        ],
        duaIds: ['dua1'],
        contentIds: ['content1']
      })
    };

    beforeEach(() => {
      mockSuggestPlanUseCase.execute.mockResolvedValue(
        Result.ok(mockPlanResponse as any)
      );
    });

    it('should create a plan suggestion successfully', async () => {
      const response = await request(app)
        .post('/api/v2/ai/suggest-plan')
        .set('Authorization', mockAuthToken)
        .send(validPlanRequest)
        .expect(200);

      expect(response.body).toMatchObject({
        plan: {
          id: 'plan123',
          kind: 'takhliyah',
          target: 'anger',
          microHabits: [
            {
              id: 'habit1',
              title: 'Deep breathing when angry',
              schedule: 'As needed',
              target: 3
            }
          ]
        },
        confidence: 0.85,
        reasoning: expect.objectContaining({
          mode: expect.stringContaining('purification from negative traits')
        }),
        alternatives: [],
        nextSteps: expect.arrayContaining([
          expect.stringContaining('Review the suggested micro-habits')
        ]),
        metadata: expect.objectContaining({
          version: '2.0',
          aiProvider: expect.any(String),
          generatedAt: expect.any(String)
        })
      });

      expect(mockSuggestPlanUseCase.execute).toHaveBeenCalledWith({
        userId: mockUserId,
        mode: 'takhliyah',
        input: 'anger',
        context: {
          struggles: ['anger'],
          goals: [],
          preferences: {
            difficultyLevel: 'moderate',
            timeCommitment: 'medium',
            focusAreas: ['anger']
          }
        }
      });
    });

    it('should handle tahliyah mode correctly', async () => {
      const tahliyahRequest = {
        ...validPlanRequest,
        mode: 'tahliyah',
        input: 'patience'
      };

      const response = await request(app)
        .post('/api/v2/ai/suggest-plan')
        .set('Authorization', mockAuthToken)
        .send(tahliyahRequest)
        .expect(200);

      expect(response.body.reasoning.mode).toContain('building positive spiritual qualities');
    });

    it('should return 400 for invalid mode', async () => {
      const invalidRequest = {
        ...validPlanRequest,
        mode: 'invalid-mode'
      };

      const response = await request(app)
        .post('/api/v2/ai/suggest-plan')
        .set('Authorization', mockAuthToken)
        .send(invalidRequest)
        .expect(400);

      expect(response.body.error).toMatchObject({
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: expect.arrayContaining([
          expect.objectContaining({
            message: 'Mode must be either takhliyah or tahliyah'
          })
        ])
      });
    });

    it('should return 400 for missing input', async () => {
      const invalidRequest = {
        mode: 'takhliyah'
        // missing input
      };

      const response = await request(app)
        .post('/api/v2/ai/suggest-plan')
        .set('Authorization', mockAuthToken)
        .send(invalidRequest)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle use case validation errors', async () => {
      mockSuggestPlanUseCase.execute.mockResolvedValue(
        Result.error(new ValidationError('Invalid spiritual goal'))
      );

      const response = await request(app)
        .post('/api/v2/ai/suggest-plan')
        .set('Authorization', mockAuthToken)
        .send(validPlanRequest)
        .expect(400);

      expect(response.body.error).toMatchObject({
        code: 'VALIDATION_ERROR',
        message: 'Invalid spiritual goal'
      });
    });

    it('should handle use case internal errors', async () => {
      mockSuggestPlanUseCase.execute.mockResolvedValue(
        Result.error(new Error('AI service unavailable'))
      );

      const response = await request(app)
        .post('/api/v2/ai/suggest-plan')
        .set('Authorization', mockAuthToken)
        .send(validPlanRequest)
        .expect(500);

      expect(response.body.error).toMatchObject({
        code: 'INTERNAL_ERROR',
        message: 'Failed to generate plan suggestion'
      });
    });

    it('should handle context without preferences', async () => {
      const requestWithoutPreferences = {
        mode: 'takhliyah',
        input: 'anger',
        context: {
          struggles: ['anger']
        }
      };

      await request(app)
        .post('/api/v2/ai/suggest-plan')
        .set('Authorization', mockAuthToken)
        .send(requestWithoutPreferences)
        .expect(200);

      expect(mockSuggestPlanUseCase.execute).toHaveBeenCalledWith({
        userId: mockUserId,
        mode: 'takhliyah',
        input: 'anger',
        context: {
          struggles: ['anger'],
          goals: [],
          preferences: {
            difficultyLevel: 'moderate',
            timeCommitment: 'medium',
            focusAreas: []
          }
        }
      });
    });

    it('should handle request without context', async () => {
      const minimalRequest = {
        mode: 'takhliyah',
        input: 'anger'
      };

      await request(app)
        .post('/api/v2/ai/suggest-plan')
        .set('Authorization', mockAuthToken)
        .send(minimalRequest)
        .expect(200);

      expect(mockSuggestPlanUseCase.execute).toHaveBeenCalledWith({
        userId: mockUserId,
        mode: 'takhliyah',
        input: 'anger',
        context: {
          struggles: [],
          goals: [],
          preferences: {
            difficultyLevel: 'moderate',
            timeCommitment: 'medium',
            focusAreas: []
          }
        }
      });
    });
  });

  describe('POST /api/v2/ai/explain', () => {
    const { getAIProvider } = require('../../../src/infrastructure/ai/factory');
    const mockAiProvider = {
      explain: jest.fn()
    };

    beforeEach(() => {
      getAIProvider.mockReturnValue(mockAiProvider);
    });

    it('should provide explanation successfully', async () => {
      const mockExplanation = {
        explanation: 'Anger is a spiritual disease that must be controlled...',
        verses: ['Quran 3:134'],
        hadith: ['Hadith about anger control'],
        duas: ['Dua for anger'],
        recommendations: ['Practice patience'],
        relatedConcepts: ['Patience', 'Self-control']
      };

      mockAiProvider.explain.mockResolvedValue(mockExplanation);

      const response = await request(app)
        .post('/api/v2/ai/explain')
        .set('Authorization', mockAuthToken)
        .send({
          struggle: 'anger',
          context: 'Help me understand anger from Islamic perspective'
        })
        .expect(200);

      expect(response.body).toMatchObject({
        concept: 'anger',
        guidance: 'Anger is a spiritual disease that must be controlled...',
        verses: ['Quran 3:134'],
        hadith: ['Hadith about anger control'],
        duas: ['Dua for anger'],
        recommendations: ['Practice patience'],
        relatedConcepts: ['Patience', 'Self-control'],
        metadata: expect.objectContaining({
          version: '2.0',
          contextUsed: true
        })
      });

      expect(mockAiProvider.explain).toHaveBeenCalledWith('anger');
    });

    it('should return 400 for missing struggle', async () => {
      const response = await request(app)
        .post('/api/v2/ai/explain')
        .set('Authorization', mockAuthToken)
        .send({
          context: 'Some context'
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle AI provider errors', async () => {
      mockAiProvider.explain.mockRejectedValue(new Error('AI service error'));

      const response = await request(app)
        .post('/api/v2/ai/explain')
        .set('Authorization', mockAuthToken)
        .send({
          struggle: 'anger'
        })
        .expect(500);

      expect(response.body.error).toMatchObject({
        code: 'INTERNAL_ERROR',
        message: 'Failed to provide explanation'
      });
    });
  });

  describe('POST /api/v2/ai/analyze-progress', () => {
    it('should analyze progress successfully', async () => {
      const progressRequest = {
        planId: 'plan123',
        completedHabits: ['habit1', 'habit2'],
        challenges: ['Consistency with morning prayers'],
        reflections: 'I need to be more disciplined',
        timeframe: '30d'
      };

      const response = await request(app)
        .post('/api/v2/ai/analyze-progress')
        .set('Authorization', mockAuthToken)
        .send(progressRequest)
        .expect(200);

      expect(response.body).toMatchObject({
        analysis: expect.objectContaining({
          progress: expect.objectContaining({
            overallScore: expect.any(Number),
            consistencyScore: expect.any(Number)
          }),
          insights: expect.arrayContaining([expect.any(String)]),
          recommendations: expect.arrayContaining([expect.any(String)]),
          nextGoals: expect.arrayContaining([expect.any(String)])
        }),
        metadata: expect.objectContaining({
          version: '2.0',
          timeframe: '30d',
          dataPoints: 3 // 2 completed habits + 1 challenge
        })
      });
    });

    it('should return 400 for missing planId', async () => {
      const response = await request(app)
        .post('/api/v2/ai/analyze-progress')
        .set('Authorization', mockAuthToken)
        .send({
          completedHabits: ['habit1']
        })
        .expect(400);

      expect(response.body.error).toMatchObject({
        code: 'VALIDATION_ERROR',
        message: 'Plan ID is required for progress analysis'
      });
    });

    it('should handle default timeframe', async () => {
      const response = await request(app)
        .post('/api/v2/ai/analyze-progress')
        .set('Authorization', mockAuthToken)
        .send({
          planId: 'plan123'
        })
        .expect(200);

      expect(response.body.metadata.timeframe).toBe('30d');
    });
  });

  describe('GET /api/v2/ai/capabilities', () => {
    it('should return AI capabilities', async () => {
      const response = await request(app)
        .get('/api/v2/ai/capabilities')
        .set('Authorization', mockAuthToken)
        .expect(200);

      expect(response.body).toMatchObject({
        capabilities: expect.objectContaining({
          features: expect.objectContaining({
            planSuggestion: expect.objectContaining({
              available: true,
              modes: ['takhliyah', 'tahliyah'],
              maxInputLength: 1000,
              supportedLanguages: ['en', 'ar']
            }),
            conceptExplanation: expect.objectContaining({
              available: true,
              maxQueryLength: 500
            }),
            progressAnalysis: expect.objectContaining({
              available: true,
              timeframes: ['7d', '30d', '90d', '1y']
            })
          }),
          provider: expect.objectContaining({
            type: expect.any(String),
            version: '2.0'
          }),
          limits: expect.objectContaining({
            requestsPerHour: 100,
            requestsPerDay: 500,
            maxConcurrentRequests: 5
          })
        }),
        metadata: expect.objectContaining({
          version: '2.0'
        })
      });
    });
  });
});