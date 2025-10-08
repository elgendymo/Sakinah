import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/result';
import { ISurveyRepository } from '@/domain/repositories/ISurveyRepository';
import { SurveyResult } from '@/domain/entities/SurveyResult';
import { SurveyProgress } from '@/domain/entities/SurveyProgress';
import { UserId } from '@/domain/value-objects/UserId';
import { ReflectionRequest, Disease, LikertScore } from '@sakinah/types';

interface SubmitReflectionParams {
  userId: string;
  reflectionData: ReflectionRequest;
}

interface ReflectionPreview {
  personalizedHabits: string[];
  takhliyahFocus: string[];
  tahliyahFocus: string[];
}

interface SubmitReflectionResult {
  saved: boolean;
  preview: ReflectionPreview;
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
  resultsAvailable: boolean;
}

@injectable()
export class SubmitReflectionUseCase {
  constructor(
    @inject('ISurveyRepository') private surveyRepo: ISurveyRepository
  ) {}

  async execute(params: SubmitReflectionParams): Promise<Result<SubmitReflectionResult>> {
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
        return Result.error(new Error('Phase 1 must be completed before reflection'));
      }

      if (!progress.phase2Completed) {
        return Result.error(new Error('Phase 2 must be completed before reflection'));
      }

      if (progress.currentPhase < 3) {
        return Result.error(new Error('Cannot submit reflection: not in reflection phase'));
      }

      if (progress.reflectionCompleted) {
        return Result.error(new Error('Reflection has already been completed'));
      }

      // Validate reflection data
      const validationResult = this.validateReflectionData(params.reflectionData);
      if (Result.isError(validationResult)) {
        return validationResult;
      }

      // Get all user survey responses to generate preview
      console.log('SubmitReflectionUseCase.execute - About to get all survey responses for userId:', userId.toString());
      const responsesResult = await this.surveyRepo.getAllSurveyResponses(userId);

      if (Result.isError(responsesResult)) {
        console.error('SubmitReflectionUseCase.execute - Failed to get survey responses:', responsesResult.error);
        return Result.error(new Error('Failed to get survey responses for preview generation'));
      }

      console.log('SubmitReflectionUseCase.execute - Retrieved survey responses:', responsesResult.value.length, 'responses');

      // Calculate disease scores from responses
      const diseaseScores = this.calculateDiseaseScores(responsesResult.value);

      // Generate reflection preview
      const preview = this.generateReflectionPreview(diseaseScores, params.reflectionData);

      // Create preliminary survey result with reflection data
      const surveyResult = SurveyResult.create({
        userId: params.userId,
        diseaseScores,
        reflectionAnswers: {
          strongestStruggle: params.reflectionData.strongestStruggle,
          dailyHabit: params.reflectionData.dailyHabit
        },
        personalizedHabits: [], // Will be generated in results phase
        tazkiyahPlan: {
          criticalDiseases: this.getCriticalDiseases(diseaseScores),
          planType: 'takhliyah' as const,
          phases: [],
          expectedDuration: '',
          milestones: []
        },
        radarChartData: this.generateRadarChartData(diseaseScores)
      });

      // Check if survey result already exists
      const existingResultResult = await this.surveyRepo.getSurveyResult(userId);

      console.log('SubmitReflectionUseCase.execute - Existing result check:', {
        isError: Result.isError(existingResultResult),
        hasValue: !Result.isError(existingResultResult) ? !!existingResultResult.value : false,
        error: Result.isError(existingResultResult) ? existingResultResult.error.message : null
      });

      console.log('SubmitReflectionUseCase.execute - About to save/update survey result for userId:', userId.toString());

      let saveResultResult;
      if (!Result.isError(existingResultResult) && existingResultResult.value) {
        // Survey result already exists, skip save/update since we only need to complete the phase
        console.log('SubmitReflectionUseCase.execute - Survey result already exists, proceeding to complete reflection phase');
        saveResultResult = Result.ok(existingResultResult.value);
      } else {
        // Create new result
        console.log('SubmitReflectionUseCase.execute - Creating new survey result');
        saveResultResult = await this.surveyRepo.saveSurveyResult(surveyResult);

        if (Result.isError(saveResultResult)) {
          console.error('SubmitReflectionUseCase.execute - Failed to save survey result:', saveResultResult.error);
          return Result.error(new Error('Failed to save survey result'));
        }
      }

      console.log('SubmitReflectionUseCase.execute - Successfully handled survey result');

      // Complete reflection phase
      progress.completeReflection();

      // Update progress
      const updateProgressResult = await this.surveyRepo.updateSurveyProgress(progress);

      if (Result.isError(updateProgressResult)) {
        return Result.error(new Error('Failed to update survey progress'));
      }

      const result: SubmitReflectionResult = {
        saved: true,
        preview,
        progress: progress.toDTO(),
        resultsAvailable: true
      };

      return Result.ok(result);
    } catch (error) {
      return Result.error(error as Error);
    }
  }

  private validateReflectionData(data: ReflectionRequest): Result<void> {
    // Validate strongest struggle text
    if (!data.strongestStruggle || data.strongestStruggle.trim().length < 10) {
      return Result.error(new Error('Strongest struggle response must be at least 10 characters'));
    }

    if (data.strongestStruggle.length > 500) {
      return Result.error(new Error('Strongest struggle response cannot exceed 500 characters'));
    }

    // Validate daily habit text
    if (!data.dailyHabit || data.dailyHabit.trim().length < 10) {
      return Result.error(new Error('Daily habit response must be at least 10 characters'));
    }

    if (data.dailyHabit.length > 500) {
      return Result.error(new Error('Daily habit response cannot exceed 500 characters'));
    }

    return Result.ok(undefined);
  }

  private calculateDiseaseScores(responses: Array<{ questionId: string; score: number }>): Record<Disease, LikertScore> {
    const diseaseScores: Record<Disease, LikertScore> = {
      envy: 1,
      arrogance: 1,
      selfDeception: 1,
      lust: 1,
      anger: 1,
      malice: 1,
      backbiting: 1,
      suspicion: 1,
      loveOfDunya: 1,
      laziness: 1,
      despair: 1
    };

    // Map responses to disease scores
    for (const response of responses) {
      const disease = response.questionId as Disease;
      if (disease in diseaseScores) {
        diseaseScores[disease] = response.score as LikertScore;
      }
    }

    return diseaseScores;
  }

  private getCriticalDiseases(diseaseScores: Record<Disease, LikertScore>): Disease[] {
    return Object.entries(diseaseScores)
      .filter(([_, score]) => score >= 4)
      .map(([disease, _]) => disease as Disease);
  }

  private generateReflectionPreview(diseaseScores: Record<Disease, LikertScore>, reflectionData: ReflectionRequest): ReflectionPreview {
    const criticalDiseases = this.getCriticalDiseases(diseaseScores);
    const moderateDiseases = Object.entries(diseaseScores)
      .filter(([_, score]) => score === 3)
      .map(([disease, _]) => disease as Disease);

    // Generate simple personalized habits preview
    const personalizedHabits: string[] = [];

    if (criticalDiseases.includes('envy')) {
      personalizedHabits.push('Practice daily gratitude dhikr');
    }
    if (criticalDiseases.includes('anger')) {
      personalizedHabits.push('Recite "A\'udhu billahi min ash-shaytani\'r-rajim" when feeling anger');
    }
    if (criticalDiseases.includes('arrogance')) {
      personalizedHabits.push('Daily reflection on human weaknesses');
    }

    // Add habit based on reflection
    if (reflectionData.dailyHabit.toLowerCase().includes('prayer') || reflectionData.dailyHabit.toLowerCase().includes('salah')) {
      personalizedHabits.push('Maintain consistent prayer schedule');
    } else {
      personalizedHabits.push('Incorporate Islamic reminders in daily routine');
    }

    // Generate takhliyah focus (purification - removing negative traits)
    const takhliyahFocus = criticalDiseases.map(disease => {
      const diseaseMap: Record<Disease, string> = {
        envy: 'Purify heart from envy through gratitude',
        arrogance: 'Remove arrogance through humility practices',
        selfDeception: 'Eliminate self-deception through honest self-reflection',
        lust: 'Control lustful desires through spiritual discipline',
        anger: 'Remove anger through patience and dhikr',
        malice: 'Cleanse heart from malice through forgiveness',
        backbiting: 'Stop backbiting through mindful speech',
        suspicion: 'Remove suspicion through positive thinking',
        loveOfDunya: 'Detach from excessive worldly desires',
        laziness: 'Overcome laziness through consistent action',
        despair: 'Remove despair through trust in Allah'
      };
      return diseaseMap[disease];
    });

    // Generate tahliyah focus (beautification - building positive traits)
    const strengths = Object.entries(diseaseScores)
      .filter(([_, score]) => score <= 2)
      .map(([disease, _]) => disease as Disease);

    const tahliyahFocus = strengths.slice(0, 3).map(disease => {
      const virtueMap: Record<Disease, string> = {
        envy: 'Cultivate contentment and gratitude',
        arrogance: 'Build humility and modesty',
        selfDeception: 'Develop self-awareness and honesty',
        lust: 'Strengthen spiritual discipline',
        anger: 'Develop patience and forbearance',
        malice: 'Cultivate forgiveness and compassion',
        backbiting: 'Practice good speech and silence',
        suspicion: 'Build trust and positive thinking',
        loveOfDunya: 'Focus on the Hereafter',
        laziness: 'Develop discipline and consistency',
        despair: 'Strengthen faith and hope'
      };
      return virtueMap[disease];
    });

    return {
      personalizedHabits,
      takhliyahFocus,
      tahliyahFocus
    };
  }

  private generateRadarChartData(diseaseScores: Record<Disease, LikertScore>) {
    const labels = Object.keys(diseaseScores).map(disease => {
      const labelMap: Record<Disease, string> = {
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
      return labelMap[disease as Disease];
    });

    const data = Object.values(diseaseScores);

    return {
      labels,
      datasets: [{
        label: 'Disease Scores',
        data,
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        borderColor: 'rgba(54, 162, 235, 1)'
      }]
    };
  }
}