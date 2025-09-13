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
    const habit = await habitRepo.getHabit(input.habitId, input.userId);

    if (!habit) {
      return Result.error(new NotFoundError('Habit'));
    }

    const today = new Date().toISOString().split('T')[0];

    if (input.completed) {
      // Mark as completed
      await habitRepo.markCompleted(input.habitId, input.userId, today);

      // Update streak
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const isConsecutive = habit.lastCompletedOn === yesterday;

      const newStreakCount = isConsecutive ? habit.streakCount + 1 : 1;

      await habitRepo.updateHabit(input.habitId, input.userId, {
        streakCount: newStreakCount,
        lastCompletedOn: today,
      });

      return Result.ok({ streakCount: newStreakCount });
    } else {
      // Mark as not completed
      await habitRepo.markIncomplete(input.habitId, input.userId, today);

      // Don't reset streak if uncompleting today
      return Result.ok({ streakCount: habit.streakCount });
    }
  } catch (error) {
    return Result.error(error as Error);
  }
}