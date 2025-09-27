import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/result';
import { ICheckinRepository } from '@/domain/repositories';
import { Checkin } from '@/domain/entities/Checkin';
import { UserId } from '@/domain/value-objects/UserId';
import { CheckinId } from '@/domain/value-objects/CheckinId';
import { IDatabaseClient } from '../database/types';

@injectable()
export class CheckinRepositoryAdapter implements ICheckinRepository {
  constructor(
    @inject('IDatabaseClient') private db: IDatabaseClient
  ) {}

  async create(checkin: Checkin): Promise<Result<Checkin>> {
    try {
      const result = await this.db.createCheckin({
        userId: checkin.userId.toString(),
        date: checkin.date.toISOString().split('T')[0],
        mood: checkin.mood,
        intention: checkin.intention,
        reflection: checkin.reflection
      });

      if (result.error) {
        return Result.error(new Error(result.error.message));
      }

      const created = Checkin.create({
        id: result.data!.id,
        userId: result.data!.userId,
        date: new Date(result.data!.date),
        mood: result.data!.mood,
        intention: result.data!.intention,
        reflection: result.data!.reflection,
        createdAt: new Date(result.data!.createdAt)
      });

      return Result.ok(created);
    } catch (error) {
      return Result.error(error as Error);
    }
  }

  async findById(_id: CheckinId): Promise<Result<Checkin | null>> {
    try {
      // We don't have a direct method for this, need to implement
      return Result.error(new Error('findById not implemented'));
    } catch (error) {
      return Result.error(error as Error);
    }
  }

  async findByUserAndDate(userId: UserId, date: Date): Promise<Result<Checkin | null>> {
    try {
      const result = await this.db.getCheckinByDate(
        userId.toString(),
        date.toISOString().split('T')[0]
      );

      if (result.error) {
        return Result.error(new Error(result.error.message));
      }

      if (!result.data) {
        return Result.ok(null);
      }

      const checkin = Checkin.create({
        id: result.data.id,
        userId: result.data.userId,
        date: new Date(result.data.date),
        mood: result.data.mood,
        intention: result.data.intention,
        reflection: result.data.reflection,
        createdAt: new Date(result.data.createdAt)
      });

      return Result.ok(checkin);
    } catch (error) {
      return Result.error(error as Error);
    }
  }

  async update(checkin: Checkin): Promise<Result<Checkin>> {
    try {
      const result = await this.db.updateCheckin(
        checkin.id.toString(),
        checkin.userId.toString(),
        {
          mood: checkin.mood,
          intention: checkin.intention,
          reflection: checkin.reflection
        }
      );

      if (result.error) {
        return Result.error(new Error(result.error.message));
      }

      const updated = Checkin.create({
        id: result.data!.id,
        userId: result.data!.userId,
        date: new Date(result.data!.date),
        mood: result.data!.mood,
        intention: result.data!.intention,
        reflection: result.data!.reflection,
        createdAt: new Date(result.data!.createdAt)
      });

      return Result.ok(updated);
    } catch (error) {
      return Result.error(error as Error);
    }
  }

  async findByUser(userId: UserId, filters?: {
    from?: Date;
    to?: Date;
    limit?: number;
    offset?: number;
  }): Promise<Result<Checkin[]>> {
    try {
      const result = await this.db.getCheckinsByUser(
        userId.toString(),
        {
          from: filters?.from?.toISOString().split('T')[0],
          to: filters?.to?.toISOString().split('T')[0],
          limit: filters?.limit,
          offset: filters?.offset
        }
      );

      if (result.error) {
        return Result.error(new Error(result.error.message));
      }

      const checkins = (result.data || []).map(data =>
        Checkin.create({
          id: data.id,
          userId: data.userId,
          date: new Date(data.date),
          mood: data.mood,
          intention: data.intention,
          reflection: data.reflection,
          createdAt: new Date(data.createdAt)
        })
      );

      return Result.ok(checkins);
    } catch (error) {
      return Result.error(error as Error);
    }
  }

  async countByUser(userId: UserId, filters?: {
    from?: Date;
    to?: Date;
  }): Promise<Result<number>> {
    try {
      const result = await this.db.countCheckinsByUser(
        userId.toString(),
        {
          from: filters?.from?.toISOString().split('T')[0],
          to: filters?.to?.toISOString().split('T')[0]
        }
      );

      if (result.error) {
        return Result.error(new Error(result.error.message));
      }

      return Result.ok(result.data || 0);
    } catch (error) {
      return Result.error(error as Error);
    }
  }

  async findAllByUser(userId: UserId): Promise<Result<Checkin[]>> {
    try {
      const result = await this.db.getCheckinsByUser(userId.toString());

      if (result.error) {
        return Result.error(new Error(result.error.message));
      }

      const checkins = (result.data || []).map(data =>
        Checkin.create({
          id: data.id,
          userId: data.userId,
          date: new Date(data.date),
          mood: data.mood,
          intention: data.intention,
          reflection: data.reflection,
          createdAt: new Date(data.createdAt)
        })
      );

      return Result.ok(checkins);
    } catch (error) {
      return Result.error(error as Error);
    }
  }

  async findLatestByUser(userId: UserId): Promise<Result<Checkin | null>> {
    try {
      const result = await this.db.getCheckinsByUser(
        userId.toString(),
        { limit: 1, orderBy: 'date', orderDirection: 'DESC' }
      );

      if (result.error) {
        return Result.error(new Error(result.error.message));
      }

      if (!result.data || result.data.length === 0) {
        return Result.ok(null);
      }

      const data = result.data[0];
      const checkin = Checkin.create({
        id: data.id,
        userId: data.userId,
        date: new Date(data.date),
        mood: data.mood,
        intention: data.intention,
        reflection: data.reflection,
        createdAt: new Date(data.createdAt)
      });

      return Result.ok(checkin);
    } catch (error) {
      return Result.error(error as Error);
    }
  }
}