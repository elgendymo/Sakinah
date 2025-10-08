import { describe, it, expect, beforeEach, vi } from 'vitest';
import { container } from 'tsyringe';
import { GenerateResultsUseCase } from '@/application/usecases/GenerateResultsUseCase';
import { ISurveyRepository } from '@/domain/repositories/ISurveyRepository';
import { ISurveyAiProvider } from '@/domain/providers/ISurveyAiProvider';
import { SurveyResult } from '@/domain/entities/SurveyResult';
import { UserId } from '@/domain/value-objects/UserId';
import { Result } from '@/shared/result';
import { ErrorCode } from '@/shared/errors';
import type { SurveyProgress, PersonalizedHabit, TazkiyahPlan, Disease, LikertScore } from '@sakinah/types';

// Mock dependencies
const mockSurveyRepository = {
  getSurveyResult: vi.fn(),
  getUserSurveyData: vi.fn(),
  saveSurveyResult: vi.fn(),
  updateSurveyProgress: vi.fn(),
} as any as ISurveyRepository;

const mockAiProvider = {
  generatePersonalizedHabits: vi.fn(),
  generateTazkiyahPlan: vi.fn(),
} as any as ISurveyAiProvider;

describe('GenerateResultsUseCase', () => {
  let useCase: GenerateResultsUseCase;
  let userId: string;
  let mockSurveyData: any;
  let mockPersonalizedHabits: PersonalizedHabit[];
  let mockTazkiyahPlan: TazkiyahPlan;

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();

    // Register mocks in container
    container.clearInstances();
    container.register('ISurveyRepository', { useValue: mockSurveyRepository });
    container.register('ISurveyAiProvider', { useValue: mockAiProvider });

    useCase = new GenerateResultsUseCase(mockSurveyRepository, mockAiProvider);

    userId = 'test-user-id';

    mockSurveyData = {
      responses: [
        { questionId: 'envy', score: 4, note: 'Test envy note' },
        { questionId: 'arrogance', score: 2, note: 'Test arrogance note' },
        { questionId: 'anger', score: 5, note: 'Test anger note' },
        { questionId: 'lust', score: 3, note: 'Test lust note' },
        { questionId: 'malice', score: 1, note: 'Test malice note' },
        { questionId: 'backbiting', score: 2, note: 'Test backbiting note' },
        { questionId: 'suspicion', score: 3, note: 'Test suspicion note' },
        { questionId: 'loveOfDunya', score: 4, note: 'Test love of dunya note' },
        { questionId: 'laziness', score: 2, note: 'Test laziness note' },
        { questionId: 'despair', score: 1, note: 'Test despair note' },
        { questionId: 'selfDeception', score: 3, note: 'Test self-deception note' }
      ],
      progress: {
        reflectionCompleted: true,
        reflectionAnswers: {
          strongestStruggle: 'My biggest struggle is with anger management',
          dailyHabit: 'I want to establish regular dhikr practice'
        }
      }
    };

    mockPersonalizedHabits = [
      {
        id: 'habit-1',
        title: 'Morning dhikr',
        description: 'Recite dhikr after Fajr prayer',
        frequency: 'daily' as const,
        targetDisease: 'anger' as Disease,
        difficultyLevel: 'easy' as const,
        estimatedDuration: '10 minutes',
        islamicContent: []
      },
      {
        id: 'habit-2',
        title: 'Gratitude practice',
        description: 'Write down 3 things you are grateful for',
        frequency: 'daily' as const,
        targetDisease: 'envy' as Disease,
        difficultyLevel: 'moderate' as const,
        estimatedDuration: '5 minutes',
        islamicContent: []
      }
    ];

    mockTazkiyahPlan = {
      criticalDiseases: ['anger', 'envy', 'loveOfDunya'],
      planType: 'takhliyah' as const,
      phases: [
        {
          phaseNumber: 1,
          title: 'Awareness Phase',
          description: 'Building awareness of spiritual diseases',
          targetDiseases: ['anger', 'envy'],
          duration: '2 weeks',
          practices: [
            {
              name: 'Self-reflection',
              type: 'reflection' as const,
              description: 'Daily self-accountability practice',
              frequency: 'Daily',
              islamicBasis: []
            }
          ],
          checkpoints: ['Identify triggers', 'Establish routine']
        }
      ],
      expectedDuration: '3 months',
      milestones: [
        {
          id: 'milestone-1',
          title: 'Foundation Established',
          description: 'Basic awareness and routine established',
          targetDate: new Date(),
          completed: false
        }
      ]
    };
  });

  describe('execute', () => {
    it('should return existing results if they already exist', async () => {
      // Arrange
      const existingResult = SurveyResult.create({
        userId,
        diseaseScores: {
          envy: 4,
          arrogance: 2,
          anger: 5,
          lust: 3,
          malice: 1,
          backbiting: 2,
          suspicion: 3,
          loveOfDunya: 4,
          laziness: 2,
          despair: 1,
          selfDeception: 3
        } as Record<Disease, LikertScore>,
        reflectionAnswers: {
          strongestStruggle: 'Test struggle',
          dailyHabit: 'Test habit'
        },
        personalizedHabits: mockPersonalizedHabits,
        tazkiyahPlan: mockTazkiyahPlan
      });

      mockSurveyRepository.getSurveyResult.mockResolvedValue(Result.ok(existingResult));

      // Act
      const result = await useCase.execute({ userId });

      // Assert
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.results).toBe(existingResult);
        expect(result.value.exportOptions).toHaveLength(2);
        expect(result.value.exportOptions[0].format).toBe('pdf');
        expect(result.value.exportOptions[1].format).toBe('json');
      }

      expect(mockSurveyRepository.getUserSurveyData).not.toHaveBeenCalled();
      expect(mockAiProvider.generatePersonalizedHabits).not.toHaveBeenCalled();
    });

    it('should generate new results when none exist', async () => {
      // Arrange
      mockSurveyRepository.getSurveyResult.mockResolvedValue(Result.ok(null));
      mockSurveyRepository.getUserSurveyData.mockResolvedValue(Result.ok(mockSurveyData));
      mockAiProvider.generatePersonalizedHabits.mockResolvedValue(mockPersonalizedHabits);
      mockAiProvider.generateTazkiyahPlan.mockResolvedValue(mockTazkiyahPlan);

      const savedResult = SurveyResult.create({
        userId,
        diseaseScores: {
          envy: 4,
          arrogance: 2,
          anger: 5,
          lust: 3,
          malice: 1,
          backbiting: 2,
          suspicion: 3,
          loveOfDunya: 4,
          laziness: 2,
          despair: 1,
          selfDeception: 3
        } as Record<Disease, LikertScore>,
        reflectionAnswers: mockSurveyData.progress.reflectionAnswers,
        personalizedHabits: mockPersonalizedHabits,
        tazkiyahPlan: mockTazkiyahPlan
      });

      mockSurveyRepository.saveSurveyResult.mockResolvedValue(Result.ok(savedResult));
      mockSurveyRepository.updateSurveyProgress.mockResolvedValue(Result.ok({}));

      // Act
      const result = await useCase.execute({ userId });

      // Assert
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.results.userId.toString()).toBe(userId);
        expect(result.value.results.personalizedHabits).toHaveLength(2);
        expect(result.value.results.tazkiyahPlan.criticalDiseases).toContain('anger');
        expect(result.value.exportOptions).toHaveLength(2);
      }

      expect(mockSurveyRepository.getUserSurveyData).toHaveBeenCalledWith(new UserId(userId));
      expect(mockAiProvider.generatePersonalizedHabits).toHaveBeenCalledWith(
        expect.objectContaining({
          diseaseScores: expect.any(Object),
          reflectionAnswers: mockSurveyData.progress.reflectionAnswers
        })
      );
      expect(mockAiProvider.generateTazkiyahPlan).toHaveBeenCalledWith(
        expect.objectContaining({
          diseaseScores: expect.any(Object),
          reflectionAnswers: mockSurveyData.progress.reflectionAnswers
        })
      );
      expect(mockSurveyRepository.saveSurveyResult).toHaveBeenCalled();
      expect(mockSurveyRepository.updateSurveyProgress).toHaveBeenCalledWith(
        new UserId(userId),
        { resultsGenerated: true, currentPhase: 4 }
      );
    });

    it('should return error when survey data cannot be retrieved', async () => {
      // Arrange
      mockSurveyRepository.getSurveyResult.mockResolvedValue(Result.ok(null));
      mockSurveyRepository.getUserSurveyData.mockResolvedValue(
        Result.error({ code: ErrorCode.DATABASE_ERROR, message: 'Database error' })
      );

      // Act
      const result = await useCase.execute({ userId });

      // Assert
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.error.code).toBe(ErrorCode.DATABASE_ERROR);
        expect(result.error.message).toContain('Failed to retrieve survey data');
      }
    });

    it('should return error when survey is not complete', async () => {
      // Arrange
      const incompleteData = {
        ...mockSurveyData,
        progress: {
          reflectionCompleted: false
        }
      };

      mockSurveyRepository.getSurveyResult.mockResolvedValue(Result.ok(null));
      mockSurveyRepository.getUserSurveyData.mockResolvedValue(Result.ok(incompleteData));

      // Act
      const result = await useCase.execute({ userId });

      // Assert
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.error.code).toBe(ErrorCode.BAD_REQUEST);
        expect(result.error.message).toContain('Survey must be completed');
      }
    });

    it('should return error when reflection answers are missing', async () => {
      // Arrange
      const dataWithoutReflection = {
        ...mockSurveyData,
        progress: {
          reflectionCompleted: true,
          reflectionAnswers: {
            strongestStruggle: '',
            dailyHabit: 'Valid habit'
          }
        }
      };

      mockSurveyRepository.getSurveyResult.mockResolvedValue(Result.ok(null));
      mockSurveyRepository.getUserSurveyData.mockResolvedValue(Result.ok(dataWithoutReflection));

      // Act
      const result = await useCase.execute({ userId });

      // Assert
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.error.code).toBe(ErrorCode.BAD_REQUEST);
        expect(result.error.message).toContain('Reflection answers are required');
      }
    });

    it('should handle save failure gracefully', async () => {
      // Arrange
      mockSurveyRepository.getSurveyResult.mockResolvedValue(Result.ok(null));
      mockSurveyRepository.getUserSurveyData.mockResolvedValue(Result.ok(mockSurveyData));
      mockAiProvider.generatePersonalizedHabits.mockResolvedValue(mockPersonalizedHabits);
      mockAiProvider.generateTazkiyahPlan.mockResolvedValue(mockTazkiyahPlan);
      mockSurveyRepository.saveSurveyResult.mockResolvedValue(
        Result.error({ code: ErrorCode.DATABASE_ERROR, message: 'Save failed' })
      );

      // Act
      const result = await useCase.execute({ userId });

      // Assert
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.error.code).toBe(ErrorCode.DATABASE_ERROR);
        expect(result.error.message).toContain('Failed to save generated results');
      }
    });

    it('should correctly transform survey responses to disease scores', async () => {
      // Arrange
      mockSurveyRepository.getSurveyResult.mockResolvedValue(Result.ok(null));
      mockSurveyRepository.getUserSurveyData.mockResolvedValue(Result.ok(mockSurveyData));
      mockAiProvider.generatePersonalizedHabits.mockResolvedValue(mockPersonalizedHabits);
      mockAiProvider.generateTazkiyahPlan.mockResolvedValue(mockTazkiyahPlan);

      const savedResult = SurveyResult.create({
        userId,
        diseaseScores: {
          envy: 4,
          arrogance: 2,
          anger: 5,
          lust: 3,
          malice: 1,
          backbiting: 2,
          suspicion: 3,
          loveOfDunya: 4,
          laziness: 2,
          despair: 1,
          selfDeception: 3
        } as Record<Disease, LikertScore>,
        reflectionAnswers: mockSurveyData.progress.reflectionAnswers,
        personalizedHabits: mockPersonalizedHabits,
        tazkiyahPlan: mockTazkiyahPlan
      });

      mockSurveyRepository.saveSurveyResult.mockResolvedValue(Result.ok(savedResult));
      mockSurveyRepository.updateSurveyProgress.mockResolvedValue(Result.ok({}));

      // Act
      const result = await useCase.execute({ userId });

      // Assert
      expect(Result.isOk(result)).toBe(true);

      // Verify that AI provider was called with correct disease scores
      expect(mockAiProvider.generatePersonalizedHabits).toHaveBeenCalledWith(
        expect.objectContaining({
          diseaseScores: expect.objectContaining({
            envy: 4,
            arrogance: 2,
            anger: 5,
            lust: 3,
            malice: 1,
            backbiting: 2,
            suspicion: 3,
            loveOfDunya: 4,
            laziness: 2,
            despair: 1,
            selfDeception: 3
          })
        })
      );
    });

    it('should generate correct radar chart data', async () => {
      // Arrange
      mockSurveyRepository.getSurveyResult.mockResolvedValue(Result.ok(null));
      mockSurveyRepository.getUserSurveyData.mockResolvedValue(Result.ok(mockSurveyData));
      mockAiProvider.generatePersonalizedHabits.mockResolvedValue(mockPersonalizedHabits);
      mockAiProvider.generateTazkiyahPlan.mockResolvedValue(mockTazkiyahPlan);

      let capturedSurveyResult: SurveyResult;
      mockSurveyRepository.saveSurveyResult.mockImplementation((result: SurveyResult) => {
        capturedSurveyResult = result;
        return Promise.resolve(Result.ok(result));
      });
      mockSurveyRepository.updateSurveyProgress.mockResolvedValue(Result.ok({}));

      // Act
      const result = await useCase.execute({ userId });

      // Assert
      expect(Result.isOk(result)).toBe(true);
      expect(capturedSurveyResult!.radarChartData).toBeDefined();

      const chartData = capturedSurveyResult!.radarChartData!;
      expect(chartData.labels).toHaveLength(11); // 11 diseases
      expect(chartData.datasets).toHaveLength(1);
      expect(chartData.datasets[0].data).toHaveLength(11);
      expect(chartData.datasets[0].label).toBe('Spiritual Assessment');
    });
  });
});