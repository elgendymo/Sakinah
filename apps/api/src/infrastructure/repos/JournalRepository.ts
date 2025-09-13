import { JournalEntry } from '@sakinah/types';
import { supabase } from '../db/supabase';

export class JournalRepository {
  async createEntry(data: Omit<JournalEntry, 'id' | 'createdAt'>): Promise<JournalEntry> {
    const { data: entry, error } = await supabase
      .from('journals')
      .insert({
        user_id: data.userId,
        content: data.content,
        tags: data.tags,
      })
      .select()
      .single();

    if (error) throw error;

    return this.mapToModel(entry);
  }

  async getUserEntries(userId: string, limit = 50): Promise<JournalEntry[]> {
    const { data: entries, error } = await supabase
      .from('journals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return entries.map(this.mapToModel);
  }

  private mapToModel(row: any): JournalEntry {
    return {
      id: row.id,
      userId: row.user_id,
      content: row.content,
      tags: row.tags,
      createdAt: row.created_at,
    };
  }
}