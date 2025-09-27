import { inject, injectable } from 'tsyringe';
import { Result } from '@/shared/result';
import { IDhikrRepository, DhikrSessionFilters, DhikrStatsFilters, DhikrTypeFilters, DhikrSessionStats } from '@/domain/repositories/IDhikrRepository';
import { DhikrSession } from '@/domain/entities/DhikrSession';
import { DhikrType } from '@/domain/entities/DhikrType';
import { UserId } from '@/domain/value-objects/UserId';
import { DhikrSessionId } from '@/domain/value-objects/DhikrSessionId';
import { DhikrTypeId } from '@/domain/value-objects/DhikrTypeId';
import { IDatabaseClient, DhikrSessionData, DhikrTypeData } from '@/infrastructure/database/types';

@injectable()
export class DhikrRepositoryAdapter implements IDhikrRepository {
  constructor(
    @inject('DatabaseClient') private readonly db: IDatabaseClient
  ) {}

  async saveDhikrSession(session: DhikrSession): Promise<Result<DhikrSession, Error>> {
    try {
      const dto = session.toDTO();

      // Check if this is an update or create
      const existingResult = await this.db.getDhikrSessionById(dto.id);

      if (existingResult.data) {
        // Update existing session
        const updateResult = await this.db.updateDhikrSession(
          dto.id,
          dto.userId,
          {
            count: dto.count,
            targetCount: dto.targetCount,
            sessionEnd: dto.sessionEnd,
            notes: dto.notes,
            tags: dto.tags
          }
        );

        if (updateResult.error) {
          return Result.error(new Error(updateResult.error.message));
        }

        return Result.ok(this.mapToDhikrSession(updateResult.data!));
      } else {
        // Create new session
        const createResult = await this.db.createDhikrSession({
          userId: dto.userId,
          dhikrType: dto.dhikrType,
          dhikrText: dto.dhikrText,
          count: dto.count,
          targetCount: dto.targetCount,
          date: dto.date,
          sessionStart: dto.sessionStart,
          sessionEnd: dto.sessionEnd,
          notes: dto.notes,
          tags: dto.tags
        });

        if (createResult.error) {
          return Result.error(new Error(createResult.error.message));
        }

        return Result.ok(this.mapToDhikrSession(createResult.data!));
      }
    } catch (error) {
      return Result.error(error as Error);
    }
  }

  async getDhikrSessionById(id: DhikrSessionId): Promise<Result<DhikrSession | null, Error>> {
    try {
      const result = await this.db.getDhikrSessionById(id.toString());

      if (result.error) {
        return Result.error(new Error(result.error.message));
      }

      if (!result.data) {
        return Result.ok(null);
      }

      return Result.ok(this.mapToDhikrSession(result.data));
    } catch (error) {
      return Result.error(error as Error);
    }
  }

  async getDhikrSessionsByUser(
    userId: UserId,
    filters?: DhikrSessionFilters
  ): Promise<Result<DhikrSession[], Error>> {
    try {
      const result = await this.db.getDhikrSessionsByUser(userId.toString(), filters);

      if (result.error) {
        return Result.error(new Error(result.error.message));
      }

      const sessions = result.data!.map(data => this.mapToDhikrSession(data));
      return Result.ok(sessions);
    } catch (error) {
      return Result.error(error as Error);
    }
  }

  async getDhikrSessionsByDate(
    userId: UserId,
    date: string
  ): Promise<Result<DhikrSession[], Error>> {
    try {
      const result = await this.db.getDhikrSessionsByDate(userId.toString(), date);

      if (result.error) {
        return Result.error(new Error(result.error.message));
      }

      const sessions = result.data!.map(data => this.mapToDhikrSession(data));
      return Result.ok(sessions);
    } catch (error) {
      return Result.error(error as Error);
    }
  }

  async countDhikrSessionsByUser(
    userId: UserId,
    filters?: DhikrSessionFilters
  ): Promise<Result<number, Error>> {
    try {
      const result = await this.db.countDhikrSessionsByUser(userId.toString(), {
        dhikrType: filters?.dhikrType,
        dateFrom: filters?.dateFrom,
        dateTo: filters?.dateTo
      });

      if (result.error) {
        return Result.error(new Error(result.error.message));
      }

      return Result.ok(result.data!);
    } catch (error) {
      return Result.error(error as Error);
    }
  }

  async deleteDhikrSession(id: DhikrSessionId, userId: UserId): Promise<Result<void, Error>> {
    try {
      const result = await this.db.deleteDhikrSession(id.toString(), userId.toString());

      if (result.error) {
        return Result.error(new Error(result.error.message));
      }

      return Result.ok(undefined);
    } catch (error) {
      return Result.error(error as Error);
    }
  }

  async saveDhikrType(dhikrType: DhikrType): Promise<Result<DhikrType, Error>> {
    try {
      const dto = dhikrType.toDTO();

      // Check if this is an update or create
      const existingResult = await this.db.getDhikrTypeById(dto.id);

      if (existingResult.data) {
        // Update existing type
        const updateResult = await this.db.updateDhikrType(dto.id, {
          displayName: dto.displayName,
          arabicText: dto.arabicText,
          transliteration: dto.transliteration,
          translation: dto.translation,
          description: dto.description,
          recommendedCount: dto.recommendedCount,
          tags: dto.tags,
          isActive: dto.isActive
        });

        if (updateResult.error) {
          return Result.error(new Error(updateResult.error.message));
        }

        return Result.ok(this.mapToDhikrType(updateResult.data!));
      } else {
        // Create new type
        const createResult = await this.db.createDhikrType({
          name: dto.name,
          displayName: dto.displayName,
          arabicText: dto.arabicText,
          transliteration: dto.transliteration,
          translation: dto.translation,
          description: dto.description,
          recommendedCount: dto.recommendedCount,
          tags: dto.tags,
          isActive: dto.isActive
        });

        if (createResult.error) {
          return Result.error(new Error(createResult.error.message));
        }

        return Result.ok(this.mapToDhikrType(createResult.data!));
      }
    } catch (error) {
      return Result.error(error as Error);
    }
  }

  async getDhikrTypeById(id: DhikrTypeId): Promise<Result<DhikrType | null, Error>> {
    try {
      const result = await this.db.getDhikrTypeById(id.toString());

      if (result.error) {
        return Result.error(new Error(result.error.message));
      }

      if (!result.data) {
        return Result.ok(null);
      }

      return Result.ok(this.mapToDhikrType(result.data));
    } catch (error) {
      return Result.error(error as Error);
    }
  }

  async getDhikrTypeByName(name: string): Promise<Result<DhikrType | null, Error>> {
    try {
      const result = await this.db.getDhikrTypeByName(name);

      if (result.error) {
        return Result.error(new Error(result.error.message));
      }

      if (!result.data) {
        return Result.ok(null);
      }

      return Result.ok(this.mapToDhikrType(result.data));
    } catch (error) {
      return Result.error(error as Error);
    }
  }

  async getDhikrTypes(filters?: DhikrTypeFilters): Promise<Result<DhikrType[], Error>> {
    try {
      const result = await this.db.getDhikrTypes(filters);

      if (result.error) {
        return Result.error(new Error(result.error.message));
      }

      const types = result.data!.map(data => this.mapToDhikrType(data));
      return Result.ok(types);
    } catch (error) {
      return Result.error(error as Error);
    }
  }

  async deleteDhikrType(id: DhikrTypeId): Promise<Result<void, Error>> {
    try {
      const result = await this.db.deleteDhikrType(id.toString());

      if (result.error) {
        return Result.error(new Error(result.error.message));
      }

      return Result.ok(undefined);
    } catch (error) {
      return Result.error(error as Error);
    }
  }

  async getDhikrStatsByUser(
    userId: UserId,
    filters?: DhikrStatsFilters
  ): Promise<Result<DhikrSessionStats, Error>> {
    try {
      const statsResult = await this.db.getDhikrStatsByUser(userId.toString(), filters);

      if (statsResult.error) {
        return Result.error(new Error(statsResult.error.message));
      }

      // Calculate aggregated statistics from the raw stats data
      const stats = statsResult.data!;
      const totalSessions = stats.reduce((sum, stat) => sum + stat.sessionCount, 0);
      const totalCount = stats.reduce((sum, stat) => sum + stat.totalCount, 0);
      const averageSessionDuration = stats.reduce((sum, stat) =>
        sum + (stat.averageSessionDuration || 0), 0) / (stats.length || 1);
      const averageCountPerSession = totalSessions > 0 ? totalCount / totalSessions : 0;

      // Find most used dhikr type
      const dhikrTypeCounts = stats.reduce((acc, stat) => {
        acc[stat.dhikrType] = (acc[stat.dhikrType] || 0) + stat.totalCount;
        return acc;
      }, {} as Record<string, number>);

      const mostUsedDhikrType = Object.keys(dhikrTypeCounts).length > 0
        ? Object.entries(dhikrTypeCounts).reduce((a, b) => a[1] > b[1] ? a : b)[0]
        : null;

      // TODO: Implement streak calculation logic
      const longestStreak = 0;
      const currentStreak = 0;

      const sessionStats: DhikrSessionStats = {
        totalSessions,
        totalCount,
        averageSessionDuration,
        averageCountPerSession,
        mostUsedDhikrType,
        longestStreak,
        currentStreak
      };

      return Result.ok(sessionStats);
    } catch (error) {
      return Result.error(error as Error);
    }
  }

  async aggregateDhikrStats(
    userId: UserId,
    periodType: 'daily' | 'weekly' | 'monthly',
    periodStart: string,
    periodEnd: string
  ): Promise<Result<void, Error>> {
    try {
      const result = await this.db.aggregateDhikrStats(
        userId.toString(),
        periodType,
        periodStart,
        periodEnd
      );

      if (result.error) {
        return Result.error(new Error(result.error.message));
      }

      return Result.ok(undefined);
    } catch (error) {
      return Result.error(error as Error);
    }
  }

  private mapToDhikrSession(data: DhikrSessionData): DhikrSession {
    return DhikrSession.create({
      id: data.id,
      userId: data.userId,
      dhikrType: data.dhikrType,
      dhikrText: data.dhikrText,
      count: data.count,
      targetCount: data.targetCount,
      date: data.date,
      sessionStart: new Date(data.sessionStart),
      sessionEnd: data.sessionEnd ? new Date(data.sessionEnd) : null,
      notes: data.notes,
      tags: data.tags,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt)
    });
  }

  private mapToDhikrType(data: DhikrTypeData): DhikrType {
    return DhikrType.create({
      id: data.id,
      name: data.name,
      displayName: data.displayName,
      arabicText: data.arabicText,
      transliteration: data.transliteration,
      translation: data.translation,
      description: data.description,
      recommendedCount: data.recommendedCount,
      tags: data.tags,
      isActive: data.isActive,
      createdAt: new Date(data.createdAt)
    });
  }
}