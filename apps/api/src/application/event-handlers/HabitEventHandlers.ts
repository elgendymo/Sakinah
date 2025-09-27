import { EventHandler } from '../../domain/events/EventDispatcher';
import {
  HabitCompletedEvent,
  HabitStreakBrokenEvent,
  HabitMilestoneReachedEvent,
  HabitCreatedEvent
} from '../../domain/events/HabitEvents';
import { logger } from '../../shared/logger';

export class HabitEventHandlers {

  static handleHabitCreated: EventHandler<HabitCreatedEvent> = async (event) => {
    logger.info('Habit created', {
      habitId: event.habitId,
      userId: event.userId,
      title: event.title,
      eventId: event.meta.eventId
    });

    // Future: Send welcome notification
    // Future: Initialize habit analytics
  };

  static handleHabitCompleted: EventHandler<HabitCompletedEvent> = async (event) => {
    logger.info('Habit completed', {
      habitId: event.habitId,
      userId: event.userId,
      newStreakCount: event.newStreakCount,
      isStreakMaintained: event.isStreakMaintained,
      eventId: event.meta.eventId
    });

    // Future: Update user statistics
    // Future: Check for rewards/achievements
    // Future: Send encouragement notifications
  };

  static handleHabitStreakBroken: EventHandler<HabitStreakBrokenEvent> = async (event) => {
    logger.warn('Habit streak broken', {
      habitId: event.habitId,
      userId: event.userId,
      previousStreakCount: event.previousStreakCount,
      daysMissed: event.daysMissed,
      eventId: event.meta.eventId
    });

    // Future: Send motivational message
    // Future: Suggest easier micro-habits
  };

  static handleHabitMilestoneReached: EventHandler<HabitMilestoneReachedEvent> = async (event) => {
    logger.info('Habit milestone reached!', {
      habitId: event.habitId,
      userId: event.userId,
      milestoneType: event.milestoneType,
      streakCount: event.streakCount,
      eventId: event.meta.eventId
    });

    // Future: Award badges/achievements
    // Future: Send congratulations notification
    // Future: Suggest next spiritual goal
  };

  static registerAll(dispatcher: import('../../domain/events/EventDispatcher').EventDispatcher): void {
    dispatcher.register('HabitCreated', this.handleHabitCreated);
    dispatcher.register('HabitCompleted', this.handleHabitCompleted);
    dispatcher.register('HabitStreakBroken', this.handleHabitStreakBroken);
    dispatcher.register('HabitMilestoneReached', this.handleHabitMilestoneReached);
  }
}