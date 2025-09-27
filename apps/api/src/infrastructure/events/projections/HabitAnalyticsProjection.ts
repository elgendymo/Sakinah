import { injectable } from 'tsyringe';
import Database from 'better-sqlite3';
import { join } from 'path';
import { StoredEvent } from '@/domain/events/EventStore';
import { logger } from '@/shared/logger';

interface HabitAnalytics {
  userId: string;
  habitId: string;
  habitTitle: string;
  totalCompletions: number;
  currentStreak: number;
  longestStreak: number;
  averageCompletionTime?: string;
  completionRate: number;
  lastCompletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface DailyHabitStats {
  date: string; // YYYY-MM-DD format
  userId: string;
  habitsCompleted: number;
  totalHabits: number;
  completionRate: number;
  spiritualMoments: number; // Count of spiritual milestones reached
  updatedAt: Date;
}

interface UserSpiritalJourney {
  userId: string;
  totalDaysActive: number;
  longestActiveStreak: number;
  currentActiveStreak: number;
  totalHabitsCreated: number;
  totalCompletions: number;
  milestonesReached: number;
  favoriteHabitType?: string;
  mostActiveTimeOfDay?: string;
  spiritualGrowthScore: number; // 0-100 based on various factors
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

@injectable()
export class HabitAnalyticsProjection {
  private db: Database.Database;
  private projectionName = 'HabitAnalyticsProjection';

  constructor() {
    this.db = this.initializeConnection();
    this.initializeSchema();
  }

  private initializeConnection(): Database.Database {
    const dbPath = process.env.ANALYTICS_DB_PATH || './data/analytics.sqlite';
    const fullPath = join(process.cwd(), dbPath);
    return new Database(fullPath);
  }

  private initializeSchema(): void {
    // Habit analytics table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS habit_analytics (
        id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
        user_id TEXT NOT NULL,
        habit_id TEXT NOT NULL,
        habit_title TEXT NOT NULL,
        total_completions INTEGER NOT NULL DEFAULT 0,
        current_streak INTEGER NOT NULL DEFAULT 0,
        longest_streak INTEGER NOT NULL DEFAULT 0,
        average_completion_time TEXT,
        completion_rate REAL NOT NULL DEFAULT 0.0,
        last_completed_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(user_id, habit_id)
      );
    `);

    // Daily habit statistics table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS daily_habit_stats (
        id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
        date TEXT NOT NULL,
        user_id TEXT NOT NULL,
        habits_completed INTEGER NOT NULL DEFAULT 0,
        total_habits INTEGER NOT NULL DEFAULT 0,
        completion_rate REAL NOT NULL DEFAULT 0.0,
        spiritual_moments INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL,
        UNIQUE(date, user_id)
      );
    `);

    // User spiritual journey table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_spiritual_journey (
        user_id TEXT PRIMARY KEY,
        total_days_active INTEGER NOT NULL DEFAULT 0,
        longest_active_streak INTEGER NOT NULL DEFAULT 0,
        current_active_streak INTEGER NOT NULL DEFAULT 0,
        total_habits_created INTEGER NOT NULL DEFAULT 0,
        total_completions INTEGER NOT NULL DEFAULT 0,
        milestones_reached INTEGER NOT NULL DEFAULT 0,
        favorite_habit_type TEXT,
        most_active_time_of_day TEXT,
        spiritual_growth_score REAL NOT NULL DEFAULT 0.0,
        last_activity_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    // Indexes for performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_habit_analytics_user_id ON habit_analytics(user_id);
      CREATE INDEX IF NOT EXISTS idx_habit_analytics_habit_id ON habit_analytics(habit_id);
      CREATE INDEX IF NOT EXISTS idx_daily_habit_stats_date ON daily_habit_stats(date);
      CREATE INDEX IF NOT EXISTS idx_daily_habit_stats_user_id ON daily_habit_stats(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_journey_last_activity ON user_spiritual_journey(last_activity_at);
    `);

    logger.info('Habit analytics projection schema initialized');
  }

  async processEvent(event: StoredEvent): Promise<void> {
    try {
      switch (event.eventType) {
        case 'HabitCreatedEvent':
          await this.handleHabitCreated(event);
          break;
        case 'HabitCompletedEvent':
          await this.handleHabitCompleted(event);
          break;
        case 'HabitStreakBrokenEvent':
          await this.handleStreakBroken(event);
          break;
        case 'HabitMilestoneReachedEvent':
          await this.handleMilestoneReached(event);
          break;
        default:
          // Ignore events we don't handle
          break;
      }
    } catch (error) {
      logger.error(`Error processing event ${event.eventType} in HabitAnalyticsProjection:`, error);
      throw error;
    }
  }

  private async handleHabitCreated(event: StoredEvent): Promise<void> {
    const { habitId, userId, title } = event.eventData;

    const transaction = this.db.transaction(() => {
      // Initialize habit analytics
      const habitStmt = this.db.prepare(`
        INSERT OR IGNORE INTO habit_analytics (
          user_id, habit_id, habit_title, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?)
      `);

      habitStmt.run(
        userId,
        habitId,
        title,
        event.occurredAt.toISOString(),
        event.occurredAt.toISOString()
      );

      // Update user spiritual journey
      this.updateUserJourney(userId, event.occurredAt, 'habit_created');
    });

    transaction();
    logger.debug(`Processed HabitCreatedEvent for habit ${habitId}`);
  }

  private async handleHabitCompleted(event: StoredEvent): Promise<void> {
    const { habitId, userId, completionDate, streakCount } = event.eventData;
    const completionDateObj = new Date(completionDate);

    const transaction = this.db.transaction(() => {
      // Update habit analytics
      const updateHabitStmt = this.db.prepare(`
        UPDATE habit_analytics SET
          total_completions = total_completions + 1,
          current_streak = ?,
          longest_streak = MAX(longest_streak, ?),
          completion_rate = CAST(total_completions + 1 AS REAL) /
            (julianday('now') - julianday(created_at) + 1) * 100,
          last_completed_at = ?,
          updated_at = ?
        WHERE user_id = ? AND habit_id = ?
      `);

      updateHabitStmt.run(
        streakCount,
        streakCount,
        completionDateObj.toISOString(),
        event.occurredAt.toISOString(),
        userId,
        habitId
      );

      // Update daily stats
      this.updateDailyStats(userId, completionDateObj, 'completion');

      // Update user spiritual journey
      this.updateUserJourney(userId, event.occurredAt, 'completion');
    });

    transaction();
    logger.debug(`Processed HabitCompletedEvent for habit ${habitId}`);
  }

  private async handleStreakBroken(event: StoredEvent): Promise<void> {
    const { habitId, userId, previousStreak } = event.eventData;

    const transaction = this.db.transaction(() => {
      // Update habit analytics - reset current streak
      const updateStmt = this.db.prepare(`
        UPDATE habit_analytics SET
          current_streak = 0,
          longest_streak = MAX(longest_streak, ?),
          updated_at = ?
        WHERE user_id = ? AND habit_id = ?
      `);

      updateStmt.run(
        previousStreak,
        event.occurredAt.toISOString(),
        userId,
        habitId
      );

      // Update user spiritual journey
      this.updateUserJourney(userId, event.occurredAt, 'streak_broken');
    });

    transaction();
    logger.debug(`Processed HabitStreakBrokenEvent for habit ${habitId}`);
  }

  private async handleMilestoneReached(event: StoredEvent): Promise<void> {
    const { habitId, userId, milestoneType } = event.eventData;

    const transaction = this.db.transaction(() => {
      // Update daily stats with spiritual moment
      this.updateDailyStats(userId, event.occurredAt, 'milestone');

      // Update user spiritual journey
      this.updateUserJourney(userId, event.occurredAt, 'milestone');
    });

    transaction();
    logger.debug(`Processed HabitMilestoneReachedEvent: ${milestoneType} for habit ${habitId}`);
  }

  private updateDailyStats(userId: string, date: Date, action: 'completion' | 'milestone'): void {
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD

    const updateStmt = this.db.prepare(`
      INSERT INTO daily_habit_stats (date, user_id, habits_completed, spiritual_moments, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(date, user_id) DO UPDATE SET
        habits_completed = habits_completed + ?,
        spiritual_moments = spiritual_moments + ?,
        completion_rate = CAST(habits_completed AS REAL) / NULLIF(total_habits, 0) * 100,
        updated_at = ?
    `);

    const habitsIncrement = action === 'completion' ? 1 : 0;
    const milestonesIncrement = action === 'milestone' ? 1 : 0;

    updateStmt.run(
      dateStr,
      userId,
      habitsIncrement,
      milestonesIncrement,
      date.toISOString(),
      habitsIncrement,
      milestonesIncrement,
      date.toISOString()
    );
  }

  private updateUserJourney(userId: string, eventDate: Date, action: string): void {
    const updateStmt = this.db.prepare(`
      INSERT INTO user_spiritual_journey (
        user_id, total_days_active, total_habits_created, total_completions,
        milestones_reached, last_activity_at, created_at, updated_at
      )
      VALUES (?, 1, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        total_days_active = CASE
          WHEN date(last_activity_at) != date(?) THEN total_days_active + 1
          ELSE total_days_active
        END,
        total_habits_created = total_habits_created + ?,
        total_completions = total_completions + ?,
        milestones_reached = milestones_reached + ?,
        spiritual_growth_score = CASE
          WHEN total_completions + ? > 0 THEN
            MIN(100, (total_completions + ?) * 0.5 + milestones_reached * 2)
          ELSE spiritual_growth_score
        END,
        last_activity_at = ?,
        updated_at = ?
    `);

    const habitsCreated = action === 'habit_created' ? 1 : 0;
    const completions = action === 'completion' ? 1 : 0;
    const milestones = action === 'milestone' ? 1 : 0;

    updateStmt.run(
      userId,
      habitsCreated,
      completions,
      milestones,
      eventDate.toISOString(),
      eventDate.toISOString(),
      eventDate.toISOString(),
      eventDate.toISOString(),
      habitsCreated,
      completions,
      milestones,
      completions,
      completions,
      eventDate.toISOString(),
      eventDate.toISOString()
    );
  }

  // Query methods for analytics

  async getHabitAnalytics(userId: string, habitId?: string): Promise<HabitAnalytics[]> {
    let query = 'SELECT * FROM habit_analytics WHERE user_id = ?';
    const params: any[] = [userId];

    if (habitId) {
      query += ' AND habit_id = ?';
      params.push(habitId);
    }

    query += ' ORDER BY total_completions DESC';

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];

    return rows.map(row => ({
      userId: row.user_id,
      habitId: row.habit_id,
      habitTitle: row.habit_title,
      totalCompletions: row.total_completions,
      currentStreak: row.current_streak,
      longestStreak: row.longest_streak,
      averageCompletionTime: row.average_completion_time,
      completionRate: row.completion_rate,
      lastCompletedAt: row.last_completed_at ? new Date(row.last_completed_at) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }));
  }

  async getDailyStats(userId: string, fromDate?: Date, toDate?: Date): Promise<DailyHabitStats[]> {
    let query = 'SELECT * FROM daily_habit_stats WHERE user_id = ?';
    const params: any[] = [userId];

    if (fromDate) {
      query += ' AND date >= ?';
      params.push(fromDate.toISOString().split('T')[0]);
    }

    if (toDate) {
      query += ' AND date <= ?';
      params.push(toDate.toISOString().split('T')[0]);
    }

    query += ' ORDER BY date DESC';

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];

    return rows.map(row => ({
      date: row.date,
      userId: row.user_id,
      habitsCompleted: row.habits_completed,
      totalHabits: row.total_habits,
      completionRate: row.completion_rate,
      spiritualMoments: row.spiritual_moments,
      updatedAt: new Date(row.updated_at)
    }));
  }

  async getUserSpiritalJourney(userId: string): Promise<UserSpiritalJourney | null> {
    const stmt = this.db.prepare('SELECT * FROM user_spiritual_journey WHERE user_id = ?');
    const row = stmt.get(userId) as any;

    if (!row) return null;

    return {
      userId: row.user_id,
      totalDaysActive: row.total_days_active,
      longestActiveStreak: row.longest_active_streak,
      currentActiveStreak: row.current_active_streak,
      totalHabitsCreated: row.total_habits_created,
      totalCompletions: row.total_completions,
      milestonesReached: row.milestones_reached,
      favoriteHabitType: row.favorite_habit_type,
      mostActiveTimeOfDay: row.most_active_time_of_day,
      spiritualGrowthScore: row.spiritual_growth_score,
      lastActivityAt: new Date(row.last_activity_at),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  getProjectionName(): string {
    return this.projectionName;
  }
}