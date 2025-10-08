import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SubmitPhase1UseCase } from '@/application/usecases/SubmitPhase1UseCase';
import { ISurveyRepository } from '@/domain/repositories/ISurveyRepository';
import { SurveyProgress } from '@/domain/entities/SurveyProgress';
import { SurveyResponse } from '@/domain/entities/SurveyResponse';
import { Result } from '@/shared/result';
import { Phase1Request } from '@sakinah/types';

describe('SubmitPhase1UseCase', () => {
  let useCase: SubmitPhase1UseCase;
  let mockSurveyRepo: jest.Mocked<ISurveyRepository>;

  const validPhase1Data: Phase1Request = {
    envyScore: 3,
    envyNote: 'Sometimes I feel envious of others',
    arroganceScore: 2,
    arroganceNote: 'I try to be humble',
    selfDeceptionScore: 4,
    selfDeceptionNote: 'I often deceive myself about my flaws',
    lustScore: 1,
    lustNote: undefined
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

    useCase = new SubmitPhase1UseCase(mockSurveyRepo);
  });

  describe('execute', () => {
    it('should successfully submit Phase 1 responses for new user', async () => {
      // Arrange
      mockSurveyRepo.getSurveyProgress.mockResolvedValue(Result.ok(null));

      const savedResponses = [
        SurveyResponse.create({
          userId,
          phaseNumber: 1,
          questionId: 'envy',
          score: 3,
          note: 'Sometimes I feel envious of others'
        })
      ];

      mockSurveyRepo.savePhaseResponses.mockResolvedValue(Result.ok(savedResponses));

      const progress = SurveyProgress.createNew(userId);
      progress.advanceToPhase1();
      progress.completePhase1();

      mockSurveyRepo.updateSurveyProgress.mockResolvedValue(Result.ok(progress));

      // Act
      const result = await useCase.execute({
        userId,
        phase1Data: validPhase1Data
      });

      // Assert
      expect(Result.isSuccess(result)).toBe(true);
      expect(result.value).toEqual({
        saved: true,
        progress: expect.objectContaining({
          userId,
          currentPhase: 2,
          phase1Completed: true,
          phase2Completed: false,
          progressPercentage: 50
        }),
        nextPhaseAvailable: true
      });

      expect(mockSurveyRepo.savePhaseResponses).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            _phaseNumber: 1,
            _questionId: 'envy',
            _score: 3
          }),
          expect.objectContaining({
            _phaseNumber: 1,
            _questionId: 'arrogance',
            _score: 2
          }),
          expect.objectContaining({
            _phaseNumber: 1,
            _questionId: 'selfDeception',
            _score: 4
          }),
          expect.objectContaining({
            _phaseNumber: 1,
            _questionId: 'lust',
            _score: 1
          })
        ])
      );
    });

    it('should successfully submit Phase 1 responses for existing user in Phase 1', async () => {
      // Arrange
      const existingProgress = SurveyProgress.createNew(userId);
      existingProgress.advanceToPhase1();

      mockSurveyRepo.getSurveyProgress.mockResolvedValue(Result.ok(existingProgress));

      const savedResponses = [
        SurveyResponse.create({
          userId,
          phaseNumber: 1,
          questionId: 'envy',
          score: 3
        })
      ];

      mockSurveyRepo.savePhaseResponses.mockResolvedValue(Result.ok(savedResponses));

      existingProgress.completePhase1();
      mockSurveyRepo.updateSurveyProgress.mockResolvedValue(Result.ok(existingProgress));

      // Act
      const result = await useCase.execute({
        userId,
        phase1Data: validPhase1Data
      });

      // Assert
      expect(Result.isSuccess(result)).toBe(true);
      expect(result.value.progress.phase1Completed).toBe(true);
      expect(result.value.progress.currentPhase).toBe(2);
    });

    it('should reject submission if Phase 1 is already completed', async () => {
      // Arrange
      const completedProgress = SurveyProgress.createNew(userId);
      completedProgress.advanceToPhase1();
      completedProgress.completePhase1();

      mockSurveyRepo.getSurveyProgress.mockResolvedValue(Result.ok(completedProgress));

      // Act
      const result = await useCase.execute({
        userId,
        phase1Data: validPhase1Data
      });

      // Assert
      expect(Result.isError(result)).toBe(true);
      expect(result.error.message).toBe('Phase 1 has already been completed');
    });

    it('should handle repository error when getting progress', async () => {
      // Arrange
      mockSurveyRepo.getSurveyProgress.mockResolvedValue(Result.error(new Error('Database error')));

      // Act
      const result = await useCase.execute({
        userId,
        phase1Data: validPhase1Data
      });

      // Assert
      expect(Result.isError(result)).toBe(true);
      expect(result.error.message).toBe('Failed to get survey progress');
    });

    it('should handle repository error when saving responses', async () => {
      // Arrange
      mockSurveyRepo.getSurveyProgress.mockResolvedValue(Result.ok(null));
      mockSurveyRepo.savePhaseResponses.mockResolvedValue(Result.error(new Error('Save failed')));

      // Act
      const result = await useCase.execute({
        userId,
        phase1Data: validPhase1Data
      });

      // Assert
      expect(Result.isError(result)).toBe(true);
      expect(result.error.message).toBe('Failed to save Phase 1 responses');
    });

    it('should handle repository error when updating progress', async () => {
      // Arrange
      mockSurveyRepo.getSurveyProgress.mockResolvedValue(Result.ok(null));

      const savedResponses = [
        SurveyResponse.create({
          userId,
          phaseNumber: 1,
          questionId: 'envy',
          score: 3
        })
      ];

      mockSurveyRepo.savePhaseResponses.mockResolvedValue(Result.ok(savedResponses));
      mockSurveyRepo.updateSurveyProgress.mockResolvedValue(Result.error(new Error('Update failed')));

      // Act
      const result = await useCase.execute({
        userId,
        phase1Data: validPhase1Data
      });

      // Assert
      expect(Result.isError(result)).toBe(true);
      expect(result.error.message).toBe('Failed to update survey progress');
    });
  });

  describe('convertPhase1ToQuestionResponses', () => {
    it('should convert Phase1Request to QuestionResponse array correctly', async () => {
      // This is testing a private method through the public execute method
      mockSurveyRepo.getSurveyProgress.mockResolvedValue(Result.ok(null));

      const savedResponses = [
        SurveyResponse.create({ userId, phaseNumber: 1, questionId: 'envy', score: 3 }),
        SurveyResponse.create({ userId, phaseNumber: 1, questionId: 'arrogance', score: 2 }),
        SurveyResponse.create({ userId, phaseNumber: 1, questionId: 'selfDeception', score: 4 }),
        SurveyResponse.create({ userId, phaseNumber: 1, questionId: 'lust', score: 1 })
      ];

      mockSurveyRepo.savePhaseResponses.mockResolvedValue(Result.ok(savedResponses));

      const progress = SurveyProgress.createNew(userId);
      progress.advanceToPhase1();
      progress.completePhase1();
      mockSurveyRepo.updateSurveyProgress.mockResolvedValue(Result.ok(progress));

      // Act
      await useCase.execute({
        userId,
        phase1Data: validPhase1Data
      });

      // Assert - verify that all 4 questions were converted and saved
      expect(mockSurveyRepo.savePhaseResponses).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ _questionId: 'envy', _score: 3 }),
          expect.objectContaining({ _questionId: 'arrogance', _score: 2 }),
          expect.objectContaining({ _questionId: 'selfDeception', _score: 4 }),
          expect.objectContaining({ _questionId: 'lust', _score: 1 })
        ])
      );
    });

    it('should handle responses without notes', async () => {
      const dataWithoutNotes: Phase1Request = {
        envyScore: 3,
        arroganceScore: 2,
        selfDeceptionScore: 4,
        lustScore: 1
      };

      mockSurveyRepo.getSurveyProgress.mockResolvedValue(Result.ok(null));

      const savedResponses = [
        SurveyResponse.create({ userId, phaseNumber: 1, questionId: 'envy', score: 3 })
      ];

      mockSurveyRepo.savePhaseResponses.mockResolvedValue(Result.ok(savedResponses));

      const progress = SurveyProgress.createNew(userId);
      progress.advanceToPhase1();
      progress.completePhase1();
      mockSurveyRepo.updateSurveyProgress.mockResolvedValue(Result.ok(progress));

      // Act
      const result = await useCase.execute({
        userId,
        phase1Data: dataWithoutNotes
      });

      // Assert
      expect(Result.isSuccess(result)).toBe(true);
    });
  });

  describe('validation', () => {
    it('should accept all valid Likert scores (1-5)', async () => {
      for (let score = 1; score <= 5; score++) {
        const testData: Phase1Request = {
          envyScore: score as any,
          arroganceScore: score as any,
          selfDeceptionScore: score as any,
          lustScore: score as any
        };

        mockSurveyRepo.getSurveyProgress.mockResolvedValue(Result.ok(null));

        const savedResponses = [
          SurveyResponse.create({ userId, phaseNumber: 1, questionId: 'envy', score })
        ];

        mockSurveyRepo.savePhaseResponses.mockResolvedValue(Result.ok(savedResponses));

        const progress = SurveyProgress.createNew(userId);
        progress.advanceToPhase1();
        progress.completePhase1();
        mockSurveyRepo.updateSurveyProgress.mockResolvedValue(Result.ok(progress));

        const result = await useCase.execute({
          userId,
          phase1Data: testData
        });

        expect(Result.isSuccess(result)).toBe(true);
      }
    });

    it('should handle maximum length notes', async () => {
      const maxLengthNote = 'a'.repeat(1000);
      const dataWithMaxNote: Phase1Request = {
        ...validPhase1Data,
        envyNote: maxLengthNote
      };

      mockSurveyRepo.getSurveyProgress.mockResolvedValue(Result.ok(null));

      const savedResponses = [
        SurveyResponse.create({ userId, phaseNumber: 1, questionId: 'envy', score: 3, note: maxLengthNote })
      ];

      mockSurveyRepo.savePhaseResponses.mockResolvedValue(Result.ok(savedResponses));

      const progress = SurveyProgress.createNew(userId);
      progress.advanceToPhase1();
      progress.completePhase1();
      mockSurveyRepo.updateSurveyProgress.mockResolvedValue(Result.ok(progress));

      // Act
      const result = await useCase.execute({
        userId,
        phase1Data: dataWithMaxNote
      });

      // Assert
      expect(Result.isSuccess(result)).toBe(true);
    });

    it('should handle empty string notes', async () => {
      const dataWithEmptyNote: Phase1Request = {
        ...validPhase1Data,
        envyNote: ''
      };

      mockSurveyRepo.getSurveyProgress.mockResolvedValue(Result.ok(null));

      const savedResponses = [
        SurveyResponse.create({ userId, phaseNumber: 1, questionId: 'envy', score: 3, note: '' })
      ];

      mockSurveyRepo.savePhaseResponses.mockResolvedValue(Result.ok(savedResponses));

      const progress = SurveyProgress.createNew(userId);
      progress.advanceToPhase1();
      progress.completePhase1();
      mockSurveyRepo.updateSurveyProgress.mockResolvedValue(Result.ok(progress));

      // Act
      const result = await useCase.execute({
        userId,
        phase1Data: dataWithEmptyNote
      });

      // Assert
      expect(Result.isSuccess(result)).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle user advancing from welcome phase to Phase 1', async () => {
      // Arrange
      const welcomePhaseProgress = SurveyProgress.createNew(userId);
      // User is still in welcome phase (currentPhase = 0)

      mockSurveyRepo.getSurveyProgress.mockResolvedValue(Result.ok(welcomePhaseProgress));

      const savedResponses = [
        SurveyResponse.create({ userId, phaseNumber: 1, questionId: 'envy', score: 3 })
      ];

      mockSurveyRepo.savePhaseResponses.mockResolvedValue(Result.ok(savedResponses));

      // Progress will be advanced and completed
      welcomePhaseProgress.advanceToPhase1();
      welcomePhaseProgress.completePhase1();
      mockSurveyRepo.updateSurveyProgress.mockResolvedValue(Result.ok(welcomePhaseProgress));

      // Act
      const result = await useCase.execute({
        userId,
        phase1Data: validPhase1Data
      });

      // Assert
      expect(Result.isSuccess(result)).toBe(true);
      expect(result.value.progress.currentPhase).toBe(2);
      expect(result.value.progress.phase1Completed).toBe(true);
    });

    it('should handle concurrent submissions gracefully', async () => {
      // This test simulates a race condition where two requests try to submit Phase 1 simultaneously
      const progress1 = SurveyProgress.createNew(userId);
      progress1.advanceToPhase1();
      progress1.completePhase1(); // Already completed by first request

      mockSurveyRepo.getSurveyProgress.mockResolvedValue(Result.ok(progress1));

      // Act
      const result = await useCase.execute({
        userId,
        phase1Data: validPhase1Data
      });

      // Assert
      expect(Result.isError(result)).toBe(true);
      expect(result.error.message).toBe('Phase 1 has already been completed');
    });
  });
});