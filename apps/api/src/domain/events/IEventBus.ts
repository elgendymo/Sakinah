import { DomainEvent } from './base/DomainEvent';

export interface IEventHandler<T extends DomainEvent> {
  handle(event: T): Promise<void>;
}

export interface IEventBus {
  publish<T extends DomainEvent>(event: T): Promise<void>;
  publishEvents<T extends DomainEvent>(events: T[]): Promise<void>;
  subscribe<T extends DomainEvent>(eventType: string, handler: IEventHandler<T>): void;
  unsubscribe<T extends DomainEvent>(eventType: string, handler: IEventHandler<T>): void;
}