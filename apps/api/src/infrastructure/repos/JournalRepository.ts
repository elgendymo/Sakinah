import { JournalEntry } from '@sakinah/types';
import { getDatabase } from '../database';

export class JournalRepository {
  private db = getDatabase();

  async createEntry(data: Omit<JournalEntry, 'id' | 'createdAt'>): Promise<JournalEntry> {
    const result = await this.db.createJournalEntry({
      userId: data.userId,
      content: data.content,
      tags: data.tags,
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

    return result.data!;
  }

  async getUserEntries(
    userId: string,
    filters?: {
      search?: string;
      tags?: string[];
      page?: number;
      limit?: number;
      sortBy?: 'createdAt' | 'content';
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<{ entries: JournalEntry[]; pagination: any }> {
    const result = await this.db.getJournalsByUserId(userId, filters);

    if (result.error) {
      throw new Error(result.error.message);
    }

    return result.data!;
  }

  async getEntry(id: string, userId: string): Promise<JournalEntry | null> {
    const result = await this.db.getJournalById(id);

    if (result.error) {
      throw new Error(result.error.message);
    }

    const entry = result.data;
    if (entry && entry.userId !== userId) {
      return null;
    }

    return entry;
  }

  async updateEntry(id: string, userId: string, updates: { content?: string; tags?: string[] }): Promise<JournalEntry> {
    const result = await this.db.updateJournal(id, userId, updates);

    if (result.error) {
      throw new Error(result.error.message);
    }

    return result.data!;
  }

  async deleteEntry(id: string, userId: string): Promise<void> {
    const result = await this.db.deleteJournal(id, userId);

    if (result.error) {
      throw new Error(result.error.message);
    }
  }
}