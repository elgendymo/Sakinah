import { injectable, inject } from 'tsyringe';
import { IEventBus, IEventHandler } from '@/domain/events/IEventBus';
import { DomainEvent } from '@/domain/events/base/DomainEvent';
import { IEventStore } from '@/domain/events/EventStore';
import { logger } from '@/shared/logger';

@injectable()
export class EventSourcedEventBus implements IEventBus {
  private handlers = new Map<string, Array<IEventHandler<DomainEvent>>>();

  constructor(@inject('IEventStore') private eventStore: IEventStore) {}

  subscribe<T extends DomainEvent>(
    eventType: string,
    handler: IEventHandler<T>
  ): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }

    this.handlers.get(eventType)!.push(handler as IEventHandler<DomainEvent>);
    logger.debug(`Subscribed handler for event type: ${eventType}`);
  }

  unsubscribe<T extends DomainEvent>(
    eventType: string,
    handler: IEventHandler<T>
  ): void {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler as IEventHandler<DomainEvent>);
      if (index > -1) {
        handlers.splice(index, 1);
        logger.debug(`Unsubscribed handler for event type: ${eventType}`);
      }
    }
  }

  async publish<T extends DomainEvent>(event: T): Promise<void> {
    await this.publishEvents([event]);
  }

  async publishEvents(events: DomainEvent[]): Promise<void> {
    if (events.length === 0) return;

    try {
      // Group events by aggregate ID for atomic storage
      const eventsByAggregate = new Map<string, DomainEvent[]>();

      for (const event of events) {
        const aggregateId = this.extractAggregateId(event);
        if (!eventsByAggregate.has(aggregateId)) {
          eventsByAggregate.set(aggregateId, []);
        }
        eventsByAggregate.get(aggregateId)!.push(event);
      }

      // Store events in event store by aggregate
      for (const [aggregateId, aggregateEvents] of eventsByAggregate) {
        await this.eventStore.appendToStream(
          aggregateId,
          aggregateEvents,
          undefined,
          {
            userId: aggregateEvents[0]?.meta?.userId
          }
        );
      }

      // Publish events to handlers (in-memory event bus functionality)
      const publishPromises = events.map(event => this.publishToHandlers(event));
      await Promise.all(publishPromises);

      logger.debug(`Published and stored ${events.length} events`);

    } catch (error) {
      logger.error('Failed to publish and store events:', error);
      throw error;
    }
  }

  private async publishToHandlers(event: DomainEvent): Promise<void> {
    const handlers = this.handlers.get(event.eventName) || [];

    if (handlers.length === 0) {
      logger.debug(`No handlers registered for event type: ${event.eventName}`);
      return;
    }

    const handlerPromises = handlers.map(async handler => {
      try {
        await handler.handle(event);
      } catch (error) {
        logger.error(`Error in event handler for ${event.eventName}:`, error);
        // Don't rethrow - we want other handlers to continue
      }
    });

    await Promise.all(handlerPromises);
  }

  private extractAggregateId(event: DomainEvent): string {
    // Try to extract aggregate ID from event payload
    const payload = event.getPayload();

    // Common aggregate ID field names
    const possibleIdFields = ['aggregateId', 'habitId', 'planId', 'userId', 'id'];

    for (const field of possibleIdFields) {
      if (payload[field]) {
        return payload[field];
      }
    }

    // Fallback: use user ID if available
    if (event.meta.userId) {
      return `user-${event.meta.userId}`;
    }

    // Last resort: generate a fallback ID
    logger.warn(`Could not extract aggregate ID from event ${event.eventName}, using fallback`);
    return `unknown-${Date.now()}`;
  }

  // Event sourcing specific methods

  async replayEvents(
    streamId: string,
    fromEventNumber = 0
  ): Promise<DomainEvent[]> {
    const slice = await this.eventStore.readStreamForward(streamId, fromEventNumber);

    return slice.events.map(storedEvent => {
      // Create a minimal event-like object that can be used for replay
      return {
        eventName: storedEvent.eventType,
        eventVersion: '1.0',
        meta: {
          eventId: storedEvent.metadata.eventId,
          aggregateId: storedEvent.metadata.aggregateId,
          aggregateType: storedEvent.metadata.aggregateType,
          occurredAt: storedEvent.occurredAt,
          userId: storedEvent.metadata.userId
        },
        getPayload: () => storedEvent.eventData,
        toJSON: () => ({
          eventName: storedEvent.eventType,
          eventVersion: '1.0',
          meta: {
            eventId: storedEvent.metadata.eventId,
            aggregateId: storedEvent.metadata.aggregateId,
            aggregateType: storedEvent.metadata.aggregateType,
            occurredAt: storedEvent.occurredAt,
            userId: storedEvent.metadata.userId
          },
          payload: storedEvent.eventData
        })
      } as DomainEvent;
    });
  }

  async replayEventsForAggregate<T>(
    aggregateId: string,
    aggregateFactory: () => T,
    applyEvent: (aggregate: T, event: DomainEvent) => void
  ): Promise<{ aggregate: T; version: number }> {
    // Check for snapshot first
    const snapshot = await this.eventStore.getLatestSnapshot(aggregateId);
    let aggregate: T;
    let fromVersion = 0;

    if (snapshot) {
      aggregate = snapshot.data as T;
      fromVersion = snapshot.version;
    } else {
      aggregate = aggregateFactory();
    }

    // Replay events from snapshot version
    const events = await this.replayEvents(aggregateId, fromVersion);

    for (const event of events) {
      applyEvent(aggregate, event);
    }

    const currentVersion = await this.eventStore.getStreamVersion(aggregateId);

    return { aggregate, version: currentVersion };
  }

  // Islamic habit tracking specific event handlers

  setupIslamicHabitHandlers(): void {
    // Handler for spiritual milestone notifications
    this.subscribe('HabitMilestoneReachedEvent', {
      handle: async (event) => {
        const { habitId, userId, milestoneType, streakCount } = event.getPayload();

        logger.info(`🌟 Spiritual milestone reached! User ${userId} achieved ${milestoneType} with habit ${habitId} (${streakCount} days)`);

        // Here you could integrate with:
        // - Push notifications for spiritual encouragement
        // - Islamic quote of the day service
        // - Community sharing features
        // - Progress tracking analytics
      }
    });

    // Handler for streak broken - spiritual guidance
    this.subscribe('HabitStreakBrokenEvent', {
      handle: async (event) => {
        const { userId, previousStreak } = event.getPayload();

        logger.info(`📿 Gentle reminder: User ${userId} had a break in their spiritual practice. Previous streak: ${previousStreak} days`);

        // Here you could integrate with:
        // - Motivational Islamic reminders
        // - Gentle encouragement notifications
        // - Suggested duas for getting back on track
      }
    });

    // Handler for habit completion - daily spiritual progress
    this.subscribe('HabitCompletedEvent', {
      handle: async (event) => {
        const { habitId, userId } = event.getPayload();

        logger.debug(`✅ Spiritual practice completed: User ${userId} completed habit ${habitId}`);

        // Here you could integrate with:
        // - Daily progress tracking
        // - Spiritual analytics
        // - Community features
        // - Reward systems
      }
    });

    logger.info('Islamic habit tracking event handlers setup complete');
  }

  // Administrative methods

  async getEventStoreHealth(): Promise<any> {
    return await this.eventStore.getHealthStatus();
  }

  async createAggregateSnapshot(aggregateId: string, aggregateData: any, version: number): Promise<void> {
    await this.eventStore.createSnapshot(aggregateId, aggregateData, version);
  }

  getRegisteredHandlers(): Map<string, number> {
    const handlerCounts = new Map<string, number>();

    for (const [eventType, handlers] of this.handlers) {
      handlerCounts.set(eventType, handlers.length);
    }

    return handlerCounts;
  }
}