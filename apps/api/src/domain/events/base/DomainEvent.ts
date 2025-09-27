export interface DomainEventMeta {
  eventId: string;
  aggregateId: string;
  aggregateType: string;
  occurredAt: Date;
  userId?: string;
}

export abstract class DomainEvent {
  public readonly meta: DomainEventMeta;

  constructor(meta: Omit<DomainEventMeta, 'eventId' | 'occurredAt'>) {
    this.meta = {
      ...meta,
      eventId: this.generateEventId(),
      occurredAt: new Date()
    };
  }

  private generateEventId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  abstract get eventName(): string;
  abstract get eventVersion(): string;

  toJSON() {
    return {
      eventName: this.eventName,
      eventVersion: this.eventVersion,
      meta: this.meta,
      payload: this.getPayload()
    };
  }

  public abstract getPayload(): Record<string, any>;
}