import { inject, injectable } from 'tsyringe';
import { Result } from '@/shared/result';
import { IDhikrRepository, DhikrSessionFilters } from '@/domain/repositories/IDhikrRepository';
import { DhikrSession } from '@/domain/entities/DhikrSession';
import { UserId } from '@/domain/value-objects/UserId';

export interface GetDhikrSessionsRequest {
  userId: string;
  dhikrType?: string;
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  tags?: string[];
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedDhikrSessions {
  items: DhikrSession[];
  totalCount: number;
  page: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

@injectable()
export class GetDhikrSessionsUseCase {
  constructor(
    @inject('IDhikrRepository') private readonly dhikrRepository: IDhikrRepository
  ) {}

  async execute(request: GetDhikrSessionsRequest): Promise<Result<PaginatedDhikrSessions, Error>> {
    try {
      // Validate input
      if (!request.userId) {
        return Result.error(new Error('User ID is required'));
      }

      const userId = new UserId(request.userId);
      const page = request.page || 1;
      const limit = request.limit || 20;
      const offset = (page - 1) * limit;

      const filters: DhikrSessionFilters = {
        dhikrType: request.dhikrType,
        date: request.date,
        dateFrom: request.dateFrom,
        dateTo: request.dateTo,
        tags: request.tags,
        limit,
        offset,
        sortBy: request.sortBy || 'created_at',
        sortOrder: request.sortOrder?.toUpperCase() as 'ASC' | 'DESC' || 'DESC'
      };

      // Get sessions
      const sessionsResult = await this.dhikrRepository.getDhikrSessionsByUser(userId, filters);
      if (Result.isError(sessionsResult)) {
        return Result.error(sessionsResult.error);
      }

      // Get total count
      const countResult = await this.dhikrRepository.countDhikrSessionsByUser(userId, {
        dhikrType: request.dhikrType,
        dateFrom: request.dateFrom,
        dateTo: request.dateTo
      });
      if (Result.isError(countResult)) {
        return Result.error(countResult.error);
      }

      const sessions = sessionsResult.value;
      const totalCount = countResult.value;
      const totalPages = Math.ceil(totalCount / limit);

      const result: PaginatedDhikrSessions = {
        items: sessions,
        totalCount,
        page,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1
      };

      return Result.ok(result);
    } catch (error) {
      return Result.error(error as Error);
    }
  }
}