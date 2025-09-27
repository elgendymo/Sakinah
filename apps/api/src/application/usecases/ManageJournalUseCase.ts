import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/result';
import { IJournalRepository } from '@/domain/repositories';
import { JournalEntry } from '@/domain/entities/JournalEntry';
import { JournalId } from '@/domain/value-objects/JournalId';
import { UserId } from '@/domain/value-objects/UserId';

@injectable()
export class ManageJournalUseCase {
  constructor(
    @inject('IJournalRepository') private journalRepo: IJournalRepository
  ) {}

  async createEntry(params: {
    userId: string;
    content: string;
    tags?: string[];
  }): Promise<Result<JournalEntry>> {
    try {
      const entry = JournalEntry.create({
        userId: params.userId,
        content: params.content,
        tags: params.tags
      });

      return await this.journalRepo.create(entry);
    } catch (error) {
      return Result.error(error as Error);
    }
  }

  async getUserEntries(userId: string, search?: string): Promise<Result<JournalEntry[]>> {
    return await this.journalRepo.findByUserId(new UserId(userId), search);
  }

  async getEntry(id: string): Promise<Result<JournalEntry | null>> {
    return await this.journalRepo.findById(new JournalId(id));
  }

  async updateEntry(params: {
    id: string;
    userId: string;
    content?: string;
    tags?: string[];
  }): Promise<Result<JournalEntry>> {
    const result = await this.journalRepo.findById(new JournalId(params.id));

    if (Result.isError(result)) {
      return Result.error(new Error('Failed to find journal entry'));
    }

    if (!result.value) {
      return Result.error(new Error('Journal entry not found'));
    }

    const entry = result.value;

    if (entry.userId.toString() !== params.userId) {
      return Result.error(new Error('Unauthorized'));
    }

    if (params.content) {
      entry.updateContent(params.content);
    }

    if (params.tags !== undefined) {
      entry.setTags(params.tags);
    }

    return await this.journalRepo.update(entry);
  }

  async deleteEntry(id: string, userId: string): Promise<Result<void>> {
    const result = await this.journalRepo.findById(new JournalId(id));

    if (Result.isError(result)) {
      return Result.error(new Error('Failed to find journal entry'));
    }

    if (!result.value) {
      return Result.error(new Error('Journal entry not found'));
    }

    if (result.value.userId.toString() !== userId) {
      return Result.error(new Error('Unauthorized'));
    }

    return await this.journalRepo.delete(new JournalId(id), new UserId(userId));
  }
}