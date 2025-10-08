import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/result';
import { ISurveyRepository } from '@/domain/repositories/ISurveyRepository';
import { SurveyProgress } from '@/domain/entities/SurveyProgress';
import { UserId } from '@/domain/value-objects/UserId';

interface ValidateSurveyProgressParams {
  userId: string;
  targetPhase: number;
}

interface SurveyProgressValidationResult {
  canAccess: boolean;
  currentPhase: number;
  nextAvailablePhase: number;
  redirectToPhase?: number;
  message?: string;
  progress: {
    userId: string;
    currentPhase: number;
    phase1Completed: boolean;
    phase2Completed: boolean;
    reflectionCompleted: boolean;
    resultsGenerated: boolean;
    isCompleted: boolean;
    progressPercentage: number;
    nextAvailablePhase: number;
    startedAt: string;
    lastUpdated: string;
  };
}

@injectable()
export class ValidateSurveyProgressUseCase {
  constructor(
    @inject('ISurveyRepository') private surveyRepo: ISurveyRepository
  ) {}

  async execute(params: ValidateSurveyProgressParams): Promise<Result<SurveyProgressValidationResult>> {
    try {
      const userId = new UserId(params.userId);

      // Get survey progress
      const progressResult = await this.surveyRepo.getSurveyProgress(userId);

      let progress: SurveyProgress;

      if (Result.isError(progressResult)) {
        return Result.error(new Error('Failed to get survey progress'));
      }

      if (!progressResult.value) {
        // Create new progress if none exists - user is starting the survey
        progress = SurveyProgress.createNew(params.userId);

        // Save the new progress
        const saveResult = await this.surveyRepo.saveSurveyProgress(progress);
        if (Result.isError(saveResult)) {
          return Result.error(new Error('Failed to initialize survey progress'));
        }
      } else {
        progress = progressResult.value;
      }

      // Validate access to target phase
      const validationResult = this.validatePhaseAccess(progress, params.targetPhase);

      return Result.ok(validationResult);
    } catch (error) {
      return Result.error(error as Error);
    }
  }

  private validatePhaseAccess(progress: SurveyProgress, targetPhase: number): SurveyProgressValidationResult {
    const currentPhase = progress.currentPhase;
    const nextAvailablePhase = progress.getNextAvailablePhase();

    // Phase access rules:
    // Phase 0 (Welcome): Always accessible
    // Phase 1: Accessible from phase 0 or if already started
    // Phase 2: Only accessible if phase 1 is completed
    // Phase 3 (Reflection): Only accessible if phase 2 is completed
    // Phase 4 (Results): Only accessible if reflection is completed

    let canAccess = false;
    let redirectToPhase: number | undefined;
    let message: string | undefined;

    switch (targetPhase) {
      case 0: // Welcome phase
        canAccess = true;
        break;

      case 1: // Phase 1
        if (currentPhase === 0 || (currentPhase >= 1 && !progress.phase1Completed)) {
          canAccess = true;
        } else if (progress.phase1Completed) {
          canAccess = false; // Redirect to next available phase instead of allowing re-access
          redirectToPhase = nextAvailablePhase;
          message = 'Phase 1 has already been completed. Redirecting to next available phase.';
        } else {
          canAccess = false;
          redirectToPhase = 0;
          message = 'Please start from the welcome phase';
        }
        break;

      case 2: // Phase 2
        if (!progress.phase1Completed) {
          canAccess = false;
          redirectToPhase = nextAvailablePhase;
          message = 'Phase 1 must be completed before accessing Phase 2';
        } else if (progress.phase2Completed) {
          canAccess = false; // Redirect to next available phase instead of allowing re-access
          redirectToPhase = nextAvailablePhase;
          message = 'Phase 2 has already been completed. Redirecting to next available phase.';
        } else if (currentPhase >= 2 || progress.phase1Completed) {
          canAccess = true;
        }
        break;

      case 3: // Reflection phase
        if (!progress.phase1Completed || !progress.phase2Completed) {
          canAccess = false;
          redirectToPhase = nextAvailablePhase;
          message = 'Both Phase 1 and Phase 2 must be completed before accessing the reflection phase';
        } else if (progress.reflectionCompleted) {
          canAccess = false; // Redirect to next available phase instead of allowing re-access
          redirectToPhase = nextAvailablePhase;
          message = 'Reflection has already been completed. Redirecting to next available phase.';
        } else if (currentPhase >= 3 || (progress.phase1Completed && progress.phase2Completed)) {
          canAccess = true;
        }
        break;

      case 4: // Results phase
        if (!progress.phase1Completed || !progress.phase2Completed || !progress.reflectionCompleted) {
          canAccess = false;
          redirectToPhase = nextAvailablePhase;
          message = 'All previous phases must be completed before accessing results';
        } else {
          canAccess = true;
          if (progress.resultsGenerated) {
            message = 'Survey has been completed';
          }
        }
        break;

      default:
        canAccess = false;
        redirectToPhase = nextAvailablePhase;
        message = 'Invalid phase requested';
        break;
    }

    return {
      canAccess,
      currentPhase,
      nextAvailablePhase,
      redirectToPhase,
      message,
      progress: progress.toDTO()
    };
  }

  /**
   * Get user's current survey progress without validation
   */
  async getCurrentProgress(userId: string): Promise<Result<SurveyProgressValidationResult>> {
    try {
      const userIdVO = new UserId(userId);

      const progressResult = await this.surveyRepo.getSurveyProgress(userIdVO);

      let progress: SurveyProgress;

      if (Result.isError(progressResult)) {
        return Result.error(new Error('Failed to get survey progress'));
      }

      if (!progressResult.value) {
        // Create new progress if none exists
        progress = SurveyProgress.createNew(userId);

        const saveResult = await this.surveyRepo.saveSurveyProgress(progress);
        if (Result.isError(saveResult)) {
          return Result.error(new Error('Failed to initialize survey progress'));
        }
      } else {
        progress = progressResult.value;
      }

      return Result.ok({
        canAccess: true,
        currentPhase: progress.currentPhase,
        nextAvailablePhase: progress.getNextAvailablePhase(),
        progress: progress.toDTO()
      });
    } catch (error) {
      return Result.error(error as Error);
    }
  }

  /**
   * Advance user to the next phase (used by welcome page)
   */
  async advanceToNextPhase(userId: string): Promise<Result<SurveyProgressValidationResult>> {
    try {
      const userIdVO = new UserId(userId);

      const progressResult = await this.surveyRepo.getSurveyProgress(userIdVO);

      if (Result.isError(progressResult)) {
        return Result.error(new Error('Failed to get survey progress'));
      }

      if (!progressResult.value) {
        return Result.error(new Error('Survey progress not found'));
      }

      const progress = progressResult.value;

      // Advance to phase 1 if currently in welcome phase
      if (progress.currentPhase === 0) {
        progress.advanceToPhase1();

        const updateResult = await this.surveyRepo.updateSurveyProgress(progress);
        if (Result.isError(updateResult)) {
          return Result.error(new Error('Failed to update survey progress'));
        }
      }

      return Result.ok({
        canAccess: true,
        currentPhase: progress.currentPhase,
        nextAvailablePhase: progress.getNextAvailablePhase(),
        progress: progress.toDTO()
      });
    } catch (error) {
      return Result.error(error as Error);
    }
  }
}