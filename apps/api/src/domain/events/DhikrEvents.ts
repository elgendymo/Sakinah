import { DomainEvent } from './base/DomainEvent';

export class DhikrSessionCreatedEvent extends DomainEvent {
  constructor(
    public readonly sessionId: string,
    public readonly userId: string,
    public readonly dhikrType: string,
    public readonly dhikrText: string,
    public readonly date: string,
    public readonly targetCount: number | null
  ) {
    super({
      aggregateId: sessionId,
      aggregateType: 'DhikrSession',
      userId
    });
  }

  get eventName(): string {
    return 'DhikrSessionCreated';
  }

  get eventVersion(): string {
    return '1.0';
  }

  getPayload(): Record<string, any> {
    return {
      sessionId: this.sessionId,
      userId: this.userId,
      dhikrType: this.dhikrType,
      dhikrText: this.dhikrText,
      date: this.date,
      targetCount: this.targetCount
    };
  }
}

export class DhikrCountIncrementedEvent extends DomainEvent {
  constructor(
    public readonly sessionId: string,
    public readonly userId: string,
    public readonly dhikrType: string,
    public readonly previousCount: number,
    public readonly newCount: number,
    public readonly increment: number
  ) {
    super({
      aggregateId: sessionId,
      aggregateType: 'DhikrSession',
      userId
    });
  }

  get eventName(): string {
    return 'DhikrCountIncremented';
  }

  get eventVersion(): string {
    return '1.0';
  }

  getPayload(): Record<string, any> {
    return {
      sessionId: this.sessionId,
      userId: this.userId,
      dhikrType: this.dhikrType,
      previousCount: this.previousCount,
      newCount: this.newCount,
      increment: this.increment
    };
  }
}

export class DhikrSessionCompletedEvent extends DomainEvent {
  constructor(
    public readonly sessionId: string,
    public readonly userId: string,
    public readonly dhikrType: string,
    public readonly finalCount: number,
    public readonly sessionDuration: number,
    public readonly targetReached: boolean
  ) {
    super({
      aggregateId: sessionId,
      aggregateType: 'DhikrSession',
      userId
    });
  }

  get eventName(): string {
    return 'DhikrSessionCompleted';
  }

  get eventVersion(): string {
    return '1.0';
  }

  getPayload(): Record<string, any> {
    return {
      sessionId: this.sessionId,
      userId: this.userId,
      dhikrType: this.dhikrType,
      finalCount: this.finalCount,
      sessionDuration: this.sessionDuration,
      targetReached: this.targetReached
    };
  }
}

export class DhikrTargetReachedEvent extends DomainEvent {
  constructor(
    public readonly sessionId: string,
    public readonly userId: string,
    public readonly dhikrType: string,
    public readonly targetCount: number,
    public readonly finalCount: number
  ) {
    super({
      aggregateId: sessionId,
      aggregateType: 'DhikrSession',
      userId
    });
  }

  get eventName(): string {
    return 'DhikrTargetReached';
  }

  get eventVersion(): string {
    return '1.0';
  }

  getPayload(): Record<string, any> {
    return {
      sessionId: this.sessionId,
      userId: this.userId,
      dhikrType: this.dhikrType,
      targetCount: this.targetCount,
      finalCount: this.finalCount
    };
  }
}