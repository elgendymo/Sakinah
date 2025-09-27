import { DomainEvent } from './base/DomainEvent';

export interface EventMetadata {
  aggregateId: string;
  aggregateType: string;
  eventVersion: number;
  eventId: string;
  occurredAt: Date;
  userId?: string;
  correlationId?: string;
  causationId?: string;
  clientIp?: string;
  userAgent?: string;
}

export interface StoredEvent {
  id: string;
  aggregateId: string;
  aggregateType: string;
  eventType: string;
  eventVersion: number;
  eventData: any;
  metadata: EventMetadata;
  occurredAt: Date;
  recordedAt: Date;
}

export interface EventStreamSlice {
  events: StoredEvent[];
  streamVersion: number;
  hasMoreEvents: boolean;
  nextEventNumber?: number;
}

export interface EventStoreOptions {
  batchSize?: number;
  snapshotFrequency?: number;
  retentionDays?: number;
  encryption?: boolean;
}

export interface IEventStore {
  // Event persistence
  appendToStream(
    streamId: string,
    events: DomainEvent[],
    expectedVersion?: number,
    metadata?: Partial<EventMetadata>
  ): Promise<void>;

  // Event retrieval
  readStreamForward(
    streamId: string,
    fromEventNumber?: number,
    maxCount?: number
  ): Promise<EventStreamSlice>;

  readStreamBackward(
    streamId: string,
    fromEventNumber?: number,
    maxCount?: number
  ): Promise<EventStreamSlice>;

  // Event queries
  readAllEvents(
    fromPosition?: number,
    maxCount?: number
  ): Promise<StoredEvent[]>;

  readEventsByType(
    eventType: string,
    fromTimestamp?: Date,
    toTimestamp?: Date
  ): Promise<StoredEvent[]>;

  readEventsByUserId(
    userId: string,
    fromTimestamp?: Date,
    toTimestamp?: Date
  ): Promise<StoredEvent[]>;

  // Aggregate queries
  getStreamVersion(streamId: string): Promise<number>;
  streamExists(streamId: string): Promise<boolean>;

  // Event store management
  createSnapshot(aggregateId: string, aggregateData: any, version: number): Promise<void>;
  getLatestSnapshot(aggregateId: string): Promise<{ data: any; version: number } | null>;

  // Health and statistics
  getEventCount(): Promise<number>;
  getStreamCount(): Promise<number>;
  getHealthStatus(): Promise<EventStoreHealth>;
}

export interface EventStoreHealth {
  isHealthy: boolean;
  eventCount: number;
  streamCount: number;
  oldestEvent?: Date;
  newestEvent?: Date;
  storageSize?: string;
  lastCheckTime: Date;
}

export interface EventProjection {
  projectionName: string;
  lastProcessedEventNumber: number;
  lastProcessedAt: Date;
  isRunning: boolean;
  errorCount: number;
  lastError?: string;
}

export interface IEventProjectionStore {
  saveProjectionState(projection: EventProjection): Promise<void>;
  getProjectionState(projectionName: string): Promise<EventProjection | null>;
  getAllProjections(): Promise<EventProjection[]>;
  markProjectionAsRunning(projectionName: string): Promise<void>;
  markProjectionAsStopped(projectionName: string, error?: string): Promise<void>;
}