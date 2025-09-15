import { Result } from '@/shared/result';
import { HabitRepository } from '@/infrastructure/repos/HabitRepository';
import { NotFoundError } from '@/shared/errors';

interface ToggleHabitInput {
  userId: string;
  habitId: string;
  completed: boolean;
}

interface ToggleHabitOutput {
  streakCount: number;
}

export async function toggleHabit(input: ToggleHabitInput): Promise<Result<ToggleHabitOutput>> {
  try {
    const habitRepo = new HabitRepository();

    // Get the habit
    const habitResult = await habitRepo.getHabit(input.habitId, input.userId);

    if (Result.isError(habitResult)) {
      return Result.error(habitResult.error);
    }

    if (!habitResult.value) {
      return Result.error(new NotFoundError('Habit'));
    }

    const habit = habitResult.value;
    const today = new Date().toISOString().split('T')[0];

    if (input.completed) {
      // Mark as completed
      const markResult = await habitRepo.markCompleted(input.habitId, input.userId, today);
      if (Result.isError(markResult)) {
        return markResult;
      }

      // Update streak
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const isConsecutive = habit.lastCompletedOn === yesterday;

      const newStreakCount = isConsecutive ? habit.streakCount + 1 : 1;

      const streakResult = await habitRepo.updateHabitStreak(input.habitId, input.userId, newStreakCount, today);
      if (Result.isError(streakResult)) {
        return streakResult;
      }

      return Result.ok({ streakCount: newStreakCount });
    } else {
      // Mark as not completed
      const unmarkResult = await habitRepo.markIncomplete(input.habitId, input.userId, today);
      if (Result.isError(unmarkResult)) {
        return unmarkResult;
      }

      // Don't reset streak if uncompleting today
      return Result.ok({ streakCount: habit.streakCount });
    }
  } catch (error) {
    return Result.error(error as Error);
  }
}