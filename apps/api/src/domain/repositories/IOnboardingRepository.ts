import { Result } from '@/shared/result';
import { OnboardingEntity, OnboardingStep, OnboardingCollectedData } from '../entities/Onboarding';
import { OnboardingId } from '../value-objects/OnboardingId';
import { UserId } from '../value-objects/UserId';

export interface IOnboardingRepository {
  /**
   * Create a new onboarding record for a user
   */
  create(onboarding: OnboardingEntity): Promise<Result<OnboardingEntity, Error>>;

  /**
   * Get onboarding record by user ID
   */
  getByUserId(userId: UserId): Promise<Result<OnboardingEntity | null, Error>>;

  /**
   * Get onboarding record by ID
   */
  getById(id: OnboardingId): Promise<Result<OnboardingEntity | null, Error>>;

  /**
   * Update onboarding record
   */
  update(onboarding: OnboardingEntity): Promise<Result<OnboardingEntity, Error>>;

  /**
   * Upsert onboarding record (create or update)
   */
  upsert(onboarding: OnboardingEntity): Promise<Result<OnboardingEntity, Error>>;

  /**
   * Complete an onboarding step
   */
  completeStep(
    userId: UserId,
    step: OnboardingStep,
    data?: OnboardingCollectedData
  ): Promise<Result<OnboardingEntity, Error>>;

  /**
   * Skip an onboarding step
   */
  skipStep(userId: UserId, step: OnboardingStep): Promise<Result<OnboardingEntity, Error>>;

  /**
   * Move to a specific onboarding step
   */
  moveToStep(userId: UserId, step: OnboardingStep): Promise<Result<OnboardingEntity, Error>>;

  /**
   * Mark onboarding as completed
   */
  markCompleted(userId: UserId): Promise<Result<OnboardingEntity, Error>>;

  /**
   * Delete onboarding record
   */
  delete(userId: UserId): Promise<Result<void, Error>>;

  /**
   * Get completion statistics
   */
  getCompletionStats(): Promise<Result<{
    totalUsers: number;
    completedOnboarding: number;
    averageCompletionTime: number; // in minutes
    stepCompletionRates: Record<OnboardingStep, number>;
    mostSkippedSteps: OnboardingStep[];
  }, Error>>;

  /**
   * Get users who haven't completed onboarding after a certain time
   */
  getIncompleteAfterDays(days: number): Promise<Result<OnboardingEntity[], Error>>;
}