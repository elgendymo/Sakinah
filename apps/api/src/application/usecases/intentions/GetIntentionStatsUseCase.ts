import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/result';
import { IIntentionRepository } from '@/domain/repositories';
import { UserId } from '@/domain/value-objects/UserId';

export interface IntentionStats {
  totalIntentions: number;
  activeIntentions: number;
  completedIntentions: number;
  archivedIntentions: number;
  overdueIntentions: number;
  dueSoonIntentions: number;
  completionRate: number; // percentage
  overdueRate: number; // percentage
}

export interface GetIntentionStatsRequest {
  userId: string;
  daysAheadForDueSoon?: number;
}

@injectable()
export class GetIntentionStatsUseCase {
  constructor(
    @inject('IIntentionRepository') private intentionRepo: IIntentionRepository
  ) {}

  async execute(request: GetIntentionStatsRequest): Promise<Result<IntentionStats>> {
    try {
      const userId = new UserId(request.userId);

      // Get counts by status
      const statusCountsResult = await this.intentionRepo.countByStatus(userId);
      if (Result.isError(statusCountsResult)) {
        return Result.error(new Error('Failed to get status counts'));
      }

      const statusCounts = statusCountsResult.value;

      // Get overdue intentions count
      const overdueResult = await this.intentionRepo.findOverdueIntentions(userId);
      if (Result.isError(overdueResult)) {
        return Result.error(new Error('Failed to get overdue intentions'));
      }

      const overdueCount = overdueResult.value.length;

      // Get due soon intentions count
      const dueSoonResult = await this.intentionRepo.findDueSoon(userId, request.daysAheadForDueSoon || 7);
      if (Result.isError(dueSoonResult)) {
        return Result.error(new Error('Failed to get due soon intentions'));
      }

      const dueSoonCount = dueSoonResult.value.length;

      // Calculate derived stats
      const totalIntentions = statusCounts.active + statusCounts.completed + statusCounts.archived;
      const completionRate = totalIntentions > 0
        ? Math.round((statusCounts.completed / (statusCounts.active + statusCounts.completed)) * 100)
        : 0;

      const overdueRate = statusCounts.active > 0
        ? Math.round((overdueCount / statusCounts.active) * 100)
        : 0;

      const stats: IntentionStats = {
        totalIntentions,
        activeIntentions: statusCounts.active,
        completedIntentions: statusCounts.completed,
        archivedIntentions: statusCounts.archived,
        overdueIntentions: overdueCount,
        dueSoonIntentions: dueSoonCount,
        completionRate,
        overdueRate
      };

      return Result.ok(stats);
    } catch (error) {
      return Result.error(error as Error);
    }
  }
}