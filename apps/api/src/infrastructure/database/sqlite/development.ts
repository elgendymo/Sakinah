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
import { DatabaseResult } from '../types';

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
    const testUserId = 'test-user-123';
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

  async getJournalsByUserId(userId: string): Promise<DatabaseResult<JournalEntry[]>> {
    try {
      const rows = this.db.prepare('SELECT * FROM journals WHERE user_id = ? ORDER BY created_at DESC').all(userId) as any[];
      const results = rows.map(row => {
        row.tags = JSON.parse(row.tags || '[]');
        return this.mapJournalRow(row)!;
      });
      return this.formatSuccessResult(results);
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

  // Health & cleanup
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