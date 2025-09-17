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

  async getUserEntries(userId: string, search?: string, limit = 50): Promise<JournalEntry[]> {
    const result = await this.db.getJournalsByUserId(userId, search);

    if (result.error) {
      throw new Error(result.error.message);
    }

    const entries = result.data || [];
    return entries.slice(0, limit);
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