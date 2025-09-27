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
    super();
  }

  get eventName(): string {
    return 'DhikrSessionCreated';
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
    super();
  }

  get eventName(): string {
    return 'DhikrCountIncremented';
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
    super();
  }

  get eventName(): string {
    return 'DhikrSessionCompleted';
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
    super();
  }

  get eventName(): string {
    return 'DhikrTargetReached';
  }
}