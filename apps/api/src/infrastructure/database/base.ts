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
import {
  IDatabaseClient,
  DatabaseResult,
  UserRow,
  ProfileRow,
  ContentSnippetRow,
  PlanRow,
  HabitRow,
  HabitCompletionRow,
  CheckinRow,
  JournalRow,
} from './types';

export abstract class BaseDatabaseClient implements IDatabaseClient {
  // Common result formatters
  protected formatResult<T>(data: T | null, error?: Error): DatabaseResult<T> {
    if (error) {
      return { data: null, error: { message: error.message } };
    }
    return { data, error: null };
  }

  protected formatSuccessResult<T>(data: T): DatabaseResult<T> {
    return { data, error: null };
  }

  protected formatErrorResult<T>(message: string): DatabaseResult<T> {
    return { data: null, error: { message } };
  }

  // Common data mappers (handles snake_case ↔ camelCase)
  protected mapUserRow(row: UserRow | null): User | null {
    if (!row) return null;
    return {
      id: row.id,
      handle: row.handle ?? undefined,
      createdAt: row.created_at,
    };
  }

  protected mapProfileRow(row: ProfileRow | null): Profile | null {
    if (!row) return null;
    return {
      userId: row.user_id,
      displayName: row.display_name,
      timezone: row.timezone,
      createdAt: row.created_at,
    };
  }

  protected mapContentSnippetRow(row: ContentSnippetRow | null): ContentSnippet | null {
    if (!row) return null;
    return {
      id: row.id,
      type: row.type,
      text: row.text,
      ref: row.ref,
      tags: row.tags,
      createdAt: row.created_at,
    };
  }

  protected mapPlanRow(row: PlanRow | null): Plan | null {
    if (!row) return null;
    return {
      id: row.id,
      userId: row.user_id,
      kind: row.kind,
      target: row.target,
      microHabits: row.micro_habits,
      duaIds: row.dua_ids ?? undefined,
      contentIds: row.content_ids ?? undefined,
      status: row.status,
      createdAt: row.created_at,
    };
  }

  protected mapHabitRow(row: HabitRow | null): Habit | null {
    if (!row) return null;
    return {
      id: row.id,
      userId: row.user_id,
      planId: row.plan_id,
      title: row.title,
      schedule: row.schedule,
      streakCount: row.streak_count,
      lastCompletedOn: row.last_completed_on ?? undefined,
      createdAt: row.created_at,
    };
  }

  protected mapHabitCompletionRow(row: HabitCompletionRow | null): HabitCompletion | null {
    if (!row) return null;
    return {
      id: row.id,
      habitId: row.habit_id,
      userId: row.user_id,
      completedOn: row.completed_on,
    };
  }

  protected mapCheckinRow(row: CheckinRow | null): Checkin | null {
    if (!row) return null;
    return {
      id: row.id,
      userId: row.user_id,
      date: row.date,
      mood: row.mood ?? undefined,
      intention: row.intention ?? undefined,
      reflection: row.reflection ?? undefined,
      createdAt: row.created_at,
    };
  }

  protected mapJournalRow(row: JournalRow | null): JournalEntry | null {
    if (!row) return null;
    return {
      id: row.id,
      userId: row.user_id,
      content: row.content,
      tags: row.tags ?? undefined,
      createdAt: row.created_at,
    };
  }

  // Helper to generate UUIDs (for SQLite)
  protected generateId(): string {
    return crypto.randomUUID();
  }

  // Helper to get current timestamp
  protected getCurrentTimestamp(): string {
    return new Date().toISOString();
  }

  // All methods declared as abstract - must be implemented by subclasses
  abstract getUserById(id: string): Promise<DatabaseResult<User | null>>;
  abstract createUser(data: { id?: string; handle?: string }): Promise<DatabaseResult<User>>;

  abstract getProfileByUserId(userId: string): Promise<DatabaseResult<Profile | null>>;
  abstract createProfile(data: {
    userId: string;
    displayName: string;
    timezone?: string;
  }): Promise<DatabaseResult<Profile>>;
  abstract updateProfile(
    userId: string,
    updates: { displayName?: string; timezone?: string }
  ): Promise<DatabaseResult<Profile>>;

  abstract getContentSnippetById(id: string): Promise<DatabaseResult<ContentSnippet | null>>;
  abstract getContentSnippetsByTags(tags: string[]): Promise<DatabaseResult<ContentSnippet[]>>;
  abstract getAllContentSnippets(): Promise<DatabaseResult<ContentSnippet[]>>;

  abstract createPlan(data: {
    userId: string;
    kind: 'takhliyah' | 'tahliyah';
    target: string;
    microHabits: any;
    duaIds?: string[];
    contentIds?: string[];
  }): Promise<DatabaseResult<Plan>>;
  abstract getPlansByUserId(userId: string): Promise<DatabaseResult<Plan[]>>;
  abstract getPlanById(id: string): Promise<DatabaseResult<Plan | null>>;
  abstract updatePlanStatus(id: string, status: 'active' | 'archived'): Promise<DatabaseResult<Plan>>;

  abstract createHabit(data: {
    userId: string;
    planId: string;
    title: string;
    schedule: any;
  }): Promise<DatabaseResult<Habit>>;
  abstract getHabitsByUserId(userId: string): Promise<DatabaseResult<Habit[]>>;
  abstract getHabitById(id: string): Promise<DatabaseResult<Habit | null>>;
  abstract updateHabitStreak(
    id: string,
    streakCount: number,
    lastCompletedOn?: string
  ): Promise<DatabaseResult<Habit>>;

  abstract createHabitCompletion(data: {
    habitId: string;
    userId: string;
    completedOn: string;
  }): Promise<DatabaseResult<HabitCompletion>>;
  abstract getHabitCompletionsByHabit(habitId: string): Promise<DatabaseResult<HabitCompletion[]>>;
  abstract getHabitCompletionByDate(
    habitId: string,
    userId: string,
    completedOn: string
  ): Promise<DatabaseResult<HabitCompletion | null>>;
  abstract deleteHabitCompletion(id: string): Promise<DatabaseResult<void>>;

  abstract createCheckin(data: {
    userId: string;
    date: string;
    mood?: number;
    intention?: string;
    reflection?: string;
  }): Promise<DatabaseResult<Checkin>>;
  abstract getCheckinByDate(userId: string, date: string): Promise<DatabaseResult<Checkin | null>>;
  abstract updateCheckin(
    id: string,
    userId: string,
    updates: {
      mood?: number;
      intention?: string;
      reflection?: string;
    }
  ): Promise<DatabaseResult<Checkin>>;

  abstract createJournalEntry(data: {
    userId: string;
    content: string;
    tags?: string[];
  }): Promise<DatabaseResult<JournalEntry>>;
  abstract getJournalsByUserId(userId: string): Promise<DatabaseResult<JournalEntry[]>>;
  abstract getJournalById(id: string): Promise<DatabaseResult<JournalEntry | null>>;
  abstract updateJournal(
    id: string,
    userId: string,
    updates: { content?: string; tags?: string[] }
  ): Promise<DatabaseResult<JournalEntry>>;
  abstract deleteJournal(id: string, userId: string): Promise<DatabaseResult<void>>;

  abstract healthCheck(): Promise<{
    status: 'ok' | 'error';
    database: 'sqlite' | 'supabase';
    message?: string;
  }>;
  abstract close(): Promise<void>;
}