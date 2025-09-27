import { Result } from '@/shared/result';
import { JournalEntry } from '../entities/JournalEntry';
import { UserId } from '../value-objects/UserId';
import { JournalId } from '../value-objects/JournalId';

export interface IJournalRepository {
  create(entry: JournalEntry): Promise<Result<JournalEntry>>;
  findById(id: JournalId): Promise<Result<JournalEntry | null>>;
  findByUserId(userId: UserId, search?: string): Promise<Result<JournalEntry[]>>;
  update(entry: JournalEntry): Promise<Result<JournalEntry>>;
  delete(id: JournalId, userId: UserId): Promise<Result<void>>;
}