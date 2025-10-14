'use client';

import { useMemo } from 'react';
import type { LikertScore } from '@sakinah/types';
import type { SurveyValidationState, PhaseValidation, SurveyNavigation } from '../types';
import { getQuestionsByPhase, getTotalQuestions } from '@/components/survey';

interface SurveyValidationHookProps {
  currentPhase: number;
  responses: Record<string, { score: LikertScore; note?: string }>;
  reflectionAnswers?: {
    strongestStruggle: string;
    dailyHabit: string;
  };
}

interface UseSurveyValidationReturn {
  validation: SurveyValidationState;
  phaseValidation: PhaseValidation;
  navigation: SurveyNavigation;
  canAdvanceToNextPhase: boolean;
  getPhaseCompletionPercentage: (phase: number) => number;
  getOverallCompletionPercentage: () => number;
  getMissingQuestions: (phase: number) => string[];
  isPhaseComplete: (phase: number) => boolean;
}

export function useSurveyValidation({
  currentPhase,
  responses,
  reflectionAnswers
}: SurveyValidationHookProps): UseSurveyValidationReturn {
  const validation = useMemo((): SurveyValidationState => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const totalQuestions = getTotalQuestions();
    const completedQuestions = Object.keys(responses).filter(questionId =>
      responses[questionId]?.score !== undefined
    ).length;

    // Check for incomplete responses with very high scores
    Object.entries(responses).forEach(([questionId, response]) => {
      if (response.score >= 4 && !response.note) {
        warnings.push(`Consider adding a note for question ${questionId} with high score`);
      }
    });

    // Phase-specific validations
    if (currentPhase === 3) { // Reflection phase
      if (!reflectionAnswers?.strongestStruggle || reflectionAnswers.strongestStruggle.length < 10) {
        errors.push('Please provide at least 10 characters for your strongest struggle');
      }
      if (!reflectionAnswers?.dailyHabit || reflectionAnswers.dailyHabit.length < 10) {
        errors.push('Please provide at least 10 characters for your daily habit goal');
      }
      if (reflectionAnswers?.strongestStruggle && reflectionAnswers.strongestStruggle.length > 500) {
        errors.push('Strongest struggle response must be 500 characters or less');
      }
      if (reflectionAnswers?.dailyHabit && reflectionAnswers.dailyHabit.length > 500) {
        errors.push('Daily habit response must be 500 characters or less');
      }
    }

    const missingRequired: string[] = [];
    if (currentPhase === 1) {
      const phase1Questions = getQuestionsByPhase(1);
      phase1Questions.forEach(q => {
        if (!responses[q.questionId]?.score) {
          missingRequired.push(q.questionId);
        }
      });
    } else if (currentPhase === 2) {
      const phase2Questions = getQuestionsByPhase(2);
      phase2Questions.forEach(q => {
        if (!responses[q.questionId]?.score) {
          missingRequired.push(q.questionId);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      completedQuestions,
      totalQuestions,
      missingRequired
    };
  }, [currentPhase, responses, reflectionAnswers]);

  const phaseValidation = useMemo((): PhaseValidation => {
    let requiredQuestions: string[] = [];
    let answeredQuestions: string[] = [];

    if (currentPhase === 1 || currentPhase === 2) {
      const phaseQuestions = getQuestionsByPhase(currentPhase as 1 | 2);
      requiredQuestions = phaseQuestions.map(q => q.questionId);
      answeredQuestions = requiredQuestions.filter(questionId =>
        responses[questionId]?.score !== undefined
      );
    } else if (currentPhase === 3) {
      // Reflection phase - check if all previous phases are complete
      const phase1Questions = getQuestionsByPhase(1);
      const phase2Questions = getQuestionsByPhase(2);
      requiredQuestions = [...phase1Questions, ...phase2Questions].map(q => q.questionId);
      answeredQuestions = requiredQuestions.filter(questionId =>
        responses[questionId]?.score !== undefined
      );
    }

    const missingQuestions = requiredQuestions.filter(q => !answeredQuestions.includes(q));
    const isComplete = missingQuestions.length === 0;

    return {
      phase: currentPhase,
      isComplete,
      requiredQuestions,
      answeredQuestions,
      missingQuestions
    };
  }, [currentPhase, responses]);

  const navigation = useMemo((): SurveyNavigation => {
    const totalPhases = 4; // Welcome, Phase1, Phase2, Reflection
    const canGoBack = currentPhase > 1;

    let canGoNext = false;
    let nextPhase: number | null = null;

    if (currentPhase === 1) {
      // Can advance to Phase 2 if Phase 1 is complete
      const phase1Complete = getQuestionsByPhase(1).every(q =>
        responses[q.questionId]?.score !== undefined
      );
      canGoNext = phase1Complete;
      nextPhase = phase1Complete ? 2 : null;
    } else if (currentPhase === 2) {
      // Can advance to Reflection if Phase 2 is complete
      const phase2Complete = getQuestionsByPhase(2).every(q =>
        responses[q.questionId]?.score !== undefined
      );
      canGoNext = phase2Complete;
      nextPhase = phase2Complete ? 3 : null;
    } else if (currentPhase === 3) {
      // Can advance to Results if reflection is complete
      const reflectionComplete = (reflectionAnswers?.strongestStruggle?.length ?? 0) >= 10 &&
                                (reflectionAnswers?.dailyHabit?.length ?? 0) >= 10;
      canGoNext = reflectionComplete;
      nextPhase = reflectionComplete ? 4 : null;
    }

    const previousPhase = canGoBack ? currentPhase - 1 : null;

    let progressPercentage = 0;
    if (currentPhase === 1) {
      progressPercentage = 25; // Welcome completed
    } else if (currentPhase === 2) {
      progressPercentage = 50; // Phase 1 completed
    } else if (currentPhase === 3) {
      progressPercentage = 75; // Phase 2 completed
    } else if (currentPhase === 4) {
      progressPercentage = 100; // All completed
    }

    return {
      canGoBack,
      canGoNext,
      currentPhase,
      nextPhase,
      previousPhase,
      totalPhases,
      progressPercentage
    };
  }, [currentPhase, responses, reflectionAnswers]);

  const canAdvanceToNextPhase = navigation.canGoNext;

  const getPhaseCompletionPercentage = (phase: number): number => {
    if (phase === 1 || phase === 2) {
      const phaseQuestions = getQuestionsByPhase(phase as 1 | 2);
      const completedInPhase = phaseQuestions.filter(q =>
        responses[q.questionId]?.score !== undefined
      ).length;
      return phaseQuestions.length > 0 ? (completedInPhase / phaseQuestions.length) * 100 : 0;
    } else if (phase === 3) {
      const hasStrongestStruggle = (reflectionAnswers?.strongestStruggle?.length ?? 0) >= 10;
      const hasDailyHabit = (reflectionAnswers?.dailyHabit?.length ?? 0) >= 10;
      const completed = (hasStrongestStruggle ? 1 : 0) + (hasDailyHabit ? 1 : 0);
      return (completed / 2) * 100;
    }
    return 0;
  };

  const getOverallCompletionPercentage = (): number => {
    const allQuestions = [...getQuestionsByPhase(1), ...getQuestionsByPhase(2)];
    const completedQuestions = allQuestions.filter(q =>
      responses[q.questionId]?.score !== undefined
    ).length;

    const questionProgress = allQuestions.length > 0 ? (completedQuestions / allQuestions.length) * 0.8 : 0;

    const reflectionProgress = (reflectionAnswers?.strongestStruggle?.length ?? 0) >= 10 &&
                              (reflectionAnswers?.dailyHabit?.length ?? 0) >= 10 ? 0.2 : 0;

    return (questionProgress + reflectionProgress) * 100;
  };

  const getMissingQuestions = (phase: number): string[] => {
    if (phase === 1 || phase === 2) {
      const phaseQuestions = getQuestionsByPhase(phase as 1 | 2);
      return phaseQuestions
        .filter(q => !responses[q.questionId]?.score)
        .map(q => q.questionId);
    }
    return [];
  };

  const isPhaseComplete = (phase: number): boolean => {
    if (phase === 1 || phase === 2) {
      return getMissingQuestions(phase).length === 0;
    } else if (phase === 3) {
      return (reflectionAnswers?.strongestStruggle?.length ?? 0) >= 10 &&
             (reflectionAnswers?.dailyHabit?.length ?? 0) >= 10;
    }
    return false;
  };

  return {
    validation,
    phaseValidation,
    navigation,
    canAdvanceToNextPhase,
    getPhaseCompletionPercentage,
    getOverallCompletionPercentage,
    getMissingQuestions,
    isPhaseComplete
  };
}