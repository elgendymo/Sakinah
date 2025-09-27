import { Result } from '@/shared/result';
import { Intention, IntentionStatus, IntentionPriority } from '../entities/Intention';
import { UserId } from '../value-objects/UserId';
import { IntentionId } from '../value-objects/IntentionId';

export interface IntentionFilters {
  status?: IntentionStatus;
  priority?: IntentionPriority;
  tags?: string[];
  search?: string;
  targetDateFrom?: Date;
  targetDateTo?: Date;
  overdueOnly?: boolean;
}

export interface IntentionPagination {
  page: number;
  limit: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'targetDate' | 'priority' | 'text';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedIntentions {
  items: Intention[];
  totalCount: number;
  page: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface IIntentionRepository {
  create(intention: Intention): Promise<Result<Intention>>;
  findById(id: IntentionId): Promise<Result<Intention | null>>;
  findByUserId(userId: UserId, filters?: IntentionFilters, pagination?: IntentionPagination): Promise<Result<PaginatedIntentions>>;
  update(intention: Intention): Promise<Result<Intention>>;
  delete(id: IntentionId, userId: UserId): Promise<Result<void>>;
  findActiveByUserId(userId: UserId): Promise<Result<Intention[]>>;
  findTodaysIntentions(userId: UserId): Promise<Result<Intention[]>>;
  findOverdueIntentions(userId: UserId): Promise<Result<Intention[]>>;
  findByTags(userId: UserId, tags: string[]): Promise<Result<Intention[]>>;
  findDueSoon(userId: UserId, daysAhead?: number): Promise<Result<Intention[]>>;
  countByStatus(userId: UserId): Promise<Result<Record<IntentionStatus, number>>>;
  searchIntentions(userId: UserId, query: string, pagination?: IntentionPagination): Promise<Result<PaginatedIntentions>>;
}