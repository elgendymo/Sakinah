import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { Express } from 'express';
import { createApp } from '@/server';
import { SuggestPlanUseCase } from '@/application/usecases/SuggestPlanUseCase';
import { Plan } from '@/domain/entities/Plan';
import { MicroHabit } from '@/domain/entities/MicroHabit';
import { Result } from '@/shared/result';
import { container } from 'tsyringe';

// Mock the SuggestPlanUseCase
vi.mock('../../src/application/usecases/SuggestPlanUseCase');

// Mock the AI factory
vi.mock('../../src/infrastructure/ai/factory', () => ({
  getAIProvider: () => ({
    explain: vi.fn().mockResolvedValue({
      explanation: 'This is a test explanation',
      verses: ['Quran 2:286'],
      hadith: ['Hadith about patience'],
      duas: ['Dua for guidance'],
      recommendations: ['Practice regular prayer'],
      relatedConcepts: ['Tawakkul', 'Sabr']
    })
  })
}));

// Mock authentication middleware
vi.mock('../../src/infrastructure/auth/middleware', () => ({
  authMiddleware: (req: any, res: any, next: any) => {
    req.userId = 'test-user-id';
    next();
  }
}));

describe('AI V1 API Integration Tests', () => {
  let app: Express;
  let authToken: string;
  let userId: string;
  let mockSuggestPlanUseCase: any;

  beforeAll(async () => {
    // Configure test environment
    process.env.NODE_ENV = 'test';
    process.env.DB_BACKEND = 'sqlite';
    process.env.AI_PROVIDER = 'rules';

    app = await createApp();

    // Mock authentication
    authToken = 'test-jwt-token';
    userId = 'test-user-id';

    // Setup mock use case
    mockSuggestPlanUseCase = {
      execute: vi.fn()
    };

    // Register mock in container
    container.register(SuggestPlanUseCase, { useValue: mockSuggestPlanUseCase });

    // Mock the constructor to return our mock
    vi.mocked(SuggestPlanUseCase).mockImplementation(() => mockSuggestPlanUseCase);
  });

  afterAll(async () => {
    vi.clearAllMocks();
    container.clearInstances();
  });

  beforeEach(async () => {
    // Reset mocks before each test
    vi.clearAllMocks();
  });

  describe('POST /api/v1/ai/suggest-plan', () => {
    it('should generate a plan suggestion for takhliyah mode', async () => {
      const requestData = {
        mode: 'takhliyah',
        input: 'I struggle with anger and want to become more patient',
        context: {
          struggles: ['anger', 'impatience'],
          goals: ['develop patience', 'control emotions'],
          preferences: {
            difficultLevel: 'moderate',
            timeCommitment: 'medium',
            focusAreas: ['emotional control']
          }
        }
      };

      const mockPlan = Plan.create({
        id: 'suggested-plan-1',
        userId,
        kind: 'takhliyah',
        target: 'Overcome anger and develop patience',
        microHabits: [
          MicroHabit.create('Deep breathing when angry', 'when needed', 3),
          MicroHabit.create('Recite Astaghfirullah 10 times', 'daily', 2)
        ],
        duaIds: ['dua-anger-control'],
        contentIds: ['verse-patience', 'hadith-anger'],
        status: 'active'
      });

      mockSuggestPlanUseCase.execute.mockResolvedValue(Result.ok(mockPlan));

      const response = await request(app)
        .post('/api/v1/ai/suggest-plan')
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestData)
        .expect(200);

      expect(response.body).toMatchObject({
        suggestion: {
          plan: expect.objectContaining({
            kind: 'takhliyah',
            target: 'Overcome anger and develop patience'
          }),
          confidence: expect.any(Number),
          reasoning: expect.objectContaining({
            mode: expect.stringContaining('takhliyah'),
            microHabits: expect.any(Array)
          }),
          alternatives: expect.any(Array),
          nextSteps: expect.any(Array)
        },
        metadata: expect.objectContaining({
          generatedAt: expect.any(String),
          version: '1.0',
          aiProvider: 'rules'
        })
      });

      expect(mockSuggestPlanUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          mode: 'takhliyah',
          input: requestData.input,
          context: expect.objectContaining({
            struggles: requestData.context.struggles,
            goals: requestData.context.goals
          })
        })
      );
    });

    it('should generate a plan suggestion for tahliyah mode', async () => {
      const requestData = {
        mode: 'tahliyah',
        input: 'I want to increase my gratitude and develop better prayer habits',
        context: {
          goals: ['increase gratitude', 'better prayer habits'],
          preferences: {
            difficultLevel: 'easy',
            timeCommitment: 'low'
          }
        }
      };

      const mockPlan = Plan.create({
        id: 'suggested-plan-2',
        userId,
        kind: 'tahliyah',
        target: 'Increase gratitude and improve prayer habits',
        microHabits: [
          MicroHabit.create('Say Alhamdulillah before meals', 'before each meal', 2),
          MicroHabit.create('Arrive 5 minutes early for Salah', 'daily', 1)
        ],
        duaIds: ['dua-gratitude'],
        contentIds: ['verse-gratitude', 'hadith-prayer'],
        status: 'active'
      });

      mockSuggestPlanUseCase.execute.mockResolvedValue(Result.ok(mockPlan));

      const response = await request(app)
        .post('/api/v1/ai/suggest-plan')
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestData)
        .expect(200);

      expect(response.body.suggestion.plan.kind).toBe('tahliyah');
      expect(response.body.suggestion.reasoning.mode).toContain('tahliyah');
      expect(response.body.suggestion.reasoning.mode).toContain('building positive spiritual qualities');
    });

    it('should validate required fields', async () => {
      const invalidRequests = [
        {}, // missing all fields
        { mode: 'takhliyah' }, // missing input
        { input: 'test input' }, // missing mode
        { mode: 'invalid', input: 'test input' } // invalid mode
      ];

      for (const invalidRequest of invalidRequests) {
        const response = await request(app)
          .post('/api/v1/ai/suggest-plan')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidRequest)
          .expect(400);

        expect(response.body).toMatchObject({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data'
          }
        });
      }
    });

    it('should handle use case errors', async () => {
      const requestData = {
        mode: 'takhliyah',
        input: 'test input'
      };

      mockSuggestPlanUseCase.execute.mockResolvedValue(Result.error(new Error('Use case error')));

      const response = await request(app)
        .post('/api/v1/ai/suggest-plan')
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestData)
        .expect(500);

      expect(response.body).toMatchObject({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to generate plan suggestion'
        }
      });
    });

    it('should work with minimal context', async () => {
      const requestData = {
        mode: 'takhliyah',
        input: 'I need help with spiritual development'
      };

      const mockPlan = Plan.create({
        userId,
        kind: 'takhliyah',
        target: 'General spiritual development',
        microHabits: [
          MicroHabit.create('Morning dhikr', 'daily', 1)
        ],
        status: 'active'
      });

      mockSuggestPlanUseCase.execute.mockResolvedValue(Result.ok(mockPlan));

      const response = await request(app)
        .post('/api/v1/ai/suggest-plan')
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestData)
        .expect(200);

      expect(response.body.suggestion.plan).toBeDefined();
      expect(mockSuggestPlanUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            struggles: [],
            goals: []
          })
        })
      );
    });
  });

  describe('POST /api/v1/ai/explain', () => {
    it('should provide explanation for Islamic concepts', async () => {
      const requestData = {
        struggle: 'What is the importance of patience in Islam?',
        context: 'I struggle with being patient in difficult situations'
      };

      const response = await request(app)
        .post('/api/v1/ai/explain')
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestData)
        .expect(200);

      expect(response.body).toMatchObject({
        explanation: {
          concept: requestData.struggle,
          guidance: expect.any(String),
          verses: expect.any(Array),
          hadith: expect.any(Array),
          duas: expect.any(Array),
          recommendations: expect.any(Array),
          relatedConcepts: expect.any(Array)
        },
        metadata: expect.objectContaining({
          responseTime: expect.any(String),
          version: '1.0',
          aiProvider: 'rules',
          contextUsed: true
        })
      });
    });

    it('should validate required struggle field', async () => {
      const invalidRequests = [
        {}, // missing struggle
        { struggle: '' }, // empty struggle
        { context: 'only context' } // missing struggle
      ];

      for (const invalidRequest of invalidRequests) {
        const response = await request(app)
          .post('/api/v1/ai/explain')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidRequest)
          .expect(400);

        expect(response.body).toMatchObject({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data'
          }
        });
      }
    });

    it('should work without context', async () => {
      const requestData = {
        struggle: 'Explain the concept of Tawakkul'
      };

      const response = await request(app)
        .post('/api/v1/ai/explain')
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestData)
        .expect(200);

      expect(response.body.explanation.concept).toBe(requestData.struggle);
      expect(response.body.metadata.contextUsed).toBe(false);
    });
  });

  describe('POST /api/v1/ai/analyze-progress', () => {
    it('should analyze user progress and provide insights', async () => {
      const requestData = {
        planId: 'plan-123',
        completedHabits: ['habit-1', 'habit-2'],
        challenges: ['Difficulty waking up for Fajr'],
        reflections: 'I feel more peaceful when I stick to my routine',
        timeframe: '30d'
      };

      const response = await request(app)
        .post('/api/v1/ai/analyze-progress')
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestData)
        .expect(200);

      expect(response.body).toMatchObject({
        analysis: {
          progress: expect.objectContaining({
            overallScore: expect.any(Number),
            consistencyScore: expect.any(Number),
            improvementAreas: expect.any(Array),
            strengths: expect.any(Array)
          }),
          insights: expect.any(Array),
          recommendations: expect.any(Array),
          nextGoals: expect.any(Array)
        },
        metadata: expect.objectContaining({
          analyzedAt: expect.any(String),
          timeframe: '30d',
          dataPoints: expect.any(Number),
          version: '1.0'
        })
      });
    });

    it('should require planId for progress analysis', async () => {
      const requestData = {
        completedHabits: ['habit-1']
      };

      const response = await request(app)
        .post('/api/v1/ai/analyze-progress')
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestData)
        .expect(400);

      expect(response.body).toMatchObject({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Plan ID is required for progress analysis'
        }
      });
    });

    it('should work with minimal data', async () => {
      const requestData = {
        planId: 'plan-123'
      };

      const response = await request(app)
        .post('/api/v1/ai/analyze-progress')
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestData)
        .expect(200);

      expect(response.body.analysis).toBeDefined();
      expect(response.body.metadata.dataPoints).toBe(0); // No completed habits or challenges
    });
  });

  describe('GET /api/v1/ai/capabilities', () => {
    it('should return AI service capabilities', async () => {
      const response = await request(app)
        .get('/api/v1/ai/capabilities')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        capabilities: {
          features: {
            planSuggestion: expect.objectContaining({
              available: true,
              modes: ['takhliyah', 'tahliyah'],
              maxInputLength: expect.any(Number),
              supportedLanguages: expect.any(Array)
            }),
            conceptExplanation: expect.objectContaining({
              available: true,
              maxQueryLength: expect.any(Number),
              supportedTopics: expect.any(Array)
            }),
            progressAnalysis: expect.objectContaining({
              available: true,
              timeframes: expect.any(Array),
              metrics: expect.any(Array)
            })
          },
          provider: expect.objectContaining({
            type: 'rules',
            version: '1.0'
          }),
          limits: expect.objectContaining({
            requestsPerHour: expect.any(Number),
            requestsPerDay: expect.any(Number),
            maxConcurrentRequests: expect.any(Number)
          })
        },
        metadata: expect.objectContaining({
          retrievedAt: expect.any(String),
          version: '1.0'
        })
      });
    });

    it('should reflect the current AI provider configuration', async () => {
      const response = await request(app)
        .get('/api/v1/ai/capabilities')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.capabilities.provider.type).toBe(process.env.AI_PROVIDER || 'rules');
    });
  });
});