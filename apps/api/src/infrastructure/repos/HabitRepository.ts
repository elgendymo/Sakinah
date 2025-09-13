import { Habit, HabitSchedule } from '@sakinah/types';
import { supabase } from '../db/supabase';

export class HabitRepository {
  async createHabit(data: {
    userId: string;
    planId: string;
    title: string;
    schedule: HabitSchedule;
  }): Promise<Habit> {
    const { data: habit, error } = await supabase
      .from('habits')
      .insert({
        user_id: data.userId,
        plan_id: data.planId,
        title: data.title,
        schedule: data.schedule,
        streak_count: 0,
      })
      .select()
      .single();

    if (error) throw error;

    return this.mapToModel(habit);
  }

  async getHabit(id: string, userId: string): Promise<Habit | null> {
    const { data: habit, error } = await supabase
      .from('habits')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return this.mapToModel(habit);
  }

  async updateHabit(id: string, userId: string, updates: Partial<Habit>): Promise<void> {
    const { error } = await supabase
      .from('habits')
      .update({
        streak_count: updates.streakCount,
        last_completed_on: updates.lastCompletedOn,
      })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
  }

  async markCompleted(habitId: string, userId: string, date: string): Promise<void> {
    const { error } = await supabase
      .from('habit_completions')
      .upsert({
        habit_id: habitId,
        user_id: userId,
        completed_on: date,
      });

    if (error) throw error;
  }

  async markIncomplete(habitId: string, userId: string, date: string): Promise<void> {
    const { error } = await supabase
      .from('habit_completions')
      .delete()
      .eq('habit_id', habitId)
      .eq('user_id', userId)
      .eq('completed_on', date);

    if (error) throw error;
  }

  private mapToModel(row: any): Habit {
    return {
      id: row.id,
      userId: row.user_id,
      planId: row.plan_id,
      title: row.title,
      schedule: row.schedule,
      streakCount: row.streak_count,
      lastCompletedOn: row.last_completed_on,
      createdAt: row.created_at,
    };
  }
}