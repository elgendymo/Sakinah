import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/result';
import { IJournalRepository } from '@/domain/repositories';
import { JournalEntry } from '@/domain/entities/JournalEntry';
import { UserId } from '@/domain/value-objects/UserId';
import { JournalId } from '@/domain/value-objects/JournalId';
import { IDatabaseClient } from '../database/types';

@injectable()
export class JournalRepositoryAdapter implements IJournalRepository {
  constructor(
    @inject('IDatabaseClient') private db: IDatabaseClient
  ) {}

  async create(entry: JournalEntry): Promise<Result<JournalEntry>> {
    try {
      const result = await this.db.createJournalEntry({
        userId: entry.userId.toString(),
        content: entry.content,
        tags: entry.tags.length > 0 ? entry.tags : undefined
      });

      if (result.error) {
        return Result.error(new Error(result.error.message));
      }

      const created = JournalEntry.create({
        id: result.data!.id,
        userId: result.data!.userId,
        content: result.data!.content,
        tags: result.data!.tags || [],
        createdAt: new Date(result.data!.createdAt)
      });

      return Result.ok(created);
    } catch (error) {
      return Result.error(error as Error);
    }
  }

  async findById(id: JournalId): Promise<Result<JournalEntry | null>> {
    try {
      const result = await this.db.getJournalById(id.toString());

      if (result.error) {
        return Result.error(new Error(result.error.message));
      }

      if (!result.data) {
        return Result.ok(null);
      }

      const entry = JournalEntry.create({
        id: result.data.id,
        userId: result.data.userId,
        content: result.data.content,
        tags: result.data.tags || [],
        createdAt: new Date(result.data.createdAt)
      });

      return Result.ok(entry);
    } catch (error) {
      return Result.error(error as Error);
    }
  }

  async findByUserId(userId: UserId, search?: string): Promise<Result<JournalEntry[]>> {
    try {
      const result = await this.db.getJournalsByUserId(userId.toString(), search);

      if (result.error) {
        return Result.error(new Error(result.error.message));
      }

      const entries = (result.data?.entries || []).map(e =>
        JournalEntry.create({
          id: e.id,
          userId: e.userId,
          content: e.content,
          tags: e.tags || [],
          createdAt: new Date(e.createdAt)
        })
      );

      return Result.ok(entries);
    } catch (error) {
      return Result.error(error as Error);
    }
  }

  async update(entry: JournalEntry): Promise<Result<JournalEntry>> {
    try {
      const result = await this.db.updateJournal(
        entry.id.toString(),
        entry.userId.toString(),
        {
          content: entry.content,
          tags: entry.tags.length > 0 ? entry.tags : undefined
        }
      );

      if (result.error) {
        return Result.error(new Error(result.error.message));
      }

      const updated = JournalEntry.create({
        id: result.data!.id,
        userId: result.data!.userId,
        content: result.data!.content,
        tags: result.data!.tags || [],
        createdAt: new Date(result.data!.createdAt)
      });

      return Result.ok(updated);
    } catch (error) {
      return Result.error(error as Error);
    }
  }

  async delete(id: JournalId, userId: UserId): Promise<Result<void>> {
    try {
      const result = await this.db.deleteJournal(id.toString(), userId.toString());

      if (result.error) {
        return Result.error(new Error(result.error.message));
      }

      return Result.ok(undefined);
    } catch (error) {
      return Result.error(error as Error);
    }
  }
}