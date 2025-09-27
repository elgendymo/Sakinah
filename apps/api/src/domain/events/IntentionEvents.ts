import { DomainEvent } from './base/DomainEvent';
import { IntentionPriority, IntentionReminder } from '../entities/Intention';

export class IntentionCreatedEvent extends DomainEvent {
  constructor(
    public readonly intentionId: string,
    public readonly userId: string,
    public readonly text: string,
    public readonly priority: IntentionPriority,
    public readonly targetDate: Date | null
  ) {
    super({
      aggregateId: intentionId,
      aggregateType: 'Intention',
      userId
    });
  }

  get eventName(): string {
    return 'IntentionCreated';
  }

  get eventVersion(): string {
    return '1.0';
  }

  public getPayload() {
    return {
      intentionId: this.intentionId,
      userId: this.userId,
      text: this.text,
      priority: this.priority,
      targetDate: this.targetDate?.toISOString() || null
    };
  }
}

export class IntentionUpdatedEvent extends DomainEvent {
  constructor(
    public readonly intentionId: string,
    public readonly userId: string,
    public readonly changes: Record<string, any>
  ) {
    super({
      aggregateId: intentionId,
      aggregateType: 'Intention',
      userId
    });
  }

  get eventName(): string {
    return 'IntentionUpdated';
  }

  get eventVersion(): string {
    return '1.0';
  }

  public getPayload() {
    return {
      intentionId: this.intentionId,
      userId: this.userId,
      changes: this.changes
    };
  }
}

export class IntentionCompletedEvent extends DomainEvent {
  constructor(
    public readonly intentionId: string,
    public readonly userId: string,
    public readonly completedAt: Date,
    public readonly text: string
  ) {
    super({
      aggregateId: intentionId,
      aggregateType: 'Intention',
      userId
    });
  }

  get eventName(): string {
    return 'IntentionCompleted';
  }

  get eventVersion(): string {
    return '1.0';
  }

  public getPayload() {
    return {
      intentionId: this.intentionId,
      userId: this.userId,
      completedAt: this.completedAt.toISOString(),
      text: this.text
    };
  }
}

export class IntentionArchivedEvent extends DomainEvent {
  constructor(
    public readonly intentionId: string,
    public readonly userId: string,
    public readonly text: string
  ) {
    super({
      aggregateId: intentionId,
      aggregateType: 'Intention',
      userId
    });
  }

  get eventName(): string {
    return 'IntentionArchived';
  }

  get eventVersion(): string {
    return '1.0';
  }

  public getPayload() {
    return {
      intentionId: this.intentionId,
      userId: this.userId,
      text: this.text
    };
  }
}

export class IntentionOverdueEvent extends DomainEvent {
  constructor(
    public readonly intentionId: string,
    public readonly userId: string,
    public readonly text: string,
    public readonly targetDate: Date,
    public readonly daysOverdue: number
  ) {
    super({
      aggregateId: intentionId,
      aggregateType: 'Intention',
      userId
    });
  }

  get eventName(): string {
    return 'IntentionOverdue';
  }

  get eventVersion(): string {
    return '1.0';
  }

  public getPayload() {
    return {
      intentionId: this.intentionId,
      userId: this.userId,
      text: this.text,
      targetDate: this.targetDate.toISOString(),
      daysOverdue: this.daysOverdue
    };
  }
}

export class IntentionReminderTriggeredEvent extends DomainEvent {
  constructor(
    public readonly intentionId: string,
    public readonly userId: string,
    public readonly text: string,
    public readonly reminder: IntentionReminder
  ) {
    super({
      aggregateId: intentionId,
      aggregateType: 'Intention',
      userId
    });
  }

  get eventName(): string {
    return 'IntentionReminderTriggered';
  }

  get eventVersion(): string {
    return '1.0';
  }

  public getPayload() {
    return {
      intentionId: this.intentionId,
      userId: this.userId,
      text: this.text,
      reminder: this.reminder
    };
  }
}