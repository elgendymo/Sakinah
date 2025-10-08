// Survey UI Components
export { default as ProgressIndicator } from './ProgressIndicator';
export { default as QuestionCard } from './QuestionCard';
export { default as LikertScale } from './LikertScale';
export { default as NavigationButtons } from './NavigationButtons';

// Survey-specific hooks and utilities
export { useSurveyLanguage } from './hooks/useSurveyLanguage';
export { useSurveyValidation } from './hooks/useSurveyValidation';

// Survey data and utilities
export {
  surveyQuestions,
  getQuestionsByPhase,
  getQuestionById,
  getQuestionByOrder,
  getTotalQuestions,
  getPhaseProgress,
  getOverallProgress
} from './data/surveyQuestions';

// Types for survey components
export type {
  SurveyLanguage,
  SurveyQuestion,
  SurveyValidationState,
  SurveyResponse,
  SurveyState,
  PhaseValidation,
  SurveyNavigation
} from './types';