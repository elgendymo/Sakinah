import { Checkin } from '@sakinah/types';
import { Result } from '@/shared/result';
import { RepositoryResultHandler } from '@/shared/repository-result-handler';
import { CreateCheckinInput, UpdateCheckinInput } from './types';
import { getDatabase } from '../database';

export class CheckinRepository {
  private db = getDatabase();

  async createCheckin(data: CreateCheckinInput): Promise<Result<Checkin>> {
    return RepositoryResultHandler.wrapOperation(async () => {
      const result = await this.db.createCheckin(data);
      const handled = RepositoryResultHandler.handleRequiredResult(result, 'Checkin');
      if (Result.isError(handled)) {
        throw handled.error;
      }
      return handled.value;
    });
  }

  async getByDate(userId: string, date: string): Promise<Result<Checkin | null>> {
    return RepositoryResultHandler.wrapOperation(async () => {
      const result = await this.db.getCheckinByDate(userId, date);
      const handled = RepositoryResultHandler.handleSingleResult(result);
      if (Result.isError(handled)) {
        throw handled.error;
      }
      return handled.value;
    });
  }

  async updateCheckin(id: string, userId: string, updates: UpdateCheckinInput): Promise<Result<Checkin>> {
    return RepositoryResultHandler.wrapOperation(async () => {
      const result = await this.db.updateCheckin(id, userId, updates);
      const handled = RepositoryResultHandler.handleRequiredResult(result, 'Checkin');
      if (Result.isError(handled)) {
        throw handled.error;
      }
      return handled.value;
    });
  }
}