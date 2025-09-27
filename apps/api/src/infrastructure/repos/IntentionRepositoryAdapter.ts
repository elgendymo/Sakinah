import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/result';
import { IIntentionRepository, IntentionFilters, IntentionPagination, PaginatedIntentions } from '@/domain/repositories';
import { Intention, IntentionStatus, IntentionPriority } from '@/domain/entities/Intention';
import { UserId } from '@/domain/value-objects/UserId';
import { IntentionId } from '@/domain/value-objects/IntentionId';
import { IDatabaseClient, IntentionData } from '../database/types';

@injectable()
export class IntentionRepositoryAdapter implements IIntentionRepository {
  constructor(
    @inject('IDatabaseClient') private db: IDatabaseClient
  ) {}

  async create(intention: Intention): Promise<Result<Intention>> {
    try {
      const reminderData = intention.reminder;
      const result = await this.db.createIntention({
        userId: intention.userId.toString(),
        text: intention.text,
        description: intention.description,
        priority: intention.priority,
        status: intention.status,
        targetDate: intention.targetDate?.toISOString() || null,
        completedAt: intention.completedAt?.toISOString() || null,
        reminderEnabled: reminderData.enabled,
        reminderTime: reminderData.time || null,
        reminderDaysOfWeek: reminderData.daysOfWeek || null,
        tags: intention.tags
      });

      if (result.error) {
        return Result.error(new Error(result.error.message));
      }

      const created = this.mapFromData(result.data!);
      return Result.ok(created);
    } catch (error) {
      return Result.error(error as Error);
    }
  }

  async findById(id: IntentionId): Promise<Result<Intention | null>> {
    try {
      const result = await this.db.getIntentionById(id.toString());

      if (result.error) {
        return Result.error(new Error(result.error.message));
      }

      if (!result.data) {
        return Result.ok(null);
      }

      const intention = this.mapFromData(result.data);
      return Result.ok(intention);
    } catch (error) {
      return Result.error(error as Error);
    }
  }

  async findByUserId(
    userId: UserId,
    filters?: IntentionFilters,
    pagination?: IntentionPagination
  ): Promise<Result<PaginatedIntentions>> {
    try {
      // First get total count
      const countResult = await this.db.countIntentionsByUser(
        userId.toString(),
        filters ? this.mapFiltersToDb(filters) : undefined
      );

      if (countResult.error) {
        return Result.error(new Error(countResult.error.message));
      }

      const totalCount = countResult.data || 0;

      // Then get paginated results
      const dbFilters = this.buildDbFilters(filters, pagination);
      const result = await this.db.getIntentionsByUserId(
        userId.toString(),
        dbFilters
      );

      if (result.error) {
        return Result.error(new Error(result.error.message));
      }

      const intentions = (result.data || []).map(data => this.mapFromData(data));

      const page = pagination?.page || 1;
      const limit = pagination?.limit || 20;
      const totalPages = Math.ceil(totalCount / limit);

      return Result.ok({
        items: intentions,
        totalCount,
        page,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1
      });
    } catch (error) {
      return Result.error(error as Error);
    }
  }

  async update(intention: Intention): Promise<Result<Intention>> {
    try {
      const reminderData = intention.reminder;
      const result = await this.db.updateIntention(
        intention.id.toString(),
        intention.userId.toString(),
        {
          text: intention.text,
          description: intention.description,
          priority: intention.priority,
          status: intention.status,
          targetDate: intention.targetDate?.toISOString() || null,
          completedAt: intention.completedAt?.toISOString() || null,
          reminderEnabled: reminderData.enabled,
          reminderTime: reminderData.time || null,
          reminderDaysOfWeek: reminderData.daysOfWeek || null,
          tags: intention.tags
        }
      );

      if (result.error) {
        return Result.error(new Error(result.error.message));
      }

      const updated = this.mapFromData(result.data!);
      return Result.ok(updated);
    } catch (error) {
      return Result.error(error as Error);
    }
  }

  async delete(id: IntentionId, userId: UserId): Promise<Result<void>> {
    try {
      const result = await this.db.deleteIntention(id.toString(), userId.toString());

      if (result.error) {
        return Result.error(new Error(result.error.message));
      }

      return Result.ok(undefined);
    } catch (error) {
      return Result.error(error as Error);
    }
  }

  async findActiveByUserId(userId: UserId): Promise<Result<Intention[]>> {
    try {
      const result = await this.db.getIntentionsByUserId(
        userId.toString(),
        { status: 'active' }
      );

      if (result.error) {
        return Result.error(new Error(result.error.message));
      }

      const intentions = (result.data || []).map(data => this.mapFromData(data));
      return Result.ok(intentions);
    } catch (error) {
      return Result.error(error as Error);
    }
  }

  async findTodaysIntentions(userId: UserId): Promise<Result<Intention[]>> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const result = await this.db.getIntentionsByUserId(
        userId.toString(),
        {
          status: 'active',
          targetDateFrom: today,
          targetDateTo: today
        }
      );

      if (result.error) {
        return Result.error(new Error(result.error.message));
      }

      const intentions = (result.data || []).map(data => this.mapFromData(data));
      return Result.ok(intentions);
    } catch (error) {
      return Result.error(error as Error);
    }
  }

  async findOverdueIntentions(userId: UserId): Promise<Result<Intention[]>> {
    try {
      const result = await this.db.getOverdueIntentions(userId.toString());

      if (result.error) {
        return Result.error(new Error(result.error.message));
      }

      const intentions = (result.data || []).map(data => this.mapFromData(data));
      return Result.ok(intentions);
    } catch (error) {
      return Result.error(error as Error);
    }
  }

  async findByTags(userId: UserId, tags: string[]): Promise<Result<Intention[]>> {
    try {
      const result = await this.db.getIntentionsByTags(userId.toString(), tags);

      if (result.error) {
        return Result.error(new Error(result.error.message));
      }

      const intentions = (result.data || []).map(data => this.mapFromData(data));
      return Result.ok(intentions);
    } catch (error) {
      return Result.error(error as Error);
    }
  }

  async findDueSoon(userId: UserId, daysAhead: number = 7): Promise<Result<Intention[]>> {
    try {
      const result = await this.db.getIntentionsDueSoon(userId.toString(), daysAhead);

      if (result.error) {
        return Result.error(new Error(result.error.message));
      }

      const intentions = (result.data || []).map(data => this.mapFromData(data));
      return Result.ok(intentions);
    } catch (error) {
      return Result.error(error as Error);
    }
  }

  async countByStatus(userId: UserId): Promise<Result<Record<IntentionStatus, number>>> {
    try {
      const statuses: IntentionStatus[] = ['active', 'completed', 'archived'];
      const counts: Record<IntentionStatus, number> = { active: 0, completed: 0, archived: 0 };

      for (const status of statuses) {
        const result = await this.db.countIntentionsByUser(
          userId.toString(),
          { status }
        );

        if (result.error) {
          return Result.error(new Error(result.error.message));
        }

        counts[status] = result.data || 0;
      }

      return Result.ok(counts);
    } catch (error) {
      return Result.error(error as Error);
    }
  }

  async searchIntentions(
    userId: UserId,
    query: string,
    pagination?: IntentionPagination
  ): Promise<Result<PaginatedIntentions>> {
    try {
      const filters: IntentionFilters = { search: query };
      return this.findByUserId(userId, filters, pagination);
    } catch (error) {
      return Result.error(error as Error);
    }
  }

  private mapFromData(data: IntentionData): Intention {
    return Intention.create({
      id: data.id,
      userId: data.userId,
      text: data.text,
      description: data.description,
      priority: data.priority,
      status: data.status,
      targetDate: data.targetDate ? new Date(data.targetDate) : null,
      completedAt: data.completedAt ? new Date(data.completedAt) : null,
      reminder: data.reminder,
      tags: data.tags,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt)
    });
  }

  private mapFiltersToDb(filters: IntentionFilters) {
    return {
      status: filters.status,
      priority: filters.priority,
      tags: filters.tags,
      search: filters.search,
      targetDateFrom: filters.targetDateFrom?.toISOString().split('T')[0],
      targetDateTo: filters.targetDateTo?.toISOString().split('T')[0],
      overdueOnly: filters.overdueOnly
    };
  }

  private buildDbFilters(filters?: IntentionFilters, pagination?: IntentionPagination) {
    const dbFilters: any = {};

    if (filters) {
      if (filters.status) dbFilters.status = filters.status;
      if (filters.priority) dbFilters.priority = filters.priority;
      if (filters.tags) dbFilters.tags = filters.tags;
      if (filters.search) dbFilters.search = filters.search;
      if (filters.targetDateFrom) dbFilters.targetDateFrom = filters.targetDateFrom.toISOString().split('T')[0];
      if (filters.targetDateTo) dbFilters.targetDateTo = filters.targetDateTo.toISOString().split('T')[0];
      if (filters.overdueOnly) dbFilters.overdueOnly = filters.overdueOnly;
    }

    if (pagination) {
      dbFilters.limit = pagination.limit || 20;
      dbFilters.offset = ((pagination.page || 1) - 1) * (pagination.limit || 20);
      dbFilters.sortBy = pagination.sortBy || 'createdAt';
      dbFilters.sortOrder = pagination.sortOrder === 'asc' ? 'ASC' : 'DESC';
    }

    return dbFilters;
  }
}