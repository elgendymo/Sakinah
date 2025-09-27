import { injectable, inject } from 'tsyringe';
import { Result } from '../../shared/result';
import { IDatabaseClient, UserPreferencesData } from '../database/types';
import { UserPreferencesEntity } from '../../domain/entities/UserPreferences';

export interface IUserPreferencesRepository {
  getByUserId(userId: string): Promise<Result<UserPreferencesEntity | null>>;
  create(preferences: UserPreferencesEntity): Promise<Result<UserPreferencesEntity>>;
  update(preferences: UserPreferencesEntity): Promise<Result<UserPreferencesEntity>>;
  upsert(preferences: UserPreferencesEntity): Promise<Result<UserPreferencesEntity>>;
  delete(userId: string): Promise<Result<void>>;
}

@injectable()
export class UserPreferencesRepository implements IUserPreferencesRepository {
  constructor(
    @inject('IDatabaseClient') private db: IDatabaseClient
  ) {}

  async getByUserId(userId: string): Promise<Result<UserPreferencesEntity | null>> {
    try {
      const result = await this.db.getUserPreferences(userId);

      if (result.error) {
        return Result.error(new Error(result.error.message));
      }

      if (!result.data) {
        return Result.ok(null);
      }

      const entity = this.mapDataToEntity(result.data);
      return Result.ok(entity);
    } catch (error) {
      return Result.error(error as Error);
    }
  }

  async create(preferences: UserPreferencesEntity): Promise<Result<UserPreferencesEntity>> {
    try {
      const data = this.mapEntityToData(preferences);
      const result = await this.db.createUserPreferences(data);

      if (result.error) {
        return Result.error(new Error(result.error.message));
      }

      const created = this.mapDataToEntity(result.data!);
      return Result.ok(created);
    } catch (error) {
      return Result.error(error as Error);
    }
  }

  async update(preferences: UserPreferencesEntity): Promise<Result<UserPreferencesEntity>> {
    try {
      const data = this.mapEntityToData(preferences);
      const result = await this.db.updateUserPreferences(preferences.userId, data);

      if (result.error) {
        return Result.error(new Error(result.error.message));
      }

      const updated = this.mapDataToEntity(result.data!);
      return Result.ok(updated);
    } catch (error) {
      return Result.error(error as Error);
    }
  }

  async upsert(preferences: UserPreferencesEntity): Promise<Result<UserPreferencesEntity>> {
    try {
      const data = this.mapEntityToData(preferences);
      const result = await this.db.upsertUserPreferences(data);

      if (result.error) {
        return Result.error(new Error(result.error.message));
      }

      const upserted = this.mapDataToEntity(result.data!);
      return Result.ok(upserted);
    } catch (error) {
      return Result.error(error as Error);
    }
  }

  async delete(userId: string): Promise<Result<void>> {
    try {
      const result = await this.db.deleteUserPreferences(userId);

      if (result.error) {
        return Result.error(new Error(result.error.message));
      }

      return Result.ok(undefined);
    } catch (error) {
      return Result.error(error as Error);
    }
  }

  private mapDataToEntity(data: UserPreferencesData): UserPreferencesEntity {
    return new UserPreferencesEntity(
      data.userId,
      data.language,
      data.location,
      data.prayerCalculationMethod,
      data.notificationSettings,
      data.privacySettings,
      data.displaySettings,
      new Date(data.updatedAt),
      new Date(data.createdAt)
    );
  }

  private mapEntityToData(entity: UserPreferencesEntity): UserPreferencesData {
    return {
      userId: entity.userId,
      language: entity.language,
      location: entity.location,
      prayerCalculationMethod: entity.prayerCalculationMethod,
      notificationSettings: entity.notificationSettings,
      privacySettings: entity.privacySettings,
      displaySettings: entity.displaySettings,
      updatedAt: entity.updatedAt.toISOString(),
      createdAt: entity.createdAt.toISOString()
    };
  }
}