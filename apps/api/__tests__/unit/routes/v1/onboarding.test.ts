import request from 'supertest';
import express from 'express';
import { container } from 'tsyringe';
import onboardingRouter from '@/routes/v1/onboarding';
import { SubmitPhase1UseCase } from '@/application/usecases/SubmitPhase1UseCase';
import { SubmitPhase2UseCase } from '@/application/usecases/SubmitPhase2UseCase';
import { SubmitReflectionUseCase } from '@/application/usecases/SubmitReflectionUseCase';
import { ValidateSurveyProgressUseCase } from '@/application/usecases/ValidateSurveyProgressUseCase';
import { ISurveyRepository } from '@/domain/repositories/ISurveyRepository';
import { Result } from '@/shared/result';
import { SurveyProgress } from '@/domain/entities/SurveyProgress';
import { SurveyResult } from '@/domain/entities/SurveyResult';
import { LikertScore, Phase1Request, Phase2Request, ReflectionRequest } from '@sakinah/types';

// Mock the authentication middleware
jest.mock('@/infrastructure/auth/middleware', () => ({
  authMiddleware: (req: any, res: any, next: any) => {
    req.userId = 'test-user-id';
    next();
  }
}));

// Mock the DI container
const mockSubmitPhase1UseCase = {
  execute: jest.fn()
};

const mockSubmitPhase2UseCase = {
  execute: jest.fn()
};

const mockSubmitReflectionUseCase = {
  execute: jest.fn()
};

const mockValidateSurveyProgressUseCase = {
  execute: jest.fn()
};

const mockSurveyRepository = {
  getUserSurveyData: jest.fn()
};

// Mock container.resolve
jest.mock('tsyringe', () => ({
  container: {
    resolve: jest.fn((token: string) => {
      switch (token) {
        case SubmitPhase1UseCase:
          return mockSubmitPhase1UseCase;
        case SubmitPhase2UseCase:
          return mockSubmitPhase2UseCase;
        case SubmitReflectionUseCase:
          return mockSubmitReflectionUseCase;
        case ValidateSurveyProgressUseCase:
          return mockValidateSurveyProgressUseCase;
        case 'ISurveyRepository':
          return mockSurveyRepository;
        default:
          throw new Error(`Unknown token: ${token}`);
      }
    })
  }
}));

describe('V1 Onboarding Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/onboarding', onboardingRouter);

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('GET /welcome', () => {
    it('should return welcome information', async () => {
      const response = await request(app)
        .get('/api/v1/onboarding/welcome')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.welcome).toBeDefined();
      expect(response.body.data.welcome.title).toBe('Tazkiyah Discovery Survey');
      expect(response.body.data.welcome.phases).toHaveLength(4);
      expect(response.body.data.metadata.currentStep).toBe(1);
      expect(response.body.data.metadata.totalSteps).toBe(4);
      expect(response.body.data.metadata.progressPercentage).toBe(0);
    });

    it('should include Arabic translation', async () => {
      const response = await request(app)
        .get('/api/v1/onboarding/welcome')
        .expect(200);

      expect(response.body.data.welcome.titleAr).toBe('استبيان قراءة النفس');
      expect(response.body.data.welcome.descriptionAr).toContain('التقييم الروحي');
    });
  });

  describe('POST /phase1', () => {
    const validPhase1Data: Phase1Request = {
      envyScore: 3 as LikertScore,
      envyNote: 'Test note for envy',
      arroganceScore: 2 as LikertScore,
      arroganceNote: 'Test note for arrogance',
      selfDeceptionScore: 4 as LikertScore,
      selfDeceptionNote: 'Test note for self-deception',
      lustScore: 1 as LikertScore,
      lustNote: 'Test note for lust'
    };

    it('should submit Phase 1 responses successfully', async () => {
      const mockProgress = SurveyProgress.create({
        userId: 'test-user-id',
        currentPhase: 2,
        phase1Completed: true
      });

      mockSubmitPhase1UseCase.execute.mockResolvedValue(Result.ok({
        saved: true,
        progress: mockProgress.toDTO(),
        nextPhaseAvailable: true
      }));

      const response = await request(app)
        .post('/api/v1/onboarding/phase1')
        .send(validPhase1Data)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.phase1.completed).toBe(true);
      expect(response.body.data.phase1.nextPhase).toBe(2);
      expect(response.body.data.navigation.canProceed).toBe(true);
      expect(response.body.data.navigation.nextUrl).toBe('/api/v1/onboarding/phase2');
      expect(response.body.data.navigation.progressPercentage).toBe(25);

      expect(mockSubmitPhase1UseCase.execute).toHaveBeenCalledWith({
        userId: 'test-user-id',
        phase1Data: validPhase1Data
      });
    });

    it('should handle validation errors for invalid scores', async () => {
      const invalidData = {
        ...validPhase1Data,
        envyScore: 6 // Invalid score > 5
      };

      await request(app)
        .post('/api/v1/onboarding/phase1')
        .send(invalidData)
        .expect(400);
    });

    it('should handle validation errors for notes too long', async () => {
      const invalidData = {
        ...validPhase1Data,
        envyNote: 'x'.repeat(1001) // Too long > 1000 chars
      };

      await request(app)
        .post('/api/v1/onboarding/phase1')
        .send(invalidData)
        .expect(400);
    });

    it('should handle use case errors', async () => {
      mockSubmitPhase1UseCase.execute.mockResolvedValue(
        Result.error(new Error('Phase 1 already completed'))
      );

      await request(app)
        .post('/api/v1/onboarding/phase1')
        .send(validPhase1Data)
        .expect(400);
    });

    it('should require all required fields', async () => {
      const incompleteData = {
        envyScore: 3,
        // Missing other required scores
      };

      await request(app)
        .post('/api/v1/onboarding/phase1')
        .send(incompleteData)
        .expect(400);
    });
  });

  describe('POST /phase2', () => {
    const validPhase2Data: Phase2Request = {
      angerScore: 3 as LikertScore,
      angerNote: 'Test note for anger',
      maliceScore: 2 as LikertScore,
      maliceNote: 'Test note for malice',
      backbitingScore: 1 as LikertScore,
      backbitingNote: 'Test note for backbiting',
      suspicionScore: 4 as LikertScore,
      suspicionNote: 'Test note for suspicion',
      loveOfDunyaScore: 5 as LikertScore,
      loveOfDunyaNote: 'Test note for love of dunya',
      lazinessScore: 2 as LikertScore,
      lazinessNote: 'Test note for laziness',
      despairScore: 1 as LikertScore,
      despairNote: 'Test note for despair'
    };

    it('should submit Phase 2 responses successfully', async () => {
      const mockProgress = SurveyProgress.create({
        userId: 'test-user-id',
        currentPhase: 3,
        phase1Completed: true,
        phase2Completed: true
      });

      mockSubmitPhase2UseCase.execute.mockResolvedValue(Result.ok({
        saved: true,
        progress: mockProgress.toDTO(),
        nextPhaseAvailable: true
      }));

      const response = await request(app)
        .post('/api/v1/onboarding/phase2')
        .send(validPhase2Data)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.phase2.completed).toBe(true);
      expect(response.body.data.phase2.nextPhase).toBe(3);
      expect(response.body.data.navigation.canProceed).toBe(true);
      expect(response.body.data.navigation.nextUrl).toBe('/api/v1/onboarding/reflection');
      expect(response.body.data.navigation.progressPercentage).toBe(50);

      expect(mockSubmitPhase2UseCase.execute).toHaveBeenCalledWith({
        userId: 'test-user-id',
        phase2Data: validPhase2Data
      });
    });

    it('should handle validation errors for invalid scores', async () => {
      const invalidData = {
        ...validPhase2Data,
        angerScore: 0 // Invalid score < 1
      };

      await request(app)
        .post('/api/v1/onboarding/phase2')
        .send(invalidData)
        .expect(400);
    });
  });

  describe('POST /reflection', () => {
    const validReflectionData: ReflectionRequest = {
      strongestStruggle: 'I struggle with maintaining consistent prayer times due to work schedule',
      dailyHabit: 'I want to develop a habit of reading Quran for 15 minutes each morning'
    };

    it('should submit reflection responses successfully', async () => {
      const mockProgress = SurveyProgress.create({
        userId: 'test-user-id',
        currentPhase: 4,
        phase1Completed: true,
        phase2Completed: true,
        reflectionCompleted: true
      });

      mockSubmitReflectionUseCase.execute.mockResolvedValue(Result.ok({
        saved: true,
        progress: mockProgress.toDTO(),
        nextPhaseAvailable: true
      }));

      const response = await request(app)
        .post('/api/v1/onboarding/reflection')
        .send(validReflectionData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.reflection.completed).toBe(true);
      expect(response.body.data.reflection.nextPhase).toBe(4);
      expect(response.body.data.aiPreview).toBeDefined();
      expect(response.body.data.aiPreview.personalizedHabits).toHaveLength(3);
      expect(response.body.data.navigation.progressPercentage).toBe(75);

      expect(mockSubmitReflectionUseCase.execute).toHaveBeenCalledWith({
        userId: 'test-user-id',
        reflectionData: validReflectionData
      });
    });

    it('should handle validation errors for text too short', async () => {
      const invalidData = {
        strongestStruggle: 'short', // Too short < 10 chars
        dailyHabit: validReflectionData.dailyHabit
      };

      await request(app)
        .post('/api/v1/onboarding/reflection')
        .send(invalidData)
        .expect(400);
    });

    it('should handle validation errors for text too long', async () => {
      const invalidData = {
        strongestStruggle: 'x'.repeat(501), // Too long > 500 chars
        dailyHabit: validReflectionData.dailyHabit
      };

      await request(app)
        .post('/api/v1/onboarding/reflection')
        .send(invalidData)
        .expect(400);
    });
  });

  describe('GET /results', () => {
    it('should return results when survey is completed', async () => {
      const mockProgress = SurveyProgress.create({
        userId: 'test-user-id',
        currentPhase: 4,
        phase1Completed: true,
        phase2Completed: true,
        reflectionCompleted: true,
        resultsGenerated: true
      });

      const mockResults = SurveyResult.create({
        userId: 'test-user-id',
        diseaseScores: {
          envy: 3 as LikertScore,
          arrogance: 2 as LikertScore,
          selfDeception: 4 as LikertScore,
          lust: 1 as LikertScore,
          anger: 3 as LikertScore,
          malice: 2 as LikertScore,
          backbiting: 1 as LikertScore,
          suspicion: 4 as LikertScore,
          loveOfDunya: 5 as LikertScore,
          laziness: 2 as LikertScore,
          despair: 1 as LikertScore
        },
        reflectionAnswers: {
          strongestStruggle: 'I struggle with maintaining consistent prayer times',
          dailyHabit: 'I want to develop a habit of reading Quran daily'
        },
        personalizedHabits: [],
        tazkiyahPlan: {
          criticalDiseases: ['loveOfDunya', 'suspicion', 'selfDeception'],
          planType: 'takhliyah',
          phases: [],
          expectedDuration: '3 months',
          milestones: []
        }
      });

      mockSurveyRepository.getUserSurveyData.mockResolvedValue(Result.ok({
        responses: [],
        results: mockResults,
        progress: mockProgress
      }));

      const response = await request(app)
        .get('/api/v1/onboarding/results')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.results).toBeDefined();
      expect(response.body.data.exportOptions).toHaveLength(2);
      expect(response.body.data.metadata.progressPercentage).toBe(100);
    });

    it('should handle survey not completed', async () => {
      const mockProgress = SurveyProgress.create({
        userId: 'test-user-id',
        currentPhase: 2,
        phase1Completed: true,
        resultsGenerated: false
      });

      mockSurveyRepository.getUserSurveyData.mockResolvedValue(Result.ok({
        responses: [],
        results: null,
        progress: mockProgress
      }));

      await request(app)
        .get('/api/v1/onboarding/results')
        .expect(400);
    });

    it('should handle database errors', async () => {
      mockSurveyRepository.getUserSurveyData.mockResolvedValue(
        Result.error(new Error('Database connection failed'))
      );

      await request(app)
        .get('/api/v1/onboarding/results')
        .expect(500);
    });
  });

  describe('GET /progress', () => {
    it('should return current survey progress', async () => {
      const mockProgress = SurveyProgress.create({
        userId: 'test-user-id',
        currentPhase: 2,
        phase1Completed: true,
        phase2Completed: false
      });

      mockValidateSurveyProgressUseCase.execute.mockResolvedValue(Result.ok({
        progress: mockProgress
      }));

      const response = await request(app)
        .get('/api/v1/onboarding/progress')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.progress).toBeDefined();
      expect(response.body.data.progress.currentPhase).toBe(2);
      expect(response.body.data.progress.phase1Completed).toBe(true);
      expect(response.body.data.progress.phase2Completed).toBe(false);
      expect(response.body.data.navigation.phaseUrls).toBeDefined();
      expect(response.body.data.navigation.phaseUrls[1]).toBe('/api/v1/onboarding/phase1');
    });

    it('should handle progress fetch errors', async () => {
      mockValidateSurveyProgressUseCase.execute.mockResolvedValue(
        Result.error(new Error('Failed to fetch progress'))
      );

      await request(app)
        .get('/api/v1/onboarding/progress')
        .expect(500);
    });
  });

  describe('Authentication', () => {
    beforeEach(() => {
      // Mock the auth middleware to simulate no user
      jest.doMock('@/infrastructure/auth/middleware', () => ({
        authMiddleware: (req: any, res: any, next: any) => {
          // Don't set userId to simulate unauthenticated request
          next();
        }
      }));
    });

    it('should require authentication for all endpoints', async () => {
      // Re-create app with mocked auth middleware that doesn't set userId
      const testApp = express();
      testApp.use(express.json());
      testApp.use((req: any, res: any, next: any) => {
        // Simulate unauthenticated request
        next();
      });
      testApp.use('/api/v1/onboarding', onboardingRouter);

      await request(testApp)
        .get('/api/v1/onboarding/welcome')
        .expect(401);

      await request(testApp)
        .post('/api/v1/onboarding/phase1')
        .send({})
        .expect(401);

      await request(testApp)
        .post('/api/v1/onboarding/phase2')
        .send({})
        .expect(401);

      await request(testApp)
        .post('/api/v1/onboarding/reflection')
        .send({})
        .expect(401);

      await request(testApp)
        .get('/api/v1/onboarding/results')
        .expect(401);

      await request(testApp)
        .get('/api/v1/onboarding/progress')
        .expect(401);
    });
  });

  describe('Error Handling', () => {
    it('should handle unexpected errors gracefully', async () => {
      mockSubmitPhase1UseCase.execute.mockRejectedValue(new Error('Unexpected error'));

      const validPhase1Data: Phase1Request = {
        envyScore: 3 as LikertScore,
        arroganceScore: 2 as LikertScore,
        selfDeceptionScore: 4 as LikertScore,
        lustScore: 1 as LikertScore
      };

      await request(app)
        .post('/api/v1/onboarding/phase1')
        .send(validPhase1Data)
        .expect(500);
    });

    it('should include trace IDs in error responses', async () => {
      mockSubmitPhase1UseCase.execute.mockResolvedValue(
        Result.error(new Error('Test error'))
      );

      const validPhase1Data: Phase1Request = {
        envyScore: 3 as LikertScore,
        arroganceScore: 2 as LikertScore,
        selfDeceptionScore: 4 as LikertScore,
        lustScore: 1 as LikertScore
      };

      const response = await request(app)
        .post('/api/v1/onboarding/phase1')
        .send(validPhase1Data)
        .expect(400);

      expect(response.body.traceId).toBeDefined();
    });
  });

  describe('Request Validation', () => {
    it('should validate required Content-Type header', async () => {
      await request(app)
        .post('/api/v1/onboarding/phase1')
        .send('invalid json string')
        .expect(400);
    });

    it('should handle malformed JSON', async () => {
      await request(app)
        .post('/api/v1/onboarding/phase1')
        .set('Content-Type', 'application/json')
        .send('{invalid json}')
        .expect(400);
    });
  });
});