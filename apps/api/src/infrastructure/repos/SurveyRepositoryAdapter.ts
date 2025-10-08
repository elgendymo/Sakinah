import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/result';
import { createAppError, ErrorCode } from '@/shared/errors';
import { ISurveyRepository } from '@/domain/repositories/ISurveyRepository';
import { SurveyResponse } from '@/domain/entities/SurveyResponse';
import { SurveyResult, Disease, LikertScore, ReflectionAnswer } from '@/domain/entities/SurveyResult';
import { SurveyProgress } from '@/domain/entities/SurveyProgress';
import { UserId } from '@/domain/value-objects/UserId';
import { SurveyResponseId } from '@/domain/value-objects/SurveyResponseId';
import { SurveyResultId } from '@/domain/value-objects/SurveyResultId';
import { QuestionResponse } from '@/domain/value-objects/QuestionResponse';
import { IDatabaseClient } from '../database/types';

@injectable()
export class SurveyRepositoryAdapter implements ISurveyRepository {
  constructor(
    @inject('IDatabaseClient') private db: IDatabaseClient
  ) {}

  async saveSurveyResponse(response: SurveyResponse): Promise<Result<SurveyResponse>> {
    try {
      const result = await this.db.createSurveyResponse({
        userId: response.userId.toString(),
        phaseNumber: response.phaseNumber,
        questionId: response.questionId,
        score: response.score,
        note: response.note
      });

      if (result.error) {
        return Result.error(createAppError(
          ErrorCode.DATABASE_ERROR,
          result.error.message
        ));
      }

      const created = SurveyResponse.create({
        id: result.data!.id,
        userId: result.data!.userId,
        phaseNumber: result.data!.phaseNumber,
        questionId: result.data!.questionId,
        score: result.data!.score,
        note: result.data!.note,
        completedAt: new Date(result.data!.completedAt),
        createdAt: new Date(result.data!.createdAt)
      });

      return Result.ok(created);
    } catch (error) {
      return Result.error(createAppError(
        ErrorCode.DATABASE_ERROR,
        error instanceof Error ? error.message : 'Unknown error occurred',
        error instanceof Error ? error : undefined
      ));
    }
  }

  async getSurveyResponse(id: SurveyResponseId): Promise<Result<SurveyResponse | null>> {
    try {
      const result = await this.db.getSurveyResponseById(id.toString());

      if (result.error) {
        return Result.error(createAppError(
          ErrorCode.DATABASE_ERROR,
          result.error.message
        ));
      }

      if (!result.data) {
        return Result.ok(null);
      }

      const response = SurveyResponse.create({
        id: result.data.id,
        userId: result.data.userId,
        phaseNumber: result.data.phaseNumber,
        questionId: result.data.questionId,
        score: result.data.score,
        note: result.data.note,
        completedAt: new Date(result.data.completedAt),
        createdAt: new Date(result.data.createdAt)
      });

      return Result.ok(response);
    } catch (error) {
      return Result.error(createAppError(
        ErrorCode.DATABASE_ERROR,
        error instanceof Error ? error.message : 'Unknown error occurred',
        error instanceof Error ? error : undefined
      ));
    }
  }

  async getSurveyResponsesByPhase(userId: UserId, phaseNumber: number): Promise<Result<SurveyResponse[]>> {
    try {
      const result = await this.db.getSurveyResponsesByPhase(userId.toString(), phaseNumber);

      if (result.error) {
        return Result.error(createAppError(
          ErrorCode.DATABASE_ERROR,
          result.error.message
        ));
      }

      const responses = result.data!.map(data =>
        SurveyResponse.create({
          id: data.id,
          userId: data.userId,
          phaseNumber: data.phaseNumber,
          questionId: data.questionId,
          score: data.score,
          note: data.note,
          completedAt: new Date(data.completedAt),
          createdAt: new Date(data.createdAt)
        })
      );

      return Result.ok(responses);
    } catch (error) {
      return Result.error(createAppError(
        ErrorCode.DATABASE_ERROR,
        error instanceof Error ? error.message : 'Unknown error occurred',
        error instanceof Error ? error : undefined
      ));
    }
  }

  async getAllSurveyResponses(userId: UserId): Promise<Result<SurveyResponse[]>> {
    try {
      const result = await this.db.getAllSurveyResponses(userId.toString());

      if (result.error) {
        return Result.error(createAppError(
          ErrorCode.DATABASE_ERROR,
          result.error.message
        ));
      }

      const responses = result.data!.map(data =>
        SurveyResponse.create({
          id: data.id,
          userId: data.userId,
          phaseNumber: data.phaseNumber,
          questionId: data.questionId,
          score: data.score,
          note: data.note,
          completedAt: new Date(data.completedAt),
          createdAt: new Date(data.createdAt)
        })
      );

      return Result.ok(responses);
    } catch (error) {
      return Result.error(createAppError(
        ErrorCode.DATABASE_ERROR,
        error instanceof Error ? error.message : 'Unknown error occurred',
        error instanceof Error ? error : undefined
      ));
    }
  }

  async updateSurveyResponse(response: SurveyResponse): Promise<Result<SurveyResponse>> {
    try {
      const result = await this.db.updateSurveyResponse(
        response.id.toString(),
        response.userId.toString(),
        {
          score: response.score,
          note: response.note
        }
      );

      if (result.error) {
        return Result.error(createAppError(
          ErrorCode.DATABASE_ERROR,
          result.error.message
        ));
      }

      const updated = SurveyResponse.create({
        id: result.data!.id,
        userId: result.data!.userId,
        phaseNumber: result.data!.phaseNumber,
        questionId: result.data!.questionId,
        score: result.data!.score,
        note: result.data!.note,
        completedAt: new Date(result.data!.completedAt),
        createdAt: new Date(result.data!.createdAt)
      });

      return Result.ok(updated);
    } catch (error) {
      return Result.error(createAppError(
        ErrorCode.DATABASE_ERROR,
        error instanceof Error ? error.message : 'Unknown error occurred',
        error instanceof Error ? error : undefined
      ));
    }
  }

  async deleteSurveyResponse(id: SurveyResponseId): Promise<Result<void>> {
    try {
      const result = await this.db.deleteSurveyResponse(id.toString(), '');

      if (result.error) {
        return Result.error(createAppError(
          ErrorCode.DATABASE_ERROR,
          result.error.message
        ));
      }

      return Result.ok(undefined);
    } catch (error) {
      return Result.error(createAppError(
        ErrorCode.DATABASE_ERROR,
        error instanceof Error ? error.message : 'Unknown error occurred',
        error instanceof Error ? error : undefined
      ));
    }
  }

  async saveSurveyResult(result: SurveyResult): Promise<Result<SurveyResult>> {
    try {
      // Convert Map to Record for database storage
      const diseaseScoresRecord: Record<string, number> = {};
      result.diseaseScores.forEach((score, disease) => {
        diseaseScoresRecord[disease] = score;
      });

      const dbResult = await this.db.createSurveyResult({
        userId: result.userId.toString(),
        diseaseScores: diseaseScoresRecord,
        criticalDiseases: result.criticalDiseases,
        reflectionAnswers: result.reflectionAnswers,
        personalizedHabits: result.personalizedHabits,
        tazkiyahPlan: result.tazkiyahPlan,
        radarChartData: result.radarChartData
      });

      if (dbResult.error) {
        return Result.error(createAppError(
          ErrorCode.DATABASE_ERROR,
          dbResult.error.message
        ));
      }

      const created = SurveyResult.create({
        id: dbResult.data!.id,
        userId: dbResult.data!.userId,
        diseaseScores: dbResult.data!.diseaseScores as Record<Disease, LikertScore>,
        reflectionAnswers: {
          strongestStruggle: dbResult.data!.reflectionAnswers.strongestStruggle || '',
          dailyHabit: dbResult.data!.reflectionAnswers.dailyHabit || ''
        } as ReflectionAnswer,
        personalizedHabits: dbResult.data!.personalizedHabits,
        tazkiyahPlan: dbResult.data!.tazkiyahPlan,
        radarChartData: dbResult.data!.radarChartData,
        generatedAt: new Date(dbResult.data!.generatedAt),
        updatedAt: new Date(dbResult.data!.updatedAt)
      });

      return Result.ok(created);
    } catch (error) {
      return Result.error(createAppError(
        ErrorCode.DATABASE_ERROR,
        error instanceof Error ? error.message : 'Unknown error occurred',
        error instanceof Error ? error : undefined
      ));
    }
  }

  async getSurveyResult(userId: UserId): Promise<Result<SurveyResult | null>> {
    try {
      const dbResult = await this.db.getSurveyResultByUserId(userId.toString());

      if (dbResult.error) {
        return Result.error(createAppError(
          ErrorCode.DATABASE_ERROR,
          dbResult.error.message
        ));
      }

      if (!dbResult.data) {
        return Result.ok(null);
      }

      const surveyResult = SurveyResult.create({
        id: dbResult.data.id,
        userId: dbResult.data.userId,
        diseaseScores: dbResult.data.diseaseScores as Record<Disease, LikertScore>,
        reflectionAnswers: {
          strongestStruggle: dbResult.data.reflectionAnswers.strongestStruggle || '',
          dailyHabit: dbResult.data.reflectionAnswers.dailyHabit || ''
        } as ReflectionAnswer,
        personalizedHabits: dbResult.data.personalizedHabits,
        tazkiyahPlan: dbResult.data.tazkiyahPlan,
        radarChartData: dbResult.data.radarChartData,
        generatedAt: new Date(dbResult.data.generatedAt),
        updatedAt: new Date(dbResult.data.updatedAt)
      });

      return Result.ok(surveyResult);
    } catch (error) {
      return Result.error(createAppError(
        ErrorCode.DATABASE_ERROR,
        error instanceof Error ? error.message : 'Unknown error occurred',
        error instanceof Error ? error : undefined
      ));
    }
  }

  async getSurveyResultById(id: SurveyResultId): Promise<Result<SurveyResult | null>> {
    try {
      const dbResult = await this.db.getSurveyResultById(id.toString());

      if (dbResult.error) {
        return Result.error(createAppError(
          ErrorCode.DATABASE_ERROR,
          dbResult.error.message
        ));
      }

      if (!dbResult.data) {
        return Result.ok(null);
      }

      const surveyResult = SurveyResult.create({
        id: dbResult.data.id,
        userId: dbResult.data.userId,
        diseaseScores: dbResult.data.diseaseScores as Record<Disease, LikertScore>,
        reflectionAnswers: {
          strongestStruggle: dbResult.data.reflectionAnswers.strongestStruggle || '',
          dailyHabit: dbResult.data.reflectionAnswers.dailyHabit || ''
        } as ReflectionAnswer,
        personalizedHabits: dbResult.data.personalizedHabits,
        tazkiyahPlan: dbResult.data.tazkiyahPlan,
        radarChartData: dbResult.data.radarChartData,
        generatedAt: new Date(dbResult.data.generatedAt),
        updatedAt: new Date(dbResult.data.updatedAt)
      });

      return Result.ok(surveyResult);
    } catch (error) {
      return Result.error(createAppError(
        ErrorCode.DATABASE_ERROR,
        error instanceof Error ? error.message : 'Unknown error occurred',
        error instanceof Error ? error : undefined
      ));
    }
  }

  async updateSurveyResult(result: SurveyResult): Promise<Result<SurveyResult>> {
    try {
      // Convert Map to Record for database storage
      const diseaseScoresRecord: Record<string, number> = {};
      result.diseaseScores.forEach((score, disease) => {
        diseaseScoresRecord[disease] = score;
      });

      const dbResult = await this.db.updateSurveyResult(
        result.userId.toString(),
        {
          diseaseScores: diseaseScoresRecord,
          criticalDiseases: result.criticalDiseases,
          reflectionAnswers: result.reflectionAnswers,
          personalizedHabits: result.personalizedHabits,
          tazkiyahPlan: result.tazkiyahPlan,
          radarChartData: result.radarChartData
        }
      );

      if (dbResult.error) {
        return Result.error(createAppError(
          ErrorCode.DATABASE_ERROR,
          dbResult.error.message
        ));
      }

      const updated = SurveyResult.create({
        id: dbResult.data!.id,
        userId: dbResult.data!.userId,
        diseaseScores: dbResult.data!.diseaseScores as Record<Disease, LikertScore>,
        reflectionAnswers: {
          strongestStruggle: dbResult.data!.reflectionAnswers.strongestStruggle || '',
          dailyHabit: dbResult.data!.reflectionAnswers.dailyHabit || ''
        } as ReflectionAnswer,
        personalizedHabits: dbResult.data!.personalizedHabits,
        tazkiyahPlan: dbResult.data!.tazkiyahPlan,
        radarChartData: dbResult.data!.radarChartData,
        generatedAt: new Date(dbResult.data!.generatedAt),
        updatedAt: new Date(dbResult.data!.updatedAt)
      });

      return Result.ok(updated);
    } catch (error) {
      return Result.error(createAppError(
        ErrorCode.DATABASE_ERROR,
        error instanceof Error ? error.message : 'Unknown error occurred',
        error instanceof Error ? error : undefined
      ));
    }
  }

  async deleteSurveyResult(userId: UserId): Promise<Result<void>> {
    try {
      const result = await this.db.deleteSurveyResult(userId.toString());

      if (result.error) {
        return Result.error(createAppError(
          ErrorCode.DATABASE_ERROR,
          result.error.message
        ));
      }

      return Result.ok(undefined);
    } catch (error) {
      return Result.error(createAppError(
        ErrorCode.DATABASE_ERROR,
        error instanceof Error ? error.message : 'Unknown error occurred',
        error instanceof Error ? error : undefined
      ));
    }
  }

  async saveSurveyProgress(progress: SurveyProgress): Promise<Result<SurveyProgress>> {
    try {
      const result = await this.db.createSurveyProgress({
        userId: progress.userId.toString(),
        currentPhase: progress.currentPhase,
        phase1Completed: progress.phase1Completed,
        phase2Completed: progress.phase2Completed,
        reflectionCompleted: progress.reflectionCompleted,
        resultsGenerated: progress.resultsGenerated
      });

      if (result.error) {
        return Result.error(createAppError(
          ErrorCode.DATABASE_ERROR,
          result.error.message
        ));
      }

      const created = SurveyProgress.create({
        userId: result.data!.userId,
        currentPhase: result.data!.currentPhase,
        phase1Completed: result.data!.phase1Completed,
        phase2Completed: result.data!.phase2Completed,
        reflectionCompleted: result.data!.reflectionCompleted,
        resultsGenerated: result.data!.resultsGenerated,
        startedAt: new Date(result.data!.startedAt),
        lastUpdated: new Date(result.data!.lastUpdated)
      });

      return Result.ok(created);
    } catch (error) {
      return Result.error(createAppError(
        ErrorCode.DATABASE_ERROR,
        error instanceof Error ? error.message : 'Unknown error occurred',
        error instanceof Error ? error : undefined
      ));
    }
  }

  async getSurveyProgress(userId: UserId): Promise<Result<SurveyProgress | null>> {
    try {
      const result = await this.db.getSurveyProgressByUserId(userId.toString());

      if (result.error) {
        return Result.error(createAppError(
          ErrorCode.DATABASE_ERROR,
          result.error.message
        ));
      }

      if (!result.data) {
        return Result.ok(null);
      }

      const progress = SurveyProgress.create({
        userId: result.data.userId,
        currentPhase: result.data.currentPhase,
        phase1Completed: result.data.phase1Completed,
        phase2Completed: result.data.phase2Completed,
        reflectionCompleted: result.data.reflectionCompleted,
        resultsGenerated: result.data.resultsGenerated,
        startedAt: new Date(result.data.startedAt),
        lastUpdated: new Date(result.data.lastUpdated)
      });

      return Result.ok(progress);
    } catch (error) {
      return Result.error(createAppError(
        ErrorCode.DATABASE_ERROR,
        error instanceof Error ? error.message : 'Unknown error occurred',
        error instanceof Error ? error : undefined
      ));
    }
  }

  async updateSurveyProgress(progress: SurveyProgress): Promise<Result<SurveyProgress>> {
    try {
      const result = await this.db.updateSurveyProgress(
        progress.userId.toString(),
        {
          currentPhase: progress.currentPhase,
          phase1Completed: progress.phase1Completed,
          phase2Completed: progress.phase2Completed,
          reflectionCompleted: progress.reflectionCompleted,
          resultsGenerated: progress.resultsGenerated
        }
      );

      if (result.error) {
        return Result.error(createAppError(
          ErrorCode.DATABASE_ERROR,
          result.error.message
        ));
      }

      const updated = SurveyProgress.create({
        userId: result.data!.userId,
        currentPhase: result.data!.currentPhase,
        phase1Completed: result.data!.phase1Completed,
        phase2Completed: result.data!.phase2Completed,
        reflectionCompleted: result.data!.reflectionCompleted,
        resultsGenerated: result.data!.resultsGenerated,
        startedAt: new Date(result.data!.startedAt),
        lastUpdated: new Date(result.data!.lastUpdated)
      });

      return Result.ok(updated);
    } catch (error) {
      return Result.error(createAppError(
        ErrorCode.DATABASE_ERROR,
        error instanceof Error ? error.message : 'Unknown error occurred',
        error instanceof Error ? error : undefined
      ));
    }
  }

  async deleteSurveyProgress(userId: UserId): Promise<Result<void>> {
    try {
      const result = await this.db.deleteSurveyProgress(userId.toString());

      if (result.error) {
        return Result.error(createAppError(
          ErrorCode.DATABASE_ERROR,
          result.error.message
        ));
      }

      return Result.ok(undefined);
    } catch (error) {
      return Result.error(createAppError(
        ErrorCode.DATABASE_ERROR,
        error instanceof Error ? error.message : 'Unknown error occurred',
        error instanceof Error ? error : undefined
      ));
    }
  }

  async hasUserCompletedSurvey(userId: UserId): Promise<Result<boolean>> {
    try {
      const result = await this.db.hasUserCompletedSurvey(userId.toString());

      if (result.error) {
        return Result.error(createAppError(
          ErrorCode.DATABASE_ERROR,
          result.error.message
        ));
      }

      return Result.ok(result.data!);
    } catch (error) {
      return Result.error(createAppError(
        ErrorCode.DATABASE_ERROR,
        error instanceof Error ? error.message : 'Unknown error occurred',
        error instanceof Error ? error : undefined
      ));
    }
  }

  async getPhaseCompletionStatus(userId: UserId): Promise<Result<{
    phase1Completed: boolean;
    phase2Completed: boolean;
    reflectionCompleted: boolean;
    resultsGenerated: boolean;
  }>> {
    try {
      const result = await this.db.getPhaseCompletionStatus(userId.toString());

      if (result.error) {
        return Result.error(createAppError(
          ErrorCode.DATABASE_ERROR,
          result.error.message
        ));
      }

      return Result.ok(result.data!);
    } catch (error) {
      return Result.error(createAppError(
        ErrorCode.DATABASE_ERROR,
        error instanceof Error ? error.message : 'Unknown error occurred',
        error instanceof Error ? error : undefined
      ));
    }
  }

  async savePhaseResponses(responses: SurveyResponse[]): Promise<Result<SurveyResponse[]>> {
    try {
      console.log('SurveyRepositoryAdapter.savePhaseResponses - Input responses:', responses.length);
      const responseData = responses.map(r => ({
        userId: r.userId.toString(),
        phaseNumber: r.phaseNumber,
        questionId: r.questionId,
        score: r.score,
        note: r.note
      }));
      console.log('SurveyRepositoryAdapter.savePhaseResponses - Mapped data:', JSON.stringify(responseData, null, 2));

      const result = await this.db.savePhaseResponses(responseData);
      console.log('SurveyRepositoryAdapter.savePhaseResponses - Database result:', JSON.stringify(result, null, 2));

      if (result.error) {
        console.error('SurveyRepositoryAdapter.savePhaseResponses - Database error:', result.error);
        return Result.error(createAppError(
          ErrorCode.DATABASE_ERROR,
          result.error.message
        ));
      }

      console.log('SurveyRepositoryAdapter.savePhaseResponses - About to map saved responses:', result.data?.length);
      const savedResponses = result.data!.map((data, index) => {
        console.log(`SurveyRepositoryAdapter.savePhaseResponses - Mapping response ${index}:`, JSON.stringify(data, null, 2));
        return SurveyResponse.create({
          id: data.id,
          userId: data.userId,
          phaseNumber: data.phaseNumber,
          questionId: data.questionId,
          score: data.score,
          note: data.note,
          completedAt: new Date(data.completedAt),
          createdAt: new Date(data.createdAt)
        });
      });

      return Result.ok(savedResponses);
    } catch (error) {
      return Result.error(createAppError(
        ErrorCode.DATABASE_ERROR,
        error instanceof Error ? error.message : 'Unknown error occurred',
        error instanceof Error ? error : undefined
      ));
    }
  }

  async getUserSurveyData(userId: UserId): Promise<Result<{
    responses: SurveyResponse[];
    results: SurveyResult | null;
    progress: SurveyProgress | null;
  }>> {
    try {
      const result = await this.db.getUserSurveyData(userId.toString());

      if (result.error) {
        return Result.error(createAppError(
          ErrorCode.DATABASE_ERROR,
          result.error.message
        ));
      }

      const responses = result.data!.responses.map(data =>
        SurveyResponse.create({
          id: data.id,
          userId: data.userId,
          phaseNumber: data.phaseNumber,
          questionId: data.questionId,
          score: data.score,
          note: data.note,
          completedAt: new Date(data.completedAt),
          createdAt: new Date(data.createdAt)
        })
      );

      let surveyResult: SurveyResult | null = null;
      if (result.data!.result) {
        surveyResult = SurveyResult.create({
          id: result.data!.result.id,
          userId: result.data!.result.userId,
          diseaseScores: result.data!.result.diseaseScores as Record<Disease, LikertScore>,
          reflectionAnswers: {
            strongestStruggle: result.data!.result.reflectionAnswers.strongestStruggle || '',
            dailyHabit: result.data!.result.reflectionAnswers.dailyHabit || ''
          } as ReflectionAnswer,
          personalizedHabits: result.data!.result.personalizedHabits,
          tazkiyahPlan: result.data!.result.tazkiyahPlan,
          radarChartData: result.data!.result.radarChartData,
          generatedAt: new Date(result.data!.result.generatedAt),
          updatedAt: new Date(result.data!.result.updatedAt)
        });
      }

      let progress: SurveyProgress | null = null;
      if (result.data!.progress) {
        progress = SurveyProgress.create({
          userId: result.data!.progress.userId,
          currentPhase: result.data!.progress.currentPhase,
          phase1Completed: result.data!.progress.phase1Completed,
          phase2Completed: result.data!.progress.phase2Completed,
          reflectionCompleted: result.data!.progress.reflectionCompleted,
          resultsGenerated: result.data!.progress.resultsGenerated,
          startedAt: new Date(result.data!.progress.startedAt),
          lastUpdated: new Date(result.data!.progress.lastUpdated)
        });
      }

      return Result.ok({
        responses,
        results: surveyResult,
        progress
      });
    } catch (error) {
      return Result.error(createAppError(
        ErrorCode.DATABASE_ERROR,
        error instanceof Error ? error.message : 'Unknown error occurred',
        error instanceof Error ? error : undefined
      ));
    }
  }

  async getSurveyCompletionStats(): Promise<Result<{
    totalUsers: number;
    completedSurveys: number;
    averageCompletionTime: number;
    phaseDropoffRates: Record<number, number>;
  }>> {
    return Result.error(createAppError(
      ErrorCode.DATABASE_ERROR,
      'Survey completion stats not yet implemented'
    ));
  }
}