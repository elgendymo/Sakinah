import { PersonalizedHabit, TazkiyahPlan, Disease, LikertScore } from '@sakinah/types';

export interface ReflectionAnswers {
  strongestStruggle: string;
  dailyHabit: string;
}

export interface SurveyGenerationParams {
  diseaseScores: Record<Disease, LikertScore>;
  reflectionAnswers: ReflectionAnswers;
  userProfile?: {
    firstName?: string;
    gender?: 'male' | 'female';
  };
}

export interface ISurveyAiProvider {
  /**
   * Generates personalized habit recommendations based on survey results
   * @param params Survey results and user reflection answers
   * @returns Array of personalized habits targeting identified diseases
   */
  generatePersonalizedHabits(params: SurveyGenerationParams): Promise<PersonalizedHabit[]>;

  /**
   * Generates a structured Tazkiyah plan focusing on critical diseases (scores 4-5)
   * @param params Survey results with critical diseases identified
   * @returns Comprehensive spiritual development plan
   */
  generateTazkiyahPlan(params: SurveyGenerationParams): Promise<TazkiyahPlan>;
}