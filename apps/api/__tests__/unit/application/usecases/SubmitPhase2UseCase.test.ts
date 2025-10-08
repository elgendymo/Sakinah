import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SubmitPhase2UseCase } from '@/application/usecases/SubmitPhase2UseCase';
import { ISurveyRepository } from '@/domain/repositories/ISurveyRepository';
import { SurveyProgress } from '@/domain/entities/SurveyProgress';
import { SurveyResponse } from '@/domain/entities/SurveyResponse';
import { Result } from '@/shared/result';
import { Phase2Request } from '@sakinah/types';

describe('SubmitPhase2UseCase', () => {
  let useCase: SubmitPhase2UseCase;
  let mockSurveyRepo: jest.Mocked<ISurveyRepository>;

  const validPhase2Data: Phase2Request = {
    angerScore: 3,
    angerNote: 'I struggle with anger sometimes',
    maliceScore: 2,
    maliceNote: 'I try not to hold grudges',
    backbitingScore: 4,
    backbitingNote: 'I often talk about others behind their backs',
    suspicionScore: 3,
    suspicionNote: undefined,
    loveOfDunyaScore: 5,
    loveOfDunyaNote: 'I am very attached to worldly things',
    lazinessScore: 2,
    lazinessNote: 'I am generally motivated',
    despairScore: 1,
    despairNote: 'I rarely feel hopeless'
  };

  const userId = 'user-123';

  beforeEach(() => {
    mockSurveyRepo = {
      getSurveyProgress: vi.fn(),
      updateSurveyProgress: vi.fn(),
      savePhaseResponses: vi.fn(),
      saveSurveyProgress: vi.fn(),
      // Add other required methods as mocks
      saveSurveyResponse: vi.fn(),
      getSurveyResponse: vi.fn(),
      getSurveyResponsesByPhase: vi.fn(),
      getAllSurveyResponses: vi.fn(),
      updateSurveyResponse: vi.fn(),
      deleteSurveyResponse: vi.fn(),
      saveSurveyResult: vi.fn(),
      getSurveyResult: vi.fn(),
      getSurveyResultById: vi.fn(),
      updateSurveyResult: vi.fn(),
      deleteSurveyResult: vi.fn(),
      deleteSurveyProgress: vi.fn(),
      hasUserCompletedSurvey: vi.fn(),
      getPhaseCompletionStatus: vi.fn(),
      getUserSurveyData: vi.fn(),
      getSurveyCompletionStats: vi.fn()
    };

    useCase = new SubmitPhase2UseCase(mockSurveyRepo);
  });

  describe('execute', () => {
    it('should successfully submit Phase 2 responses when Phase 1 is completed', async () => {
      // Arrange
      const progress = SurveyProgress.createNew(userId);
      progress.advanceToPhase1();
      progress.completePhase1(); // Phase 1 completed, now in Phase 2

      mockSurveyRepo.getSurveyProgress.mockResolvedValue(Result.ok(progress));

      const savedResponses = [
        SurveyResponse.create({
          userId,
          phaseNumber: 2,
          questionId: 'anger',
          score: 3,
          note: 'I struggle with anger sometimes'
        })
      ];

      mockSurveyRepo.savePhaseResponses.mockResolvedValue(Result.ok(savedResponses));

      progress.completePhase2();
      mockSurveyRepo.updateSurveyProgress.mockResolvedValue(Result.ok(progress));

      // Act
      const result = await useCase.execute({
        userId,
        phase2Data: validPhase2Data
      });

      // Assert
      expect(Result.isSuccess(result)).toBe(true);
      expect(result.value).toEqual({
        saved: true,
        progress: expect.objectContaining({
          userId,
          currentPhase: 3,
          phase1Completed: true,
          phase2Completed: true,
          progressPercentage: 75
        }),
        nextPhaseAvailable: true
      });

      expect(mockSurveyRepo.savePhaseResponses).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ _questionId: 'anger', _score: 3 }),
          expect.objectContaining({ _questionId: 'malice', _score: 2 }),
          expect.objectContaining({ _questionId: 'backbiting', _score: 4 }),
          expect.objectContaining({ _questionId: 'suspicion', _score: 3 }),
          expect.objectContaining({ _questionId: 'loveOfDunya', _score: 5 }),
          expect.objectContaining({ _questionId: 'laziness', _score: 2 }),
          expect.objectContaining({ _questionId: 'despair', _score: 1 })
        ])
      );
    });

    it('should reject submission if survey progress not found', async () => {
      // Arrange
      mockSurveyRepo.getSurveyProgress.mockResolvedValue(Result.ok(null));

      // Act
      const result = await useCase.execute({
        userId,
        phase2Data: validPhase2Data
      });

      // Assert
      expect(Result.isError(result)).toBe(true);
      expect(result.error.message).toBe('Survey progress not found. Please start from Phase 1');
    });

    it('should reject submission if Phase 1 is not completed', async () => {
      // Arrange
      const progress = SurveyProgress.createNew(userId);
      progress.advanceToPhase1(); // Phase 1 started but not completed

      mockSurveyRepo.getSurveyProgress.mockResolvedValue(Result.ok(progress));

      // Act
      const result = await useCase.execute({
        userId,
        phase2Data: validPhase2Data
      });

      // Assert
      expect(Result.isError(result)).toBe(true);
      expect(result.error.message).toBe('Phase 1 must be completed before Phase 2');
    });

    it('should reject submission if not in Phase 2', async () => {
      // Arrange
      const progress = SurveyProgress.createNew(userId);
      // User is still in welcome phase (currentPhase = 0)

      mockSurveyRepo.getSurveyProgress.mockResolvedValue(Result.ok(progress));

      // Act
      const result = await useCase.execute({
        userId,
        phase2Data: validPhase2Data
      });

      // Assert
      expect(Result.isError(result)).toBe(true);
      expect(result.error.message).toBe('Phase 1 must be completed before Phase 2');
    });

    it('should reject submission if Phase 2 is already completed', async () => {
      // Arrange
      const progress = SurveyProgress.createNew(userId);
      progress.advanceToPhase1();
      progress.completePhase1();
      progress.completePhase2(); // Already completed

      mockSurveyRepo.getSurveyProgress.mockResolvedValue(Result.ok(progress));

      // Act
      const result = await useCase.execute({
        userId,
        phase2Data: validPhase2Data
      });

      // Assert
      expect(Result.isError(result)).toBe(true);
      expect(result.error.message).toBe('Phase 2 has already been completed');
    });

    it('should handle repository error when getting progress', async () => {
      // Arrange
      mockSurveyRepo.getSurveyProgress.mockResolvedValue(Result.error(new Error('Database error')));

      // Act
      const result = await useCase.execute({
        userId,
        phase2Data: validPhase2Data
      });

      // Assert
      expect(Result.isError(result)).toBe(true);
      expect(result.error.message).toBe('Failed to get survey progress');
    });

    it('should handle repository error when saving responses', async () => {
      // Arrange
      const progress = SurveyProgress.createNew(userId);
      progress.advanceToPhase1();
      progress.completePhase1();

      mockSurveyRepo.getSurveyProgress.mockResolvedValue(Result.ok(progress));
      mockSurveyRepo.savePhaseResponses.mockResolvedValue(Result.error(new Error('Save failed')));

      // Act
      const result = await useCase.execute({
        userId,
        phase2Data: validPhase2Data
      });

      // Assert
      expect(Result.isError(result)).toBe(true);
      expect(result.error.message).toBe('Failed to save Phase 2 responses');
    });

    it('should handle repository error when updating progress', async () => {
      // Arrange
      const progress = SurveyProgress.createNew(userId);
      progress.advanceToPhase1();
      progress.completePhase1();

      mockSurveyRepo.getSurveyProgress.mockResolvedValue(Result.ok(progress));

      const savedResponses = [
        SurveyResponse.create({
          userId,
          phaseNumber: 2,
          questionId: 'anger',
          score: 3
        })
      ];

      mockSurveyRepo.savePhaseResponses.mockResolvedValue(Result.ok(savedResponses));
      mockSurveyRepo.updateSurveyProgress.mockResolvedValue(Result.error(new Error('Update failed')));

      // Act
      const result = await useCase.execute({
        userId,
        phase2Data: validPhase2Data
      });

      // Assert
      expect(Result.isError(result)).toBe(true);
      expect(result.error.message).toBe('Failed to update survey progress');
    });
  });

  describe('convertPhase2ToQuestionResponses', () => {
    it('should convert Phase2Request to QuestionResponse array correctly', async () => {
      // This is testing a private method through the public execute method
      const progress = SurveyProgress.createNew(userId);
      progress.advanceToPhase1();
      progress.completePhase1();

      mockSurveyRepo.getSurveyProgress.mockResolvedValue(Result.ok(progress));

      const savedResponses = [
        SurveyResponse.create({ userId, phaseNumber: 2, questionId: 'anger', score: 3 }),
        SurveyResponse.create({ userId, phaseNumber: 2, questionId: 'malice', score: 2 }),
        SurveyResponse.create({ userId, phaseNumber: 2, questionId: 'backbiting', score: 4 }),
        SurveyResponse.create({ userId, phaseNumber: 2, questionId: 'suspicion', score: 3 }),
        SurveyResponse.create({ userId, phaseNumber: 2, questionId: 'loveOfDunya', score: 5 }),
        SurveyResponse.create({ userId, phaseNumber: 2, questionId: 'laziness', score: 2 }),
        SurveyResponse.create({ userId, phaseNumber: 2, questionId: 'despair', score: 1 })
      ];

      mockSurveyRepo.savePhaseResponses.mockResolvedValue(Result.ok(savedResponses));

      progress.completePhase2();
      mockSurveyRepo.updateSurveyProgress.mockResolvedValue(Result.ok(progress));

      // Act
      await useCase.execute({
        userId,
        phase2Data: validPhase2Data
      });

      // Assert - verify that all 7 questions were converted and saved
      expect(mockSurveyRepo.savePhaseResponses).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ _questionId: 'anger', _score: 3 }),
          expect.objectContaining({ _questionId: 'malice', _score: 2 }),
          expect.objectContaining({ _questionId: 'backbiting', _score: 4 }),
          expect.objectContaining({ _questionId: 'suspicion', _score: 3 }),
          expect.objectContaining({ _questionId: 'loveOfDunya', _score: 5 }),
          expect.objectContaining({ _questionId: 'laziness', _score: 2 }),
          expect.objectContaining({ _questionId: 'despair', _score: 1 })
        ])
      );
    });

    it('should handle responses without notes', async () => {
      const dataWithoutNotes: Phase2Request = {
        angerScore: 3,
        maliceScore: 2,
        backbitingScore: 4,
        suspicionScore: 3,
        loveOfDunyaScore: 5,
        lazinessScore: 2,
        despairScore: 1
      };

      const progress = SurveyProgress.createNew(userId);
      progress.advanceToPhase1();
      progress.completePhase1();

      mockSurveyRepo.getSurveyProgress.mockResolvedValue(Result.ok(progress));

      const savedResponses = [
        SurveyResponse.create({ userId, phaseNumber: 2, questionId: 'anger', score: 3 })
      ];

      mockSurveyRepo.savePhaseResponses.mockResolvedValue(Result.ok(savedResponses));

      progress.completePhase2();
      mockSurveyRepo.updateSurveyProgress.mockResolvedValue(Result.ok(progress));

      // Act
      const result = await useCase.execute({
        userId,
        phase2Data: dataWithoutNotes
      });

      // Assert
      expect(Result.isSuccess(result)).toBe(true);
    });
  });

  describe('validation', () => {
    it('should accept all valid Likert scores (1-5)', async () => {
      for (let score = 1; score <= 5; score++) {
        const testData: Phase2Request = {
          angerScore: score as any,
          maliceScore: score as any,
          backbitingScore: score as any,
          suspicionScore: score as any,
          loveOfDunyaScore: score as any,
          lazinessScore: score as any,
          despairScore: score as any
        };

        const progress = SurveyProgress.createNew(userId);
        progress.advanceToPhase1();
        progress.completePhase1();

        mockSurveyRepo.getSurveyProgress.mockResolvedValue(Result.ok(progress));

        const savedResponses = [
          SurveyResponse.create({ userId, phaseNumber: 2, questionId: 'anger', score })
        ];

        mockSurveyRepo.savePhaseResponses.mockResolvedValue(Result.ok(savedResponses));

        progress.completePhase2();
        mockSurveyRepo.updateSurveyProgress.mockResolvedValue(Result.ok(progress));

        const result = await useCase.execute({
          userId,
          phase2Data: testData
        });

        expect(Result.isSuccess(result)).toBe(true);
      }
    });

    it('should handle maximum length notes', async () => {
      const maxLengthNote = 'a'.repeat(1000);
      const dataWithMaxNote: Phase2Request = {
        ...validPhase2Data,
        angerNote: maxLengthNote
      };

      const progress = SurveyProgress.createNew(userId);
      progress.advanceToPhase1();
      progress.completePhase1();

      mockSurveyRepo.getSurveyProgress.mockResolvedValue(Result.ok(progress));

      const savedResponses = [
        SurveyResponse.create({ userId, phaseNumber: 2, questionId: 'anger', score: 3, note: maxLengthNote })
      ];

      mockSurveyRepo.savePhaseResponses.mockResolvedValue(Result.ok(savedResponses));

      progress.completePhase2();
      mockSurveyRepo.updateSurveyProgress.mockResolvedValue(Result.ok(progress));

      // Act
      const result = await useCase.execute({
        userId,
        phase2Data: dataWithMaxNote
      });

      // Assert
      expect(Result.isSuccess(result)).toBe(true);
    });

    it('should handle empty string notes', async () => {
      const dataWithEmptyNote: Phase2Request = {
        ...validPhase2Data,
        angerNote: ''
      };

      const progress = SurveyProgress.createNew(userId);
      progress.advanceToPhase1();
      progress.completePhase1();

      mockSurveyRepo.getSurveyProgress.mockResolvedValue(Result.ok(progress));

      const savedResponses = [
        SurveyResponse.create({ userId, phaseNumber: 2, questionId: 'anger', score: 3, note: '' })
      ];

      mockSurveyRepo.savePhaseResponses.mockResolvedValue(Result.ok(savedResponses));

      progress.completePhase2();
      mockSurveyRepo.updateSurveyProgress.mockResolvedValue(Result.ok(progress));

      // Act
      const result = await useCase.execute({
        userId,
        phase2Data: dataWithEmptyNote
      });

      // Assert
      expect(Result.isSuccess(result)).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle various phases of completion states', async () => {
      // Test different starting states for Phase 2
      const testCases = [
        {
          description: 'Phase 1 just completed, advancing to Phase 2',
          setupProgress: (p: SurveyProgress) => {
            p.advanceToPhase1();
            p.completePhase1(); // Just finished Phase 1, now in Phase 2
          },
          shouldSucceed: true
        }
      ];

      for (const testCase of testCases) {
        const progress = SurveyProgress.createNew(userId);
        testCase.setupProgress(progress);

        mockSurveyRepo.getSurveyProgress.mockResolvedValue(Result.ok(progress));

        if (testCase.shouldSucceed) {
          const savedResponses = [
            SurveyResponse.create({ userId, phaseNumber: 2, questionId: 'anger', score: 3 })
          ];

          mockSurveyRepo.savePhaseResponses.mockResolvedValue(Result.ok(savedResponses));

          progress.completePhase2();
          mockSurveyRepo.updateSurveyProgress.mockResolvedValue(Result.ok(progress));
        }

        const result = await useCase.execute({
          userId,
          phase2Data: validPhase2Data
        });

        if (testCase.shouldSucceed) {
          expect(Result.isSuccess(result)).toBe(true);
        } else {
          expect(Result.isError(result)).toBe(true);
        }
      }
    });

    it('should handle all Phase 2 questions consistently', async () => {
      // Verify all 7 Phase 2 questions are handled
      const allQuestions = ['anger', 'malice', 'backbiting', 'suspicion', 'loveOfDunya', 'laziness', 'despair'];

      const progress = SurveyProgress.createNew(userId);
      progress.advanceToPhase1();
      progress.completePhase1();

      mockSurveyRepo.getSurveyProgress.mockResolvedValue(Result.ok(progress));

      const savedResponses = allQuestions.map(questionId =>
        SurveyResponse.create({ userId, phaseNumber: 2, questionId, score: 3 })
      );

      mockSurveyRepo.savePhaseResponses.mockResolvedValue(Result.ok(savedResponses));

      progress.completePhase2();
      mockSurveyRepo.updateSurveyProgress.mockResolvedValue(Result.ok(progress));

      // Act
      const result = await useCase.execute({
        userId,
        phase2Data: validPhase2Data
      });

      // Assert
      expect(Result.isSuccess(result)).toBe(true);

      const savedResponsesCall = mockSurveyRepo.savePhaseResponses.mock.calls[0][0];
      expect(savedResponsesCall).toHaveLength(7);

      allQuestions.forEach(questionId => {
        expect(savedResponsesCall.some((r: any) => r._questionId === questionId)).toBe(true);
      });
    });
  });
});