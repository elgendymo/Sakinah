import { Result } from '@/shared/result';
import { Checkin } from '../entities/Checkin';
import { UserId } from '../value-objects/UserId';
import { CheckinId } from '../value-objects/CheckinId';

export interface ICheckinRepository {
  create(checkin: Checkin): Promise<Result<Checkin>>;
  findById(id: CheckinId): Promise<Result<Checkin | null>>;
  findByUserAndDate(userId: UserId, date: Date): Promise<Result<Checkin | null>>;
  update(checkin: Checkin): Promise<Result<Checkin>>;
  findByUser(userId: UserId, filters?: {
    from?: Date;
    to?: Date;
    limit?: number;
    offset?: number;
  }): Promise<Result<Checkin[]>>;
  countByUser(userId: UserId, filters?: {
    from?: Date;
    to?: Date;
  }): Promise<Result<number>>;
  findAllByUser(userId: UserId): Promise<Result<Checkin[]>>;
  findLatestByUser(userId: UserId): Promise<Result<Checkin | null>>;
}