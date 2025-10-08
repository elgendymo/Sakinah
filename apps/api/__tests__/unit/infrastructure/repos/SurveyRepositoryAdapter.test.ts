import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SurveyRepositoryAdapter } from '@/infrastructure/repos/SurveyRepositoryAdapter';
import { SurveyResponse } from '@/domain/entities/SurveyResponse';
import { SurveyResult } from '@/domain/entities/SurveyResult';
import { SurveyProgress } from '@/domain/entities/SurveyProgress';
import { UserId } from '@/domain/value-objects/UserId';
import { SurveyResponseId } from '@/domain/value-objects/SurveyResponseId';
import { SurveyResultId } from '@/domain/value-objects/SurveyResultId';
import { Result } from '@/shared/result';
import { ErrorCode } from '@/shared/errors';
import { IDatabaseClient } from '@/infrastructure/database/types';

describe('SurveyRepositoryAdapter', () => {
  let repository: SurveyRepositoryAdapter;
  let mockDb: IDatabaseClient;

  beforeEach(() => {
    mockDb = {
      createSurveyResponse: vi.fn(),
      getSurveyResponseById: vi.fn(),
      getSurveyResponsesByPhase: vi.fn(),
      getAllSurveyResponses: vi.fn(),
      updateSurveyResponse: vi.fn(),
      deleteSurveyResponse: vi.fn(),
      savePhaseResponses: vi.fn(),
      createSurveyResult: vi.fn(),
      getSurveyResultByUserId: vi.fn(),
      getSurveyResultById: vi.fn(),
      updateSurveyResult: vi.fn(),
      deleteSurveyResult: vi.fn(),
      createSurveyProgress: vi.fn(),
      getSurveyProgressByUserId: vi.fn(),
      updateSurveyProgress: vi.fn(),
      deleteSurveyProgress: vi.fn(),
      hasUserCompletedSurvey: vi.fn(),
      getPhaseCompletionStatus: vi.fn(),
      getUserSurveyData: vi.fn(),
    } as any;

    repository = new SurveyRepositoryAdapter(mockDb);
  });

  describe('saveSurveyResponse', () => {
    it('should save a survey response successfully', async () => {
      const response = SurveyResponse.create({
        id: 'response-123',
        userId: 'user-123',
        phaseNumber: 1,
        questionId: 'envy',
        score: 3,
        note: 'Sometimes I feel envious',
        completedAt: new Date('2024-01-01'),
        createdAt: new Date('2024-01-01')
      });

      const dbResponse = {
        id: 'response-123',
        userId: 'user-123',
        phaseNumber: 1,
        questionId: 'envy',
        score: 3,
        note: 'Sometimes I feel envious',
        completedAt: '2024-01-01T00:00:00.000Z',
        createdAt: '2024-01-01T00:00:00.000Z'
      };

      vi.mocked(mockDb.createSurveyResponse).mockResolvedValue({
        data: dbResponse,
        error: null
      });

      const result = await repository.saveSurveyResponse(response);

      expect(Result.isOk(result)).toBe(true);
      expect(result.value).toEqual(response);
      expect(mockDb.createSurveyResponse).toHaveBeenCalledWith({
        userId: 'user-123',
        phaseNumber: 1,
        questionId: 'envy',
        score: 3,
        note: 'Sometimes I feel envious'
      });
    });

    it('should handle database errors when saving survey response', async () => {
      const response = SurveyResponse.create({
        id: 'response-123',
        userId: 'user-123',
        phaseNumber: 1,
        questionId: 'envy',
        score: 3,
        completedAt: new Date(),
        createdAt: new Date()
      });

      vi.mocked(mockDb.createSurveyResponse).mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });

      const result = await repository.saveSurveyResponse(response);

      expect(Result.isError(result)).toBe(true);
      expect(result.error.code).toBe(ErrorCode.DATABASE_ERROR);
      expect(result.error.message).toContain('Database error');
    });
  });

  describe('getSurveyResponsesByPhase', () => {
    it('should get survey responses by phase successfully', async () => {
      const userId = UserId.create('user-123');
      const phaseNumber = 1;

      const dbResponses = [
        {
          id: 'response-1',
          userId: 'user-123',
          phaseNumber: 1,
          questionId: 'envy',
          score: 3,
          note: 'Note 1',
          completedAt: '2024-01-01T00:00:00.000Z',
          createdAt: '2024-01-01T00:00:00.000Z'
        },
        {
          id: 'response-2',
          userId: 'user-123',
          phaseNumber: 1,
          questionId: 'arrogance',
          score: 2,
          note: null,
          completedAt: '2024-01-01T00:00:00.000Z',
          createdAt: '2024-01-01T00:00:00.000Z'
        }
      ];

      vi.mocked(mockDb.getSurveyResponsesByPhase).mockResolvedValue({
        data: dbResponses,
        error: null
      });

      const result = await repository.getSurveyResponsesByPhase(userId, phaseNumber);

      expect(Result.isOk(result)).toBe(true);
      expect(result.value).toHaveLength(2);
      expect(result.value[0].questionId).toBe('envy');
      expect(result.value[1].questionId).toBe('arrogance');
    });
  });

  describe('saveSurveyResult', () => {
    it('should save survey result successfully', async () => {
      const surveyResult = SurveyResult.create({
        id: 'result-123',
        userId: 'user-123',
        diseaseScores: { envy: 4, arrogance: 2 },
        criticalDiseases: ['envy'],
        reflectionAnswers: {
          strongestStruggle: 'Envy is my biggest challenge',
          dailyHabit: 'Daily gratitude practice'
        },
        personalizedHabits: [
          { id: '1', title: 'Gratitude journal', frequency: 'daily' }
        ],
        tazkiyahPlan: {
          criticalDiseases: ['envy'],
          planType: 'takhliyah',
          phases: []
        },
        radarChartData: { labels: ['envy', 'arrogance'], data: [4, 2] },
        generatedAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
      });

      const dbResult = {
        id: 'result-123',
        userId: 'user-123',
        diseaseScores: { envy: 4, arrogance: 2 },
        criticalDiseases: ['envy'],
        reflectionAnswers: {
          strongestStruggle: 'Envy is my biggest challenge',
          dailyHabit: 'Daily gratitude practice'
        },
        personalizedHabits: [
          { id: '1', title: 'Gratitude journal', frequency: 'daily' }
        ],
        tazkiyahPlan: {
          criticalDiseases: ['envy'],
          planType: 'takhliyah',
          phases: []
        },
        radarChartData: { labels: ['envy', 'arrogance'], data: [4, 2] },
        generatedAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      };

      vi.mocked(mockDb.createSurveyResult).mockResolvedValue({
        data: dbResult,
        error: null
      });

      const result = await repository.saveSurveyResult(surveyResult);

      expect(Result.isOk(result)).toBe(true);
      expect(result.value.diseaseScores).toEqual({ envy: 4, arrogance: 2 });
      expect(result.value.criticalDiseases).toEqual(['envy']);
    });
  });

  describe('saveSurveyProgress', () => {
    it('should save survey progress successfully', async () => {
      const progress = SurveyProgress.create({
        userId: 'user-123',
        currentPhase: 2,
        phase1Completed: true,
        phase2Completed: false,
        reflectionCompleted: false,
        resultsGenerated: false,
        startedAt: new Date('2024-01-01'),
        lastUpdated: new Date('2024-01-01')
      });

      const dbProgress = {
        userId: 'user-123',
        currentPhase: 2,
        phase1Completed: true,
        phase2Completed: false,
        reflectionCompleted: false,
        resultsGenerated: false,
        startedAt: '2024-01-01T00:00:00.000Z',
        lastUpdated: '2024-01-01T00:00:00.000Z'
      };

      vi.mocked(mockDb.createSurveyProgress).mockResolvedValue({
        data: dbProgress,
        error: null
      });

      const result = await repository.saveSurveyProgress(progress);

      expect(Result.isOk(result)).toBe(true);
      expect(result.value.currentPhase).toBe(2);
      expect(result.value.phase1Completed).toBe(true);
      expect(result.value.phase2Completed).toBe(false);
    });
  });

  describe('getSurveyProgress', () => {
    it('should get survey progress successfully', async () => {
      const userId = UserId.create('user-123');

      const dbProgress = {
        userId: 'user-123',
        currentPhase: 3,
        phase1Completed: true,
        phase2Completed: true,
        reflectionCompleted: false,
        resultsGenerated: false,
        startedAt: '2024-01-01T00:00:00.000Z',
        lastUpdated: '2024-01-02T00:00:00.000Z'
      };

      vi.mocked(mockDb.getSurveyProgressByUserId).mockResolvedValue({
        data: dbProgress,
        error: null
      });

      const result = await repository.getSurveyProgress(userId);

      expect(Result.isOk(result)).toBe(true);
      expect(result.value?.currentPhase).toBe(3);
      expect(result.value?.phase1Completed).toBe(true);
      expect(result.value?.phase2Completed).toBe(true);
    });

    it('should return null when no progress exists', async () => {
      const userId = UserId.create('user-123');

      vi.mocked(mockDb.getSurveyProgressByUserId).mockResolvedValue({
        data: null,
        error: null
      });

      const result = await repository.getSurveyProgress(userId);

      expect(Result.isOk(result)).toBe(true);
      expect(result.value).toBeNull();
    });
  });

  describe('hasUserCompletedSurvey', () => {
    it('should return true when user has completed survey', async () => {
      const userId = UserId.create('user-123');

      vi.mocked(mockDb.hasUserCompletedSurvey).mockResolvedValue({
        data: true,
        error: null
      });

      const result = await repository.hasUserCompletedSurvey(userId);

      expect(Result.isOk(result)).toBe(true);
      expect(result.value).toBe(true);
    });

    it('should return false when user has not completed survey', async () => {
      const userId = UserId.create('user-123');

      vi.mocked(mockDb.hasUserCompletedSurvey).mockResolvedValue({
        data: false,
        error: null
      });

      const result = await repository.hasUserCompletedSurvey(userId);

      expect(Result.isOk(result)).toBe(true);
      expect(result.value).toBe(false);
    });
  });

  describe('getPhaseCompletionStatus', () => {
    it('should get phase completion status successfully', async () => {
      const userId = UserId.create('user-123');

      const status = {
        phase1Completed: true,
        phase2Completed: true,
        reflectionCompleted: false,
        resultsGenerated: false
      };

      vi.mocked(mockDb.getPhaseCompletionStatus).mockResolvedValue({
        data: status,
        error: null
      });

      const result = await repository.getPhaseCompletionStatus(userId);

      expect(Result.isOk(result)).toBe(true);
      expect(result.value).toEqual(status);
    });
  });

  describe('savePhaseResponses', () => {
    it('should save multiple phase responses successfully', async () => {
      const responses = [
        SurveyResponse.create({
          id: 'response-1',
          userId: 'user-123',
          phaseNumber: 1,
          questionId: 'envy',
          score: 3,
          note: 'Note 1',
          completedAt: new Date(),
          createdAt: new Date()
        }),
        SurveyResponse.create({
          id: 'response-2',
          userId: 'user-123',
          phaseNumber: 1,
          questionId: 'arrogance',
          score: 2,
          completedAt: new Date(),
          createdAt: new Date()
        })
      ];

      const dbResponses = responses.map(r => ({
        id: r.id.toString(),
        userId: r.userId.toString(),
        phaseNumber: r.phaseNumber,
        questionId: r.questionId,
        score: r.score,
        note: r.note,
        completedAt: r.completedAt.toISOString(),
        createdAt: r.createdAt.toISOString()
      }));

      vi.mocked(mockDb.savePhaseResponses).mockResolvedValue({
        data: dbResponses,
        error: null
      });

      const result = await repository.savePhaseResponses(responses);

      expect(Result.isOk(result)).toBe(true);
      expect(result.value).toHaveLength(2);
      expect(result.value[0].questionId).toBe('envy');
      expect(result.value[1].questionId).toBe('arrogance');
    });
  });

  describe('getUserSurveyData', () => {
    it('should get complete user survey data successfully', async () => {
      const userId = UserId.create('user-123');

      const mockData = {
        responses: [
          {
            id: 'response-1',
            userId: 'user-123',
            phaseNumber: 1,
            questionId: 'envy',
            score: 3,
            note: 'Note',
            completedAt: '2024-01-01T00:00:00.000Z',
            createdAt: '2024-01-01T00:00:00.000Z'
          }
        ],
        result: {
          id: 'result-123',
          userId: 'user-123',
          diseaseScores: { envy: 3 },
          criticalDiseases: [],
          reflectionAnswers: {},
          personalizedHabits: [],
          tazkiyahPlan: {},
          radarChartData: null,
          generatedAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z'
        },
        progress: {
          userId: 'user-123',
          currentPhase: 1,
          phase1Completed: false,
          phase2Completed: false,
          reflectionCompleted: false,
          resultsGenerated: false,
          startedAt: '2024-01-01T00:00:00.000Z',
          lastUpdated: '2024-01-01T00:00:00.000Z'
        }
      };

      vi.mocked(mockDb.getUserSurveyData).mockResolvedValue({
        data: mockData,
        error: null
      });

      const result = await repository.getUserSurveyData(userId);

      expect(Result.isOk(result)).toBe(true);
      expect(result.value.responses).toHaveLength(1);
      expect(result.value.results).toBeTruthy();
      expect(result.value.progress).toBeTruthy();
    });

    it('should handle partial data when user has no results yet', async () => {
      const userId = UserId.create('user-123');

      const mockData = {
        responses: [],
        result: null,
        progress: null
      };

      vi.mocked(mockDb.getUserSurveyData).mockResolvedValue({
        data: mockData,
        error: null
      });

      const result = await repository.getUserSurveyData(userId);

      expect(Result.isOk(result)).toBe(true);
      expect(result.value.responses).toHaveLength(0);
      expect(result.value.results).toBeNull();
      expect(result.value.progress).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should handle exceptions gracefully', async () => {
      const userId = UserId.create('user-123');

      vi.mocked(mockDb.getSurveyProgressByUserId).mockRejectedValue(
        new Error('Unexpected database error')
      );

      const result = await repository.getSurveyProgress(userId);

      expect(Result.isError(result)).toBe(true);
      expect(result.error.code).toBe(ErrorCode.DATABASE_ERROR);
      expect(result.error.message).toContain('Unexpected database error');
    });
  });

  describe('getSurveyCompletionStats', () => {
    it('should return not implemented error', async () => {
      const result = await repository.getSurveyCompletionStats();

      expect(Result.isError(result)).toBe(true);
      expect(result.error.code).toBe(ErrorCode.NOT_IMPLEMENTED);
      expect(result.error.message).toContain('not yet implemented');
    });
  });
});