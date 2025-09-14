import { ContentSnippet, ContentType } from '@sakinah/types';
import { getDatabase } from '../database';

export class ContentRepository {
  private db = getDatabase();

  async getContent(filters: {
    tags?: string[];
    type?: ContentType;
  } = {}): Promise<ContentSnippet[]> {
    let result;

    if (filters.tags && filters.tags.length > 0) {
      result = await this.db.getContentSnippetsByTags(filters.tags);
    } else {
      result = await this.db.getAllContentSnippets();
    }

    if (result.error) {
      throw new Error(result.error.message);
    }

    let content = result.data || [];

    // Apply type filter if specified
    if (filters.type) {
      content = content.filter(item => item.type === filters.type);
    }

    // Limit to 20 items
    return content.slice(0, 20);
  }

  async getById(id: string): Promise<ContentSnippet | null> {
    const result = await this.db.getContentSnippetById(id);

    if (result.error) {
      throw new Error(result.error.message);
    }

    return result.data;
  }

  async getAllContent(): Promise<ContentSnippet[]> {
    const result = await this.db.getAllContentSnippets();

    if (result.error) {
      throw new Error(result.error.message);
    }

    return result.data || [];
  }
}