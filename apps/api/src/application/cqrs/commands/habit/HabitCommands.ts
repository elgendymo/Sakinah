import { BaseCommand } from '../base/Command';
import { HabitSchedule } from '@/domain/entities/Habit';

// Create Habit Command
export class CreateHabitCommand extends BaseCommand {
  constructor(
    public readonly userId: string,
    public readonly planId: string,
    public readonly title: string,
    public readonly schedule: HabitSchedule,
    correlationId?: string
  ) {
    super('CreateHabitCommand', userId, undefined, correlationId);
  }
}

// Complete Habit Command
export class CompleteHabitCommand extends BaseCommand {
  constructor(
    public readonly userId: string,
    public readonly habitId: string,
    public readonly completionDate: Date = new Date(),
    correlationId?: string
  ) {
    super('CompleteHabitCommand', userId, habitId, correlationId);
  }
}

// Uncomplete Habit Command
export class UncompleteHabitCommand extends BaseCommand {
  constructor(
    public readonly userId: string,
    public readonly habitId: string,
    public readonly date: Date = new Date(),
    correlationId?: string
  ) {
    super('UncompleteHabitCommand', userId, habitId, correlationId);
  }
}

// Reset Habit Streak Command
export class ResetHabitStreakCommand extends BaseCommand {
  constructor(
    public readonly userId: string,
    public readonly habitId: string,
    correlationId?: string
  ) {
    super('ResetHabitStreakCommand', userId, habitId, correlationId);
  }
}

// Update Habit Command
export class UpdateHabitCommand extends BaseCommand {
  constructor(
    public readonly userId: string,
    public readonly habitId: string,
    public readonly updates: {
      title?: string;
      schedule?: HabitSchedule;
    },
    correlationId?: string
  ) {
    super('UpdateHabitCommand', userId, habitId, correlationId);
  }
}

// Delete Habit Command
export class DeleteHabitCommand extends BaseCommand {
  constructor(
    public readonly userId: string,
    public readonly habitId: string,
    correlationId?: string
  ) {
    super('DeleteHabitCommand', userId, habitId, correlationId);
  }
}

// Bulk Complete Habits Command (for daily routines)
export class BulkCompleteHabitsCommand extends BaseCommand {
  constructor(
    public readonly userId: string,
    public readonly habitIds: string[],
    public readonly completionDate: Date = new Date(),
    correlationId?: string
  ) {
    super('BulkCompleteHabitsCommand', userId, undefined, correlationId);
  }
}