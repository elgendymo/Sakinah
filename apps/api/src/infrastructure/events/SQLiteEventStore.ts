import { injectable } from 'tsyringe';
import Database from 'better-sqlite3';
import { join } from 'path';
import { IEventStore, StoredEvent, EventStreamSlice, EventMetadata, EventStoreHealth } from '@/domain/events/EventStore';
import { DomainEvent } from '@/domain/events/base/DomainEvent';
import { logger } from '@/shared/logger';
import { v4 as uuidv4 } from 'uuid';

@injectable()
export class SQLiteEventStore implements IEventStore {
  private db: Database.Database;

  constructor() {
    this.db = this.initializeConnection();
    this.initializeSchema();
  }

  private initializeConnection(): Database.Database {
    const dbPath = process.env.EVENT_STORE_PATH || './data/events.sqlite';
    const fullPath = join(process.cwd(), dbPath);
    return new Database(fullPath);
  }

  private initializeSchema(): void {
    // Events table for storing domain events
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS event_store (
        id TEXT PRIMARY KEY,
        aggregate_id TEXT NOT NULL,
        aggregate_type TEXT NOT NULL,
        event_type TEXT NOT NULL,
        event_version INTEGER NOT NULL,
        event_data TEXT NOT NULL,
        metadata TEXT NOT NULL,
        occurred_at TEXT NOT NULL,
        recorded_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(aggregate_id, event_version)
      );
    `);

    // Snapshots table for aggregate snapshots
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS event_snapshots (
        aggregate_id TEXT PRIMARY KEY,
        aggregate_type TEXT NOT NULL,
        snapshot_data TEXT NOT NULL,
        snapshot_version INTEGER NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Projections table for projection state
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS event_projections (
        projection_name TEXT PRIMARY KEY,
        last_processed_event_number INTEGER NOT NULL DEFAULT 0,
        last_processed_at TEXT DEFAULT CURRENT_TIMESTAMP,
        is_running BOOLEAN NOT NULL DEFAULT FALSE,
        error_count INTEGER NOT NULL DEFAULT 0,
        last_error TEXT
      );
    `);

    // Indexes for performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_event_store_aggregate_id ON event_store(aggregate_id);
      CREATE INDEX IF NOT EXISTS idx_event_store_event_type ON event_store(event_type);
      CREATE INDEX IF NOT EXISTS idx_event_store_occurred_at ON event_store(occurred_at);
      CREATE INDEX IF NOT EXISTS idx_event_store_user_id ON event_store(json_extract(metadata, '$.userId'));
    `);

    logger.info('Event store schema initialized');
  }

  async appendToStream(
    streamId: string,
    events: DomainEvent[],
    expectedVersion?: number,
    additionalMetadata?: Partial<EventMetadata>
  ): Promise<void> {
    if (events.length === 0) return;

    const transaction = this.db.transaction(() => {
      // Check expected version if provided
      if (expectedVersion !== undefined) {
        const currentVersion = this.getStreamVersionSync(streamId);
        if (currentVersion !== expectedVersion) {
          throw new Error(`Expected version ${expectedVersion}, but stream is at version ${currentVersion}`);
        }
      }

      const currentVersion = this.getStreamVersionSync(streamId);

      // Insert events
      const insertStmt = this.db.prepare(`
        INSERT INTO event_store (
          id, aggregate_id, aggregate_type, event_type, event_version,
          event_data, metadata, occurred_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      events.forEach((event, index) => {
        const eventVersion = currentVersion + index + 1;
        const eventId = uuidv4();

        const metadata: EventMetadata = {
          aggregateId: streamId,
          aggregateType: this.extractAggregateType(event),
          eventVersion,
          eventId,
          occurredAt: event.meta.occurredAt,
          userId: event.meta.userId,
          ...additionalMetadata
        };

        insertStmt.run(
          eventId,
          streamId,
          metadata.aggregateType,
          event.eventName,
          eventVersion,
          JSON.stringify(event.getPayload()),
          JSON.stringify(metadata),
          event.meta.occurredAt.toISOString()
        );
      });
    });

    try {
      transaction();
      logger.debug(`Appended ${events.length} events to stream ${streamId}`);
    } catch (error) {
      logger.error(`Failed to append events to stream ${streamId}:`, error);
      throw error;
    }
  }

  async readStreamForward(
    streamId: string,
    fromEventNumber = 0,
    maxCount = 100
  ): Promise<EventStreamSlice> {
    const stmt = this.db.prepare(`
      SELECT * FROM event_store
      WHERE aggregate_id = ? AND event_version > ?
      ORDER BY event_version ASC
      LIMIT ?
    `);

    const rows = stmt.all(streamId, fromEventNumber, maxCount + 1) as any[];
    const hasMoreEvents = rows.length > maxCount;
    const events = (hasMoreEvents ? rows.slice(0, maxCount) : rows).map(this.mapRowToStoredEvent);

    const currentVersion = this.getStreamVersionSync(streamId);
    const nextEventNumber = hasMoreEvents ? events[events.length - 1].eventVersion + 1 : undefined;

    return {
      events,
      streamVersion: currentVersion,
      hasMoreEvents,
      nextEventNumber
    };
  }

  async readStreamBackward(
    streamId: string,
    fromEventNumber?: number,
    maxCount = 100
  ): Promise<EventStreamSlice> {
    const currentVersion = this.getStreamVersionSync(streamId);
    const startVersion = fromEventNumber ?? currentVersion;

    const stmt = this.db.prepare(`
      SELECT * FROM event_store
      WHERE aggregate_id = ? AND event_version <= ?
      ORDER BY event_version DESC
      LIMIT ?
    `);

    const rows = stmt.all(streamId, startVersion, maxCount + 1) as any[];
    const hasMoreEvents = rows.length > maxCount;
    const events = (hasMoreEvents ? rows.slice(0, maxCount) : rows).map(this.mapRowToStoredEvent);

    return {
      events,
      streamVersion: currentVersion,
      hasMoreEvents,
      nextEventNumber: hasMoreEvents ? events[events.length - 1].eventVersion - 1 : undefined
    };
  }

  async readAllEvents(fromPosition = 0, maxCount = 100): Promise<StoredEvent[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM event_store
      WHERE rowid > ?
      ORDER BY rowid ASC
      LIMIT ?
    `);

    const rows = stmt.all(fromPosition, maxCount) as any[];
    return rows.map(this.mapRowToStoredEvent);
  }

  async readEventsByType(
    eventType: string,
    fromTimestamp?: Date,
    toTimestamp?: Date
  ): Promise<StoredEvent[]> {
    let query = 'SELECT * FROM event_store WHERE event_type = ?';
    const params: any[] = [eventType];

    if (fromTimestamp) {
      query += ' AND occurred_at >= ?';
      params.push(fromTimestamp.toISOString());
    }

    if (toTimestamp) {
      query += ' AND occurred_at <= ?';
      params.push(toTimestamp.toISOString());
    }

    query += ' ORDER BY occurred_at ASC';

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];
    return rows.map(this.mapRowToStoredEvent);
  }

  async readEventsByUserId(
    userId: string,
    fromTimestamp?: Date,
    toTimestamp?: Date
  ): Promise<StoredEvent[]> {
    let query = "SELECT * FROM event_store WHERE json_extract(metadata, '$.userId') = ?";
    const params: any[] = [userId];

    if (fromTimestamp) {
      query += ' AND occurred_at >= ?';
      params.push(fromTimestamp.toISOString());
    }

    if (toTimestamp) {
      query += ' AND occurred_at <= ?';
      params.push(toTimestamp.toISOString());
    }

    query += ' ORDER BY occurred_at ASC';

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];
    return rows.map(this.mapRowToStoredEvent);
  }

  async getStreamVersion(streamId: string): Promise<number> {
    return this.getStreamVersionSync(streamId);
  }

  private getStreamVersionSync(streamId: string): number {
    const stmt = this.db.prepare(`
      SELECT MAX(event_version) as version FROM event_store WHERE aggregate_id = ?
    `);
    const result = stmt.get(streamId) as any;
    return result?.version ?? 0;
  }

  async streamExists(streamId: string): Promise<boolean> {
    const stmt = this.db.prepare(`
      SELECT 1 FROM event_store WHERE aggregate_id = ? LIMIT 1
    `);
    const result = stmt.get(streamId);
    return !!result;
  }

  async createSnapshot(aggregateId: string, aggregateData: any, version: number): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO event_snapshots (
        aggregate_id, aggregate_type, snapshot_data, snapshot_version
      ) VALUES (?, ?, ?, ?)
    `);

    stmt.run(
      aggregateId,
      aggregateData.constructor.name,
      JSON.stringify(aggregateData),
      version
    );

    logger.debug(`Created snapshot for aggregate ${aggregateId} at version ${version}`);
  }

  async getLatestSnapshot(aggregateId: string): Promise<{ data: any; version: number } | null> {
    const stmt = this.db.prepare(`
      SELECT snapshot_data, snapshot_version FROM event_snapshots WHERE aggregate_id = ?
    `);

    const result = stmt.get(aggregateId) as any;
    if (!result) return null;

    return {
      data: JSON.parse(result.snapshot_data),
      version: result.snapshot_version
    };
  }

  async getEventCount(): Promise<number> {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM event_store');
    const result = stmt.get() as any;
    return result.count;
  }

  async getStreamCount(): Promise<number> {
    const stmt = this.db.prepare('SELECT COUNT(DISTINCT aggregate_id) as count FROM event_store');
    const result = stmt.get() as any;
    return result.count;
  }

  async getHealthStatus(): Promise<EventStoreHealth> {
    const eventCount = await this.getEventCount();
    const streamCount = await this.getStreamCount();

    // Get oldest and newest events
    const oldestStmt = this.db.prepare('SELECT MIN(occurred_at) as oldest FROM event_store');
    const newestStmt = this.db.prepare('SELECT MAX(occurred_at) as newest FROM event_store');

    const oldestResult = oldestStmt.get() as any;
    const newestResult = newestStmt.get() as any;

    return {
      isHealthy: true,
      eventCount,
      streamCount,
      oldestEvent: oldestResult?.oldest ? new Date(oldestResult.oldest) : undefined,
      newestEvent: newestResult?.newest ? new Date(newestResult.newest) : undefined,
      lastCheckTime: new Date()
    };
  }

  private mapRowToStoredEvent(row: any): StoredEvent {
    return {
      id: row.id,
      aggregateId: row.aggregate_id,
      aggregateType: row.aggregate_type,
      eventType: row.event_type,
      eventVersion: row.event_version,
      eventData: JSON.parse(row.event_data),
      metadata: JSON.parse(row.metadata),
      occurredAt: new Date(row.occurred_at),
      recordedAt: new Date(row.recorded_at)
    };
  }

  private extractAggregateType(event: DomainEvent): string {
    // Extract aggregate type from event name (e.g., 'HabitCompletedEvent' -> 'Habit')
    const eventName = event.eventName;
    const match = eventName.match(/^(\w+).*Event$/);
    return match ? match[1] : 'Unknown';
  }
}