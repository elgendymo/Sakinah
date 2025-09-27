'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import {
  Warning,
  CheckCircle,
  LocalFireDepartment,
  SelfImprovement,
  LocalFlorist,
  RadioButtonUnchecked
} from '@mui/icons-material';

interface Habit {
  id: string;
  title: string;
  streakCount: number;
  lastCompletedOn?: string;
  plan: {
    target: string;
    kind: 'takhliyah' | 'tahliyah';
  };
}

interface OptimisticHabitCardProps {
  habit: Habit;
  isCompleted: boolean;
  isOptimistic?: boolean;
  isFailing?: boolean;
  isPending?: boolean;
  onToggle: (habitId: string) => Promise<void>;
  onRetry?: (habitId: string) => Promise<void>;
  onDismissError?: (habitId: string) => void;
}

export function OptimisticHabitCard({
  habit,
  isCompleted,
  isOptimistic = false,
  isFailing = false,
  isPending = false,
  onToggle,
  onRetry,
  onDismissError
}: OptimisticHabitCardProps) {
  const t = useTranslations('habits');

  const handleToggle = async () => {
    if (!isPending) {
      await onToggle(habit.id);
    }
  };

  const handleRetry = async () => {
    if (onRetry && !isPending) {
      await onRetry(habit.id);
    }
  };

  return (
    <div
      data-testid="habit-card"
      className={`habit-card card-islamic rounded-xl p-6 shadow-lg transition-all duration-200 ${
        isCompleted && !isFailing
          ? 'ring-2 ring-emerald-500/30 bg-emerald-50 border-emerald-200'
          : isFailing
          ? 'ring-2 ring-red-500/30 bg-red-50 border-red-200'
          : 'hover:shadow-emerald-200/50'
      } ${
        isOptimistic ? 'opacity-80' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-medium text-sage-900">
              {habit.title}
            </h3>
            {isOptimistic && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                <svg className="animate-spin -ml-1 mr-1 h-3 w-3 text-blue-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </span>
            )}
            {isFailing && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                <Warning sx={{ fontSize: 12, marginRight: '2px' }} />
                Failed
              </span>
            )}
          </div>

          <div className="flex items-center text-sm text-sage-600 space-x-4">
            <span>
              <span className="flex items-center gap-1">
                {habit.plan.kind === 'takhliyah' ? (
                  <SelfImprovement sx={{ fontSize: 16 }} />
                ) : (
                  <LocalFlorist sx={{ fontSize: 16 }} />
                )}
                {habit.plan.target}
              </span>
            </span>
            <span className="flex items-center gap-1">
              <LocalFireDepartment sx={{ fontSize: 16, color: '#f97316' }} />
              {habit.streakCount} {t('dayStreak')}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Retry button for failed operations */}
          {isFailing && onRetry && (
            <button
              onClick={handleRetry}
              disabled={isPending}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-red-600 hover:bg-red-100 transition-all disabled:opacity-50"
              title="Retry"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}

          {/* Dismiss error button */}
          {isFailing && onDismissError && (
            <button
              onClick={() => onDismissError(habit.id)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-red-600 hover:bg-red-100 transition-all"
              title="Dismiss error"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}

          {/* Main toggle button */}
          <button
            onClick={handleToggle}
            disabled={isPending}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 disabled:opacity-50 ${
              isCompleted && !isFailing
                ? 'bg-emerald-600 text-white shadow-lg hover:bg-emerald-700'
                : isFailing
                ? 'bg-red-100 text-red-600 hover:bg-red-200'
                : 'bg-sage-100 text-sage-500 hover:bg-emerald-100 hover:text-emerald-600'
            }`}
          >
            {isPending ? (
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : isCompleted && !isFailing ? (
              <CheckCircle sx={{ fontSize: 20 }} />
            ) : isFailing ? (
              <Warning sx={{ fontSize: 20 }} />
            ) : (
              <RadioButtonUnchecked sx={{ fontSize: 20 }} />
            )}
          </button>
        </div>
      </div>

      {/* Success message */}
      {isCompleted && !isFailing && !isOptimistic && (
        <div className="mt-4 text-sm text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-200/50">
          {t('completionMessage')}
        </div>
      )}

      {/* Failure message */}
      {isFailing && (
        <div className="mt-4 text-sm text-red-700 bg-red-50 px-3 py-2 rounded-lg border border-red-200/50">
          <div className="flex items-center justify-between">
            <span>Failed to sync. Your progress is saved locally.</span>
            {onRetry && (
              <button
                onClick={handleRetry}
                className="text-xs underline hover:no-underline"
              >
                Try again
              </button>
            )}
          </div>
        </div>
      )}

      {/* Optimistic feedback */}
      {isOptimistic && !isFailing && (
        <div className="mt-4 text-sm text-blue-700 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200/50">
          Syncing your progress...
        </div>
      )}
    </div>
  );
}