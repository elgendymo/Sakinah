import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SubmitReflectionUseCase } from '@/application/usecases/SubmitReflectionUseCase';
import { ISurveyRepository } from '@/domain/repositories/ISurveyRepository';
import { SurveyProgress } from '@/domain/entities/SurveyProgress';
import { SurveyResponse } from '@/domain/entities/SurveyResponse';
import { SurveyResult } from '@/domain/entities/SurveyResult';
import { Result } from '@/shared/result';
import { ReflectionRequest } from '@sakinah/types';

describe('SubmitReflectionUseCase', () => {
  let useCase: SubmitReflectionUseCase;
  let mockSurveyRepo: jest.Mocked<ISurveyRepository>;

  const validReflectionData: ReflectionRequest = {
    strongestStruggle: 'I struggle most with anger and impatience, especially when things don\'t go as planned.',
    dailyHabit: 'I want to develop a consistent morning dhikr routine to start my day with Allah\'s remembrance.'
  };

  const userId = 'user-123';

  const mockSurveyResponses = [
    { questionId: 'envy', score: 3 },
    { questionId: 'arrogance', score: 2 },
    { questionId: 'selfDeception', score: 4 },
    { questionId: 'lust', score: 1 },
    { questionId: 'anger', score: 5 }, // Critical disease
    { questionId: 'malice', score: 2 },
    { questionId: 'backbiting', score: 3 },
    { questionId: 'suspicion', score: 1 },
    { questionId: 'loveOfDunya', score: 4 }, // Critical disease
    { questionId: 'laziness', score: 2 },
    { questionId: 'despair', score: 1 }
  ];

  beforeEach(() => {
    mockSurveyRepo = {
      getSurveyProgress: vi.fn(),
      updateSurveyProgress: vi.fn(),
      getAllSurveyResponses: vi.fn(),
      saveSurveyResult: vi.fn(),
      // Add other required methods as mocks
      savePhaseResponses: vi.fn(),
      saveSurveyProgress: vi.fn(),
      saveSurveyResponse: vi.fn(),
      getSurveyResponse: vi.fn(),
      getSurveyResponsesByPhase: vi.fn(),
      updateSurveyResponse: vi.fn(),
      deleteSurveyResponse: vi.fn(),
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

    useCase = new SubmitReflectionUseCase(mockSurveyRepo);
  });

  describe('execute', () => {
    it('should successfully submit reflection when prerequisites are met', async () => {
      // Arrange
      const progress = SurveyProgress.createNew(userId);
      progress.advanceToPhase1();
      progress.completePhase1();
      progress.completePhase2(); // Both phases completed, now in reflection

      mockSurveyRepo.getSurveyProgress.mockResolvedValue(Result.ok(progress));
      mockSurveyRepo.getAllSurveyResponses.mockResolvedValue(Result.ok(mockSurveyResponses));

      const mockSurveyResult = SurveyResult.create({
        userId,
        diseaseScores: {
          envy: 3, arrogance: 2, selfDeception: 4, lust: 1,
          anger: 5, malice: 2, backbiting: 3, suspicion: 1,
          loveOfDunya: 4, laziness: 2, despair: 1
        },
        reflectionAnswers: validReflectionData,
        personalizedHabits: [],
        tazkiyahPlan: {
          criticalDiseases: ['anger', 'loveOfDunya'],
          planType: 'takhliyah',
          phases: [],
          expectedDuration: '',
          milestones: []
        },
        radarChartData: {
          labels: [],
          datasets: []
        }
      });

      mockSurveyRepo.saveSurveyResult.mockResolvedValue(Result.ok(mockSurveyResult));

      progress.completeReflection();
      mockSurveyRepo.updateSurveyProgress.mockResolvedValue(Result.ok(progress));

      // Act
      const result = await useCase.execute({
        userId,
        reflectionData: validReflectionData
      });

      // Assert
      expect(Result.isSuccess(result)).toBe(true);
      expect(result.value).toEqual({
        saved: true,
        preview: expect.objectContaining({
          personalizedHabits: expect.arrayContaining([
            'Recite "A\'udhu billahi min ash-shaytani\'r-rajim" when feeling anger'
          ]),
          takhliyahFocus: expect.arrayContaining([
            'Remove anger through patience and dhikr',
            'Detach from excessive worldly desires'
          ]),
          tahliyahFocus: expect.any(Array)
        }),
        progress: expect.objectContaining({
          userId,
          currentPhase: 4,
          reflectionCompleted: true,
          progressPercentage: 100
        }),
        resultsAvailable: true
      });

      expect(mockSurveyRepo.saveSurveyResult).toHaveBeenCalledWith(
        expect.objectContaining({
          _reflectionAnswers: validReflectionData
        })
      );
    });

    it('should reject submission if survey progress not found', async () => {
      // Arrange
      mockSurveyRepo.getSurveyProgress.mockResolvedValue(Result.ok(null));

      // Act
      const result = await useCase.execute({
        userId,
        reflectionData: validReflectionData
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
        reflectionData: validReflectionData
      });

      // Assert
      expect(Result.isError(result)).toBe(true);
      expect(result.error.message).toBe('Phase 1 must be completed before reflection');
    });

    it('should reject submission if Phase 2 is not completed', async () => {
      // Arrange
      const progress = SurveyProgress.createNew(userId);
      progress.advanceToPhase1();
      progress.completePhase1(); // Phase 1 completed but not Phase 2

      mockSurveyRepo.getSurveyProgress.mockResolvedValue(Result.ok(progress));

      // Act
      const result = await useCase.execute({
        userId,
        reflectionData: validReflectionData
      });

      // Assert
      expect(Result.isError(result)).toBe(true);
      expect(result.error.message).toBe('Phase 2 must be completed before reflection');
    });

    it('should reject submission if not in reflection phase', async () => {
      // Arrange
      const progress = SurveyProgress.createNew(userId);
      progress.advanceToPhase1();
      progress.completePhase1(); // Still in Phase 2, not reflection

      mockSurveyRepo.getSurveyProgress.mockResolvedValue(Result.ok(progress));

      // Act
      const result = await useCase.execute({
        userId,
        reflectionData: validReflectionData
      });

      // Assert
      expect(Result.isError(result)).toBe(true);
      expect(result.error.message).toBe('Phase 2 must be completed before reflection');
    });

    it('should reject submission if reflection is already completed', async () => {
      // Arrange
      const progress = SurveyProgress.createNew(userId);
      progress.advanceToPhase1();
      progress.completePhase1();
      progress.completePhase2();
      progress.completeReflection(); // Already completed

      mockSurveyRepo.getSurveyProgress.mockResolvedValue(Result.ok(progress));

      // Act
      const result = await useCase.execute({
        userId,
        reflectionData: validReflectionData
      });

      // Assert
      expect(Result.isError(result)).toBe(true);
      expect(result.error.message).toBe('Reflection has already been completed');
    });

    it('should handle repository error when getting survey responses', async () => {
      // Arrange
      const progress = SurveyProgress.createNew(userId);
      progress.advanceToPhase1();
      progress.completePhase1();
      progress.completePhase2();

      mockSurveyRepo.getSurveyProgress.mockResolvedValue(Result.ok(progress));
      mockSurveyRepo.getAllSurveyResponses.mockResolvedValue(Result.error(new Error('Database error')));

      // Act
      const result = await useCase.execute({
        userId,
        reflectionData: validReflectionData
      });

      // Assert
      expect(Result.isError(result)).toBe(true);
      expect(result.error.message).toBe('Failed to get survey responses for preview generation');
    });

    it('should handle repository error when saving survey result', async () => {
      // Arrange
      const progress = SurveyProgress.createNew(userId);
      progress.advanceToPhase1();
      progress.completePhase1();
      progress.completePhase2();

      mockSurveyRepo.getSurveyProgress.mockResolvedValue(Result.ok(progress));
      mockSurveyRepo.getAllSurveyResponses.mockResolvedValue(Result.ok(mockSurveyResponses));
      mockSurveyRepo.saveSurveyResult.mockResolvedValue(Result.error(new Error('Save failed')));

      // Act
      const result = await useCase.execute({
        userId,
        reflectionData: validReflectionData
      });

      // Assert
      expect(Result.isError(result)).toBe(true);
      expect(result.error.message).toBe('Failed to save survey result');
    });
  });

  describe('validation', () => {
    it('should reject reflection with too short strongest struggle', async () => {
      // Arrange
      const shortReflection: ReflectionRequest = {
        strongestStruggle: 'Short', // Less than 10 characters
        dailyHabit: 'I want to develop a consistent morning routine'
      };

      const progress = SurveyProgress.createNew(userId);
      progress.advanceToPhase1();
      progress.completePhase1();
      progress.completePhase2();

      mockSurveyRepo.getSurveyProgress.mockResolvedValue(Result.ok(progress));

      // Act
      const result = await useCase.execute({
        userId,
        reflectionData: shortReflection
      });

      // Assert
      expect(Result.isError(result)).toBe(true);
      expect(result.error.message).toBe('Strongest struggle response must be at least 10 characters');
    });

    it('should reject reflection with too long strongest struggle', async () => {
      // Arrange
      const longReflection: ReflectionRequest = {
        strongestStruggle: 'a'.repeat(501), // More than 500 characters
        dailyHabit: 'I want to develop a consistent morning routine'
      };

      const progress = SurveyProgress.createNew(userId);
      progress.advanceToPhase1();
      progress.completePhase1();
      progress.completePhase2();

      mockSurveyRepo.getSurveyProgress.mockResolvedValue(Result.ok(progress));

      // Act
      const result = await useCase.execute({
        userId,
        reflectionData: longReflection
      });

      // Assert
      expect(Result.isError(result)).toBe(true);
      expect(result.error.message).toBe('Strongest struggle response cannot exceed 500 characters');
    });

    it('should reject reflection with too short daily habit', async () => {
      // Arrange
      const shortReflection: ReflectionRequest = {
        strongestStruggle: 'I struggle with anger and impatience often',
        dailyHabit: 'Short' // Less than 10 characters
      };

      const progress = SurveyProgress.createNew(userId);
      progress.advanceToPhase1();
      progress.completePhase1();
      progress.completePhase2();

      mockSurveyRepo.getSurveyProgress.mockResolvedValue(Result.ok(progress));

      // Act
      const result = await useCase.execute({
        userId,
        reflectionData: shortReflection
      });

      // Assert
      expect(Result.isError(result)).toBe(true);
      expect(result.error.message).toBe('Daily habit response must be at least 10 characters');
    });

    it('should reject reflection with too long daily habit', async () => {
      // Arrange
      const longReflection: ReflectionRequest = {
        strongestStruggle: 'I struggle with anger and impatience often',
        dailyHabit: 'a'.repeat(501) // More than 500 characters
      };

      const progress = SurveyProgress.createNew(userId);
      progress.advanceToPhase1();
      progress.completePhase1();
      progress.completePhase2();

      mockSurveyRepo.getSurveyProgress.mockResolvedValue(Result.ok(progress));

      // Act
      const result = await useCase.execute({
        userId,
        reflectionData: longReflection
      });

      // Assert
      expect(Result.isError(result)).toBe(true);
      expect(result.error.message).toBe('Daily habit response cannot exceed 500 characters');
    });

    it('should accept reflection at minimum length (10 characters)', async () => {
      // Arrange
      const minReflection: ReflectionRequest = {
        strongestStruggle: '1234567890', // Exactly 10 characters
        dailyHabit: '1234567890' // Exactly 10 characters
      };

      const progress = SurveyProgress.createNew(userId);
      progress.advanceToPhase1();
      progress.completePhase1();
      progress.completePhase2();

      mockSurveyRepo.getSurveyProgress.mockResolvedValue(Result.ok(progress));
      mockSurveyRepo.getAllSurveyResponses.mockResolvedValue(Result.ok(mockSurveyResponses));

      const mockSurveyResult = SurveyResult.create({
        userId,
        diseaseScores: { envy: 3, arrogance: 2, selfDeception: 4, lust: 1, anger: 5, malice: 2, backbiting: 3, suspicion: 1, loveOfDunya: 4, laziness: 2, despair: 1 },
        reflectionAnswers: minReflection,
        personalizedHabits: [],
        tazkiyahPlan: { criticalDiseases: [], planType: 'takhliyah', phases: [], expectedDuration: '', milestones: [] },
        radarChartData: { labels: [], datasets: [] }
      });

      mockSurveyRepo.saveSurveyResult.mockResolvedValue(Result.ok(mockSurveyResult));

      progress.completeReflection();
      mockSurveyRepo.updateSurveyProgress.mockResolvedValue(Result.ok(progress));

      // Act
      const result = await useCase.execute({
        userId,
        reflectionData: minReflection
      });

      // Assert
      expect(Result.isSuccess(result)).toBe(true);
    });

    it('should accept reflection at maximum length (500 characters)', async () => {
      // Arrange
      const maxReflection: ReflectionRequest = {
        strongestStruggle: 'a'.repeat(500), // Exactly 500 characters
        dailyHabit: 'b'.repeat(500) // Exactly 500 characters
      };

      const progress = SurveyProgress.createNew(userId);
      progress.advanceToPhase1();
      progress.completePhase1();
      progress.completePhase2();

      mockSurveyRepo.getSurveyProgress.mockResolvedValue(Result.ok(progress));
      mockSurveyRepo.getAllSurveyResponses.mockResolvedValue(Result.ok(mockSurveyResponses));

      const mockSurveyResult = SurveyResult.create({
        userId,
        diseaseScores: { envy: 3, arrogance: 2, selfDeception: 4, lust: 1, anger: 5, malice: 2, backbiting: 3, suspicion: 1, loveOfDunya: 4, laziness: 2, despair: 1 },
        reflectionAnswers: maxReflection,
        personalizedHabits: [],
        tazkiyahPlan: { criticalDiseases: [], planType: 'takhliyah', phases: [], expectedDuration: '', milestones: [] },
        radarChartData: { labels: [], datasets: [] }
      });

      mockSurveyRepo.saveSurveyResult.mockResolvedValue(Result.ok(mockSurveyResult));

      progress.completeReflection();
      mockSurveyRepo.updateSurveyProgress.mockResolvedValue(Result.ok(progress));

      // Act
      const result = await useCase.execute({
        userId,
        reflectionData: maxReflection
      });

      // Assert
      expect(Result.isSuccess(result)).toBe(true);
    });
  });

  describe('preview generation', () => {
    it('should generate appropriate habits for critical diseases', async () => {
      // Arrange
      const progress = SurveyProgress.createNew(userId);
      progress.advanceToPhase1();
      progress.completePhase1();
      progress.completePhase2();

      mockSurveyRepo.getSurveyProgress.mockResolvedValue(Result.ok(progress));

      // Responses with high scores for envy and anger
      const responsesWithEnvyAndAnger = [
        { questionId: 'envy', score: 5 }, // Critical
        { questionId: 'anger', score: 4 }, // Critical
        { questionId: 'arrogance', score: 1 },
        { questionId: 'selfDeception', score: 2 },
        { questionId: 'lust', score: 1 },
        { questionId: 'malice', score: 2 },
        { questionId: 'backbiting', score: 1 },
        { questionId: 'suspicion', score: 1 },
        { questionId: 'loveOfDunya', score: 2 },
        { questionId: 'laziness', score: 1 },
        { questionId: 'despair', score: 1 }
      ];

      mockSurveyRepo.getAllSurveyResponses.mockResolvedValue(Result.ok(responsesWithEnvyAndAnger));

      const mockSurveyResult = SurveyResult.create({
        userId,
        diseaseScores: { envy: 5, arrogance: 1, selfDeception: 2, lust: 1, anger: 4, malice: 2, backbiting: 1, suspicion: 1, loveOfDunya: 2, laziness: 1, despair: 1 },
        reflectionAnswers: validReflectionData,
        personalizedHabits: [],
        tazkiyahPlan: { criticalDiseases: [], planType: 'takhliyah', phases: [], expectedDuration: '', milestones: [] },
        radarChartData: { labels: [], datasets: [] }
      });

      mockSurveyRepo.saveSurveyResult.mockResolvedValue(Result.ok(mockSurveyResult));

      progress.completeReflection();
      mockSurveyRepo.updateSurveyProgress.mockResolvedValue(Result.ok(progress));

      // Act
      const result = await useCase.execute({
        userId,
        reflectionData: validReflectionData
      });

      // Assert
      expect(Result.isSuccess(result)).toBe(true);
      expect(result.value.preview.personalizedHabits).toContain('Practice daily gratitude dhikr');
      expect(result.value.preview.personalizedHabits).toContain('Recite "A\'udhu billahi min ash-shaytani\'r-rajim" when feeling anger');
      expect(result.value.preview.takhliyahFocus).toContain('Purify heart from envy through gratitude');
      expect(result.value.preview.takhliyahFocus).toContain('Remove anger through patience and dhikr');
    });

    it('should generate habits based on reflection about prayer', async () => {
      // Arrange
      const prayerReflection: ReflectionRequest = {
        strongestStruggle: 'I struggle with maintaining consistent prayer times',
        dailyHabit: 'I want to improve my prayer schedule and focus during salah'
      };

      const progress = SurveyProgress.createNew(userId);
      progress.advanceToPhase1();
      progress.completePhase1();
      progress.completePhase2();

      mockSurveyRepo.getSurveyProgress.mockResolvedValue(Result.ok(progress));
      mockSurveyRepo.getAllSurveyResponses.mockResolvedValue(Result.ok(mockSurveyResponses));

      const mockSurveyResult = SurveyResult.create({
        userId,
        diseaseScores: { envy: 3, arrogance: 2, selfDeception: 4, lust: 1, anger: 5, malice: 2, backbiting: 3, suspicion: 1, loveOfDunya: 4, laziness: 2, despair: 1 },
        reflectionAnswers: prayerReflection,
        personalizedHabits: [],
        tazkiyahPlan: { criticalDiseases: [], planType: 'takhliyah', phases: [], expectedDuration: '', milestones: [] },
        radarChartData: { labels: [], datasets: [] }
      });

      mockSurveyRepo.saveSurveyResult.mockResolvedValue(Result.ok(mockSurveyResult));

      progress.completeReflection();
      mockSurveyRepo.updateSurveyProgress.mockResolvedValue(Result.ok(progress));

      // Act
      const result = await useCase.execute({
        userId,
        reflectionData: prayerReflection
      });

      // Assert
      expect(Result.isSuccess(result)).toBe(true);
      expect(result.value.preview.personalizedHabits).toContain('Maintain consistent prayer schedule');
    });

    it('should categorize diseases correctly into takhliyah and tahliyah focus', async () => {
      // Arrange
      const progress = SurveyProgress.createNew(userId);
      progress.advanceToPhase1();
      progress.completePhase1();
      progress.completePhase2();

      mockSurveyRepo.getSurveyProgress.mockResolvedValue(Result.ok(progress));

      // Mixed scores - some critical (4-5), some strengths (1-2)
      const mixedResponses = [
        { questionId: 'envy', score: 5 }, // Critical - should be in takhliyah
        { questionId: 'arrogance', score: 1 }, // Strength - should be in tahliyah
        { questionId: 'selfDeception', score: 2 }, // Strength - should be in tahliyah
        { questionId: 'lust', score: 1 }, // Strength - should be in tahliyah
        { questionId: 'anger', score: 4 }, // Critical - should be in takhliyah
        { questionId: 'malice', score: 3 }, // Moderate - not in either focus
        { questionId: 'backbiting', score: 1 },
        { questionId: 'suspicion', score: 2 },
        { questionId: 'loveOfDunya', score: 1 },
        { questionId: 'laziness', score: 2 },
        { questionId: 'despair', score: 1 }
      ];

      mockSurveyRepo.getAllSurveyResponses.mockResolvedValue(Result.ok(mixedResponses));

      const mockSurveyResult = SurveyResult.create({
        userId,
        diseaseScores: { envy: 5, arrogance: 1, selfDeception: 2, lust: 1, anger: 4, malice: 3, backbiting: 1, suspicion: 2, loveOfDunya: 1, laziness: 2, despair: 1 },
        reflectionAnswers: validReflectionData,
        personalizedHabits: [],
        tazkiyahPlan: { criticalDiseases: [], planType: 'takhliyah', phases: [], expectedDuration: '', milestones: [] },
        radarChartData: { labels: [], datasets: [] }
      });

      mockSurveyRepo.saveSurveyResult.mockResolvedValue(Result.ok(mockSurveyResult));

      progress.completeReflection();
      mockSurveyRepo.updateSurveyProgress.mockResolvedValue(Result.ok(progress));

      // Act
      const result = await useCase.execute({
        userId,
        reflectionData: validReflectionData
      });

      // Assert
      expect(Result.isSuccess(result)).toBe(true);

      // Check takhliyah focus (removing critical diseases)
      expect(result.value.preview.takhliyahFocus).toContain('Purify heart from envy through gratitude');
      expect(result.value.preview.takhliyahFocus).toContain('Remove anger through patience and dhikr');

      // Check tahliyah focus (building on strengths) - should have up to 3 items
      expect(result.value.preview.tahliyahFocus).toHaveLength(3);
      expect(result.value.preview.tahliyahFocus).toContain('Build humility and modesty'); // arrogance strength
    });
  });
});