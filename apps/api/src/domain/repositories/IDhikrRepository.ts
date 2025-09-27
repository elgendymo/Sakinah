import { Result } from '@/shared/result';
import { DhikrSession } from '../entities/DhikrSession';
import { DhikrType } from '../entities/DhikrType';
import { UserId } from '../value-objects/UserId';
import { DhikrSessionId } from '../value-objects/DhikrSessionId';
import { DhikrTypeId } from '../value-objects/DhikrTypeId';

export interface DhikrSessionFilters {
  dhikrType?: string;
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface DhikrStatsFilters {
  dhikrType?: string;
  periodType?: 'daily' | 'weekly' | 'monthly';
  periodStart?: string;
  periodEnd?: string;
}

export interface DhikrTypeFilters {
  isActive?: boolean;
  tags?: string[];
  search?: string;
}

export interface DhikrSessionStats {
  totalSessions: number;
  totalCount: number;
  averageSessionDuration: number;
  averageCountPerSession: number;
  mostUsedDhikrType: string | null;
  longestStreak: number;
  currentStreak: number;
}

export interface IDhikrRepository {
  // Session operations
  saveDhikrSession(session: DhikrSession): Promise<Result<DhikrSession, Error>>;
  getDhikrSessionById(id: DhikrSessionId): Promise<Result<DhikrSession | null, Error>>;
  getDhikrSessionsByUser(
    userId: UserId,
    filters?: DhikrSessionFilters
  ): Promise<Result<DhikrSession[], Error>>;
  getDhikrSessionsByDate(
    userId: UserId,
    date: string
  ): Promise<Result<DhikrSession[], Error>>;
  countDhikrSessionsByUser(
    userId: UserId,
    filters?: DhikrSessionFilters
  ): Promise<Result<number, Error>>;
  deleteDhikrSession(id: DhikrSessionId, userId: UserId): Promise<Result<void, Error>>;

  // Type operations
  saveDhikrType(dhikrType: DhikrType): Promise<Result<DhikrType, Error>>;
  getDhikrTypeById(id: DhikrTypeId): Promise<Result<DhikrType | null, Error>>;
  getDhikrTypeByName(name: string): Promise<Result<DhikrType | null, Error>>;
  getDhikrTypes(filters?: DhikrTypeFilters): Promise<Result<DhikrType[], Error>>;
  deleteDhikrType(id: DhikrTypeId): Promise<Result<void, Error>>;

  // Statistics operations
  getDhikrStatsByUser(
    userId: UserId,
    filters?: DhikrStatsFilters
  ): Promise<Result<DhikrSessionStats, Error>>;
  aggregateDhikrStats(
    userId: UserId,
    periodType: 'daily' | 'weekly' | 'monthly',
    periodStart: string,
    periodEnd: string
  ): Promise<Result<void, Error>>;
}