import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/result';
import { IHabitRepository } from '@/domain/repositories';
import { HabitId } from '@/domain/value-objects/HabitId';
import { UserId } from '@/domain/value-objects/UserId';

@injectable()
export class ToggleHabitUseCase {
  constructor(
    @inject('IHabitRepository') private habitRepo: IHabitRepository
  ) {}

  async execute(params: {
    habitId: string;
    userId: string;
    completed: boolean;
  }): Promise<Result<void>> {
    try {
      const habitId = new HabitId(params.habitId);
      const userId = new UserId(params.userId);

      // Get the habit
      const habitResult = await this.habitRepo.findById(habitId);

      if (Result.isError(habitResult)) {
        return Result.error(new Error('Failed to find habit'));
      }

      if (!habitResult.value) {
        return Result.error(new Error('Habit not found'));
      }

      const habit = habitResult.value;

      // Verify ownership
      if (!habit.userId.equals(userId)) {
        return Result.error(new Error('Unauthorized'));
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (params.completed) {
        // Mark as completed
        habit.markCompleted(today);
        await this.habitRepo.updateStreak(habit);
        await this.habitRepo.createCompletion(habitId, userId, today);
      } else {
        // Mark as incomplete
        habit.markIncomplete(today);
        await this.habitRepo.updateStreak(habit);
        await this.habitRepo.deleteCompletion(habitId, userId, today);
      }

      return Result.ok(undefined);
    } catch (error) {
      return Result.error(error as Error);
    }
  }
}