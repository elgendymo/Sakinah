import { ContentSnippet, ContentType } from '@sakinah/types';
import { supabase } from '../db/supabase';

export class ContentRepository {
  async getContent(filters: {
    tags?: string[];
    type?: ContentType;
  } = {}): Promise<ContentSnippet[]> {
    let query = supabase.from('content_snippets').select('*');

    if (filters.type) {
      query = query.eq('type', filters.type);
    }

    if (filters.tags && filters.tags.length > 0) {
      query = query.contains('tags', filters.tags);
    }

    const { data: content, error } = await query.limit(20);

    if (error) throw error;

    return content.map(this.mapToModel);
  }

  async createContent(data: Omit<ContentSnippet, 'id' | 'createdAt'>): Promise<ContentSnippet> {
    const { data: content, error } = await supabase
      .from('content_snippets')
      .insert({
        type: data.type,
        text: data.text,
        ref: data.ref,
        tags: data.tags,
      })
      .select()
      .single();

    if (error) throw error;

    return this.mapToModel(content);
  }

  private mapToModel(row: any): ContentSnippet {
    return {
      id: row.id,
      type: row.type,
      text: row.text,
      ref: row.ref,
      tags: row.tags,
      createdAt: row.created_at,
    };
  }
}