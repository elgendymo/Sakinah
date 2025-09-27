import { injectable, inject } from 'tsyringe';
import Database from 'better-sqlite3';
import { join } from 'path';
import { IEventStore, StoredEvent, IEventProjectionStore, EventProjection } from '@/domain/events/EventStore';
import { logger } from '@/shared/logger';

export interface IEventProjection {
  getProjectionName(): string;
  processEvent(event: StoredEvent): Promise<void>;
}

@injectable()
export class EventProjectionManager implements IEventProjectionStore {
  private db: Database.Database;
  private projections = new Map<string, IEventProjection>();
  private isRunning = false;
  private processingInterval?: NodeJS.Timeout;

  constructor(@inject('IEventStore') private eventStore: IEventStore) {
    this.db = this.initializeConnection();
    this.initializeSchema();
  }

  private initializeConnection(): Database.Database {
    const dbPath = process.env.PROJECTIONS_DB_PATH || './data/projections.sqlite';
    const fullPath = join(process.cwd(), dbPath);
    return new Database(fullPath);
  }

  private initializeSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS event_projections_state (
        projection_name TEXT PRIMARY KEY,
        last_processed_event_number INTEGER NOT NULL DEFAULT 0,
        last_processed_at TEXT DEFAULT CURRENT_TIMESTAMP,
        is_running BOOLEAN NOT NULL DEFAULT FALSE,
        error_count INTEGER NOT NULL DEFAULT 0,
        last_error TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    logger.info('Event projection manager schema initialized');
  }

  registerProjection(projection: IEventProjection): void {
    const name = projection.getProjectionName();
    this.projections.set(name, projection);

    // Initialize projection state if it doesn't exist
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO event_projections_state (projection_name)
      VALUES (?)
    `);
    stmt.run(name);

    logger.info(`Registered projection: ${name}`);
  }

  async startProjections(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Event projection manager is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting event projection manager');

    // Mark all projections as running
    for (const projectionName of this.projections.keys()) {
      await this.markProjectionAsRunning(projectionName);
    }

    // Start processing events
    this.processingInterval = setInterval(() => {
      this.processEventsForAllProjections().catch(error => {
        logger.error('Error in projection processing cycle:', error);
      });
    }, 1000); // Process every second

    // Initial processing
    this.processEventsForAllProjections();
  }

  async stopProjections(): Promise<void> {
    if (!this.isRunning) {
      logger.warn('Event projection manager is not running');
      return;
    }

    this.isRunning = false;
    logger.info('Stopping event projection manager');

    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = undefined;
    }

    // Mark all projections as stopped
    for (const projectionName of this.projections.keys()) {
      await this.markProjectionAsStopped(projectionName);
    }
  }

  private async processEventsForAllProjections(): Promise<void> {
    for (const [projectionName, projection] of this.projections) {
      try {
        await this.processEventsForProjection(projectionName, projection);
      } catch (error) {
        logger.error(`Error processing events for projection ${projectionName}:`, error);
        await this.markProjectionAsStopped(projectionName, error.message);
      }
    }
  }

  private async processEventsForProjection(
    projectionName: string,
    projection: IEventProjection
  ): Promise<void> {
    const state = await this.getProjectionState(projectionName);
    if (!state || !state.isRunning) {
      return;
    }

    // Read events from the last processed position
    const batchSize = 100;
    const events = await this.eventStore.readAllEvents(state.lastProcessedEventNumber, batchSize);

    if (events.length === 0) {
      return; // No new events to process
    }

    logger.debug(`Processing ${events.length} events for projection ${projectionName}`);

    let lastProcessedEventNumber = state.lastProcessedEventNumber;
    let errorCount = state.errorCount;

    for (const event of events) {
      try {
        await projection.processEvent(event);
        lastProcessedEventNumber = Math.max(lastProcessedEventNumber, this.getEventRowId(event));
      } catch (error) {
        errorCount++;
        logger.error(`Error processing event ${event.id} in projection ${projectionName}:`, error);

        if (errorCount >= 10) {
          // Stop projection after too many errors
          await this.markProjectionAsStopped(projectionName, `Too many errors: ${error.message}`);
          return;
        }
      }
    }

    // Update projection state
    await this.updateProjectionState(projectionName, lastProcessedEventNumber, errorCount);
  }

  private getEventRowId(event: StoredEvent): number {
    // In SQLite, we can use the rowid as the event number
    // This is a simplification - in a real system you might have a dedicated sequence
    return parseInt(event.id, 16) % 1000000; // Simple hash to get a number
  }

  // IEventProjectionStore implementation

  async saveProjectionState(projection: EventProjection): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO event_projections_state (
        projection_name, last_processed_event_number, last_processed_at,
        is_running, error_count, last_error, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      projection.projectionName,
      projection.lastProcessedEventNumber,
      projection.lastProcessedAt.toISOString(),
      projection.isRunning,
      projection.errorCount,
      projection.lastError,
      new Date().toISOString()
    );
  }

  async getProjectionState(projectionName: string): Promise<EventProjection | null> {
    const stmt = this.db.prepare(`
      SELECT * FROM event_projections_state WHERE projection_name = ?
    `);

    const row = stmt.get(projectionName) as any;
    if (!row) return null;

    return {
      projectionName: row.projection_name,
      lastProcessedEventNumber: row.last_processed_event_number,
      lastProcessedAt: new Date(row.last_processed_at),
      isRunning: row.is_running,
      errorCount: row.error_count,
      lastError: row.last_error
    };
  }

  async getAllProjections(): Promise<EventProjection[]> {
    const stmt = this.db.prepare('SELECT * FROM event_projections_state ORDER BY projection_name');
    const rows = stmt.all() as any[];

    return rows.map(row => ({
      projectionName: row.projection_name,
      lastProcessedEventNumber: row.last_processed_event_number,
      lastProcessedAt: new Date(row.last_processed_at),
      isRunning: row.is_running,
      errorCount: row.error_count,
      lastError: row.last_error
    }));
  }

  async markProjectionAsRunning(projectionName: string): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE event_projections_state SET
        is_running = TRUE,
        updated_at = ?
      WHERE projection_name = ?
    `);

    stmt.run(new Date().toISOString(), projectionName);
    logger.debug(`Marked projection ${projectionName} as running`);
  }

  async markProjectionAsStopped(projectionName: string, error?: string): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE event_projections_state SET
        is_running = FALSE,
        last_error = ?,
        error_count = CASE WHEN ? IS NOT NULL THEN error_count + 1 ELSE error_count END,
        updated_at = ?
      WHERE projection_name = ?
    `);

    stmt.run(error || null, error, new Date().toISOString(), projectionName);
    logger.debug(`Marked projection ${projectionName} as stopped`);
  }

  private async updateProjectionState(
    projectionName: string,
    lastProcessedEventNumber: number,
    errorCount: number
  ): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE event_projections_state SET
        last_processed_event_number = ?,
        last_processed_at = ?,
        error_count = ?,
        updated_at = ?
      WHERE projection_name = ?
    `);

    stmt.run(
      lastProcessedEventNumber,
      new Date().toISOString(),
      errorCount,
      new Date().toISOString(),
      projectionName
    );
  }

  // Management methods

  async resetProjection(projectionName: string): Promise<void> {
    if (!this.projections.has(projectionName)) {
      throw new Error(`Projection ${projectionName} not found`);
    }

    const stmt = this.db.prepare(`
      UPDATE event_projections_state SET
        last_processed_event_number = 0,
        last_processed_at = ?,
        error_count = 0,
        last_error = NULL,
        updated_at = ?
      WHERE projection_name = ?
    `);

    stmt.run(new Date().toISOString(), new Date().toISOString(), projectionName);
    logger.info(`Reset projection ${projectionName}`);
  }

  async getProjectionStatus(): Promise<{
    isRunning: boolean;
    registeredProjections: number;
    activeProjections: number;
    totalEventsProcessed: number;
  }> {
    const projections = await this.getAllProjections();
    const activeProjections = projections.filter(p => p.isRunning).length;
    const totalEventsProcessed = projections.reduce((sum, p) => sum + p.lastProcessedEventNumber, 0);

    return {
      isRunning: this.isRunning,
      registeredProjections: this.projections.size,
      activeProjections,
      totalEventsProcessed
    };
  }

  isProjectionManagerRunning(): boolean {
    return this.isRunning;
  }
}