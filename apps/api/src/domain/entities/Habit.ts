import { HabitId } from '../value-objects/HabitId';
import { UserId } from '../value-objects/UserId';
import { PlanId } from '../value-objects/PlanId';
import { AggregateRoot } from '../events/base/AggregateRoot';
import {
  HabitCreatedEvent,
  HabitCompletedEvent,
  HabitStreakBrokenEvent,
  HabitMilestoneReachedEvent
} from '../events/HabitEvents';

export interface HabitSchedule {
  freq: 'daily' | 'weekly' | 'custom';
  days?: number[];
}

export class Habit extends AggregateRoot {
  private constructor(
    private readonly _id: HabitId,
    private readonly _userId: UserId,
    private readonly _planId: PlanId,
    private readonly _title: string,
    private readonly _schedule: HabitSchedule,
    private _streakCount: number,
    private _lastCompletedOn: Date | null,
    private readonly _createdAt: Date
  ) {
    super();
  }

  static create(params: {
    id?: string;
    userId: string;
    planId: string;
    title: string;
    schedule: HabitSchedule;
    streakCount?: number;
    lastCompletedOn?: Date | null;
    createdAt?: Date;
  }): Habit {
    const habit = new Habit(
      new HabitId(params.id),
      new UserId(params.userId),
      new PlanId(params.planId),
      params.title,
      params.schedule,
      params.streakCount || 0,
      params.lastCompletedOn || null,
      params.createdAt || new Date()
    );

    // Emit creation event only for new habits
    if (!params.id) {
      habit.addDomainEvent(
        new HabitCreatedEvent(
          habit._id.toString(),
          habit._userId.toString(),
          habit._planId.toString(),
          habit._title,
          habit._schedule
        )
      );
    }

    return habit;
  }

  get id(): HabitId {
    return this._id;
  }

  get userId(): UserId {
    return this._userId;
  }

  get planId(): PlanId {
    return this._planId;
  }

  get title(): string {
    return this._title;
  }

  get schedule(): HabitSchedule {
    return { ...this._schedule };
  }

  get streakCount(): number {
    return this._streakCount;
  }

  get lastCompletedOn(): Date | null {
    return this._lastCompletedOn;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  markCompleted(date: Date = new Date()): void {
    const today = new Date(date);
    today.setHours(0, 0, 0, 0);

    let isStreakMaintained = false;
    const previousStreakCount = this._streakCount;

    if (this._lastCompletedOn) {
      const lastDate = new Date(this._lastCompletedOn);
      lastDate.setHours(0, 0, 0, 0);

      const daysDiff = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff === 0) {
        throw new Error('Habit already completed today');
      } else if (daysDiff === 1) {
        this._streakCount++;
        isStreakMaintained = true;
      } else {
        // Streak broken
        if (previousStreakCount > 0) {
          this.addDomainEvent(
            new HabitStreakBrokenEvent(
              this._id.toString(),
              this._userId.toString(),
              previousStreakCount,
              daysDiff
            )
          );
        }
        this._streakCount = 1;
      }
    } else {
      this._streakCount = 1;
    }

    this._lastCompletedOn = date;

    // Emit completion event
    this.addDomainEvent(
      new HabitCompletedEvent(
        this._id.toString(),
        this._userId.toString(),
        date,
        this._streakCount,
        isStreakMaintained
      )
    );

    // Check for milestones
    this.checkMilestones();
  }

  markIncomplete(date: Date = new Date()): void {
    const today = new Date(date);
    today.setHours(0, 0, 0, 0);

    if (!this._lastCompletedOn) {
      throw new Error('Habit was not completed');
    }

    const lastDate = new Date(this._lastCompletedOn);
    lastDate.setHours(0, 0, 0, 0);

    if (today.getTime() === lastDate.getTime()) {
      if (this._streakCount > 0) {
        this._streakCount--;
      }

      // Find previous completion date logic would go here
      this._lastCompletedOn = null;
    }
  }

  resetStreak(): void {
    this._streakCount = 0;
    this._lastCompletedOn = null;
  }

  private checkMilestones(): void {
    const milestones = [
      { days: 7, type: 'week' as const },
      { days: 30, type: 'month' as const },
      { days: 90, type: 'quarter' as const },
      { days: 365, type: 'year' as const }
    ];

    for (const milestone of milestones) {
      if (this._streakCount === milestone.days) {
        this.addDomainEvent(
          new HabitMilestoneReachedEvent(
            this._id.toString(),
            this._userId.toString(),
            milestone.type,
            this._streakCount
          )
        );
      }
    }
  }

  protected get aggregateId(): string {
    return this._id.toString();
  }

  protected get aggregateType(): string {
    return 'Habit';
  }

  toDTO() {
    return {
      id: this._id.toString(),
      userId: this._userId.toString(),
      planId: this._planId.toString(),
      title: this._title,
      schedule: this._schedule,
      streakCount: this._streakCount,
      lastCompletedOn: this._lastCompletedOn?.toISOString() || undefined,
      createdAt: this._createdAt.toISOString()
    };
  }
}