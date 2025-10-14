import type { LikertScore, Disease } from '@sakinah/types';

export type SurveyLanguage = 'en' | 'ar';

export interface SurveyQuestion {
  id: string;
  questionId: string;
  disease: Disease;
  phase: 1 | 2;
  category: 'inner' | 'behavioral';
  order: number;
}

export interface SurveyValidationState {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  completedQuestions: number;
  totalQuestions: number;
  missingRequired: string[];
}

export interface SurveyResponse {
  questionId: string;
  score: LikertScore;
  note?: string;
  answeredAt: Date;
}

export interface SurveyState {
  currentPhase: number;
  language: SurveyLanguage;
  responses: Record<string, SurveyResponse>;
  notes: Record<string, string>;
  startedAt: Date;
  lastUpdated: Date;
}

export interface PhaseValidation {
  phase: number;
  isComplete: boolean;
  requiredQuestions: string[];
  answeredQuestions: string[];
  missingQuestions: string[];
}

export interface SurveyNavigation {
  canGoBack: boolean;
  canGoNext: boolean;
  currentPhase: number;
  nextPhase: number | null;
  previousPhase: number | null;
  totalPhases: number;
  progressPercentage: number;
}