import { inject, injectable } from 'tsyringe';
import { Result } from '@/shared/result';
import { IDhikrRepository, DhikrStatsFilters, DhikrSessionStats } from '@/domain/repositories/IDhikrRepository';
import { UserId } from '@/domain/value-objects/UserId';

export interface GetDhikrStatsRequest {
  userId: string;
  dhikrType?: string;
  periodType?: 'daily' | 'weekly' | 'monthly';
  periodStart?: string;
  periodEnd?: string;
}

@injectable()
export class GetDhikrStatsUseCase {
  constructor(
    @inject('IDhikrRepository') private readonly dhikrRepository: IDhikrRepository
  ) {}

  async execute(request: GetDhikrStatsRequest): Promise<Result<DhikrSessionStats, Error>> {
    try {
      // Validate input
      if (!request.userId) {
        return Result.error(new Error('User ID is required'));
      }

      const userId = new UserId(request.userId);

      const filters: DhikrStatsFilters = {
        dhikrType: request.dhikrType,
        periodType: request.periodType,
        periodStart: request.periodStart,
        periodEnd: request.periodEnd
      };

      // Get dhikr statistics
      const statsResult = await this.dhikrRepository.getDhikrStatsByUser(userId, filters);
      if (Result.isError(statsResult)) {
        return Result.error(statsResult.error);
      }

      return Result.ok(statsResult.value);
    } catch (error) {
      return Result.error(error as Error);
    }
  }
}