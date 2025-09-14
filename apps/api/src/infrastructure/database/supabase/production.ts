import { createClient, SupabaseClient } from '@supabase/supabase-js';
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

export class ProductionDatabaseClient extends BaseDatabaseClient {
  private _supabaseClient: SupabaseClient | null = null;

  private get supabaseClient(): SupabaseClient {
    if (!this._supabaseClient) {
      const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!url || !key) {
        throw new Error('Supabase configuration missing. Required: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
      }

      this._supabaseClient = createClient(url, key, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
    }
    return this._supabaseClient;
  }

  // User operations
  async getUserById(id: string): Promise<DatabaseResult<User | null>> {
    try {
      const { data, error } = await this.supabaseClient
        .from('users')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) return this.formatErrorResult(error.message);
      return this.formatSuccessResult(this.mapUserRow(data));
    } catch (e) {
      return this.formatErrorResult(String(e));
    }
  }

  async createUser(userData: { id?: string; handle?: string }): Promise<DatabaseResult<User>> {
    try {
      const { data, error } = await this.supabaseClient
        .from('users')
        .insert({
          id: userData.id,
          handle: userData.handle || null,
        })
        .select()
        .single();

      if (error) return this.formatErrorResult(error.message);
      return this.formatSuccessResult(this.mapUserRow(data)!);
    } catch (e) {
      return this.formatErrorResult(String(e));
    }
  }

  // Profile operations
  async getProfileByUserId(userId: string): Promise<DatabaseResult<Profile | null>> {
    try {
      const { data, error } = await this.supabaseClient
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) return this.formatErrorResult(error.message);
      return this.formatSuccessResult(this.mapProfileRow(data));
    } catch (e) {
      return this.formatErrorResult(String(e));
    }
  }

  async createProfile(profileData: {
    userId: string;
    displayName: string;
    timezone?: string;
  }): Promise<DatabaseResult<Profile>> {
    try {
      const { data, error } = await this.supabaseClient
        .from('profiles')
        .insert({
          user_id: profileData.userId,
          display_name: profileData.displayName,
          timezone: profileData.timezone || 'UTC',
        })
        .select()
        .single();

      if (error) return this.formatErrorResult(error.message);
      return this.formatSuccessResult(this.mapProfileRow(data)!);
    } catch (e) {
      return this.formatErrorResult(String(e));
    }
  }

  async updateProfile(
    userId: string,
    updates: { displayName?: string; timezone?: string }
  ): Promise<DatabaseResult<Profile>> {
    try {
      const updateData: any = {};
      if (updates.displayName !== undefined) updateData.display_name = updates.displayName;
      if (updates.timezone !== undefined) updateData.timezone = updates.timezone;

      const { data, error } = await this.supabaseClient
        .from('profiles')
        .update(updateData)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) return this.formatErrorResult(error.message);
      return this.formatSuccessResult(this.mapProfileRow(data)!);
    } catch (e) {
      return this.formatErrorResult(String(e));
    }
  }

  // Content operations
  async getContentSnippetById(id: string): Promise<DatabaseResult<ContentSnippet | null>> {
    try {
      const { data, error } = await this.supabaseClient
        .from('content_snippets')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) return this.formatErrorResult(error.message);
      return this.formatSuccessResult(this.mapContentSnippetRow(data));
    } catch (e) {
      return this.formatErrorResult(String(e));
    }
  }

  async getContentSnippetsByTags(tags: string[]): Promise<DatabaseResult<ContentSnippet[]>> {
    try {
      const { data, error } = await this.supabaseClient
        .from('content_snippets')
        .select('*')
        .overlaps('tags', tags);

      if (error) return this.formatErrorResult(error.message);
      const results = data?.map(row => this.mapContentSnippetRow(row)!).filter(Boolean) || [];
      return this.formatSuccessResult(results);
    } catch (e) {
      return this.formatErrorResult(String(e));
    }
  }

  async getAllContentSnippets(): Promise<DatabaseResult<ContentSnippet[]>> {
    try {
      const { data, error } = await this.supabaseClient
        .from('content_snippets')
        .select('*')
        .order('created_at');

      if (error) return this.formatErrorResult(error.message);
      const results = data?.map(row => this.mapContentSnippetRow(row)!).filter(Boolean) || [];
      return this.formatSuccessResult(results);
    } catch (e) {
      return this.formatErrorResult(String(e));
    }
  }

  // Plan operations
  async createPlan(planData: {
    userId: string;
    kind: 'takhliyah' | 'tahliyah';
    target: string;
    microHabits: any;
    duaIds?: string[];
    contentIds?: string[];
  }): Promise<DatabaseResult<Plan>> {
    try {
      const { data, error } = await this.supabaseClient
        .from('plans')
        .insert({
          user_id: planData.userId,
          kind: planData.kind,
          target: planData.target,
          micro_habits: planData.microHabits,
          dua_ids: planData.duaIds || null,
          content_ids: planData.contentIds || null,
        })
        .select()
        .single();

      if (error) return this.formatErrorResult(error.message);
      return this.formatSuccessResult(this.mapPlanRow(data)!);
    } catch (e) {
      return this.formatErrorResult(String(e));
    }
  }

  async getPlansByUserId(userId: string): Promise<DatabaseResult<Plan[]>> {
    try {
      const { data, error } = await this.supabaseClient
        .from('plans')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) return this.formatErrorResult(error.message);
      const results = data?.map(row => this.mapPlanRow(row)!).filter(Boolean) || [];
      return this.formatSuccessResult(results);
    } catch (e) {
      return this.formatErrorResult(String(e));
    }
  }

  async getPlanById(id: string): Promise<DatabaseResult<Plan | null>> {
    try {
      const { data, error } = await this.supabaseClient
        .from('plans')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) return this.formatErrorResult(error.message);
      return this.formatSuccessResult(this.mapPlanRow(data));
    } catch (e) {
      return this.formatErrorResult(String(e));
    }
  }

  async updatePlanStatus(id: string, status: 'active' | 'archived'): Promise<DatabaseResult<Plan>> {
    try {
      const { data, error } = await this.supabaseClient
        .from('plans')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) return this.formatErrorResult(error.message);
      return this.formatSuccessResult(this.mapPlanRow(data)!);
    } catch (e) {
      return this.formatErrorResult(String(e));
    }
  }

  // Habit operations
  async createHabit(habitData: {
    userId: string;
    planId: string;
    title: string;
    schedule: any;
  }): Promise<DatabaseResult<Habit>> {
    try {
      const { data, error } = await this.supabaseClient
        .from('habits')
        .insert({
          user_id: habitData.userId,
          plan_id: habitData.planId,
          title: habitData.title,
          schedule: habitData.schedule,
        })
        .select()
        .single();

      if (error) return this.formatErrorResult(error.message);
      return this.formatSuccessResult(this.mapHabitRow(data)!);
    } catch (e) {
      return this.formatErrorResult(String(e));
    }
  }

  async getHabitsByUserId(userId: string): Promise<DatabaseResult<Habit[]>> {
    try {
      const { data, error } = await this.supabaseClient
        .from('habits')
        .select('*')
        .eq('user_id', userId)
        .order('created_at');

      if (error) return this.formatErrorResult(error.message);
      const results = data?.map(row => this.mapHabitRow(row)!).filter(Boolean) || [];
      return this.formatSuccessResult(results);
    } catch (e) {
      return this.formatErrorResult(String(e));
    }
  }

  async getHabitById(id: string): Promise<DatabaseResult<Habit | null>> {
    try {
      const { data, error } = await this.supabaseClient
        .from('habits')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) return this.formatErrorResult(error.message);
      return this.formatSuccessResult(this.mapHabitRow(data));
    } catch (e) {
      return this.formatErrorResult(String(e));
    }
  }

  async updateHabitStreak(
    id: string,
    streakCount: number,
    lastCompletedOn?: string
  ): Promise<DatabaseResult<Habit>> {
    try {
      const { data, error } = await this.supabaseClient
        .from('habits')
        .update({
          streak_count: streakCount,
          last_completed_on: lastCompletedOn || null,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) return this.formatErrorResult(error.message);
      return this.formatSuccessResult(this.mapHabitRow(data)!);
    } catch (e) {
      return this.formatErrorResult(String(e));
    }
  }

  // Habit completion operations
  async createHabitCompletion(completionData: {
    habitId: string;
    userId: string;
    completedOn: string;
  }): Promise<DatabaseResult<HabitCompletion>> {
    try {
      const { data, error } = await this.supabaseClient
        .from('habit_completions')
        .insert({
          habit_id: completionData.habitId,
          user_id: completionData.userId,
          completed_on: completionData.completedOn,
        })
        .select()
        .single();

      if (error) return this.formatErrorResult(error.message);
      return this.formatSuccessResult(this.mapHabitCompletionRow(data)!);
    } catch (e) {
      return this.formatErrorResult(String(e));
    }
  }

  async getHabitCompletionsByHabit(habitId: string): Promise<DatabaseResult<HabitCompletion[]>> {
    try {
      const { data, error } = await this.supabaseClient
        .from('habit_completions')
        .select('*')
        .eq('habit_id', habitId)
        .order('completed_on');

      if (error) return this.formatErrorResult(error.message);
      const results = data?.map(row => this.mapHabitCompletionRow(row)!).filter(Boolean) || [];
      return this.formatSuccessResult(results);
    } catch (e) {
      return this.formatErrorResult(String(e));
    }
  }

  async getHabitCompletionByDate(
    habitId: string,
    userId: string,
    completedOn: string
  ): Promise<DatabaseResult<HabitCompletion | null>> {
    try {
      const { data, error } = await this.supabaseClient
        .from('habit_completions')
        .select('*')
        .eq('habit_id', habitId)
        .eq('user_id', userId)
        .eq('completed_on', completedOn)
        .maybeSingle();

      if (error) return this.formatErrorResult(error.message);
      return this.formatSuccessResult(this.mapHabitCompletionRow(data));
    } catch (e) {
      return this.formatErrorResult(String(e));
    }
  }

  async deleteHabitCompletion(id: string): Promise<DatabaseResult<void>> {
    try {
      const { error } = await this.supabaseClient
        .from('habit_completions')
        .delete()
        .eq('id', id);

      if (error) return this.formatErrorResult(error.message);
      return this.formatSuccessResult(undefined as any);
    } catch (e) {
      return this.formatErrorResult(String(e));
    }
  }

  // Checkin operations
  async createCheckin(checkinData: {
    userId: string;
    date: string;
    mood?: number;
    intention?: string;
    reflection?: string;
  }): Promise<DatabaseResult<Checkin>> {
    try {
      const { data, error } = await this.supabaseClient
        .from('checkins')
        .insert({
          user_id: checkinData.userId,
          date: checkinData.date,
          mood: checkinData.mood || null,
          intention: checkinData.intention || null,
          reflection: checkinData.reflection || null,
        })
        .select()
        .single();

      if (error) return this.formatErrorResult(error.message);
      return this.formatSuccessResult(this.mapCheckinRow(data)!);
    } catch (e) {
      return this.formatErrorResult(String(e));
    }
  }

  async getCheckinByDate(userId: string, date: string): Promise<DatabaseResult<Checkin | null>> {
    try {
      const { data, error } = await this.supabaseClient
        .from('checkins')
        .select('*')
        .eq('user_id', userId)
        .eq('date', date)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') return this.formatErrorResult(error.message);
      return this.formatSuccessResult(this.mapCheckinRow(data));
    } catch (e) {
      return this.formatErrorResult(String(e));
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
      const updateData: any = {};
      if (updates.mood !== undefined) updateData.mood = updates.mood;
      if (updates.intention !== undefined) updateData.intention = updates.intention;
      if (updates.reflection !== undefined) updateData.reflection = updates.reflection;

      const { data, error } = await this.supabaseClient
        .from('checkins')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) return this.formatErrorResult(error.message);
      return this.formatSuccessResult(this.mapCheckinRow(data)!);
    } catch (e) {
      return this.formatErrorResult(String(e));
    }
  }

  // Journal operations
  async createJournalEntry(journalData: {
    userId: string;
    content: string;
    tags?: string[];
  }): Promise<DatabaseResult<JournalEntry>> {
    try {
      const { data, error } = await this.supabaseClient
        .from('journals')
        .insert({
          user_id: journalData.userId,
          content: journalData.content,
          tags: journalData.tags || null,
        })
        .select()
        .single();

      if (error) return this.formatErrorResult(error.message);
      return this.formatSuccessResult(this.mapJournalRow(data)!);
    } catch (e) {
      return this.formatErrorResult(String(e));
    }
  }

  async getJournalsByUserId(userId: string): Promise<DatabaseResult<JournalEntry[]>> {
    try {
      const { data, error } = await this.supabaseClient
        .from('journals')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) return this.formatErrorResult(error.message);
      const results = data?.map(row => this.mapJournalRow(row)!).filter(Boolean) || [];
      return this.formatSuccessResult(results);
    } catch (e) {
      return this.formatErrorResult(String(e));
    }
  }

  async getJournalById(id: string): Promise<DatabaseResult<JournalEntry | null>> {
    try {
      const { data, error } = await this.supabaseClient
        .from('journals')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) return this.formatErrorResult(error.message);
      return this.formatSuccessResult(this.mapJournalRow(data));
    } catch (e) {
      return this.formatErrorResult(String(e));
    }
  }

  async updateJournal(
    id: string,
    userId: string,
    updates: { content?: string; tags?: string[] }
  ): Promise<DatabaseResult<JournalEntry>> {
    try {
      const updateData: any = {};
      if (updates.content !== undefined) updateData.content = updates.content;
      if (updates.tags !== undefined) updateData.tags = updates.tags;

      const { data, error } = await this.supabaseClient
        .from('journals')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) return this.formatErrorResult(error.message);
      return this.formatSuccessResult(this.mapJournalRow(data)!);
    } catch (e) {
      return this.formatErrorResult(String(e));
    }
  }

  async deleteJournal(id: string, userId: string): Promise<DatabaseResult<void>> {
    try {
      const { error } = await this.supabaseClient
        .from('journals')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) return this.formatErrorResult(error.message);
      return this.formatSuccessResult(undefined as any);
    } catch (e) {
      return this.formatErrorResult(String(e));
    }
  }

  // Health & cleanup
  async healthCheck(): Promise<{
    status: 'ok' | 'error';
    database: 'sqlite' | 'supabase';
    message?: string;
  }> {
    try {
      const { error } = await this.supabaseClient
        .from('users')
        .select('*', { count: 'exact', head: true });

      if (error) {
        return {
          status: 'error',
          database: 'supabase',
          message: error.message,
        };
      }

      return { status: 'ok', database: 'supabase' };
    } catch (e) {
      return {
        status: 'error',
        database: 'supabase',
        message: String(e),
      };
    }
  }

  async close(): Promise<void> {
    // Supabase client doesn't need explicit closing
    this._supabaseClient = null;
  }
}