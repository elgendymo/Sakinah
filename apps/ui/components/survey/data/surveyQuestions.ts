import type { SurveyQuestion } from '../types';

export const surveyQuestions: SurveyQuestion[] = [
  // Phase 1: Inner Heart Diseases (4 questions)
  {
    id: 'q1',
    questionId: 'envy',
    disease: 'envy',
    phase: 1,
    category: 'inner',
    order: 1
  },
  {
    id: 'q2',
    questionId: 'arrogance',
    disease: 'arrogance',
    phase: 1,
    category: 'inner',
    order: 2
  },
  {
    id: 'q3',
    questionId: 'selfDeception',
    disease: 'selfDeception',
    phase: 1,
    category: 'inner',
    order: 3
  },
  {
    id: 'q4',
    questionId: 'lust',
    disease: 'lust',
    phase: 1,
    category: 'inner',
    order: 4
  },

  // Phase 2: Behavioral Manifestations (7 questions)
  {
    id: 'q5',
    questionId: 'anger',
    disease: 'anger',
    phase: 2,
    category: 'behavioral',
    order: 5
  },
  {
    id: 'q6',
    questionId: 'malice',
    disease: 'malice',
    phase: 2,
    category: 'behavioral',
    order: 6
  },
  {
    id: 'q7',
    questionId: 'backbiting',
    disease: 'backbiting',
    phase: 2,
    category: 'behavioral',
    order: 7
  },
  {
    id: 'q8',
    questionId: 'suspicion',
    disease: 'suspicion',
    phase: 2,
    category: 'behavioral',
    order: 8
  },
  {
    id: 'q9',
    questionId: 'loveOfDunya',
    disease: 'loveOfDunya',
    phase: 2,
    category: 'behavioral',
    order: 9
  },
  {
    id: 'q10',
    questionId: 'laziness',
    disease: 'laziness',
    phase: 2,
    category: 'behavioral',
    order: 10
  },
  {
    id: 'q11',
    questionId: 'despair',
    disease: 'despair',
    phase: 2,
    category: 'behavioral',
    order: 11
  }
];

// Helper functions for working with survey questions
export const getQuestionsByPhase = (phase: 1 | 2): SurveyQuestion[] => {
  return surveyQuestions.filter(q => q.phase === phase).sort((a, b) => a.order - b.order);
};

export const getQuestionById = (questionId: string): SurveyQuestion | undefined => {
  return surveyQuestions.find(q => q.questionId === questionId);
};

export const getQuestionByOrder = (order: number): SurveyQuestion | undefined => {
  return surveyQuestions.find(q => q.order === order);
};

export const getTotalQuestions = (): number => {
  return surveyQuestions.length;
};

export const getPhaseProgress = (phase: 1 | 2, completedQuestions: string[]): number => {
  const phaseQuestions = getQuestionsByPhase(phase);
  const completedInPhase = phaseQuestions.filter(q =>
    completedQuestions.includes(q.questionId)
  ).length;

  return phaseQuestions.length > 0 ? (completedInPhase / phaseQuestions.length) * 100 : 0;
};

export const getOverallProgress = (completedQuestions: string[]): number => {
  const totalQuestions = getTotalQuestions();
  return totalQuestions > 0 ? (completedQuestions.length / totalQuestions) * 100 : 0;
};