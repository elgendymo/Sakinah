import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ValidateSurveyProgressUseCase } from '@/application/usecases/ValidateSurveyProgressUseCase';
import { ISurveyRepository } from '@/domain/repositories/ISurveyRepository';
import { SurveyProgress } from '@/domain/entities/SurveyProgress';
import { Result } from '@/shared/result';

describe('ValidateSurveyProgressUseCase', () => {
  let useCase: ValidateSurveyProgressUseCase;
  let mockSurveyRepo: jest.Mocked<ISurveyRepository>;

  const userId = 'user-123';

  beforeEach(() => {
    mockSurveyRepo = {
      getSurveyProgress: vi.fn(),
      saveSurveyProgress: vi.fn(),
      updateSurveyProgress: vi.fn(),
      // Add other required methods as mocks
      savePhaseResponses: vi.fn(),
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

    useCase = new ValidateSurveyProgressUseCase(mockSurveyRepo);
  });

  describe('execute - phase validation', () => {
    it('should allow access to welcome phase (phase 0) for any user', async () => {
      // Arrange
      const progress = SurveyProgress.createNew(userId);
      mockSurveyRepo.getSurveyProgress.mockResolvedValue(Result.ok(progress));

      // Act
      const result = await useCase.execute({
        userId,
        targetPhase: 0
      });

      // Assert
      expect(Result.isSuccess(result)).toBe(true);
      expect(result.value.canAccess).toBe(true);
      expect(result.value.currentPhase).toBe(0);
      expect(result.value.redirectToPhase).toBeUndefined();
    });

    it('should allow access to Phase 1 from welcome phase', async () => {
      // Arrange
      const progress = SurveyProgress.createNew(userId);
      mockSurveyRepo.getSurveyProgress.mockResolvedValue(Result.ok(progress));

      // Act
      const result = await useCase.execute({
        userId,
        targetPhase: 1
      });

      // Assert
      expect(Result.isSuccess(result)).toBe(true);
      expect(result.value.canAccess).toBe(true);
      expect(result.value.redirectToPhase).toBeUndefined();
    });

    it('should allow access to Phase 1 when already in Phase 1', async () => {
      // Arrange
      const progress = SurveyProgress.createNew(userId);
      progress.advanceToPhase1();
      mockSurveyRepo.getSurveyProgress.mockResolvedValue(Result.ok(progress));

      // Act
      const result = await useCase.execute({
        userId,
        targetPhase: 1
      });

      // Assert
      expect(Result.isSuccess(result)).toBe(true);
      expect(result.value.canAccess).toBe(true);
    });

    it('should allow access to completed Phase 1 with appropriate message', async () => {
      // Arrange
      const progress = SurveyProgress.createNew(userId);
      progress.advanceToPhase1();
      progress.completePhase1();
      mockSurveyRepo.getSurveyProgress.mockResolvedValue(Result.ok(progress));

      // Act
      const result = await useCase.execute({
        userId,
        targetPhase: 1
      });

      // Assert
      expect(Result.isSuccess(result)).toBe(true);
      expect(result.value.canAccess).toBe(true);
      expect(result.value.message).toBe('Phase 1 has already been completed');
    });

    it('should deny access to Phase 2 when Phase 1 is not completed', async () => {
      // Arrange
      const progress = SurveyProgress.createNew(userId);
      progress.advanceToPhase1(); // In Phase 1 but not completed
      mockSurveyRepo.getSurveyProgress.mockResolvedValue(Result.ok(progress));

      // Act
      const result = await useCase.execute({
        userId,
        targetPhase: 2
      });

      // Assert
      expect(Result.isSuccess(result)).toBe(true);
      expect(result.value.canAccess).toBe(false);
      expect(result.value.redirectToPhase).toBe(1);
      expect(result.value.message).toBe('Phase 1 must be completed before accessing Phase 2');
    });

    it('should allow access to Phase 2 when Phase 1 is completed', async () => {
      // Arrange
      const progress = SurveyProgress.createNew(userId);
      progress.advanceToPhase1();
      progress.completePhase1(); // Now in Phase 2
      mockSurveyRepo.getSurveyProgress.mockResolvedValue(Result.ok(progress));

      // Act
      const result = await useCase.execute({
        userId,
        targetPhase: 2
      });

      // Assert
      expect(Result.isSuccess(result)).toBe(true);
      expect(result.value.canAccess).toBe(true);
      expect(result.value.redirectToPhase).toBeUndefined();
    });

    it('should deny access to reflection phase when Phase 2 is not completed', async () => {
      // Arrange
      const progress = SurveyProgress.createNew(userId);
      progress.advanceToPhase1();
      progress.completePhase1(); // In Phase 2 but not completed
      mockSurveyRepo.getSurveyProgress.mockResolvedValue(Result.ok(progress));

      // Act
      const result = await useCase.execute({
        userId,
        targetPhase: 3
      });

      // Assert
      expect(Result.isSuccess(result)).toBe(true);
      expect(result.value.canAccess).toBe(false);
      expect(result.value.redirectToPhase).toBe(2);
      expect(result.value.message).toBe('Both Phase 1 and Phase 2 must be completed before accessing the reflection phase');
    });

    it('should allow access to reflection phase when both phases are completed', async () => {
      // Arrange
      const progress = SurveyProgress.createNew(userId);
      progress.advanceToPhase1();
      progress.completePhase1();
      progress.completePhase2(); // Now in reflection phase
      mockSurveyRepo.getSurveyProgress.mockResolvedValue(Result.ok(progress));

      // Act
      const result = await useCase.execute({
        userId,
        targetPhase: 3
      });

      // Assert
      expect(Result.isSuccess(result)).toBe(true);
      expect(result.value.canAccess).toBe(true);
    });

    it('should deny access to results phase when reflection is not completed', async () => {
      // Arrange
      const progress = SurveyProgress.createNew(userId);
      progress.advanceToPhase1();
      progress.completePhase1();
      progress.completePhase2(); // In reflection but not completed
      mockSurveyRepo.getSurveyProgress.mockResolvedValue(Result.ok(progress));

      // Act
      const result = await useCase.execute({
        userId,
        targetPhase: 4
      });

      // Assert
      expect(Result.isSuccess(result)).toBe(true);
      expect(result.value.canAccess).toBe(false);
      expect(result.value.redirectToPhase).toBe(3);
      expect(result.value.message).toBe('All previous phases must be completed before accessing results');
    });

    it('should allow access to results phase when all phases are completed', async () => {
      // Arrange
      const progress = SurveyProgress.createNew(userId);
      progress.advanceToPhase1();
      progress.completePhase1();
      progress.completePhase2();
      progress.completeReflection(); // Now in results phase
      mockSurveyRepo.getSurveyProgress.mockResolvedValue(Result.ok(progress));

      // Act
      const result = await useCase.execute({
        userId,
        targetPhase: 4
      });

      // Assert
      expect(Result.isSuccess(result)).toBe(true);
      expect(result.value.canAccess).toBe(true);
    });

    it('should deny access to invalid phase numbers', async () => {
      // Arrange
      const progress = SurveyProgress.createNew(userId);
      mockSurveyRepo.getSurveyProgress.mockResolvedValue(Result.ok(progress));

      // Act
      const result = await useCase.execute({
        userId,
        targetPhase: 5 // Invalid phase
      });

      // Assert
      expect(Result.isSuccess(result)).toBe(true);
      expect(result.value.canAccess).toBe(false);
      expect(result.value.message).toBe('Invalid phase requested');
    });

    it('should create new progress if none exists', async () => {
      // Arrange
      mockSurveyRepo.getSurveyProgress.mockResolvedValue(Result.ok(null));

      const newProgress = SurveyProgress.createNew(userId);
      mockSurveyRepo.saveSurveyProgress.mockResolvedValue(Result.ok(newProgress));

      // Act
      const result = await useCase.execute({
        userId,
        targetPhase: 0
      });

      // Assert
      expect(Result.isSuccess(result)).toBe(true);
      expect(result.value.canAccess).toBe(true);
      expect(result.value.currentPhase).toBe(0);
      expect(mockSurveyRepo.saveSurveyProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          _currentPhase: 0
        })
      );
    });

    it('should handle repository error when getting progress', async () => {
      // Arrange
      mockSurveyRepo.getSurveyProgress.mockResolvedValue(Result.error(new Error('Database error')));

      // Act
      const result = await useCase.execute({
        userId,
        targetPhase: 1
      });

      // Assert
      expect(Result.isError(result)).toBe(true);
      expect(result.error.message).toBe('Failed to get survey progress');
    });

    it('should handle repository error when creating new progress', async () => {
      // Arrange
      mockSurveyRepo.getSurveyProgress.mockResolvedValue(Result.ok(null));
      mockSurveyRepo.saveSurveyProgress.mockResolvedValue(Result.error(new Error('Save failed')));

      // Act
      const result = await useCase.execute({
        userId,
        targetPhase: 0
      });

      // Assert
      expect(Result.isError(result)).toBe(true);
      expect(result.error.message).toBe('Failed to initialize survey progress');
    });
  });

  describe('getCurrentProgress', () => {
    it('should return current progress for existing user', async () => {
      // Arrange
      const progress = SurveyProgress.createNew(userId);
      progress.advanceToPhase1();
      progress.completePhase1();

      mockSurveyRepo.getSurveyProgress.mockResolvedValue(Result.ok(progress));

      // Act
      const result = await useCase.getCurrentProgress(userId);

      // Assert
      expect(Result.isSuccess(result)).toBe(true);
      expect(result.value.currentPhase).toBe(2);
      expect(result.value.nextAvailablePhase).toBe(2);
      expect(result.value.canAccess).toBe(true);
    });

    it('should create and return new progress for new user', async () => {
      // Arrange
      mockSurveyRepo.getSurveyProgress.mockResolvedValue(Result.ok(null));

      const newProgress = SurveyProgress.createNew(userId);
      mockSurveyRepo.saveSurveyProgress.mockResolvedValue(Result.ok(newProgress));

      // Act
      const result = await useCase.getCurrentProgress(userId);

      // Assert
      expect(Result.isSuccess(result)).toBe(true);
      expect(result.value.currentPhase).toBe(0);
      expect(result.value.nextAvailablePhase).toBe(1);
      expect(mockSurveyRepo.saveSurveyProgress).toHaveBeenCalled();
    });

    it('should handle repository error', async () => {
      // Arrange
      mockSurveyRepo.getSurveyProgress.mockResolvedValue(Result.error(new Error('Database error')));

      // Act
      const result = await useCase.getCurrentProgress(userId);

      // Assert
      expect(Result.isError(result)).toBe(true);
      expect(result.error.message).toBe('Failed to get survey progress');
    });
  });

  describe('advanceToNextPhase', () => {
    it('should advance from welcome phase to Phase 1', async () => {
      // Arrange
      const progress = SurveyProgress.createNew(userId);
      mockSurveyRepo.getSurveyProgress.mockResolvedValue(Result.ok(progress));

      progress.advanceToPhase1();
      mockSurveyRepo.updateSurveyProgress.mockResolvedValue(Result.ok(progress));

      // Act
      const result = await useCase.advanceToNextPhase(userId);

      // Assert
      expect(Result.isSuccess(result)).toBe(true);
      expect(result.value.currentPhase).toBe(1);
      expect(mockSurveyRepo.updateSurveyProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          _currentPhase: 1
        })
      );
    });

    it('should not advance if already past welcome phase', async () => {
      // Arrange
      const progress = SurveyProgress.createNew(userId);
      progress.advanceToPhase1(); // Already in Phase 1

      mockSurveyRepo.getSurveyProgress.mockResolvedValue(Result.ok(progress));

      // Act
      const result = await useCase.advanceToNextPhase(userId);

      // Assert
      expect(Result.isSuccess(result)).toBe(true);
      expect(result.value.currentPhase).toBe(1);
      expect(mockSurveyRepo.updateSurveyProgress).not.toHaveBeenCalled();
    });

    it('should handle missing progress', async () => {
      // Arrange
      mockSurveyRepo.getSurveyProgress.mockResolvedValue(Result.ok(null));

      // Act
      const result = await useCase.advanceToNextPhase(userId);

      // Assert
      expect(Result.isError(result)).toBe(true);
      expect(result.error.message).toBe('Survey progress not found');
    });

    it('should handle repository error when updating progress', async () => {
      // Arrange
      const progress = SurveyProgress.createNew(userId);
      mockSurveyRepo.getSurveyProgress.mockResolvedValue(Result.ok(progress));
      mockSurveyRepo.updateSurveyProgress.mockResolvedValue(Result.error(new Error('Update failed')));

      // Act
      const result = await useCase.advanceToNextPhase(userId);

      // Assert
      expect(Result.isError(result)).toBe(true);
      expect(result.error.message).toBe('Failed to update survey progress');
    });
  });

  describe('edge cases and comprehensive progression', () => {
    it('should handle complete survey progression correctly', async () => {
      // Test the entire progression from start to finish
      const progress = SurveyProgress.createNew(userId);

      // Test each phase in sequence
      const phases = [
        { phase: 0, shouldAllow: true, description: 'Welcome phase' },
        { phase: 1, shouldAllow: true, description: 'Phase 1 from welcome' },
        { phase: 2, shouldAllow: false, description: 'Phase 2 without Phase 1 completion' }
      ];

      for (const testCase of phases) {
        mockSurveyRepo.getSurveyProgress.mockResolvedValue(Result.ok(progress));

        const result = await useCase.execute({
          userId,
          targetPhase: testCase.phase
        });

        expect(Result.isSuccess(result)).toBe(true);
        expect(result.value.canAccess).toBe(testCase.shouldAllow);
      }

      // Complete Phase 1 and test Phase 2 access
      progress.advanceToPhase1();
      progress.completePhase1();

      mockSurveyRepo.getSurveyProgress.mockResolvedValue(Result.ok(progress));

      const phase2Result = await useCase.execute({
        userId,
        targetPhase: 2
      });

      expect(Result.isSuccess(phase2Result)).toBe(true);
      expect(phase2Result.value.canAccess).toBe(true);
    });

    it('should correctly calculate next available phase for various states', async () => {
      // Test different progress states
      const testCases = [
        {
          setup: (p: SurveyProgress) => {}, // Fresh start
          expectedNext: 1
        },
        {
          setup: (p: SurveyProgress) => {
            p.advanceToPhase1();
          },
          expectedNext: 1
        },
        {
          setup: (p: SurveyProgress) => {
            p.advanceToPhase1();
            p.completePhase1();
          },
          expectedNext: 2
        },
        {
          setup: (p: SurveyProgress) => {
            p.advanceToPhase1();
            p.completePhase1();
            p.completePhase2();
          },
          expectedNext: 3
        },
        {
          setup: (p: SurveyProgress) => {
            p.advanceToPhase1();
            p.completePhase1();
            p.completePhase2();
            p.completeReflection();
          },
          expectedNext: 4
        }
      ];

      for (const testCase of testCases) {
        const progress = SurveyProgress.createNew(userId);
        testCase.setup(progress);

        mockSurveyRepo.getSurveyProgress.mockResolvedValue(Result.ok(progress));

        const result = await useCase.getCurrentProgress(userId);

        expect(Result.isSuccess(result)).toBe(true);
        expect(result.value.nextAvailablePhase).toBe(testCase.expectedNext);
      }
    });
  });
});