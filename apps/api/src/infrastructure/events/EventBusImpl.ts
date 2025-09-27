import { injectable } from 'tsyringe';
import { IEventBus, IEventHandler } from '@/domain/events/IEventBus';
import { DomainEvent } from '@/domain/events/base/DomainEvent';

@injectable()
export class EventBusImpl implements IEventBus {
  private handlers = new Map<string, IEventHandler<any>[]>();

  async publish<T extends DomainEvent>(event: T): Promise<void> {
    const eventHandlers = this.handlers.get((event as any).type) || [];

    console.log(`Publishing event: ${(event as any).type}`, {
      aggregateId: (event as any).aggregateId,
      eventId: (event as any).eventId,
      timestamp: (event as any).timestamp
    });

    // Execute all handlers in parallel
    const promises = eventHandlers.map(async (handler) => {
      try {
        await handler.handle(event);
      } catch (error) {
        console.error(`Error handling event ${(event as any).type} with handler ${handler.constructor.name}:`, error);
        // Don't rethrow - we want other handlers to continue
      }
    });

    await Promise.allSettled(promises);
  }

  async publishEvents<T extends DomainEvent>(events: T[]): Promise<void> {
    // Publish events sequentially to maintain order
    const promises = events.map(event => this.publish(event));
    await Promise.allSettled(promises);
  }

  subscribe<T extends DomainEvent>(eventType: string, handler: IEventHandler<T>): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
  }

  unsubscribe<T extends DomainEvent>(eventType: string, handler: IEventHandler<T>): void {
    const eventHandlers = this.handlers.get(eventType);
    if (eventHandlers) {
      const index = eventHandlers.indexOf(handler);
      if (index > -1) {
        eventHandlers.splice(index, 1);
      }
    }
  }

  // Utility methods
  getSubscribedEventTypes(): string[] {
    return Array.from(this.handlers.keys());
  }

  getHandlerCount(eventType: string): number {
    return this.handlers.get(eventType)?.length || 0;
  }

  getAllHandlerCounts(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const [eventType, handlers] of this.handlers) {
      counts[eventType] = handlers.length;
    }
    return counts;
  }
}