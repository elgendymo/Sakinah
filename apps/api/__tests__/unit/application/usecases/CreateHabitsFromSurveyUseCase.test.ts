import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CreateHabitsFromSurveyUseCase } from '@/application/usecases/CreateHabitsFromSurveyUseCase';
import { ISurveyRepository } from '@/domain/repositories/ISurveyRepository';
import { IHabitRepository } from '@/domain/repositories/IHabitRepository';
import { IPlanRepository } from '@/domain/repositories/IPlanRepository';
import { Result } from '@/shared/result';
import { Habit } from '@/domain/entities/Habit';
import { Plan } from '@/domain/entities/Plan';
import { SurveyResult, PersonalizedHabit, LikertScore } from '@/domain/entities/SurveyResult';

// Mock repositories
const mockSurveyRepository: ISurveyRepository = {
  // Survey Responses
  saveSurveyResponse: vi.fn(),
  getSurveyResponse: vi.fn(),
  getSurveyResponsesByPhase: vi.fn(),
  getAllSurveyResponses: vi.fn(),
  updateSurveyResponse: vi.fn(),
  deleteSurveyResponse: vi.fn(),

  // Survey Results
  saveSurveyResult: vi.fn(),
  getSurveyResult: vi.fn(),
  getSurveyResultById: vi.fn(),
  updateSurveyResult: vi.fn(),
  deleteSurveyResult: vi.fn(),

  // Survey Progress
  saveSurveyProgress: vi.fn(),
  getSurveyProgress: vi.fn(),
  updateSurveyProgress: vi.fn(),
  deleteSurveyProgress: vi.fn(),

  // Survey Flow Management
  hasUserCompletedSurvey: vi.fn(),
  getPhaseCompletionStatus: vi.fn(),

  // Batch Operations
  savePhaseResponses: vi.fn(),
  getUserSurveyData: vi.fn(),

  // Analytics
  getSurveyCompletionStats: vi.fn()
};

const mockHabitRepository: IHabitRepository = {
  create: vi.fn(),
  findById: vi.fn(),
  findByUserId: vi.fn(),
  findByPlanId: vi.fn(),
  updateStreak: vi.fn(),
  createCompletion: vi.fn(),
  deleteCompletion: vi.fn(),
  findCompletionByDate: vi.fn()
};

const mockPlanRepository: IPlanRepository = {
  create: vi.fn(),
  findById: vi.fn(),
  findByUserId: vi.fn(),
  updateStatus: vi.fn()
};

describe('CreateHabitsFromSurveyUseCase', () => {
  let useCase: CreateHabitsFromSurveyUseCase;
  let mockSurveyResult: SurveyResult;
  let mockPersonalizedHabits: PersonalizedHabit[];

  // Valid UUIDs for testing (must be v4 format)
  const TEST_USER_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
  const TEST_SURVEY_ID = '550e8400-e29b-41d4-a716-446655440000';
  const TEST_PLAN_ID = '6ba7b814-9dad-41d1-80b4-00c04fd430c8';

  beforeEach(() => {
    useCase = new CreateHabitsFromSurveyUseCase(
      mockSurveyRepository,
      mockHabitRepository,
      mockPlanRepository
    );

    // Reset all mocks
    vi.clearAllMocks();

    // Setup mock data
    mockPersonalizedHabits = [
      {
        id: 'habit-1',
        title: 'Morning Dhikr',
        description: 'Recite morning remembrance',
        frequency: 'daily',
        targetDisease: 'envy',
        difficultyLevel: 'easy',
        estimatedDuration: '5 minutes',
        islamicContentIds: []
      },
      {
        id: 'habit-2',
        title: 'Evening Reflection',
        description: 'Self-reflection before sleep',
        frequency: 'weekly',
        targetDisease: 'arrogance',
        difficultyLevel: 'moderate',
        estimatedDuration: '15 minutes',
        islamicContentIds: []
      },
      {
        id: 'habit-3',
        title: 'Weekly Quran Study',
        description: 'Study Quran with reflection',
        frequency: 'bi-weekly',
        targetDisease: 'lust',
        difficultyLevel: 'challenging',
        estimatedDuration: '30 minutes',
        islamicContentIds: []
      }
    ];

    // Create a proper SurveyResult entity
    mockSurveyResult = SurveyResult.create({
      id: TEST_SURVEY_ID,
      userId: TEST_USER_ID,
      diseaseScores: {
        envy: 4,
        arrogance: 3,
        selfDeception: 2,
        lust: 2,
        anger: 1,
        malice: 1,
        backbiting: 2,
        suspicion: 2,
        loveOfDunya: 3,
        laziness: 2,
        despair: 1
      },
      reflectionAnswers: {
        strongestStruggle: 'Dealing with envy and its effects on my spiritual journey',
        dailyHabit: 'Morning dhikr practice and reflection time after Fajr'
      },
      personalizedHabits: mockPersonalizedHabits,
      tazkiyahPlan: {
        criticalDiseases: ['envy'],
        planType: 'takhliyah',
        phases: [],
        expectedDuration: '3 months',
        milestones: []
      },
      radarChartData: {
        labels: ['Envy', 'Arrogance', 'Self-Deception'],
        datasets: [{
          label: 'Disease Scores',
          data: [4, 3, 2],
          backgroundColor: 'rgba(255, 0, 0, 0.2)',
          borderColor: 'rgba(255, 0, 0, 1)'
        }]
      }
    });

    // Note: criticalDiseases are auto-calculated from scores >= 4 in SurveyResult.create()
  });

  describe('execute', () => {
    it('should successfully create habits from survey results', async () => {
      // Arrange
      const request = {
        userId: TEST_USER_ID,
        surveyResultId: TEST_SURVEY_ID,
        traceId: 'trace-123'
      };

      const mockPlan = Plan.create({
        userId: TEST_USER_ID,
        kind: 'takhliyah',
        target: 'Spiritual purification focusing on: envy',
        microHabits: [],
        status: 'active'
      });

      const mockHabit1 = Habit.create({
        userId: TEST_USER_ID,
        planId: mockPlan.id.toString(),
        title: 'Morning Dhikr',
        schedule: { freq: 'daily' }
      });

      const mockHabit2 = Habit.create({
        userId: TEST_USER_ID,
        planId: mockPlan.id.toString(),
        title: 'Evening Reflection',
        schedule: { freq: 'weekly', days: [0] }
      });

      const mockHabit3 = Habit.create({
        userId: TEST_USER_ID,
        planId: mockPlan.id.toString(),
        title: 'Weekly Quran Study',
        schedule: { freq: 'custom', days: [0, 3] }
      });

      // Mock repository responses
      vi.mocked(mockSurveyRepository.getSurveyResult).mockResolvedValue(
        Result.ok(mockSurveyResult)
      );
      vi.mocked(mockPlanRepository.create).mockResolvedValue(
        Result.ok(mockPlan)
      );
      vi.mocked(mockHabitRepository.create)
        .mockResolvedValueOnce(Result.ok(mockHabit1))
        .mockResolvedValueOnce(Result.ok(mockHabit2))
        .mockResolvedValueOnce(Result.ok(mockHabit3));

      // Act
      const result = await useCase.execute(request);

      // Assert
      if (!Result.isOk(result)) {
        console.error('Test failed with error:', result.error);
      }
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.totalHabitsCreated).toBe(3);
        expect(result.value.planId).toBe(mockPlan.id.toString());
        expect(result.value.createdHabits).toHaveLength(3);
        expect(result.value.createdHabits[0]).toMatchObject({
          title: 'Morning Dhikr',
          planId: mockPlan.id.toString(),
          targetDisease: 'envy'
        });
        expect(result.value.createdHabits[1]).toMatchObject({
          title: 'Evening Reflection',
          planId: mockPlan.id.toString(),
          targetDisease: 'arrogance'
        });
        expect(result.value.createdHabits[2]).toMatchObject({
          title: 'Weekly Quran Study',
          planId: mockPlan.id.toString(),
          targetDisease: 'lust'
        });
      }

      // Verify repository calls
      expect(mockSurveyRepository.getSurveyResult).toHaveBeenCalled();
      expect(mockPlanRepository.create).toHaveBeenCalled();
      expect(mockHabitRepository.create).toHaveBeenCalledTimes(3);
    });

    it('should use existing plan when planId is provided', async () => {
      // Arrange
      const request = {
        userId: TEST_USER_ID,
        surveyResultId: TEST_SURVEY_ID,
        planId: TEST_PLAN_ID,
        traceId: 'trace-123'
      };

      const mockHabit = Habit.create({
        userId: TEST_USER_ID,
        planId: TEST_PLAN_ID,
        title: 'Morning Dhikr',
        schedule: { freq: 'daily' }
      });

      // Mock repository responses
      vi.mocked(mockSurveyRepository.getSurveyResult).mockResolvedValue(
        Result.ok(mockSurveyResult)
      );
      vi.mocked(mockHabitRepository.create).mockResolvedValue(
        Result.ok(mockHabit)
      );

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.planId).toBe(TEST_PLAN_ID);
      }

      // Verify that plan creation was NOT called
      expect(mockPlanRepository.create).not.toHaveBeenCalled();
    });

    it('should handle case with no personalized habits', async () => {
      // Arrange
      const request = {
        userId: TEST_USER_ID,
        surveyResultId: TEST_SURVEY_ID,
        traceId: 'trace-123'
      };

      // Create a copy with no habits using the same data structure as the original
      const originalDiseaseScores = {
        envy: 4 as LikertScore,
        arrogance: 3 as LikertScore,
        selfDeception: 2 as LikertScore,
        lust: 2 as LikertScore,
        anger: 1 as LikertScore,
        malice: 1 as LikertScore,
        backbiting: 2 as LikertScore,
        suspicion: 2 as LikertScore,
        loveOfDunya: 3 as LikertScore,
        laziness: 2 as LikertScore,
        despair: 1 as LikertScore
      };

      const surveyResultWithNoHabits = SurveyResult.create({
        id: TEST_SURVEY_ID,
        userId: TEST_USER_ID,
        diseaseScores: originalDiseaseScores,
        reflectionAnswers: mockSurveyResult.reflectionAnswers,
        personalizedHabits: [], // Empty habits array
        tazkiyahPlan: mockSurveyResult.tazkiyahPlan,
        radarChartData: mockSurveyResult.radarChartData
      });
      // Note: criticalDiseases are auto-calculated from scores >= 4

      vi.mocked(mockSurveyRepository.getSurveyResult).mockResolvedValue(
        Result.ok(surveyResultWithNoHabits)
      );

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.totalHabitsCreated).toBe(0);
        expect(result.value.createdHabits).toHaveLength(0);
        expect(result.value.planId).toBe('');
      }

      // Verify no habits were created
      expect(mockHabitRepository.create).not.toHaveBeenCalled();
      expect(mockPlanRepository.create).not.toHaveBeenCalled();
    });

    it('should handle survey results not found', async () => {
      // Arrange
      const request = {
        userId: TEST_USER_ID,
        surveyResultId: TEST_SURVEY_ID,
        traceId: 'trace-123'
      };

      vi.mocked(mockSurveyRepository.getSurveyResult).mockResolvedValue(
        Result.ok(null)
      );

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.error.message).toBe('Survey results not found');
      }
    });

    it('should handle repository errors gracefully', async () => {
      // Arrange
      const request = {
        userId: TEST_USER_ID,
        surveyResultId: TEST_SURVEY_ID,
        traceId: 'trace-123'
      };

      const repositoryError = new Error('Database connection failed');
      vi.mocked(mockSurveyRepository.getSurveyResult).mockResolvedValue(
        Result.error(repositoryError)
      );

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.error).toBe(repositoryError);
      }
    });

    it('should continue creating other habits if one fails', async () => {
      // Arrange
      const request = {
        userId: TEST_USER_ID,
        surveyResultId: TEST_SURVEY_ID,
        traceId: 'trace-123'
      };

      const mockPlan = Plan.create({
        userId: TEST_USER_ID,
        kind: 'takhliyah',
        target: 'Spiritual purification focusing on: envy',
        microHabits: [],
        status: 'active'
      });

      const mockHabit1 = Habit.create({
        userId: TEST_USER_ID,
        planId: mockPlan.id.toString(),
        title: 'Morning Dhikr',
        schedule: { freq: 'daily' }
      });

      const mockHabit3 = Habit.create({
        userId: TEST_USER_ID,
        planId: mockPlan.id.toString(),
        title: 'Weekly Quran Study',
        schedule: { freq: 'custom', days: [0, 3] }
      });

      // Mock repository responses
      vi.mocked(mockSurveyRepository.getSurveyResult).mockResolvedValue(
        Result.ok(mockSurveyResult)
      );
      vi.mocked(mockPlanRepository.create).mockResolvedValue(
        Result.ok(mockPlan)
      );
      vi.mocked(mockHabitRepository.create)
        .mockResolvedValueOnce(Result.ok(mockHabit1))
        .mockResolvedValueOnce(Result.error(new Error('Failed to create habit')))
        .mockResolvedValueOnce(Result.ok(mockHabit3));

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.totalHabitsCreated).toBe(2); // Only 2 succeeded
        expect(result.value.createdHabits).toHaveLength(2);
        expect(result.value.createdHabits[0].id).toBe(mockHabit1.id.toString());
        expect(result.value.createdHabits[1].id).toBe(mockHabit3.id.toString());
      }
    });

    describe('mapFrequencyToSchedule', () => {
      it('should correctly map frequency to schedule', async () => {
        // Arrange - Create habits with different frequencies
        const dailyHabit: PersonalizedHabit = {
          ...mockPersonalizedHabits[0],
          frequency: 'daily'
        };
        const weeklyHabit: PersonalizedHabit = {
          ...mockPersonalizedHabits[0],
          frequency: 'weekly'
        };
        const biWeeklyHabit: PersonalizedHabit = {
          ...mockPersonalizedHabits[0],
          frequency: 'bi-weekly'
        };

        const surveyResultsWithDifferentFrequencies = SurveyResult.create({
          id: TEST_SURVEY_ID,
          userId: TEST_USER_ID,
          diseaseScores: {
            envy: 4 as LikertScore,
            arrogance: 3 as LikertScore,
            selfDeception: 2 as LikertScore,
            lust: 2 as LikertScore,
            anger: 1 as LikertScore,
            malice: 1 as LikertScore,
            backbiting: 2 as LikertScore,
            suspicion: 2 as LikertScore,
            loveOfDunya: 3 as LikertScore,
            laziness: 2 as LikertScore,
            despair: 1 as LikertScore
          },
          reflectionAnswers: mockSurveyResult.reflectionAnswers,
          personalizedHabits: [dailyHabit, weeklyHabit, biWeeklyHabit],
          tazkiyahPlan: mockSurveyResult.tazkiyahPlan,
          radarChartData: mockSurveyResult.radarChartData
        });
        // Note: criticalDiseases are auto-calculated from scores >= 4

        const request = {
          userId: TEST_USER_ID,
          surveyResultId: TEST_SURVEY_ID,
          traceId: 'trace-123'
        };

        const mockPlan = Plan.create({
          userId: TEST_USER_ID,
          kind: 'takhliyah',
          target: 'Test plan',
          microHabits: [],
          status: 'active'
        });

        // Mock repository responses
        vi.mocked(mockSurveyRepository.getSurveyResult).mockResolvedValue(
          Result.ok(surveyResultsWithDifferentFrequencies)
        );
        vi.mocked(mockPlanRepository.create).mockResolvedValue(
          Result.ok(mockPlan)
        );
        vi.mocked(mockHabitRepository.create).mockImplementation((data: any) => {
          const habit = Habit.create({
            id: `habit-${Date.now()}`,
            userId: data.userId,
            planId: data.planId,
            title: data.title,
            schedule: data.schedule
          });
          return Promise.resolve(Result.ok(habit));
        });

        // Act
        await useCase.execute(request);

        // Assert
        expect(mockHabitRepository.create).toHaveBeenCalledTimes(3);
      });
    });
  });
});