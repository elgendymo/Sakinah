import { injectable, inject } from 'tsyringe';
import { Result } from '../../shared/result';
import { IDatabaseClient, OnboardingData } from '../database/types';
import { OnboardingEntity, OnboardingStep, OnboardingCollectedData } from '../../domain/entities/Onboarding';
import { OnboardingId } from '../../domain/value-objects/OnboardingId';
import { UserId } from '../../domain/value-objects/UserId';
import { IOnboardingRepository } from '../../domain/repositories/IOnboardingRepository';

@injectable()
export class OnboardingRepositoryAdapter implements IOnboardingRepository {
  constructor(
    @inject('IDatabaseClient') private db: IDatabaseClient
  ) {}

  async create(onboarding: OnboardingEntity): Promise<Result<OnboardingEntity, Error>> {
    try {
      const data = this.mapEntityToData(onboarding);
      const result = await this.db.createOnboarding(data);

      if (result.error) {
        return Result.error(new Error(result.error.message));
      }

      const created = this.mapDataToEntity(result.data!);
      return Result.ok(created);
    } catch (error) {
      return Result.error(error as Error);
    }
  }

  async getByUserId(userId: UserId): Promise<Result<OnboardingEntity | null, Error>> {
    try {
      const result = await this.db.getOnboardingByUserId(userId.value);

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

  async getById(id: OnboardingId): Promise<Result<OnboardingEntity | null, Error>> {
    try {
      // Since we don't have getOnboardingById in the database interface yet,
      // we'll need to add this method or use a different approach
      // For now, let's return an error indicating this needs to be implemented
      return Result.error(new Error('getById not implemented yet - use getByUserId instead'));
    } catch (error) {
      return Result.error(error as Error);
    }
  }

  async update(onboarding: OnboardingEntity): Promise<Result<OnboardingEntity, Error>> {
    try {
      const data = this.mapEntityToData(onboarding);
      const result = await this.db.updateOnboarding(onboarding.userId, data);

      if (result.error) {
        return Result.error(new Error(result.error.message));
      }

      const updated = this.mapDataToEntity(result.data!);
      return Result.ok(updated);
    } catch (error) {
      return Result.error(error as Error);
    }
  }

  async upsert(onboarding: OnboardingEntity): Promise<Result<OnboardingEntity, Error>> {
    try {
      const data = this.mapEntityToData(onboarding);
      const result = await this.db.upsertOnboarding(data);

      if (result.error) {
        return Result.error(new Error(result.error.message));
      }

      const upserted = this.mapDataToEntity(result.data!);
      return Result.ok(upserted);
    } catch (error) {
      return Result.error(error as Error);
    }
  }

  async completeStep(
    userId: UserId,
    step: OnboardingStep,
    data?: OnboardingCollectedData
  ): Promise<Result<OnboardingEntity, Error>> {
    try {
      // Get existing onboarding or create new one
      const existingResult = await this.getByUserId(userId);
      if (Result.isError(existingResult)) {
        return existingResult;
      }

      let onboarding = existingResult.value;
      if (!onboarding) {
        onboarding = OnboardingEntity.createNew(userId.value);
      }

      // Complete the step
      onboarding.completeStep(step, data);

      // Update in database
      return await this.upsert(onboarding);
    } catch (error) {
      return Result.error(error as Error);
    }
  }

  async skipStep(userId: UserId, step: OnboardingStep): Promise<Result<OnboardingEntity, Error>> {
    try {
      // Get existing onboarding or create new one
      const existingResult = await this.getByUserId(userId);
      if (Result.isError(existingResult)) {
        return existingResult;
      }

      let onboarding = existingResult.value;
      if (!onboarding) {
        onboarding = OnboardingEntity.createNew(userId.value);
      }

      // Skip the step
      onboarding.skipStep(step);

      // Update in database
      return await this.upsert(onboarding);
    } catch (error) {
      return Result.error(error as Error);
    }
  }

  async moveToStep(userId: UserId, step: OnboardingStep): Promise<Result<OnboardingEntity, Error>> {
    try {
      // Get existing onboarding or create new one
      const existingResult = await this.getByUserId(userId);
      if (Result.isError(existingResult)) {
        return existingResult;
      }

      let onboarding = existingResult.value;
      if (!onboarding) {
        onboarding = OnboardingEntity.createNew(userId.value);
      }

      // Move to the step
      onboarding.moveToStep(step);

      // Update in database
      return await this.upsert(onboarding);
    } catch (error) {
      return Result.error(error as Error);
    }
  }

  async markCompleted(userId: UserId): Promise<Result<OnboardingEntity, Error>> {
    try {
      // Get existing onboarding
      const existingResult = await this.getByUserId(userId);
      if (Result.isError(existingResult)) {
        return existingResult;
      }

      if (!existingResult.value) {
        return Result.error(new Error('No onboarding found for user'));
      }

      const onboarding = existingResult.value;
      onboarding.moveToStep('complete');

      // Update in database
      return await this.upsert(onboarding);
    } catch (error) {
      return Result.error(error as Error);
    }
  }

  async delete(userId: UserId): Promise<Result<void, Error>> {
    try {
      const result = await this.db.deleteOnboarding(userId.value);

      if (result.error) {
        return Result.error(new Error(result.error.message));
      }

      return Result.ok(undefined);
    } catch (error) {
      return Result.error(error as Error);
    }
  }

  async getCompletionStats(): Promise<Result<{
    totalUsers: number;
    completedOnboarding: number;
    averageCompletionTime: number;
    stepCompletionRates: Record<OnboardingStep, number>;
    mostSkippedSteps: OnboardingStep[];
  }, Error>> {
    try {
      // This would require complex aggregation queries that aren't implemented yet
      // For now, return a placeholder implementation
      return Result.error(new Error('getCompletionStats not implemented yet'));
    } catch (error) {
      return Result.error(error as Error);
    }
  }

  async getIncompleteAfterDays(days: number): Promise<Result<OnboardingEntity[], Error>> {
    try {
      // This would require date-based queries that aren't implemented yet
      // For now, return a placeholder implementation
      return Result.error(new Error('getIncompleteAfterDays not implemented yet'));
    } catch (error) {
      return Result.error(error as Error);
    }
  }

  private mapDataToEntity(data: OnboardingData): OnboardingEntity {
    return OnboardingEntity.fromData(data);
  }

  private mapEntityToData(entity: OnboardingEntity): OnboardingData {
    return {
      id: entity.id,
      userId: entity.userId,
      currentStep: entity.currentStep,
      completedSteps: entity.completedSteps,
      profileCompletionPercentage: entity.profileCompletionPercentage,
      dataCollected: entity.dataCollected,
      languageSelected: entity.languageSelected,
      locationSet: entity.locationSet,
      prayerCalculationMethodSet: entity.prayerCalculationMethodSet,
      notificationsConfigured: entity.notificationsConfigured,
      privacyPreferencesSet: entity.privacyPreferencesSet,
      displayPreferencesSet: entity.displayPreferencesSet,
      isCompleted: entity.isCompleted,
      skippedSteps: entity.skippedSteps,
      completionDate: entity.completionDate?.toISOString() || null,
      startedAt: entity.startedAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }
}