import { Checkin } from '@sakinah/types';
import { supabase } from '../db/supabase';

export class CheckinRepository {
  async createCheckin(data: Omit<Checkin, 'id' | 'createdAt'>): Promise<Checkin> {
    const { data: checkin, error } = await supabase
      .from('checkins')
      .insert({
        user_id: data.userId,
        date: data.date,
        mood: data.mood,
        intention: data.intention,
        reflection: data.reflection,
      })
      .select()
      .single();

    if (error) throw error;

    return this.mapToModel(checkin);
  }

  async getByDate(userId: string, date: string): Promise<Checkin | null> {
    const { data: checkin, error } = await supabase
      .from('checkins')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return this.mapToModel(checkin);
  }

  async updateCheckin(id: string, userId: string, updates: Partial<Checkin>): Promise<Checkin> {
    const { data: checkin, error } = await supabase
      .from('checkins')
      .update({
        mood: updates.mood,
        intention: updates.intention,
        reflection: updates.reflection,
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    return this.mapToModel(checkin);
  }

  private mapToModel(row: any): Checkin {
    return {
      id: row.id,
      userId: row.user_id,
      date: row.date,
      mood: row.mood,
      intention: row.intention,
      reflection: row.reflection,
      createdAt: row.created_at,
    };
  }
}