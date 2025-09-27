import { injectable, inject } from 'tsyringe';
import { logger } from '@/shared/logger';
import { CommandHandler } from '../base/Command';
import {
  CreateHabitCommand,
  CompleteHabitCommand,
  UncompleteHabitCommand,
  ResetHabitStreakCommand,
  DeleteHabitCommand,
  BulkCompleteHabitsCommand
} from './HabitCommands';
import { IHabitRepository, IPlanRepository } from '@/domain/repositories';
import { Habit } from '@/domain/entities/Habit';
import { PlanId } from '@/domain/value-objects/PlanId';
import { Result } from '@/shared/result';
import { IEventBus } from '@/domain/events/IEventBus';

@injectable()
export class CreateHabitCommandHandler implements CommandHandler<CreateHabitCommand, Result<string>> {
  constructor(
    @inject('IHabitRepository') private habitRepo: IHabitRepository,
    @inject('IPlanRepository') private planRepo: IPlanRepository,
    @inject('IEventBus') private _eventBus: IEventBus
  ) {}

  async handle(command: CreateHabitCommand): Promise<Result<string>> {
    try {
      // Verify plan exists and belongs to user
      const planResult = await this.planRepo.findById(new PlanId(command.planId));
      if (!planResult.ok || !planResult.value) {
        return Result.error(new Error('Plan not found'));
      }

      if (planResult.value.userId.toString() !== command.userId) {
        return Result.error(new Error('Unauthorized: Plan does not belong to user'));
      }

      // Create habit
      const habit = Habit.create({
        userId: command.userId,
        planId: command.planId,
        title: command.title,
        schedule: command.schedule
      });

      const result = await this.habitRepo.create(habit);
      if (!result.ok) {
        return Result.error(new Error('Failed to create habit'));
      }

      // Publish domain events
      await this._eventBus.publishEvents(habit.getDomainEvents());
      habit.clearDomainEvents();

      return Result.ok(result.value.id.toString());
    } catch (error) {
      return Result.error(error as Error);
    }
  }
}

@injectable()
export class CompleteHabitCommandHandler implements CommandHandler<CompleteHabitCommand, Result<void>> {
  constructor(
    @inject('IHabitRepository') private habitRepo: IHabitRepository,
    @inject('IEventBus') private _eventBus: IEventBus
  ) {}

  async handle(command: CompleteHabitCommand): Promise<Result<void>> {
    try {
      const habitResult = await this.habitRepo.findById(command.habitId as any);
      if (!habitResult.ok || !habitResult.value) {
        return Result.error(new Error('Habit not found'));
      }

      const habit = habitResult.value;
      if (habit.userId.toString() !== command.userId) {
        return Result.error(new Error('Unauthorized: Habit does not belong to user'));
      }

      // Mark as completed
      habit.markCompleted(command.completionDate);

      // TODO: Use update method when available in repository interface
      const saveResult = await this.habitRepo.create(habit);
      if (!saveResult.ok) {
        return Result.error(new Error('Failed to save habit'));
      }

      // Publish domain events
      await this._eventBus.publishEvents(habit.getDomainEvents());
      habit.clearDomainEvents();

      return Result.ok(undefined);
    } catch (error) {
      return Result.error(error as Error);
    }
  }
}

@injectable()
export class UncompleteHabitCommandHandler implements CommandHandler<UncompleteHabitCommand, Result<void>> {
  constructor(
    @inject('IHabitRepository') private habitRepo: IHabitRepository,
    @inject('IEventBus') private _eventBus: IEventBus
  ) {}

  async handle(command: UncompleteHabitCommand): Promise<Result<void>> {
    try {
      const habitResult = await this.habitRepo.findById(command.habitId as any);
      if (!habitResult.ok || !habitResult.value) {
        return Result.error(new Error('Habit not found'));
      }

      const habit = habitResult.value;
      if (habit.userId.toString() !== command.userId) {
        return Result.error(new Error('Unauthorized: Habit does not belong to user'));
      }

      // Mark as incomplete
      habit.markIncomplete(command.date);

      // TODO: Use update method when available in repository interface
      const saveResult = await this.habitRepo.create(habit);
      if (!saveResult.ok) {
        return Result.error(new Error('Failed to save habit'));
      }

      // Publish domain events
      await this._eventBus.publishEvents(habit.getDomainEvents());
      habit.clearDomainEvents();

      return Result.ok(undefined);
    } catch (error) {
      return Result.error(error as Error);
    }
  }
}

@injectable()
export class ResetHabitStreakCommandHandler implements CommandHandler<ResetHabitStreakCommand, Result<void>> {
  constructor(
    @inject('IHabitRepository') private habitRepo: IHabitRepository,
    @inject('IEventBus') private _eventBus: IEventBus
  ) {}

  async handle(command: ResetHabitStreakCommand): Promise<Result<void>> {
    try {
      const habitResult = await this.habitRepo.findById(command.habitId as any);
      if (!habitResult.ok || !habitResult.value) {
        return Result.error(new Error('Habit not found'));
      }

      const habit = habitResult.value;
      if (habit.userId.toString() !== command.userId) {
        return Result.error(new Error('Unauthorized: Habit does not belong to user'));
      }

      // Reset streak
      habit.resetStreak();

      // TODO: Use update method when available in repository interface
      const saveResult = await this.habitRepo.create(habit);
      if (!saveResult.ok) {
        return Result.error(new Error('Failed to save habit'));
      }

      // Publish domain events
      await this._eventBus.publishEvents(habit.getDomainEvents());
      habit.clearDomainEvents();

      return Result.ok(undefined);
    } catch (error) {
      return Result.error(error as Error);
    }
  }
}

@injectable()
export class BulkCompleteHabitsCommandHandler implements CommandHandler<BulkCompleteHabitsCommand, Result<number>> {
  constructor(
    @inject('IHabitRepository') private habitRepo: IHabitRepository,
    @inject('IEventBus') private _eventBus: IEventBus
  ) {}

  async handle(command: BulkCompleteHabitsCommand): Promise<Result<number>> {
    try {
      let successCount = 0;
      const allEvents: any[] = [];

      for (const habitId of command.habitIds) {
        const habitResult = await this.habitRepo.findById(habitId as any);
        if (!habitResult.ok || !habitResult.value) {
          continue; // Skip non-existent habits
        }

        const habit = habitResult.value;
        if (habit.userId.toString() !== command.userId) {
          continue; // Skip unauthorized habits
        }

        try {
          habit.markCompleted(command.completionDate);
          // TODO: Use update method when available in repository interface
          const saveResult = await this.habitRepo.create(habit);

          if (saveResult.ok) {
            successCount++;
            allEvents.push(...habit.getDomainEvents());
            habit.clearDomainEvents();
          }
        } catch (error) {
          // Continue with next habit if this one fails
          logger.warn(`Failed to complete habit ${habitId}:`, error);
        }
      }

      // Publish all events in batch
      if (allEvents.length > 0) {
        await this._eventBus.publishEvents(allEvents);
      }

      return Result.ok(successCount);
    } catch (error) {
      return Result.error(error as Error);
    }
  }
}

@injectable()
export class DeleteHabitCommandHandler implements CommandHandler<DeleteHabitCommand, Result<void>> {
  constructor(
    @inject('IHabitRepository') private habitRepo: IHabitRepository,
    @inject('IEventBus') private _eventBus: IEventBus
  ) {}

  async handle(command: DeleteHabitCommand): Promise<Result<void>> {
    try {
      const habitResult = await this.habitRepo.findById(command.habitId as any);
      if (!habitResult.ok || !habitResult.value) {
        return Result.error(new Error('Habit not found'));
      }

      const habit = habitResult.value;
      if (habit.userId.toString() !== command.userId) {
        return Result.error(new Error('Unauthorized: Habit does not belong to user'));
      }

      // TODO: Implement actual deletion when repository interface has delete method
      // TODO: Use this._eventBus.publish() to emit HabitDeletedEvent
      // For now, return success as a placeholder
      return Result.ok(undefined);
    } catch (error) {
      return Result.error(error as Error);
    }
  }
}