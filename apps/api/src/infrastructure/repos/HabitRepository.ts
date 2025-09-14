import { Habit } from '@sakinah/types';
import { Result } from '@/shared/result';
import { RepositoryResultHandler } from '@/shared/repository-result-handler';
import { CreateHabitInput, CreateHabitCompletionInput } from './types';
import { getDatabase } from '../database';

export class HabitRepository {
  private db = getDatabase();

  async createHabit(data: CreateHabitInput): Promise<Result<Habit>> {
    return RepositoryResultHandler.wrapOperation(async () => {
      const result = await this.db.createHabit(data);
      const handled = RepositoryResultHandler.handleRequiredResult(result, 'Habit');
      if (Result.isError(handled)) {
        throw handled.error;
      }
      return handled.value;
    });
  }

  async getHabit(id: string, userId: string): Promise<Result<Habit | null>> {
    return RepositoryResultHandler.wrapOperation(async () => {
      const result = await this.db.getHabitById(id);
      const habitResult = RepositoryResultHandler.handleSingleResult(result);

      if (Result.isError(habitResult)) {
        throw habitResult.error;
      }

      // Verify the habit belongs to the user
      const habit = habitResult.value;
      if (habit && habit.userId !== userId) {
        return null;
      }

      return habit;
    });
  }

  async getHabitsByUser(userId: string): Promise<Result<Habit[]>> {
    return RepositoryResultHandler.wrapOperation(async () => {
      const result = await this.db.getHabitsByUserId(userId);
      const handled = RepositoryResultHandler.handleArrayResult(result);
      if (Result.isError(handled)) {
        throw handled.error;
      }
      return handled.value;
    });
  }

  async updateHabitStreak(id: string, userId: string, streakCount: number, lastCompletedOn?: string): Promise<Result<void>> {
    return RepositoryResultHandler.wrapOperation(async () => {
      // First verify the habit belongs to the user
      const habitResult = await this.getHabit(id, userId);
      if (Result.isError(habitResult)) {
        throw habitResult.error;
      }
      if (!habitResult.value) {
        throw new Error('Habit not found or access denied');
      }

      const result = await this.db.updateHabitStreak(id, streakCount, lastCompletedOn);
      const handled = RepositoryResultHandler.handleVoidResult(result);
      if (Result.isError(handled)) {
        throw handled.error;
      }
      return handled.value;
    });
  }

  async markCompleted(habitId: string, userId: string, date: string): Promise<Result<void>> {
    return RepositoryResultHandler.wrapOperation(async () => {
      // Check if already completed on this date
      const existingResult = await this.db.getHabitCompletionByDate(habitId, userId, date);
      const existingData = RepositoryResultHandler.handleSingleResult(existingResult);

      if (Result.isError(existingData)) {
        throw existingData.error;
      }

      if (!existingData.value) {
        // Create new completion
        const completionInput: CreateHabitCompletionInput = {
          habitId,
          userId,
          completedOn: date,
        };
        const result = await this.db.createHabitCompletion(completionInput);
        const handled = RepositoryResultHandler.handleVoidResult(result);
        if (Result.isError(handled)) {
          throw handled.error;
        }
        return handled.value;
      }
    });
  }

  async markIncomplete(habitId: string, userId: string, date: string): Promise<Result<void>> {
    return RepositoryResultHandler.wrapOperation(async () => {
      // Find the completion record
      const existingResult = await this.db.getHabitCompletionByDate(habitId, userId, date);
      const existingData = RepositoryResultHandler.handleSingleResult(existingResult);

      if (Result.isError(existingData)) {
        throw existingData.error;
      }

      if (existingData.value) {
        // Delete the completion
        const result = await this.db.deleteHabitCompletion(existingData.value.id);
        const handled = RepositoryResultHandler.handleVoidResult(result);
        if (Result.isError(handled)) {
          throw handled.error;
        }
        return handled.value;
      }
    });
  }

  async getHabitCompletions(habitId: string): Promise<Result<string[]>> {
    return RepositoryResultHandler.wrapOperation(async () => {
      const result = await this.db.getHabitCompletionsByHabit(habitId);
      const completionsResult = RepositoryResultHandler.handleArrayResult(result);

      if (Result.isError(completionsResult)) {
        throw completionsResult.error;
      }

      return completionsResult.value.map(completion => completion.completedOn);
    });
  }
}