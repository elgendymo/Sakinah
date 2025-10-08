import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/result';
import { ISurveyRepository } from '@/domain/repositories/ISurveyRepository';
import { SurveyResponse } from '@/domain/entities/SurveyResponse';
import { SurveyProgress } from '@/domain/entities/SurveyProgress';
import { QuestionResponse } from '@/domain/value-objects/QuestionResponse';
import { UserId } from '@/domain/value-objects/UserId';
import { Phase2Request, LikertScore } from '@sakinah/types';

interface SubmitPhase2Params {
  userId: string;
  phase2Data: Phase2Request;
}

interface SubmitPhase2Result {
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
export class SubmitPhase2UseCase {
  constructor(
    @inject('ISurveyRepository') private surveyRepo: ISurveyRepository
  ) {}

  async execute(params: SubmitPhase2Params): Promise<Result<SubmitPhase2Result>> {
    try {
      const userId = new UserId(params.userId);

      // Get survey progress
      const progressResult = await this.surveyRepo.getSurveyProgress(userId);

      if (Result.isError(progressResult)) {
        return Result.error(new Error('Failed to get survey progress'));
      }

      if (!progressResult.value) {
        return Result.error(new Error('Survey progress not found. Please start from Phase 1'));
      }

      const progress = progressResult.value;

      // Validate progression prerequisites
      if (!progress.phase1Completed) {
        return Result.error(new Error('Phase 1 must be completed before Phase 2'));
      }

      if (progress.currentPhase < 2) {
        return Result.error(new Error('Cannot submit Phase 2: not in Phase 2'));
      }

      if (progress.phase2Completed) {
        return Result.error(new Error('Phase 2 has already been completed'));
      }

      // Validate Phase 2 data
      const validationResult = this.validatePhase2Data(params.phase2Data);
      if (Result.isError(validationResult)) {
        return validationResult;
      }

      // Convert Phase2Request to QuestionResponse array
      const questionResponses = this.convertPhase2ToQuestionResponses(params.phase2Data);

      // Create SurveyResponse entities for each question
      const surveyResponses: SurveyResponse[] = [];

      for (const questionResponse of questionResponses) {
        const surveyResponse = SurveyResponse.fromQuestionResponse(
          params.userId,
          2, // Phase 2
          questionResponse
        );
        surveyResponses.push(surveyResponse);
      }

      // Save all responses in batch
      const saveResult = await this.surveyRepo.savePhaseResponses(surveyResponses);

      if (Result.isError(saveResult)) {
        return Result.error(new Error('Failed to save Phase 2 responses'));
      }

      // Complete Phase 2 and advance to Reflection phase
      progress.completePhase2();

      // Update progress
      const updateProgressResult = await this.surveyRepo.updateSurveyProgress(progress);

      if (Result.isError(updateProgressResult)) {
        return Result.error(new Error('Failed to update survey progress'));
      }

      const result: SubmitPhase2Result = {
        saved: true,
        progress: progress.toDTO(),
        nextPhaseAvailable: true
      };

      return Result.ok(result);
    } catch (error) {
      return Result.error(error as Error);
    }
  }

  private convertPhase2ToQuestionResponses(data: Phase2Request): QuestionResponse[] {
    const responses: QuestionResponse[] = [];

    // Anger question
    responses.push(new QuestionResponse('anger', data.angerScore, data.angerNote));

    // Malice question
    responses.push(new QuestionResponse('malice', data.maliceScore, data.maliceNote));

    // Backbiting question
    responses.push(new QuestionResponse('backbiting', data.backbitingScore, data.backbitingNote));

    // Suspicion question
    responses.push(new QuestionResponse('suspicion', data.suspicionScore, data.suspicionNote));

    // Love of Dunya question
    responses.push(new QuestionResponse('loveOfDunya', data.loveOfDunyaScore, data.loveOfDunyaNote));

    // Laziness question
    responses.push(new QuestionResponse('laziness', data.lazinessScore, data.lazinessNote));

    // Despair question
    responses.push(new QuestionResponse('despair', data.despairScore, data.despairNote));

    return responses;
  }

  private validateLikertScore(score: number): score is LikertScore {
    return score >= 1 && score <= 5 && Number.isInteger(score);
  }

  private validatePhase2Data(data: Phase2Request): Result<void> {
    // Validate all required scores are valid Likert scores
    const scores = [
      data.angerScore,
      data.maliceScore,
      data.backbitingScore,
      data.suspicionScore,
      data.loveOfDunyaScore,
      data.lazinessScore,
      data.despairScore
    ];

    for (const score of scores) {
      if (!this.validateLikertScore(score)) {
        return Result.error(new Error(`Invalid Likert score: ${score}. Score must be between 1 and 5`));
      }
    }

    // Validate notes don't exceed maximum length
    const notes = [
      data.angerNote,
      data.maliceNote,
      data.backbitingNote,
      data.suspicionNote,
      data.loveOfDunyaNote,
      data.lazinessNote,
      data.despairNote
    ];

    for (const note of notes) {
      if (note && note.length > 1000) {
        return Result.error(new Error('Note cannot exceed 1000 characters'));
      }
    }

    return Result.ok(undefined);
  }
}