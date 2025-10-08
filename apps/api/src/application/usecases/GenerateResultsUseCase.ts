import { injectable, inject } from 'tsyringe';
import { ISurveyRepository } from '@/domain/repositories/ISurveyRepository';
import { ISurveyAiProvider } from '@/domain/providers/ISurveyAiProvider';
import { SurveyResult } from '@/domain/entities/SurveyResult';
import { UserId } from '@/domain/value-objects/UserId';
import { Result } from '@/shared/result';
import { createAppError, ErrorCode } from '@/shared/errors';
import type { Disease, LikertScore, ChartData } from '@sakinah/types';

export interface GenerateResultsRequest {
  userId: string;
}

export interface GenerateResultsResponse {
  results: SurveyResult;
  exportOptions: Array<{
    format: 'pdf' | 'json';
    url: string;
  }>;
}

@injectable()
export class GenerateResultsUseCase {
  constructor(
    @inject('ISurveyRepository') private surveyRepository: ISurveyRepository,
    @inject('ISurveyAiProvider') private aiProvider: ISurveyAiProvider
  ) {}

  async execute(request: GenerateResultsRequest): Promise<Result<GenerateResultsResponse>> {
    try {
      console.log('GenerateResultsUseCase.execute - Starting for userId:', request.userId);
      const userIdObj = new UserId(request.userId);

      // Check if results already exist
      console.log('GenerateResultsUseCase.execute - Checking for existing results');
      const existingResultsResult = await this.surveyRepository.getSurveyResult(userIdObj);

      console.log('GenerateResultsUseCase.execute - Existing results check:', {
        isError: Result.isError(existingResultsResult),
        hasValue: !Result.isError(existingResultsResult) ? !!existingResultsResult.value : false
      });

      if (!Result.isError(existingResultsResult) && existingResultsResult.value) {
        // Results already exist, return them
        return Result.ok({
          results: existingResultsResult.value,
          exportOptions: [
            { format: 'pdf', url: `/api/v1/onboarding/export/pdf/${existingResultsResult.value.id.toString()}` },
            { format: 'json', url: `/api/v1/onboarding/export/json/${existingResultsResult.value.id.toString()}` }
          ]
        });
      }

      // Get user's survey data to generate results
      const surveyDataResult = await this.surveyRepository.getUserSurveyData(userIdObj);

      if (Result.isError(surveyDataResult)) {
        return Result.error(createAppError(
          ErrorCode.DATABASE_ERROR,
          'Failed to retrieve survey data for results generation'
        ));
      }

      const { responses, progress } = surveyDataResult.value;

      // Validate that survey is complete
      if (!progress || !progress.reflectionCompleted) {
        return Result.error(createAppError(
          ErrorCode.BAD_REQUEST,
          'Survey must be completed before generating results'
        ));
      }

      // Transform responses to disease scores
      const diseaseScores = this.transformResponsesToDiseaseScores(responses);

      // Get reflection answers from responses
      const reflectionData = responses.filter(r => r.phaseNumber === 3);
      const reflectionAnswers = {
        strongestStruggle: reflectionData.find(r => r.questionId === 'strongestStruggle')?.note || '',
        dailyHabit: reflectionData.find(r => r.questionId === 'dailyHabit')?.note || ''
      };

      // Validate reflection answers exist
      if (!reflectionAnswers.strongestStruggle || !reflectionAnswers.dailyHabit) {
        return Result.error(createAppError(
          ErrorCode.BAD_REQUEST,
          'Reflection answers are required for results generation'
        ));
      }

      // Generate personalized habits and Tazkiyah plan using AI provider
      const aiParams = {
        diseaseScores,
        reflectionAnswers,
        userProfile: {
          // Add optional user profile data as needed
        }
      };

      const [aiHabits, aiPlan] = await Promise.all([
        this.aiProvider.generatePersonalizedHabits(aiParams),
        this.aiProvider.generateTazkiyahPlan(aiParams)
      ]);

      // Transform AI provider results to domain entity format
      const personalizedHabits = this.transformHabitsToEntityFormat(aiHabits);
      const tazkiyahPlan = this.transformPlanToEntityFormat(aiPlan);

      // Generate radar chart data
      const radarChartData = this.generateRadarChartData(diseaseScores);

      // Create SurveyResult entity
      const surveyResult = SurveyResult.create({
        userId: request.userId,
        diseaseScores,
        reflectionAnswers,
        personalizedHabits,
        tazkiyahPlan,
        radarChartData,
        generatedAt: new Date(),
        updatedAt: new Date()
      });

      // Save results to database
      const saveResult = await this.surveyRepository.saveSurveyResult(surveyResult);

      if (Result.isError(saveResult)) {
        return Result.error(createAppError(
          ErrorCode.DATABASE_ERROR,
          'Failed to save generated results'
        ));
      }

      // Update progress to mark results as generated
      const currentProgress = await this.surveyRepository.getSurveyProgress(userIdObj);
      if (Result.isOk(currentProgress) && currentProgress.value) {
        currentProgress.value.generateResults();
        const updateProgressResult = await this.surveyRepository.updateSurveyProgress(currentProgress.value);

        if (Result.isError(updateProgressResult)) {
          // Log warning but don't fail the operation
          console.warn('Failed to update survey progress after results generation');
        }
      }

      return Result.ok({
        results: saveResult.value,
        exportOptions: [
          { format: 'pdf', url: `/api/v1/onboarding/export/pdf/${saveResult.value.id.toString()}` },
          { format: 'json', url: `/api/v1/onboarding/export/json/${saveResult.value.id.toString()}` }
        ]
      });

    } catch (error) {
      return Result.error(createAppError(
        ErrorCode.SERVER_ERROR,
        `Results generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      ));
    }
  }

  private transformResponsesToDiseaseScores(responses: any[]): Record<Disease, LikertScore> {
    const diseaseScores: Record<Disease, LikertScore> = {} as Record<Disease, LikertScore>;

    // Map question responses to disease scores
    const questionDiseaseMap: Record<string, Disease> = {
      'envy': 'envy',
      'arrogance': 'arrogance',
      'selfDeception': 'selfDeception',
      'lust': 'lust',
      'anger': 'anger',
      'malice': 'malice',
      'backbiting': 'backbiting',
      'suspicion': 'suspicion',
      'loveOfDunya': 'loveOfDunya',
      'laziness': 'laziness',
      'despair': 'despair'
    };

    // Process responses to extract scores
    responses.forEach(response => {
      const disease = questionDiseaseMap[response.questionId];
      if (disease && response.score >= 1 && response.score <= 5) {
        diseaseScores[disease] = response.score as LikertScore;
      }
    });

    // Ensure all diseases have scores (default to 1 if missing)
    Object.values(questionDiseaseMap).forEach(disease => {
      if (!(disease in diseaseScores)) {
        diseaseScores[disease] = 1;
      }
    });

    return diseaseScores;
  }

  private generateRadarChartData(diseaseScores: Record<Disease, LikertScore>): ChartData {
    const diseaseLabels: Record<Disease, string> = {
      envy: 'Envy',
      arrogance: 'Arrogance',
      selfDeception: 'Self-Deception',
      lust: 'Lust',
      anger: 'Anger',
      malice: 'Malice',
      backbiting: 'Backbiting',
      suspicion: 'Suspicion',
      loveOfDunya: 'Love of Dunya',
      laziness: 'Laziness',
      despair: 'Despair'
    };

    const labels = Object.keys(diseaseScores).map(disease =>
      diseaseLabels[disease as Disease] || disease
    );
    const data = Object.values(diseaseScores);

    return {
      labels,
      datasets: [
        {
          label: 'Spiritual Assessment',
          data,
          backgroundColor: 'rgba(16, 185, 129, 0.2)',
          borderColor: 'rgba(16, 185, 129, 0.8)'
        }
      ]
    };
  }

  private transformHabitsToEntityFormat(aiHabits: any[]): any[] {
    return aiHabits.map(habit => ({
      id: habit.id,
      title: habit.title,
      description: habit.description,
      frequency: habit.frequency,
      targetDisease: habit.targetDisease,
      difficultyLevel: habit.difficultyLevel,
      estimatedDuration: habit.estimatedDuration,
      islamicContentIds: habit.islamicContent?.map((content: any) => content.id) || []
    }));
  }

  private transformPlanToEntityFormat(aiPlan: any): any {
    return {
      criticalDiseases: aiPlan.criticalDiseases,
      planType: aiPlan.planType,
      expectedDuration: aiPlan.expectedDuration,
      milestones: aiPlan.milestones,
      phases: aiPlan.phases.map((phase: any) => ({
        phaseNumber: phase.phaseNumber,
        title: phase.title,
        description: phase.description,
        targetDiseases: phase.targetDiseases,
        duration: phase.duration,
        checkpoints: phase.checkpoints,
        practices: phase.practices.map((practice: any) => ({
          name: practice.name,
          type: practice.type,
          description: practice.description,
          frequency: practice.frequency,
          islamicContentIds: practice.islamicBasis?.map((content: any) => content.id) || []
        }))
      }))
    };
  }
}