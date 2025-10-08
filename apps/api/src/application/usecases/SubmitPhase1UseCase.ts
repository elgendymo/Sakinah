import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/result';
import { ISurveyRepository } from '@/domain/repositories/ISurveyRepository';
import { SurveyResponse } from '@/domain/entities/SurveyResponse';
import { SurveyProgress } from '@/domain/entities/SurveyProgress';
import { QuestionResponse } from '@/domain/value-objects/QuestionResponse';
import { UserId } from '@/domain/value-objects/UserId';
import { Phase1Request, LikertScore } from '@sakinah/types';

interface SubmitPhase1Params {
  userId: string;
  phase1Data: Phase1Request;
}

interface SubmitPhase1Result {
  saved: boolean;
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
  nextPhaseAvailable: boolean;
}

@injectable()
export class SubmitPhase1UseCase {
  constructor(
    @inject('ISurveyRepository') private surveyRepo: ISurveyRepository
  ) {}

  async execute(params: SubmitPhase1Params): Promise<Result<SubmitPhase1Result>> {
    try {
      const userId = new UserId(params.userId);

      // Get or create survey progress
      const progressResult = await this.surveyRepo.getSurveyProgress(userId);

      let progress: SurveyProgress;

      if (Result.isError(progressResult)) {
        return Result.error(new Error('Failed to get survey progress'));
      }

      if (!progressResult.value) {
        // Create new progress if none exists
        progress = SurveyProgress.createNew(params.userId);
        progress.advanceToPhase1(); // Start Phase 1
      } else {
        progress = progressResult.value;

        // Validate that user can submit Phase 1
        console.log('SubmitPhase1UseCase.execute - Validation check:', {
          currentPhase: progress.currentPhase,
          phase1Completed: progress.phase1Completed,
          condition: progress.currentPhase > 1 && progress.phase1Completed
        });

        if (progress.currentPhase > 1 && progress.phase1Completed) {
          console.log('SubmitPhase1UseCase.execute - Phase 1 already completed, returning error');
          return Result.error(new Error('Phase 1 has already been completed'));
        }

        if (progress.currentPhase < 1) {
          progress.advanceToPhase1();
        }
      }

      // Convert Phase1Request to QuestionResponse array
      const questionResponses = this.convertPhase1ToQuestionResponses(params.phase1Data);

      // Create SurveyResponse entities for each question
      const surveyResponses: SurveyResponse[] = [];

      for (const questionResponse of questionResponses) {
        const surveyResponse = SurveyResponse.fromQuestionResponse(
          params.userId,
          1, // Phase 1
          questionResponse
        );
        surveyResponses.push(surveyResponse);
      }

      // Save all responses in batch
      const saveResult = await this.surveyRepo.savePhaseResponses(surveyResponses);

      if (Result.isError(saveResult)) {
        console.error('Failed to save Phase 1 responses:', saveResult.error);
        return Result.error(new Error(`Failed to save Phase 1 responses: ${saveResult.error.message}`));
      }

      // Complete Phase 1 and advance to Phase 2
      progress.completePhase1();

      // Update progress
      const updateProgressResult = await this.surveyRepo.updateSurveyProgress(progress);

      if (Result.isError(updateProgressResult)) {
        console.error('Failed to update survey progress:', updateProgressResult.error);
        return Result.error(new Error(`Failed to update survey progress: ${updateProgressResult.error.message}`));
      }

      const result: SubmitPhase1Result = {
        saved: true,
        progress: progress.toDTO(),
        nextPhaseAvailable: true
      };

      return Result.ok(result);
    } catch (error) {
      return Result.error(error as Error);
    }
  }

  private convertPhase1ToQuestionResponses(data: Phase1Request): QuestionResponse[] {
    const responses: QuestionResponse[] = [];

    // Envy question
    responses.push(new QuestionResponse('envy', data.envyScore, data.envyNote));

    // Arrogance question
    responses.push(new QuestionResponse('arrogance', data.arroganceScore, data.arroganceNote));

    // Self-deception question
    responses.push(new QuestionResponse('selfDeception', data.selfDeceptionScore, data.selfDeceptionNote));

    // Lust question
    responses.push(new QuestionResponse('lust', data.lustScore, data.lustNote));

    return responses;
  }

  private validateLikertScore(score: number): score is LikertScore {
    return score >= 1 && score <= 5 && Number.isInteger(score);
  }

  private validatePhase1Data(data: Phase1Request): Result<void> {
    // Validate all required scores are valid Likert scores
    const scores = [data.envyScore, data.arroganceScore, data.selfDeceptionScore, data.lustScore];

    for (const score of scores) {
      if (!this.validateLikertScore(score)) {
        return Result.error(new Error(`Invalid Likert score: ${score}. Score must be between 1 and 5`));
      }
    }

    // Validate notes don't exceed maximum length
    const notes = [data.envyNote, data.arroganceNote, data.selfDeceptionNote, data.lustNote];

    for (const note of notes) {
      if (note && note.length > 1000) {
        return Result.error(new Error('Note cannot exceed 1000 characters'));
      }
    }

    return Result.ok(undefined);
  }
}