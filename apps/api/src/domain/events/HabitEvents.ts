import { DomainEvent } from './base/DomainEvent';
import { HabitSchedule } from '../entities/Habit';

export class HabitCreatedEvent extends DomainEvent {
  constructor(
    public readonly habitId: string,
    public readonly userId: string,
    public readonly planId: string,
    public readonly title: string,
    public readonly schedule: HabitSchedule
  ) {
    super({
      aggregateId: habitId,
      aggregateType: 'Habit',
      userId
    });
  }

  get eventName(): string {
    return 'HabitCreated';
  }

  get eventVersion(): string {
    return '1.0';
  }

  public getPayload() {
    return {
      habitId: this.habitId,
      userId: this.userId,
      planId: this.planId,
      title: this.title,
      schedule: this.schedule
    };
  }
}

export class HabitCompletedEvent extends DomainEvent {
  constructor(
    public readonly habitId: string,
    public readonly userId: string,
    public readonly completionDate: Date,
    public readonly newStreakCount: number,
    public readonly isStreakMaintained: boolean
  ) {
    super({
      aggregateId: habitId,
      aggregateType: 'Habit',
      userId
    });
  }

  get eventName(): string {
    return 'HabitCompleted';
  }

  get eventVersion(): string {
    return '1.0';
  }

  public getPayload() {
    return {
      habitId: this.habitId,
      userId: this.userId,
      completionDate: this.completionDate.toISOString(),
      newStreakCount: this.newStreakCount,
      isStreakMaintained: this.isStreakMaintained
    };
  }
}

export class HabitStreakBrokenEvent extends DomainEvent {
  constructor(
    public readonly habitId: string,
    public readonly userId: string,
    public readonly previousStreakCount: number,
    public readonly daysMissed: number
  ) {
    super({
      aggregateId: habitId,
      aggregateType: 'Habit',
      userId
    });
  }

  get eventName(): string {
    return 'HabitStreakBroken';
  }

  get eventVersion(): string {
    return '1.0';
  }

  public getPayload() {
    return {
      habitId: this.habitId,
      userId: this.userId,
      previousStreakCount: this.previousStreakCount,
      daysMissed: this.daysMissed
    };
  }
}

export class HabitMilestoneReachedEvent extends DomainEvent {
  constructor(
    public readonly habitId: string,
    public readonly userId: string,
    public readonly milestoneType: 'week' | 'month' | 'quarter' | 'year',
    public readonly streakCount: number
  ) {
    super({
      aggregateId: habitId,
      aggregateType: 'Habit',
      userId
    });
  }

  get eventName(): string {
    return 'HabitMilestoneReached';
  }

  get eventVersion(): string {
    return '1.0';
  }

  public getPayload() {
    return {
      habitId: this.habitId,
      userId: this.userId,
      milestoneType: this.milestoneType,
      streakCount: this.streakCount
    };
  }
}