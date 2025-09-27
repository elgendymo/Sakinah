import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/result';
import { IIntentionRepository, IntentionFilters, IntentionPagination, PaginatedIntentions } from '@/domain/repositories';
import { UserId } from '@/domain/value-objects/UserId';
import { IntentionStatus, IntentionPriority } from '@/domain/entities/Intention';

export interface GetIntentionsRequest {
  userId: string;
  status?: IntentionStatus;
  priority?: IntentionPriority;
  tags?: string[];
  search?: string;
  targetDateFrom?: Date;
  targetDateTo?: Date;
  overdueOnly?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'targetDate' | 'priority' | 'text';
  sortOrder?: 'asc' | 'desc';
}

@injectable()
export class GetIntentionsUseCase {
  constructor(
    @inject('IIntentionRepository') private intentionRepo: IIntentionRepository
  ) {}

  async execute(request: GetIntentionsRequest): Promise<Result<PaginatedIntentions>> {
    try {
      const userId = new UserId(request.userId);

      // Build filters
      const filters: IntentionFilters = {};
      if (request.status) filters.status = request.status;
      if (request.priority) filters.priority = request.priority;
      if (request.tags && request.tags.length > 0) filters.tags = request.tags;
      if (request.search) filters.search = request.search;
      if (request.targetDateFrom) filters.targetDateFrom = request.targetDateFrom;
      if (request.targetDateTo) filters.targetDateTo = request.targetDateTo;
      if (request.overdueOnly) filters.overdueOnly = request.overdueOnly;

      // Build pagination
      const pagination: IntentionPagination = {
        page: request.page || 1,
        limit: Math.min(request.limit || 20, 100), // Cap at 100 items per page
        sortBy: request.sortBy || 'createdAt',
        sortOrder: request.sortOrder || 'desc'
      };

      // Validate pagination
      if (pagination.page < 1) {
        return Result.error(new Error('Page must be greater than 0'));
      }

      if (pagination.limit < 1) {
        return Result.error(new Error('Limit must be greater than 0'));
      }

      // Get intentions
      const result = await this.intentionRepo.findByUserId(userId, filters, pagination);

      if (Result.isError(result)) {
        return Result.error(new Error('Failed to retrieve intentions'));
      }

      return Result.ok(result.value);
    } catch (error) {
      return Result.error(error as Error);
    }
  }
}