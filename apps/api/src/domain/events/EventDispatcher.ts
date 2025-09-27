import { DomainEvent } from './base/DomainEvent';

export type EventHandler<T extends DomainEvent = DomainEvent> = (event: T) => Promise<void> | void;

export interface IEventDispatcher {
  dispatch(events: DomainEvent[]): Promise<void>;
  register(eventName: string, handler: EventHandler): void;
  unregister(eventName: string, handler: EventHandler): void;
}

export class EventDispatcher implements IEventDispatcher {
  private handlers: Map<string, Set<EventHandler>> = new Map();
  private static instance: EventDispatcher;

  private constructor() {}

  static getInstance(): EventDispatcher {
    if (!EventDispatcher.instance) {
      EventDispatcher.instance = new EventDispatcher();
    }
    return EventDispatcher.instance;
  }

  register(eventName: string, handler: EventHandler): void {
    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, new Set());
    }
    this.handlers.get(eventName)!.add(handler);
  }

  unregister(eventName: string, handler: EventHandler): void {
    const eventHandlers = this.handlers.get(eventName);
    if (eventHandlers) {
      eventHandlers.delete(handler);
      if (eventHandlers.size === 0) {
        this.handlers.delete(eventName);
      }
    }
  }

  async dispatch(events: DomainEvent[]): Promise<void> {
    const promises: Promise<void>[] = [];

    for (const event of events) {
      const eventHandlers = this.handlers.get(event.eventName);
      if (eventHandlers) {
        for (const handler of eventHandlers) {
          const result = handler(event);
          if (result instanceof Promise) {
            promises.push(result);
          }
        }
      }
    }

    await Promise.all(promises);
  }

  clear(): void {
    this.handlers.clear();
  }
}