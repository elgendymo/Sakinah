import Database from 'better-sqlite3';
import { join } from 'path';
import { readFileSync } from 'fs';
import {
  User,
  Profile,
  ContentSnippet,
  Plan,
  Habit,
  HabitCompletion,
  Checkin,
  JournalEntry,
} from '@sakinah/types';
import { BaseDatabaseClient } from '../base';
import { DatabaseResult, UserPreferencesData, UserPreferencesRow, OnboardingData, OnboardingRow } from '../types';

export class DevelopmentDatabaseClient extends BaseDatabaseClient {
  private sqliteDb: Database.Database | null = null;

  private get db(): Database.Database {
    if (!this.sqliteDb) {
      this.sqliteDb = this.initializeSQLiteConnection();
    }
    return this.sqliteDb;
  }

  private initializeSQLiteConnection(): Database.Database {
    const dbPath = process.env.DATABASE_PATH || './data/sakinah.sqlite';
    const fullPath = join(process.cwd(), dbPath);

    const db = new Database(fullPath);

    // Create tables from schema
    const schemaPath = join(__dirname, 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf8');
    db.exec(schema);

    // Seed data if content_snippets table is empty
    const count = db.prepare('SELECT COUNT(*) as count FROM content_snippets').get() as { count: number };
    if (count.count === 0) {
      const seedPath = join(__dirname, 'seed.sql');
      const seedData = readFileSync(seedPath, 'utf8');
      db.exec(seedData);
    }

    // Ensure test user exists for development
    const testUserId = '12345678-1234-4567-8901-123456789012';
    const existingUser = db.prepare('SELECT id FROM users WHERE id = ?').get(testUserId);
    if (!existingUser) {
      db.prepare('INSERT INTO users (id, handle, created_at) VALUES (?, ?, ?)')
        .run(testUserId, 'dev-user', this.getCurrentTimestamp());

      // Also create a profile for the test user
      db.prepare('INSERT INTO profiles (user_id, display_name, timezone, created_at) VALUES (?, ?, ?, ?)')
        .run(testUserId, 'Development User', 'UTC', this.getCurrentTimestamp());
    }

    return db;
  }

  // User operations
  async getUserById(id: string): Promise<DatabaseResult<User | null>> {
    try {
      const row = this.db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
      return this.formatSuccessResult(this.mapUserRow(row));
    } catch (error) {
      return this.formatResult(null, error as Error);
    }
  }

  async createUser(data: { id?: string; handle?: string }): Promise<DatabaseResult<User>> {
    try {
      const id = data.id || this.generateId();
      const createdAt = this.getCurrentTimestamp();

      this.db.prepare('INSERT INTO users (id, handle, created_at) VALUES (?, ?, ?)')
        .run(id, data.handle || null, createdAt);

      const user = this.db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
      return this.formatSuccessResult(this.mapUserRow(user)!);
    } catch (error) {
      return this.formatResult(null, error as Error);
    }
  }

  // Profile operations
  async getProfileByUserId(userId: string): Promise<DatabaseResult<Profile | null>> {
    try {
      const row = this.db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(userId) as any;
      return this.formatSuccessResult(this.mapProfileRow(row));
    } catch (error) {
      return this.formatResult(null, error as Error);
    }
  }

  async createProfile(data: {
    userId: string;
    displayName: string;
    timezone?: string;
  }): Promise<DatabaseResult<Profile>> {
    try {
      const createdAt = this.getCurrentTimestamp();

      this.db.prepare('INSERT INTO profiles (user_id, display_name, timezone, created_at) VALUES (?, ?, ?, ?)')
        .run(data.userId, data.displayName, data.timezone || 'UTC', createdAt);

      const profile = this.db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(data.userId) as any;
      return this.formatSuccessResult(this.mapProfileRow(profile)!);
    } catch (error) {
      return this.formatResult(null, error as Error);
    }
  }

  async updateProfile(
    userId: string,
    updates: { displayName?: string; timezone?: string }
  ): Promise<DatabaseResult<Profile>> {
    try {
      const setParts: string[] = [];
      const values: any[] = [];

      if (updates.displayName !== undefined) {
        setParts.push('display_name = ?');
        values.push(updates.displayName);
      }
      if (updates.timezone !== undefined) {
        setParts.push('timezone = ?');
        values.push(updates.timezone);
      }

      if (setParts.length === 0) {
        const profile = this.db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(userId) as any;
        return this.formatSuccessResult(this.mapProfileRow(profile)!);
      }

      values.push(userId);
      this.db.prepare(`UPDATE profiles SET ${setParts.join(', ')} WHERE user_id = ?`).run(...values);

      const profile = this.db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(userId) as any;
      return this.formatSuccessResult(this.mapProfileRow(profile)!);
    } catch (error) {
      return this.formatResult(null, error as Error);
    }
  }

  // Content operations
  async getContentSnippetById(id: string): Promise<DatabaseResult<ContentSnippet | null>> {
    try {
      const row = this.db.prepare('SELECT * FROM content_snippets WHERE id = ?').get(id) as any;
      if (row) {
        row.tags = JSON.parse(row.tags || '[]');
      }
      return this.formatSuccessResult(this.mapContentSnippetRow(row));
    } catch (error) {
      return this.formatResult(null, error as Error);
    }
  }

  async getContentSnippetsByTags(tags: string[]): Promise<DatabaseResult<ContentSnippet[]>> {
    try {
      const rows = this.db.prepare('SELECT * FROM content_snippets').all() as any[];
      const filtered = rows.filter(row => {
        const rowTags = JSON.parse(row.tags || '[]');
        return tags.some(tag => rowTags.includes(tag));
      });

      const results = filtered.map(row => {
        row.tags = JSON.parse(row.tags || '[]');
        return this.mapContentSnippetRow(row)!;
      });

      return this.formatSuccessResult(results);
    } catch (error) {
      return this.formatResult(null, error as Error);
    }
  }

  async getAllContentSnippets(): Promise<DatabaseResult<ContentSnippet[]>> {
    try {
      const rows = this.db.prepare('SELECT * FROM content_snippets ORDER BY created_at').all() as any[];
      const results = rows.map(row => {
        row.tags = JSON.parse(row.tags || '[]');
        return this.mapContentSnippetRow(row)!;
      });
      return this.formatSuccessResult(results);
    } catch (error) {
      return this.formatResult(null, error as Error);
    }
  }

  // Plan operations
  async createPlan(data: {
    userId: string;
    kind: 'takhliyah' | 'tahliyah';
    target: string;
    microHabits: any;
    duaIds?: string[];
    contentIds?: string[];
  }): Promise<DatabaseResult<Plan>> {
    try {
      const id = this.generateId();
      const createdAt = this.getCurrentTimestamp();

      this.db.prepare(`
        INSERT INTO plans (id, user_id, kind, target, micro_habits, dua_ids, content_ids, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        data.userId,
        data.kind,
        data.target,
        JSON.stringify(data.microHabits),
        JSON.stringify(data.duaIds || []),
        JSON.stringify(data.contentIds || []),
        createdAt
      );

      const plan = this.db.prepare('SELECT * FROM plans WHERE id = ?').get(id) as any;
      plan.micro_habits = JSON.parse(plan.micro_habits);
      plan.dua_ids = JSON.parse(plan.dua_ids || '[]');
      plan.content_ids = JSON.parse(plan.content_ids || '[]');

      return this.formatSuccessResult(this.mapPlanRow(plan)!);
    } catch (error) {
      return this.formatResult(null, error as Error);
    }
  }

  async getPlansByUserId(userId: string): Promise<DatabaseResult<Plan[]>> {
    try {
      const rows = this.db.prepare('SELECT * FROM plans WHERE user_id = ? ORDER BY created_at DESC').all(userId) as any[];
      const results = rows.map(row => {
        row.micro_habits = JSON.parse(row.micro_habits);
        row.dua_ids = JSON.parse(row.dua_ids || '[]');
        row.content_ids = JSON.parse(row.content_ids || '[]');
        return this.mapPlanRow(row)!;
      });
      return this.formatSuccessResult(results);
    } catch (error) {
      return this.formatResult(null, error as Error);
    }
  }

  async getPlanById(id: string): Promise<DatabaseResult<Plan | null>> {
    try {
      const row = this.db.prepare('SELECT * FROM plans WHERE id = ?').get(id) as any;
      if (row) {
        row.micro_habits = JSON.parse(row.micro_habits);
        row.dua_ids = JSON.parse(row.dua_ids || '[]');
        row.content_ids = JSON.parse(row.content_ids || '[]');
      }
      return this.formatSuccessResult(this.mapPlanRow(row));
    } catch (error) {
      return this.formatResult(null, error as Error);
    }
  }

  async updatePlanStatus(id: string, status: 'active' | 'archived'): Promise<DatabaseResult<Plan>> {
    try {
      this.db.prepare('UPDATE plans SET status = ? WHERE id = ?').run(status, id);
      const plan = this.db.prepare('SELECT * FROM plans WHERE id = ?').get(id) as any;
      plan.micro_habits = JSON.parse(plan.micro_habits);
      plan.dua_ids = JSON.parse(plan.dua_ids || '[]');
      plan.content_ids = JSON.parse(plan.content_ids || '[]');
      return this.formatSuccessResult(this.mapPlanRow(plan)!);
    } catch (error) {
      return this.formatResult(null, error as Error);
    }
  }

  // Habit operations
  async createHabit(data: {
    userId: string;
    planId: string;
    title: string;
    schedule: any;
  }): Promise<DatabaseResult<Habit>> {
    try {
      const id = this.generateId();
      const createdAt = this.getCurrentTimestamp();

      this.db.prepare(`
        INSERT INTO habits (id, user_id, plan_id, title, schedule, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, data.userId, data.planId, data.title, JSON.stringify(data.schedule), createdAt);

      const habit = this.db.prepare('SELECT * FROM habits WHERE id = ?').get(id) as any;
      habit.schedule = JSON.parse(habit.schedule);
      return this.formatSuccessResult(this.mapHabitRow(habit)!);
    } catch (error) {
      return this.formatResult(null, error as Error);
    }
  }

  async getHabitsByUserId(userId: string): Promise<DatabaseResult<Habit[]>> {
    try {
      const rows = this.db.prepare('SELECT * FROM habits WHERE user_id = ? ORDER BY created_at').all(userId) as any[];
      const results = rows.map(row => {
        row.schedule = JSON.parse(row.schedule);
        return this.mapHabitRow(row)!;
      });
      return this.formatSuccessResult(results);
    } catch (error) {
      return this.formatResult(null, error as Error);
    }
  }

  async getHabitById(id: string): Promise<DatabaseResult<Habit | null>> {
    try {
      const row = this.db.prepare('SELECT * FROM habits WHERE id = ?').get(id) as any;
      if (row) {
        row.schedule = JSON.parse(row.schedule);
      }
      return this.formatSuccessResult(this.mapHabitRow(row));
    } catch (error) {
      return this.formatResult(null, error as Error);
    }
  }

  async updateHabitStreak(
    id: string,
    streakCount: number,
    lastCompletedOn?: string
  ): Promise<DatabaseResult<Habit>> {
    try {
      this.db.prepare('UPDATE habits SET streak_count = ?, last_completed_on = ? WHERE id = ?')
        .run(streakCount, lastCompletedOn || null, id);

      const habit = this.db.prepare('SELECT * FROM habits WHERE id = ?').get(id) as any;
      habit.schedule = JSON.parse(habit.schedule);
      return this.formatSuccessResult(this.mapHabitRow(habit)!);
    } catch (error) {
      return this.formatResult(null, error as Error);
    }
  }

  // Habit completion operations
  async createHabitCompletion(data: {
    habitId: string;
    userId: string;
    completedOn: string;
  }): Promise<DatabaseResult<HabitCompletion>> {
    try {
      const id = this.generateId();

      this.db.prepare('INSERT INTO habit_completions (id, habit_id, user_id, completed_on) VALUES (?, ?, ?, ?)')
        .run(id, data.habitId, data.userId, data.completedOn);

      const completion = this.db.prepare('SELECT * FROM habit_completions WHERE id = ?').get(id) as any;
      return this.formatSuccessResult(this.mapHabitCompletionRow(completion)!);
    } catch (error) {
      return this.formatResult(null, error as Error);
    }
  }

  async getHabitCompletionsByHabit(habitId: string): Promise<DatabaseResult<HabitCompletion[]>> {
    try {
      const rows = this.db.prepare('SELECT * FROM habit_completions WHERE habit_id = ? ORDER BY completed_on').all(habitId) as any[];
      const results = rows.map(row => this.mapHabitCompletionRow(row)!);
      return this.formatSuccessResult(results);
    } catch (error) {
      return this.formatResult(null, error as Error);
    }
  }

  async getHabitCompletionByDate(
    habitId: string,
    userId: string,
    completedOn: string
  ): Promise<DatabaseResult<HabitCompletion | null>> {
    try {
      const row = this.db.prepare('SELECT * FROM habit_completions WHERE habit_id = ? AND user_id = ? AND completed_on = ?')
        .get(habitId, userId, completedOn) as any;
      return this.formatSuccessResult(this.mapHabitCompletionRow(row));
    } catch (error) {
      return this.formatResult(null, error as Error);
    }
  }

  async deleteHabitCompletion(id: string): Promise<DatabaseResult<void>> {
    try {
      this.db.prepare('DELETE FROM habit_completions WHERE id = ?').run(id);
      return this.formatSuccessResult(undefined as any);
    } catch (error) {
      return this.formatResult(null, error as Error);
    }
  }

  // Checkin operations
  async createCheckin(data: {
    userId: string;
    date: string;
    mood?: number;
    intention?: string;
    reflection?: string;
  }): Promise<DatabaseResult<Checkin>> {
    try {
      const id = this.generateId();
      const createdAt = this.getCurrentTimestamp();

      this.db.prepare(`
        INSERT INTO checkins (id, user_id, date, mood, intention, reflection, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, data.userId, data.date, data.mood || null, data.intention || null, data.reflection || null, createdAt);

      const checkin = this.db.prepare('SELECT * FROM checkins WHERE id = ?').get(id) as any;
      return this.formatSuccessResult(this.mapCheckinRow(checkin)!);
    } catch (error) {
      return this.formatResult(null, error as Error);
    }
  }

  async getCheckinByDate(userId: string, date: string): Promise<DatabaseResult<Checkin | null>> {
    try {
      const row = this.db.prepare('SELECT * FROM checkins WHERE user_id = ? AND date = ?').get(userId, date) as any;
      return this.formatSuccessResult(this.mapCheckinRow(row));
    } catch (error) {
      return this.formatResult(null, error as Error);
    }
  }

  async updateCheckin(
    id: string,
    userId: string,
    updates: {
      mood?: number;
      intention?: string;
      reflection?: string;
    }
  ): Promise<DatabaseResult<Checkin>> {
    try {
      const setParts: string[] = [];
      const values: any[] = [];

      if (updates.mood !== undefined) {
        setParts.push('mood = ?');
        values.push(updates.mood);
      }
      if (updates.intention !== undefined) {
        setParts.push('intention = ?');
        values.push(updates.intention);
      }
      if (updates.reflection !== undefined) {
        setParts.push('reflection = ?');
        values.push(updates.reflection);
      }

      if (setParts.length === 0) {
        const checkin = this.db.prepare('SELECT * FROM checkins WHERE id = ? AND user_id = ?').get(id, userId) as any;
        return this.formatSuccessResult(this.mapCheckinRow(checkin)!);
      }

      values.push(id, userId);
      this.db.prepare(`UPDATE checkins SET ${setParts.join(', ')} WHERE id = ? AND user_id = ?`).run(...values);

      const checkin = this.db.prepare('SELECT * FROM checkins WHERE id = ? AND user_id = ?').get(id, userId) as any;
      return this.formatSuccessResult(this.mapCheckinRow(checkin)!);
    } catch (error) {
      return this.formatResult(null, error as Error);
    }
  }

  async getCheckinsByUser(
    userId: string,
    filters?: {
      from?: string;
      to?: string;
      limit?: number;
      offset?: number;
      orderBy?: string;
      orderDirection?: 'ASC' | 'DESC';
    }
  ): Promise<DatabaseResult<Checkin[]>> {
    try {
      let query = 'SELECT * FROM checkins WHERE user_id = ?';
      const params: any[] = [userId];

      if (filters?.from) {
        query += ' AND date >= ?';
        params.push(filters.from);
      }
      if (filters?.to) {
        query += ' AND date <= ?';
        params.push(filters.to);
      }

      const orderBy = filters?.orderBy || 'date';
      const orderDirection = filters?.orderDirection || 'DESC';
      query += ` ORDER BY ${orderBy} ${orderDirection}`;

      if (filters?.limit) {
        query += ' LIMIT ?';
        params.push(filters.limit);
        if (filters?.offset) {
          query += ' OFFSET ?';
          params.push(filters.offset);
        }
      }

      const rows = this.db.prepare(query).all(...params) as any[];
      const checkins = rows.map(row => this.mapCheckinRow(row)).filter(Boolean) as Checkin[];
      return this.formatSuccessResult(checkins);
    } catch (error) {
      return this.formatResult(null, error as Error);
    }
  }

  async countCheckinsByUser(
    userId: string,
    filters?: {
      from?: string;
      to?: string;
    }
  ): Promise<DatabaseResult<number>> {
    try {
      let query = 'SELECT COUNT(*) as count FROM checkins WHERE user_id = ?';
      const params: any[] = [userId];

      if (filters?.from) {
        query += ' AND date >= ?';
        params.push(filters.from);
      }
      if (filters?.to) {
        query += ' AND date <= ?';
        params.push(filters.to);
      }

      const result = this.db.prepare(query).get(...params) as any;
      return this.formatSuccessResult(result.count);
    } catch (error) {
      return this.formatResult(null, error as Error);
    }
  }

  // Journal operations
  async createJournalEntry(data: {
    userId: string;
    content: string;
    tags?: string[];
  }): Promise<DatabaseResult<JournalEntry>> {
    try {
      const id = this.generateId();
      const createdAt = this.getCurrentTimestamp();

      this.db.prepare('INSERT INTO journals (id, user_id, content, tags, created_at) VALUES (?, ?, ?, ?, ?)')
        .run(id, data.userId, data.content, JSON.stringify(data.tags || []), createdAt);

      const journal = this.db.prepare('SELECT * FROM journals WHERE id = ?').get(id) as any;
      journal.tags = JSON.parse(journal.tags || '[]');
      return this.formatSuccessResult(this.mapJournalRow(journal)!);
    } catch (error) {
      return this.formatResult(null, error as Error);
    }
  }

  async getJournalsByUserId(
    userId: string,
    filters?: {
      search?: string;
      tags?: string[];
      page?: number;
      limit?: number;
      sortBy?: 'createdAt' | 'content';
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<DatabaseResult<{ entries: JournalEntry[]; pagination: any }>> {
    try {
      const page = filters?.page || 1;
      const limit = filters?.limit || 20;
      const sortBy = filters?.sortBy || 'createdAt';
      const sortOrder = filters?.sortOrder || 'desc';
      const offset = (page - 1) * limit;

      // Build the base query
      let whereClause = 'WHERE user_id = ?';
      const params: any[] = [userId];

      // Add search filter
      if (filters?.search && filters.search.trim()) {
        whereClause += ' AND (content LIKE ? OR tags LIKE ?)';
        const searchPattern = `%${filters.search.trim()}%`;
        params.push(searchPattern, searchPattern);
      }

      // Add tags filter
      if (filters?.tags && filters.tags.length > 0) {
        const tagConditions = filters.tags.map(() => 'tags LIKE ?').join(' OR ');
        whereClause += ` AND (${tagConditions})`;
        filters.tags.forEach(tag => {
          params.push(`%"${tag}"%`);
        });
      }

      // Get total count for pagination
      const countQuery = `SELECT COUNT(*) as count FROM journals ${whereClause}`;
      const countResult = this.db.prepare(countQuery).get(...params) as { count: number };
      const total = countResult.count;

      // Build main query with pagination
      const orderBy = sortBy === 'createdAt' ? 'created_at' : 'content';
      const query = `
        SELECT * FROM journals ${whereClause}
        ORDER BY ${orderBy} ${sortOrder.toUpperCase()}
        LIMIT ? OFFSET ?
      `;

      const queryParams = [...params, limit, offset];
      const rows = this.db.prepare(query).all(...queryParams) as any[];

      // Map results
      const entries = rows.map(row => {
        row.tags = JSON.parse(row.tags || '[]');
        return this.mapJournalRow(row)!;
      });

      // Calculate pagination info
      const totalPages = Math.ceil(total / limit);
      const pagination = {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      };

      return this.formatSuccessResult({ entries, pagination });
    } catch (error) {
      return this.formatResult(null, error as Error);
    }
  }

  async getJournalById(id: string): Promise<DatabaseResult<JournalEntry | null>> {
    try {
      const row = this.db.prepare('SELECT * FROM journals WHERE id = ?').get(id) as any;
      if (row) {
        row.tags = JSON.parse(row.tags || '[]');
      }
      return this.formatSuccessResult(this.mapJournalRow(row));
    } catch (error) {
      return this.formatResult(null, error as Error);
    }
  }

  async updateJournal(
    id: string,
    userId: string,
    updates: { content?: string; tags?: string[] }
  ): Promise<DatabaseResult<JournalEntry>> {
    try {
      const setParts: string[] = [];
      const values: any[] = [];

      if (updates.content !== undefined) {
        setParts.push('content = ?');
        values.push(updates.content);
      }
      if (updates.tags !== undefined) {
        setParts.push('tags = ?');
        values.push(JSON.stringify(updates.tags));
      }

      if (setParts.length === 0) {
        const journal = this.db.prepare('SELECT * FROM journals WHERE id = ? AND user_id = ?').get(id, userId) as any;
        journal.tags = JSON.parse(journal.tags || '[]');
        return this.formatSuccessResult(this.mapJournalRow(journal)!);
      }

      values.push(id, userId);
      this.db.prepare(`UPDATE journals SET ${setParts.join(', ')} WHERE id = ? AND user_id = ?`).run(...values);

      const journal = this.db.prepare('SELECT * FROM journals WHERE id = ? AND user_id = ?').get(id, userId) as any;
      journal.tags = JSON.parse(journal.tags || '[]');
      return this.formatSuccessResult(this.mapJournalRow(journal)!);
    } catch (error) {
      return this.formatResult(null, error as Error);
    }
  }

  async deleteJournal(id: string, userId: string): Promise<DatabaseResult<void>> {
    try {
      this.db.prepare('DELETE FROM journals WHERE id = ? AND user_id = ?').run(id, userId);
      return this.formatSuccessResult(undefined as any);
    } catch (error) {
      return this.formatResult(null, error as Error);
    }
  }

  // Prayer times operations
  async createPrayerTimes(data: {
    userId: string;
    latitude: number;
    longitude: number;
    city?: string;
    country?: string;
    timezone?: string;
    calculationMethod: string;
    date: string;
    fajr: string;
    sunrise: string;
    dhuhr: string;
    asr: string;
    maghrib: string;
    isha: string;
    qiyam?: string;
    hijriDate?: string;
    validUntil: string;
  }): Promise<DatabaseResult<any>> {
    try {
      const id = this.generateId();
      const createdAt = this.getCurrentTimestamp();

      this.db.prepare(`
        INSERT INTO prayer_times (
          id, user_id, latitude, longitude, city, country, timezone,
          calculation_method, date, fajr, sunrise, dhuhr, asr, maghrib, isha,
          qiyam, hijri_date, valid_until, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, data.userId, data.latitude, data.longitude, data.city || null,
        data.country || null, data.timezone || null, data.calculationMethod,
        data.date, data.fajr, data.sunrise, data.dhuhr, data.asr,
        data.maghrib, data.isha, data.qiyam || null, data.hijriDate || null,
        data.validUntil, createdAt
      );

      const prayerTimes = this.db.prepare('SELECT * FROM prayer_times WHERE id = ?').get(id) as any;
      return this.formatSuccessResult(this.mapPrayerTimesRow(prayerTimes)!);
    } catch (error) {
      return this.formatResult(null, error as Error);
    }
  }

  async getPrayerTimesById(id: string): Promise<DatabaseResult<any | null>> {
    try {
      const row = this.db.prepare('SELECT * FROM prayer_times WHERE id = ?').get(id) as any;
      return this.formatSuccessResult(this.mapPrayerTimesRow(row));
    } catch (error) {
      return this.formatResult(null, error as Error);
    }
  }

  async getPrayerTimesByUserAndDate(userId: string, date: string): Promise<DatabaseResult<any | null>> {
    try {
      const row = this.db.prepare('SELECT * FROM prayer_times WHERE user_id = ? AND date = ?').get(userId, date) as any;
      return this.formatSuccessResult(this.mapPrayerTimesRow(row));
    } catch (error) {
      return this.formatResult(null, error as Error);
    }
  }

  async getPrayerTimesByLocationAndDate(
    latitude: number,
    longitude: number,
    calculationMethod: string,
    date: string
  ): Promise<DatabaseResult<any | null>> {
    try {
      // Use a small epsilon for floating point comparison (approximately 100m accuracy)
      const epsilon = 0.001;
      const row = this.db.prepare(`
        SELECT * FROM prayer_times
        WHERE ABS(latitude - ?) < ?
          AND ABS(longitude - ?) < ?
          AND calculation_method = ?
          AND date = ?
          AND datetime(valid_until) > datetime('now')
        ORDER BY created_at DESC
        LIMIT 1
      `).get(latitude, epsilon, longitude, epsilon, calculationMethod, date) as any;

      return this.formatSuccessResult(this.mapPrayerTimesRow(row));
    } catch (error) {
      return this.formatResult(null, error as Error);
    }
  }

  async getPrayerTimesByUserAndDateRange(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<DatabaseResult<any[]>> {
    try {
      const rows = this.db.prepare(`
        SELECT * FROM prayer_times
        WHERE user_id = ? AND date >= ? AND date <= ?
        ORDER BY date ASC
      `).all(userId, startDate, endDate) as any[];

      const prayerTimesList = rows.map(row => this.mapPrayerTimesRow(row)!);
      return this.formatSuccessResult(prayerTimesList);
    } catch (error) {
      return this.formatResult(null, error as Error);
    }
  }

  async deletePrayerTimes(id: string): Promise<DatabaseResult<void>> {
    try {
      this.db.prepare('DELETE FROM prayer_times WHERE id = ?').run(id);
      return this.formatSuccessResult(undefined as any);
    } catch (error) {
      return this.formatResult(null, error as Error);
    }
  }

  async deleteExpiredPrayerTimes(): Promise<DatabaseResult<number>> {
    try {
      const result = this.db.prepare(`
        DELETE FROM prayer_times
        WHERE datetime(valid_until) < datetime('now')
      `).run();

      return this.formatSuccessResult(result.changes as any);
    } catch (error) {
      return this.formatResult(null, error as Error);
    }
  }

  private mapPrayerTimesRow(row: any): any | null {
    if (!row) return null;

    return {
      id: row.id,
      userId: row.user_id,
      location: {
        latitude: row.latitude,
        longitude: row.longitude,
        city: row.city,
        country: row.country,
        timezone: row.timezone
      },
      calculationMethod: row.calculation_method,
      date: row.date,
      prayerTimes: {
        fajr: row.fajr,
        sunrise: row.sunrise,
        dhuhr: row.dhuhr,
        asr: row.asr,
        maghrib: row.maghrib,
        isha: row.isha,
        qiyam: row.qiyam
      },
      hijriDate: row.hijri_date,
      validUntil: row.valid_until,
      createdAt: row.created_at
    };
  }

  // User preferences operations
  async getUserPreferences(userId: string): Promise<DatabaseResult<UserPreferencesData | null>> {
    try {
      const row = this.db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(userId) as UserPreferencesRow | undefined;

      if (!row) {
        return this.formatSuccessResult(null);
      }

      return this.formatSuccessResult(this.mapUserPreferencesRow(row));
    } catch (error) {
      return this.formatResult(null, error as Error);
    }
  }

  async createUserPreferences(data: UserPreferencesData): Promise<DatabaseResult<UserPreferencesData>> {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO user_preferences (
          user_id, language, location, prayer_calculation_method,
          notification_settings, privacy_settings, display_settings,
          updated_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        data.userId,
        data.language,
        data.location ? JSON.stringify(data.location) : null,
        data.prayerCalculationMethod,
        JSON.stringify(data.notificationSettings || {}),
        JSON.stringify(data.privacySettings || {}),
        JSON.stringify(data.displaySettings || {}),
        data.updatedAt || this.getCurrentTimestamp(),
        data.createdAt || this.getCurrentTimestamp()
      );

      const created = this.db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(data.userId) as UserPreferencesRow;
      return this.formatSuccessResult(this.mapUserPreferencesRow(created));
    } catch (error) {
      return this.formatResult(null, error as Error);
    }
  }

  async updateUserPreferences(userId: string, updates: Partial<UserPreferencesData>): Promise<DatabaseResult<UserPreferencesData>> {
    try {
      const current = await this.getUserPreferences(userId);
      if (!current.data) {
        return this.formatResult(null, new Error('User preferences not found'));
      }

      const merged = { ...current.data, ...updates };

      const stmt = this.db.prepare(`
        UPDATE user_preferences
        SET language = ?, location = ?, prayer_calculation_method = ?,
            notification_settings = ?, privacy_settings = ?, display_settings = ?,
            updated_at = ?
        WHERE user_id = ?
      `);

      const result = stmt.run(
        merged.language,
        merged.location ? JSON.stringify(merged.location) : null,
        merged.prayerCalculationMethod,
        JSON.stringify(merged.notificationSettings || {}),
        JSON.stringify(merged.privacySettings || {}),
        JSON.stringify(merged.displaySettings || {}),
        this.getCurrentTimestamp(),
        userId
      );

      if (result.changes === 0) {
        return this.formatResult(null, new Error('Failed to update preferences'));
      }

      const updated = this.db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(userId) as UserPreferencesRow;
      return this.formatSuccessResult(this.mapUserPreferencesRow(updated));
    } catch (error) {
      return this.formatResult(null, error as Error);
    }
  }

  async upsertUserPreferences(data: UserPreferencesData): Promise<DatabaseResult<UserPreferencesData>> {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO user_preferences (
          user_id, language, location, prayer_calculation_method,
          notification_settings, privacy_settings, display_settings,
          updated_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
          language = excluded.language,
          location = excluded.location,
          prayer_calculation_method = excluded.prayer_calculation_method,
          notification_settings = excluded.notification_settings,
          privacy_settings = excluded.privacy_settings,
          display_settings = excluded.display_settings,
          updated_at = excluded.updated_at
      `);

      const now = this.getCurrentTimestamp();
      stmt.run(
        data.userId,
        data.language,
        data.location ? JSON.stringify(data.location) : null,
        data.prayerCalculationMethod,
        JSON.stringify(data.notificationSettings || {}),
        JSON.stringify(data.privacySettings || {}),
        JSON.stringify(data.displaySettings || {}),
        now,
        data.createdAt || now
      );

      const upserted = this.db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(data.userId) as UserPreferencesRow;
      return this.formatSuccessResult(this.mapUserPreferencesRow(upserted));
    } catch (error) {
      return this.formatResult(null, error as Error);
    }
  }

  async deleteUserPreferences(userId: string): Promise<DatabaseResult<void>> {
    try {
      const result = this.db.prepare('DELETE FROM user_preferences WHERE user_id = ?').run(userId);

      if (result.changes === 0) {
        return this.formatResult(null, new Error('User preferences not found'));
      }

      return this.formatSuccessResult(undefined);
    } catch (error) {
      return this.formatResult(null, error as Error);
    }
  }

  private mapUserPreferencesRow(row: UserPreferencesRow): UserPreferencesData {
    return {
      userId: row.user_id,
      language: row.language,
      location: row.location ? JSON.parse(row.location) : undefined,
      prayerCalculationMethod: row.prayer_calculation_method,
      notificationSettings: row.notification_settings ? JSON.parse(row.notification_settings) : {},
      privacySettings: row.privacy_settings ? JSON.parse(row.privacy_settings) : {},
      displaySettings: row.display_settings ? JSON.parse(row.display_settings) : {},
      updatedAt: row.updated_at,
      createdAt: row.created_at
    };
  }

  // Health & cleanup
  // Onboarding operations
  async createOnboarding(data: {
    userId: string;
    currentStep?: string;
    completedSteps?: string[];
    profileCompletionPercentage?: number;
    dataCollected?: Record<string, any>;
    languageSelected?: string | null;
    locationSet?: boolean;
    prayerCalculationMethodSet?: boolean;
    notificationsConfigured?: boolean;
    privacyPreferencesSet?: boolean;
    displayPreferencesSet?: boolean;
    isCompleted?: boolean;
    skippedSteps?: string[];
  }): Promise<DatabaseResult<OnboardingData>> {
    try {
      const id = crypto.randomUUID();
      const stmt = this.db.prepare(`
        INSERT INTO onboarding (
          id, user_id, current_step, completed_steps, profile_completion_percentage,
          data_collected, language_selected, location_set, prayer_calculation_method_set,
          notifications_configured, privacy_preferences_set, display_preferences_set,
          is_completed, skipped_steps, started_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        id,
        data.userId,
        data.currentStep || 'welcome',
        JSON.stringify(data.completedSteps || []),
        data.profileCompletionPercentage || 0,
        JSON.stringify(data.dataCollected || {}),
        data.languageSelected || null,
        data.locationSet ? 1 : 0,
        data.prayerCalculationMethodSet ? 1 : 0,
        data.notificationsConfigured ? 1 : 0,
        data.privacyPreferencesSet ? 1 : 0,
        data.displayPreferencesSet ? 1 : 0,
        data.isCompleted ? 1 : 0,
        JSON.stringify(data.skippedSteps || []),
        this.getCurrentTimestamp(),
        this.getCurrentTimestamp()
      );

      const created = this.db.prepare('SELECT * FROM onboarding WHERE id = ?').get(id) as OnboardingRow;
      return this.formatSuccessResult(this.mapOnboardingRow(created));
    } catch (error) {
      return this.formatResult(null, error as Error);
    }
  }

  async getOnboardingByUserId(userId: string): Promise<DatabaseResult<OnboardingData | null>> {
    try {
      const row = this.db.prepare('SELECT * FROM onboarding WHERE user_id = ?').get(userId) as OnboardingRow | undefined;

      if (!row) {
        return this.formatSuccessResult(null);
      }

      return this.formatSuccessResult(this.mapOnboardingRow(row));
    } catch (error) {
      return this.formatResult(null, error as Error);
    }
  }

  async updateOnboarding(
    userId: string,
    updates: {
      currentStep?: string;
      completedSteps?: string[];
      profileCompletionPercentage?: number;
      dataCollected?: Record<string, any>;
      languageSelected?: string | null;
      locationSet?: boolean;
      prayerCalculationMethodSet?: boolean;
      notificationsConfigured?: boolean;
      privacyPreferencesSet?: boolean;
      displayPreferencesSet?: boolean;
      isCompleted?: boolean;
      skippedSteps?: string[];
      completionDate?: string | null;
    }
  ): Promise<DatabaseResult<OnboardingData>> {
    try {
      const current = await this.getOnboardingByUserId(userId);
      if (!current.data) {
        return this.formatResult(null, new Error('Onboarding record not found'));
      }

      const merged = { ...current.data, ...updates };

      const stmt = this.db.prepare(`
        UPDATE onboarding SET
          current_step = ?,
          completed_steps = ?,
          profile_completion_percentage = ?,
          data_collected = ?,
          language_selected = ?,
          location_set = ?,
          prayer_calculation_method_set = ?,
          notifications_configured = ?,
          privacy_preferences_set = ?,
          display_preferences_set = ?,
          is_completed = ?,
          skipped_steps = ?,
          completion_date = ?,
          updated_at = ?
        WHERE user_id = ?
      `);

      stmt.run(
        merged.currentStep,
        JSON.stringify(merged.completedSteps),
        merged.profileCompletionPercentage,
        JSON.stringify(merged.dataCollected),
        merged.languageSelected,
        merged.locationSet ? 1 : 0,
        merged.prayerCalculationMethodSet ? 1 : 0,
        merged.notificationsConfigured ? 1 : 0,
        merged.privacyPreferencesSet ? 1 : 0,
        merged.displayPreferencesSet ? 1 : 0,
        merged.isCompleted ? 1 : 0,
        JSON.stringify(merged.skippedSteps),
        updates.completionDate || null,
        this.getCurrentTimestamp(),
        userId
      );

      const updated = this.db.prepare('SELECT * FROM onboarding WHERE user_id = ?').get(userId) as OnboardingRow;
      return this.formatSuccessResult(this.mapOnboardingRow(updated));
    } catch (error) {
      return this.formatResult(null, error as Error);
    }
  }

  async upsertOnboarding(data: OnboardingData): Promise<DatabaseResult<OnboardingData>> {
    try {
      const existing = await this.getOnboardingByUserId(data.userId);

      if (existing.data) {
        // Update existing
        return await this.updateOnboarding(data.userId, data);
      } else {
        // Create new
        return await this.createOnboarding(data);
      }
    } catch (error) {
      return this.formatResult(null, error as Error);
    }
  }

  async deleteOnboarding(userId: string): Promise<DatabaseResult<void>> {
    try {
      const stmt = this.db.prepare('DELETE FROM onboarding WHERE user_id = ?');
      const result = stmt.run(userId);

      if (result.changes === 0) {
        return this.formatResult(null, new Error('Onboarding record not found'));
      }

      return this.formatSuccessResult(undefined);
    } catch (error) {
      return this.formatResult(null, error as Error);
    }
  }

  private mapOnboardingRow(row: OnboardingRow): OnboardingData {
    return {
      id: row.id,
      userId: row.user_id,
      currentStep: row.current_step,
      completedSteps: JSON.parse(row.completed_steps || '[]'),
      profileCompletionPercentage: row.profile_completion_percentage,
      dataCollected: JSON.parse(row.data_collected || '{}'),
      languageSelected: row.language_selected,
      locationSet: Boolean(row.location_set),
      prayerCalculationMethodSet: Boolean(row.prayer_calculation_method_set),
      notificationsConfigured: Boolean(row.notifications_configured),
      privacyPreferencesSet: Boolean(row.privacy_preferences_set),
      displayPreferencesSet: Boolean(row.display_preferences_set),
      isCompleted: Boolean(row.is_completed),
      skippedSteps: JSON.parse(row.skipped_steps || '[]'),
      completionDate: row.completion_date || null,
      startedAt: row.started_at,
      updatedAt: row.updated_at,
    };
  }

  async healthCheck(): Promise<{
    status: 'ok' | 'error';
    database: 'sqlite' | 'supabase';
    message?: string;
  }> {
    try {
      this.db.prepare('SELECT 1').get();
      return { status: 'ok', database: 'sqlite' };
    } catch (error) {
      return {
        status: 'error',
        database: 'sqlite',
        message: (error as Error).message,
      };
    }
  }

  async close(): Promise<void> {
    if (this.sqliteDb) {
      this.sqliteDb.close();
      this.sqliteDb = null;
    }
  }
}