import request from 'supertest';
import { app } from '@/server';
import { container } from 'tsyringe';
import { ISurveyRepository } from '@/domain/repositories/ISurveyRepository';
import { SurveyProgress } from '@/domain/entities/SurveyProgress';
import { Result } from '@/shared/result';

describe('Survey Route Protection Integration', () => {
  let mockSurveyRepo: jest.Mocked<ISurveyRepository>;

  beforeAll(() => {
    // Mock the survey repository
    mockSurveyRepo = {
      getSurveyProgress: jest.fn(),
      saveSurveyProgress: jest.fn(),
      updateSurveyProgress: jest.fn(),
      saveSurveyResponse: jest.fn(),
      getSurveyResponse: jest.fn(),
      getSurveyResponsesByPhase: jest.fn(),
      getAllSurveyResponses: jest.fn(),
      updateSurveyResponse: jest.fn(),
      deleteSurveyResponse: jest.fn(),
      saveSurveyResult: jest.fn(),
      getSurveyResult: jest.fn(),
      getSurveyResultById: jest.fn(),
      updateSurveyResult: jest.fn(),
      deleteSurveyResult: jest.fn(),
      deleteSurveyProgress: jest.fn(),
      hasUserCompletedSurvey: jest.fn(),
      getPhaseCompletionStatus: jest.fn(),
      savePhaseResponses: jest.fn(),
      getUserSurveyData: jest.fn(),
      getSurveyCompletionStats: jest.fn()
    };

    // Register the mock repository
    container.registerInstance('ISurveyRepository', mockSurveyRepo);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication + Survey Progress Protection', () => {
    it('should deny access without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/onboarding/welcome')
        .expect(401);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('unauthorized');
    });

    it('should allow welcome phase access with valid authentication', async () => {
      // Mock fresh survey progress
      const progress = SurveyProgress.createNew('test-user-id');
      mockSurveyRepo.getSurveyProgress.mockResolvedValue(Result.ok(progress));

      const response = await request(app)
        .get('/api/v1/onboarding/welcome')
        .set('Authorization', 'Bearer valid-token') // This would be mocked in real app
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.welcome).toBeDefined();
    });

    it('should deny phase 2 access when phase 1 is not completed', async () => {
      // Mock progress where user is still on phase 1
      const progress = SurveyProgress.createNew('test-user-id');
      progress.advanceToPhase1(); // In phase 1 but not completed

      mockSurveyRepo.getSurveyProgress.mockResolvedValue(Result.ok(progress));

      const response = await request(app)
        .post('/api/v1/onboarding/phase2')
        .set('Authorization', 'Bearer valid-token')
        .send({
          angerScore: 3,
          maliceScore: 2,
          backbitingScore: 1,
          suspicionScore: 4,
          loveOfDunyaScore: 3,
          lazinessScore: 2,
          despairScore: 1
        })
        .expect(403);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('survey_phase_access_denied');
      expect(response.body.error.context.redirectToPhase).toBe(1);
    });

    it('should allow phase 2 access when phase 1 is completed', async () => {
      // Mock progress where user completed phase 1
      const progress = SurveyProgress.createNew('test-user-id');
      progress.advanceToPhase1();
      progress.completePhase1(); // Now in phase 2

      mockSurveyRepo.getSurveyProgress.mockResolvedValue(Result.ok(progress));
      mockSurveyRepo.saveSurveyResponse.mockResolvedValue(Result.ok({} as any));

      const response = await request(app)
        .post('/api/v1/onboarding/phase2')
        .set('Authorization', 'Bearer valid-token')
        .send({
          angerScore: 3,
          maliceScore: 2,
          backbitingScore: 1,
          suspicionScore: 4,
          loveOfDunyaScore: 3,
          lazinessScore: 2,
          despairScore: 1
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.phase2.completed).toBe(true);
    });

    it('should redirect to results when survey is already completed', async () => {
      // Mock completed survey progress
      const progress = SurveyProgress.create({
        userId: 'test-user-id',
        currentPhase: 4,
        phase1Completed: true,
        phase2Completed: true,
        reflectionCompleted: true,
        resultsGenerated: true
      });

      mockSurveyRepo.getCurrentProgress.mockResolvedValue(Result.ok({
        progress: progress.toDTO(),
        canAccess: true,
        currentPhase: 4,
        nextAvailablePhase: 4
      }));

      const response = await request(app)
        .post('/api/v1/onboarding/phase1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          envyScore: 3,
          arroganceScore: 2,
          selfDeceptionScore: 1,
          lustScore: 4
        })
        .expect(200);

      expect(response.body.status).toBe('completed');
      expect(response.body.redirect).toBe('/onboarding/results');
    });

    it('should handle progress endpoint correctly', async () => {
      const progress = SurveyProgress.create({
        userId: 'test-user-id',
        currentPhase: 2,
        phase1Completed: true,
        phase2Completed: false
      });

      mockSurveyRepo.getSurveyProgress.mockResolvedValue(Result.ok(progress));

      const response = await request(app)
        .get('/api/v1/onboarding/progress')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.progress.currentPhase).toBe(2);
      expect(response.body.data.progress.phase1Completed).toBe(true);
      expect(response.body.data.progress.phase2Completed).toBe(false);
      expect(response.body.data.navigation.nextAvailablePhase).toBe(2);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle database errors gracefully', async () => {
      mockSurveyRepo.getSurveyProgress.mockResolvedValue(
        Result.error(new Error('Database connection failed'))
      );

      const response = await request(app)
        .get('/api/v1/onboarding/welcome')
        .set('Authorization', 'Bearer valid-token')
        .expect(500);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('survey_progress_error');
    });

    it('should handle validation errors properly', async () => {
      const progress = SurveyProgress.createNew('test-user-id');
      progress.advanceToPhase1();

      mockSurveyRepo.getSurveyProgress.mockResolvedValue(Result.ok(progress));

      const response = await request(app)
        .post('/api/v1/onboarding/phase1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          envyScore: 6, // Invalid score (should be 1-5)
          arroganceScore: 2,
          selfDeceptionScore: 1,
          lustScore: 4
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('validation_error');
    });
  });

  describe('Survey Completion Flow Integration', () => {
    it('should enforce complete survey progression', async () => {
      const userId = 'test-user-id';
      let progress = SurveyProgress.createNew(userId);

      // Step 1: Start with welcome - should work
      mockSurveyRepo.getSurveyProgress.mockResolvedValue(Result.ok(progress));

      let response = await request(app)
        .get('/api/v1/onboarding/welcome')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.data.metadata.currentStep).toBe(1);

      // Step 2: Try to skip to phase 2 - should fail
      response = await request(app)
        .post('/api/v1/onboarding/phase2')
        .set('Authorization', 'Bearer valid-token')
        .send({
          angerScore: 3,
          maliceScore: 2,
          backbitingScore: 1,
          suspicionScore: 4,
          loveOfDunyaScore: 3,
          lazinessScore: 2,
          despairScore: 1
        })
        .expect(403);

      expect(response.body.error.context.redirectToPhase).toBe(1);

      // Step 3: Complete phase 1 properly
      progress.advanceToPhase1();
      progress.completePhase1();
      mockSurveyRepo.getSurveyProgress.mockResolvedValue(Result.ok(progress));
      mockSurveyRepo.saveSurveyResponse.mockResolvedValue(Result.ok({} as any));

      response = await request(app)
        .post('/api/v1/onboarding/phase2')
        .set('Authorization', 'Bearer valid-token')
        .send({
          angerScore: 3,
          maliceScore: 2,
          backbitingScore: 1,
          suspicionScore: 4,
          loveOfDunyaScore: 3,
          lazinessScore: 2,
          despairScore: 1
        })
        .expect(200);

      expect(response.body.data.navigation.nextUrl).toBe('/api/v1/onboarding/reflection');
    });
  });
});