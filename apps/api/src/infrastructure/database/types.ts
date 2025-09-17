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

// Common result wrapper for unified error handling
export interface DatabaseResult<T> {
  data: T | null;
  error: { message: string } | null;
}

// Database row types (snake_case from database)
export interface UserRow {
  id: string;
  handle: string | null;
  created_at: string;
}

export interface ProfileRow {
  user_id: string;
  display_name: string;
  timezone: string;
  created_at: string;
}

export interface ContentSnippetRow {
  id: string;
  type: 'ayah' | 'hadith' | 'dua' | 'note';
  text: string;
  ref: string;
  tags: string[];
  created_at: string;
}

export interface PlanRow {
  id: string;
  user_id: string;
  kind: 'takhliyah' | 'tahliyah';
  target: string;
  micro_habits: any;
  dua_ids: string[] | null;
  content_ids: string[] | null;
  status: 'active' | 'archived';
  created_at: string;
}

export interface HabitRow {
  id: string;
  user_id: string;
  plan_id: string;
  title: string;
  schedule: any;
  streak_count: number;
  last_completed_on: string | null;
  created_at: string;
}

export interface HabitCompletionRow {
  id: string;
  habit_id: string;
  user_id: string;
  completed_on: string;
}

export interface CheckinRow {
  id: string;
  user_id: string;
  date: string;
  mood: number | null;
  intention: string | null;
  reflection: string | null;
  created_at: string;
}

export interface JournalRow {
  id: string;
  user_id: string;
  content: string;
  tags: string[] | null;
  created_at: string;
}

// Unified interface for all database operations
export interface IDatabaseClient {
  // User operations
  getUserById(id: string): Promise<DatabaseResult<User | null>>;
  createUser(data: { id?: string; handle?: string }): Promise<DatabaseResult<User>>;

  // Profile operations
  getProfileByUserId(userId: string): Promise<DatabaseResult<Profile | null>>;
  createProfile(data: {
    userId: string;
    displayName: string;
    timezone?: string;
  }): Promise<DatabaseResult<Profile>>;
  updateProfile(
    userId: string,
    updates: { displayName?: string; timezone?: string }
  ): Promise<DatabaseResult<Profile>>;

  // Content operations
  getContentSnippetById(id: string): Promise<DatabaseResult<ContentSnippet | null>>;
  getContentSnippetsByTags(tags: string[]): Promise<DatabaseResult<ContentSnippet[]>>;
  getAllContentSnippets(): Promise<DatabaseResult<ContentSnippet[]>>;

  // Plan operations
  createPlan(data: {
    userId: string;
    kind: 'takhliyah' | 'tahliyah';
    target: string;
    microHabits: any;
    duaIds?: string[];
    contentIds?: string[];
  }): Promise<DatabaseResult<Plan>>;
  getPlansByUserId(userId: string): Promise<DatabaseResult<Plan[]>>;
  getPlanById(id: string): Promise<DatabaseResult<Plan | null>>;
  updatePlanStatus(id: string, status: 'active' | 'archived'): Promise<DatabaseResult<Plan>>;

  // Habit operations
  createHabit(data: {
    userId: string;
    planId: string;
    title: string;
    schedule: any;
  }): Promise<DatabaseResult<Habit>>;
  getHabitsByUserId(userId: string): Promise<DatabaseResult<Habit[]>>;
  getHabitById(id: string): Promise<DatabaseResult<Habit | null>>;
  updateHabitStreak(
    id: string,
    streakCount: number,
    lastCompletedOn?: string
  ): Promise<DatabaseResult<Habit>>;

  // Habit completion operations
  createHabitCompletion(data: {
    habitId: string;
    userId: string;
    completedOn: string;
  }): Promise<DatabaseResult<HabitCompletion>>;
  getHabitCompletionsByHabit(habitId: string): Promise<DatabaseResult<HabitCompletion[]>>;
  getHabitCompletionByDate(
    habitId: string,
    userId: string,
    completedOn: string
  ): Promise<DatabaseResult<HabitCompletion | null>>;
  deleteHabitCompletion(id: string): Promise<DatabaseResult<void>>;

  // Checkin operations
  createCheckin(data: {
    userId: string;
    date: string;
    mood?: number;
    intention?: string;
    reflection?: string;
  }): Promise<DatabaseResult<Checkin>>;
  getCheckinByDate(userId: string, date: string): Promise<DatabaseResult<Checkin | null>>;
  updateCheckin(
    id: string,
    userId: string,
    updates: {
      mood?: number;
      intention?: string;
      reflection?: string;
    }
  ): Promise<DatabaseResult<Checkin>>;

  // Journal operations
  createJournalEntry(data: {
    userId: string;
    content: string;
    tags?: string[];
  }): Promise<DatabaseResult<JournalEntry>>;
  getJournalsByUserId(userId: string, search?: string): Promise<DatabaseResult<JournalEntry[]>>;
  getJournalById(id: string): Promise<DatabaseResult<JournalEntry | null>>;
  updateJournal(
    id: string,
    userId: string,
    updates: { content?: string; tags?: string[] }
  ): Promise<DatabaseResult<JournalEntry>>;
  deleteJournal(id: string, userId: string): Promise<DatabaseResult<void>>;

  // Health & cleanup
  healthCheck(): Promise<{
    status: 'ok' | 'error';
    database: 'sqlite' | 'supabase';
    message?: string;
  }>;
  close(): Promise<void>;
}