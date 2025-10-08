import { Result } from '../../shared/result';
import { SurveyResponse } from '../entities/SurveyResponse';
import { SurveyResult } from '../entities/SurveyResult';
import { SurveyProgress } from '../entities/SurveyProgress';
import { UserId } from '../value-objects/UserId';
import { SurveyResponseId } from '../value-objects/SurveyResponseId';
import { SurveyResultId } from '../value-objects/SurveyResultId';

export interface ISurveyRepository {
  // Survey Responses
  saveSurveyResponse(response: SurveyResponse): Promise<Result<SurveyResponse>>;
  getSurveyResponse(id: SurveyResponseId): Promise<Result<SurveyResponse | null>>;
  getSurveyResponsesByPhase(userId: UserId, phaseNumber: number): Promise<Result<SurveyResponse[]>>;
  getAllSurveyResponses(userId: UserId): Promise<Result<SurveyResponse[]>>;
  updateSurveyResponse(response: SurveyResponse): Promise<Result<SurveyResponse>>;
  deleteSurveyResponse(id: SurveyResponseId): Promise<Result<void>>;

  // Survey Results
  saveSurveyResult(result: SurveyResult): Promise<Result<SurveyResult>>;
  getSurveyResult(userId: UserId): Promise<Result<SurveyResult | null>>;
  getSurveyResultById(id: SurveyResultId): Promise<Result<SurveyResult | null>>;
  updateSurveyResult(result: SurveyResult): Promise<Result<SurveyResult>>;
  deleteSurveyResult(userId: UserId): Promise<Result<void>>;

  // Survey Progress
  saveSurveyProgress(progress: SurveyProgress): Promise<Result<SurveyProgress>>;
  getSurveyProgress(userId: UserId): Promise<Result<SurveyProgress | null>>;
  updateSurveyProgress(progress: SurveyProgress): Promise<Result<SurveyProgress>>;
  deleteSurveyProgress(userId: UserId): Promise<Result<void>>;

  // Survey Flow Management
  hasUserCompletedSurvey(userId: UserId): Promise<Result<boolean>>;
  getPhaseCompletionStatus(userId: UserId): Promise<Result<{
    phase1Completed: boolean;
    phase2Completed: boolean;
    reflectionCompleted: boolean;
    resultsGenerated: boolean;
  }>>;

  // Batch Operations
  savePhaseResponses(responses: SurveyResponse[]): Promise<Result<SurveyResponse[]>>;
  getUserSurveyData(userId: UserId): Promise<Result<{
    responses: SurveyResponse[];
    results: SurveyResult | null;
    progress: SurveyProgress | null;
  }>>;

  // Analytics (for future admin features)
  getSurveyCompletionStats(): Promise<Result<{
    totalUsers: number;
    completedSurveys: number;
    averageCompletionTime: number;
    phaseDropoffRates: Record<number, number>;
  }>>;
}