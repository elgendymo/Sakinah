import { Result } from '@/shared/result';
import { ISurveyRepository } from '@/domain/repositories/ISurveyRepository';
import { IHabitRepository } from '@/domain/repositories/IHabitRepository';
import { IPlanRepository } from '@/domain/repositories/IPlanRepository';
import { Habit } from '@/domain/entities/Habit';
import { Plan } from '@/domain/entities/Plan';
import { MicroHabit } from '@/domain/entities/MicroHabit';
import { UserId } from '@/domain/value-objects/UserId';
import { createRequestLogger } from '@/shared/errors';

export interface CreateHabitsFromSurveyRequest {
  userId: string;
  surveyResultId: string;
  planId?: string;
  traceId?: string;
}

export interface CreateHabitsFromSurveyResponse {
  createdHabits: Array<{
    id: string;
    title: string;
    planId: string;
    targetDisease: string;
  }>;
  planId: string;
  totalHabitsCreated: number;
}

export class CreateHabitsFromSurveyUseCase {
  constructor(
    private surveyRepository: ISurveyRepository,
    private habitRepository: IHabitRepository,
    private planRepository: IPlanRepository
  ) {}

  async execute(request: CreateHabitsFromSurveyRequest): Promise<Result<CreateHabitsFromSurveyResponse>> {
    const logger = createRequestLogger(request.traceId || 'survey-habits-integration');

    try {
      logger.info('Starting survey habits integration', {
        userId: request.userId,
        surveyResultId: request.surveyResultId,
        planId: request.planId
      });

      // Get survey results
      const surveyResultResult = await this.surveyRepository.getSurveyResult(new UserId(request.userId));
      if (Result.isError(surveyResultResult)) {
        logger.error('Failed to get survey results', { error: surveyResultResult.error });
        return surveyResultResult;
      }

      if (!surveyResultResult.value) {
        return Result.error(new Error('Survey results not found'));
      }

      const surveyResults = surveyResultResult.value;
      const personalizedHabits = surveyResults.personalizedHabits;

      if (personalizedHabits.length === 0) {
        logger.info('No personalized habits found in survey results');
        return Result.ok({
          createdHabits: [],
          planId: request.planId || '',
          totalHabitsCreated: 0
        });
      }

      // Create or get plan for these habits
      let targetPlanId = request.planId;

      if (!targetPlanId) {
        // Create a new Tazkiyah plan based on survey results
        const planResult = await this.createTazkiyahPlan(request.userId, surveyResults, logger);
        if (Result.isError(planResult)) {
          logger.error('Failed to create Tazkiyah plan', { error: planResult.error });
          return planResult;
        }
        targetPlanId = planResult.value.id.toString();
      }

      // Create habits from personalized recommendations
      const createdHabits = [];
      for (const personalizedHabit of personalizedHabits) {
        const habitResult = await this.createHabitFromPersonalized(
          request.userId,
          targetPlanId,
          personalizedHabit,
          logger
        );

        if (Result.isError(habitResult)) {
          logger.error('Failed to create habit', {
            error: habitResult.error,
            habitTitle: personalizedHabit.title
          });
          continue; // Continue with other habits even if one fails
        }

        createdHabits.push({
          id: habitResult.value.id.toString(),
          title: habitResult.value.title,
          planId: habitResult.value.planId.toString(),
          targetDisease: personalizedHabit.targetDisease
        });
      }

      logger.info('Successfully created habits from survey', {
        totalHabitsCreated: createdHabits.length,
        planId: targetPlanId
      });

      return Result.ok({
        createdHabits,
        planId: targetPlanId,
        totalHabitsCreated: createdHabits.length
      });

    } catch (error) {
      logger.error('Unexpected error in survey habits integration', { error });
      return Result.error(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async createTazkiyahPlan(
    userId: string,
    surveyResults: any, // Survey results from domain
    logger: any
  ): Promise<Result<Plan>> {
    try {
      // Create a Takhliyah plan based on critical diseases from survey
      const microHabits = surveyResults.personalizedHabits.slice(0, 3).map((habit: any) =>
        MicroHabit.create(habit.title, habit.frequency, 1)
      );

      const plan = Plan.create({
        userId,
        kind: 'takhliyah' as const,
        target: `Spiritual purification focusing on: ${surveyResults.criticalDiseases.join(', ')}`,
        microHabits,
        status: 'active' as const
      });

      const planResult = await this.planRepository.create(plan);
      if (Result.isError(planResult)) {
        return planResult;
      }

      logger.info('Created Tazkiyah plan from survey results', {
        planId: planResult.value.id.toString(),
        targetDiseases: surveyResults.criticalDiseases
      });

      return planResult;
    } catch (error) {
      logger.error('Error creating Tazkiyah plan', { error });
      return Result.error(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async createHabitFromPersonalized(
    userId: string,
    planId: string,
    personalizedHabit: { title: string; frequency: 'daily' | 'weekly' | 'bi-weekly'; targetDisease: string },
    logger: any
  ): Promise<Result<Habit>> {
    try {
      // Map personalized habit frequency to habit schedule
      const schedule = this.mapFrequencyToSchedule(personalizedHabit.frequency);

      const habit = Habit.create({
        userId,
        planId,
        title: personalizedHabit.title,
        schedule
      });

      const habitResult = await this.habitRepository.create(habit);
      if (Result.isError(habitResult)) {
        return habitResult;
      }

      logger.info('Created habit from personalized recommendation', {
        habitId: habitResult.value.id.toString(),
        title: personalizedHabit.title,
        targetDisease: personalizedHabit.targetDisease
      });

      return habitResult;
    } catch (error) {
      logger.error('Error creating habit from personalized recommendation', {
        error,
        habitTitle: personalizedHabit.title
      });
      return Result.error(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private mapFrequencyToSchedule(frequency: 'daily' | 'weekly' | 'bi-weekly'): {
    freq: 'daily' | 'weekly' | 'custom';
    days?: number[];
  } {
    switch (frequency) {
      case 'daily':
        return { freq: 'daily' };
      case 'weekly':
        return { freq: 'weekly', days: [0] }; // Default to Sunday
      case 'bi-weekly':
        return { freq: 'custom', days: [0, 3] }; // Sunday and Wednesday
      default:
        return { freq: 'daily' };
    }
  }
}