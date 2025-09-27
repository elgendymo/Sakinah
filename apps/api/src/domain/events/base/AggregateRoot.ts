import { DomainEvent } from './DomainEvent';

export abstract class AggregateRoot {
  private _domainEvents: DomainEvent[] = [];
  private _version: number = 0;

  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  clearDomainEvents(): void {
    this._domainEvents = [];
  }

  getDomainEvents(): DomainEvent[] {
    return [...this._domainEvents];
  }

  get version(): number {
    return this._version;
  }

  protected incrementVersion(): void {
    this._version++;
  }

  markEventsAsCommitted(): void {
    this._domainEvents = [];
  }

  protected abstract get aggregateId(): string;
  protected abstract get aggregateType(): string;
}