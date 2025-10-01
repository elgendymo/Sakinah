import { injectable } from 'tsyringe';
import { Result } from '@/shared/result';
import { createAppError, ErrorCode } from '@/shared/errors';
import { IHabitRepository } from '@/domain/repositories/IHabitRepository';
import { Habit } from '@/domain/entities/Habit';
import { HabitId } from '@/domain/value-objects/HabitId';
import { UserId } from '@/domain/value-objects/UserId';
import { PlanId } from '@/domain/value-objects/PlanId';
import { HabitRepository } from '../repos/HabitRepository';

@injectable()
export class HabitRepositoryImpl implements IHabitRepository {
  private habitRepo = new HabitRepository();

  async findById(id: HabitId): Promise<Result<Habit | null>> {
    try {
      // We need to somehow get the userId for security check
      // For now, we'll use a different approach - get the habit first and verify ownership later
      const db = this.habitRepo['db']; // Access private db property
      const rawResult = await db.getHabitById(id.toString());

      if (!rawResult || !Array.isArray(rawResult) || rawResult.length === 0) {
        return Result.ok(null);
      }

      const rawHabit = rawResult[0];

      // Convert raw database result to domain entity
      const habit = Habit.create({
        id: rawHabit.id,
        userId: rawHabit.user_id,
        planId: rawHabit.plan_id,
        title: rawHabit.title,
        schedule: JSON.parse(rawHabit.schedule || '{"freq": "daily"}'),
        streakCount: rawHabit.streak_count || 0,
        lastCompletedOn: rawHabit.last_completed_on ? new Date(rawHabit.last_completed_on) : null,
        createdAt: rawHabit.created_at ? new Date(rawHabit.created_at) : new Date()
      });

      return Result.ok(habit);
    } catch (error) {
      return Result.error(createAppError(
        ErrorCode.DATABASE_ERROR,
        `Failed to find habit: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      ));
    }
  }

  async findByUserId(userId: UserId): Promise<Result<Habit[]>> {
    try {
      const result = await this.habitRepo.getHabitsByUser(userId.toString());

      if (Result.isError(result)) {
        return result;
      }

      // Convert raw habit data to domain entities
      const habits = result.value.map(rawHabit =>
        Habit.create({
          id: rawHabit.id,
          userId: rawHabit.userId,
          planId: rawHabit.planId,
          title: rawHabit.title,
          schedule: typeof rawHabit.schedule === 'string'
            ? JSON.parse(rawHabit.schedule)
            : rawHabit.schedule,
          streakCount: rawHabit.streakCount || 0,
          lastCompletedOn: rawHabit.lastCompletedOn ? new Date(rawHabit.lastCompletedOn) : null,
          createdAt: rawHabit.createdAt ? new Date(rawHabit.createdAt) : new Date()
        })
      );

      return Result.ok(habits);
    } catch (error) {
      return Result.error(createAppError(
        ErrorCode.DATABASE_ERROR,
        `Failed to find habits by user: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      ));
    }
  }

  async findByPlanId(planId: PlanId): Promise<Result<Habit[]>> {
    // TODO: Implement when needed
    return Result.ok([]);
  }

  async create(habit: Habit): Promise<Result<Habit>> {
    try {
      const createInput = {
        userId: habit.userId.toString(),
        planId: habit.planId.toString(),
        title: habit.title,
        schedule: habit.schedule,
        streakCount: habit.streakCount,
        lastCompletedOn: habit.lastCompletedOn?.toISOString()
      };

      const result = await this.habitRepo.createHabit(createInput);

      if (Result.isError(result)) {
        return result;
      }

      return Result.ok(habit);
    } catch (error) {
      return Result.error(createAppError(
        ErrorCode.DATABASE_ERROR,
        `Failed to create habit: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      ));
    }
  }

  async updateStreak(habit: Habit): Promise<Result<Habit>> {
    try {
      const result = await this.habitRepo.updateHabitStreak(
        habit.id.toString(),
        habit.userId.toString(),
        habit.streakCount,
        habit.lastCompletedOn?.toISOString()
      );

      if (Result.isError(result)) {
        return result;
      }

      return Result.ok(habit);
    } catch (error) {
      return Result.error(createAppError(
        ErrorCode.DATABASE_ERROR,
        `Failed to update habit streak: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      ));
    }
  }

  async createCompletion(habitId: HabitId, userId: UserId, date: Date): Promise<Result<void>> {
    try {
      const dateString = date.toISOString().split('T')[0];
      const result = await this.habitRepo.markCompleted(
        habitId.toString(),
        userId.toString(),
        dateString
      );
      return result;
    } catch (error) {
      return Result.error(createAppError(
        ErrorCode.DATABASE_ERROR,
        `Failed to create completion: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      ));
    }
  }

  async deleteCompletion(habitId: HabitId, userId: UserId, date: Date): Promise<Result<void>> {
    try {
      const dateString = date.toISOString().split('T')[0];
      const result = await this.habitRepo.markIncomplete(
        habitId.toString(),
        userId.toString(),
        dateString
      );
      return result;
    } catch (error) {
      return Result.error(createAppError(
        ErrorCode.DATABASE_ERROR,
        `Failed to delete completion: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      ));
    }
  }

  async findCompletionByDate(habitId: HabitId, userId: UserId, date: Date): Promise<Result<boolean>> {
    try {
      // TODO: Implement proper completion checking
      // For now, return false
      return Result.ok(false);
    } catch (error) {
      return Result.error(createAppError(
        ErrorCode.DATABASE_ERROR,
        `Failed to find completion: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      ));
    }
  }
}