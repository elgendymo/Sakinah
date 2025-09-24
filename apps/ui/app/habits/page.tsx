'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase-browser';
import { AuthUtils } from '@/lib/auth-utils';
import PageContainer from '@/components/PageContainer';
import { ErrorDisplay, useErrorHandler } from '@/components/ErrorDisplay';
import { api } from '@/lib/api';
import {
  Nature as EcoIcon,
  LocalFlorist as FlowerIcon,
  LocalFireDepartment as FireIcon,
  Assessment as StatsIcon,
  EmojiEvents as TrophyIcon,
  TrendingUp as TrendingIcon,
  FitnessCenter as StrengthIcon,
  CheckCircle as CheckedIcon,
  RadioButtonUnchecked as UncheckedIcon,
  SelfImprovement as GrowthIcon
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
  stats?: {
    completionRate: number;
    averageStreakLength: number;
    totalCompletions: number;
  };
  analytics?: {
    habitId: string;
    period: string;
    completionRate: number;
    currentStreak: number;
    longestStreak: number;
    totalCompletions: number;
    recentCompletions: number;
    consistency: {
      daily: number;
      weekly: number;
      monthly: number;
    };
  };
}

export default function HabitsPage() {
  const t = useTranslations('habits');

  const [habits, setHabits] = useState<Habit[]>([]);
  const [completedToday, setCompletedToday] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState<Set<string>>(new Set());
  const [retryingHabit, setRetryingHabit] = useState<string | null>(null);
  const { error, handleError, clearError } = useErrorHandler();
  // const searchParams = useSearchParams();
  // const planId = searchParams?.get('planId'); // Future use for filtering
  const supabase = createClient();

  useEffect(() => {
     loadHabits();
  }, []);

  // Load analytics for all habits when habits change
  useEffect(() => {
    if (habits.length > 0) {
      // Load analytics for habits that don't have analytics yet
      habits.forEach(habit => {
        if (!habit.analytics && !loadingAnalytics.has(habit.id)) {
          loadHabitAnalytics(habit.id);
        }
      });
    }
  }, [habits.length]); // Only trigger when number of habits changes

  const loadHabits = async () => {
    try {
      setLoading(true);
      clearError();

      // Get authentication token
      const token = await AuthUtils.getAuthTokenWithFallback();

      // Check if we're in development mode with mock auth
      if (token === 'mock-token-for-dev') {
        // Show sample data for development
        const sampleHabits: Habit[] = [
          {
            id: '1',
            title: t('sampleHabits.morningDhikr'),
            streakCount: 7,
            lastCompletedOn: undefined,
            plan: { target: t('sampleHabits.patience'), kind: 'tahliyah' }
          },
          {
            id: '2',
            title: t('sampleHabits.readQuran'),
            streakCount: 3,
            lastCompletedOn: undefined,
            plan: { target: t('sampleHabits.knowledge'), kind: 'tahliyah' }
          },
          {
            id: '3',
            title: t('sampleHabits.eveningDua'),
            streakCount: 12,
            lastCompletedOn: undefined,
            plan: { target: t('sampleHabits.gratitude'), kind: 'tahliyah' }
          },
        ];
        setHabits(sampleHabits);
        setCompletedToday(new Set());
        return;
      }

      // Use v2 API endpoint with stats and history query parameters
      const habitsData = await api.getHabits({
        includeStats: true,
        includeHistory: true
      });

      if (habitsData?.habits) {
        setHabits(habitsData.habits);

        // Determine which habits are completed today
        const today = new Date().toISOString().split('T')[0];
        const completedTodaySet = new Set<string>();

        habitsData.habits.forEach((habit: Habit) => {
          if (habit.lastCompletedOn === today) {
            completedTodaySet.add(habit.id);
          }
        });

        setCompletedToday(completedTodaySet);
      } else {
        setHabits([]);
        setCompletedToday(new Set());
      }
    } catch (error) {
      handleError(error, 'Loading Habits');

      // Fallback to empty state on error
      setHabits([]);
      setCompletedToday(new Set());
    } finally {
      setLoading(false);
    }
  };

  const toggleHabit = async (habitId: string) => {
    try {
      clearError();
      const token = await AuthUtils.getAuthTokenWithFallback();

      const isCompleted = completedToday.has(habitId);
      const today = new Date().toISOString().split('T')[0];

      // Store current state for rollback
      const previousCompletedToday = new Set(completedToday);
      const previousHabits = [...habits];

      // Optimistically update UI immediately for better UX
      const newCompleted = new Set(completedToday);
      if (isCompleted) {
        newCompleted.delete(habitId);
      } else {
        newCompleted.add(habitId);
      }
      setCompletedToday(newCompleted);

      // Optimistically update habit data
      setHabits(prev => prev.map(habit => {
        if (habit.id === habitId) {
          return {
            ...habit,
            streakCount: isCompleted ? Math.max(0, habit.streakCount - 1) : habit.streakCount + 1,
            lastCompletedOn: isCompleted ? undefined : today,
          };
        }
        return habit;
      }));

      try {
        // Call the appropriate v2 API endpoint
        if (isCompleted) {
          await api.incompleteHabit(habitId);
        } else {
          await api.completeHabit(habitId);
        }

        // If successful, load fresh analytics data for this habit
        await loadHabitAnalytics(habitId);
      } catch (apiError: any) {
        // Rollback optimistic updates on API error
        setCompletedToday(previousCompletedToday);
        setHabits(previousHabits);

        // Enhanced error handling based on error type
        let errorContext = 'Updating Habit';
        if (apiError?.statusCode === 401) {
          errorContext = 'Authentication expired. Please log in again.';
        } else if (apiError?.statusCode === 403) {
          errorContext = 'You do not have permission to modify this habit.';
        } else if (apiError?.statusCode === 404) {
          errorContext = 'Habit not found. It may have been deleted.';
        } else if (apiError?.statusCode === 429) {
          errorContext = 'Too many requests. Please wait a moment and try again.';
        } else if (apiError?.errorCode === 'NETWORK_ERROR') {
          errorContext = 'Network connection failed. Please check your internet connection.';
        }

        // Re-throw with enhanced context
        const enhancedError = new Error(errorContext);
        (enhancedError as any).originalError = apiError;
        throw enhancedError;
      }
    } catch (error) {
      handleError(error, 'Updating Habit');
    }
  };

  // Retry a failed habit operation
  const retryHabitOperation = async (habitId: string) => {
    setRetryingHabit(habitId);
    try {
      await toggleHabit(habitId);
      clearError();
    } catch (error) {
      // Error already handled in toggleHabit
    } finally {
      setRetryingHabit(null);
    }
  };

  // Load analytics for a specific habit
  const loadHabitAnalytics = async (habitId: string) => {
    try {
      // Add to loading set
      setLoadingAnalytics(prev => new Set(prev).add(habitId));

      // Get authentication token
      const token = await AuthUtils.getAuthTokenWithFallback();
      const analyticsData = await api.getHabitAnalytics(habitId, token);

      if (analyticsData?.analytics) {
        // Update the specific habit with analytics data
        setHabits(prev => prev.map(habit => {
          if (habit.id === habitId) {
            return {
              ...habit,
              analytics: analyticsData.analytics
            };
          }
          return habit;
        }));
      }
    } catch (error) {
      console.error('Failed to load habit analytics:', error);
      // Don't show error to user for analytics - it's supplementary data
    } finally {
      // Remove from loading set
      setLoadingAnalytics(prev => {
        const newSet = new Set(prev);
        newSet.delete(habitId);
        return newSet;
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-emerald-600">{t('loadingHabits')}</div>
      </div>
    );
  }

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <PageContainer
      title={t('title')}
      subtitle={today}
      maxWidth="lg"
      padding="lg"
    >
      {/* Error Display */}
      {error && (
        <ErrorDisplay
          error={error}
          onDismiss={clearError}
          onRetry={() => loadHabits()}
          className="mb-6"
        />
      )}

        {habits.length > 0 ? (
          <div className="space-y-4">
            {habits.map((habit) => (
              <div
                key={habit.id}
                data-testid="habit-card"
                className={`habit-card card-islamic rounded-xl p-6 shadow-lg transition-all hover:shadow-emerald-200/50 ${
                  completedToday.has(habit.id) ? 'ring-2 ring-emerald-500/30 bg-emerald-50 border-emerald-200' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-sage-900 mb-1">
                      {habit.title}
                    </h3>
                    <div className="flex items-center text-sm text-sage-600 space-x-4">
                      <span>
                        {habit.plan.kind === 'takhliyah' ? <EcoIcon sx={{ fontSize: 14, color: '#16a34a' }} /> : <FlowerIcon sx={{ fontSize: 14, color: '#ec4899' }} />} {habit.plan.target}
                      </span>
                      <span className="flex items-center">
                        <FireIcon sx={{ fontSize: 14, color: '#ea580c' }} /> {habit.streakCount} {t('dayStreak')}
                      </span>
                      {habit.stats && (
                        <span className="flex items-center">
                          <StatsIcon sx={{ fontSize: 14, color: '#0ea5e9' }} /> {Math.round(habit.stats.completionRate * 100)}% {t('completion')}
                        </span>
                      )}
                    </div>
                    {habit.analytics && (
                      <div className="mt-2 text-xs text-sage-500 flex items-center space-x-3">
                        <span className="flex items-center gap-1"><TrophyIcon sx={{ fontSize: 12, color: '#f59e0b' }} /> {t('longest')}: {habit.analytics.longestStreak}</span>
                        <span className="flex items-center gap-1"><TrendingIcon sx={{ fontSize: 12, color: '#10b981' }} /> {t('total')}: {habit.analytics.totalCompletions}</span>
                        <span className="flex items-center gap-1"><StrengthIcon sx={{ fontSize: 12, color: '#8b5cf6' }} /> {t('consistency')}: {Math.round(habit.analytics.consistency.daily * 100)}%</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    {loadingAnalytics.has(habit.id) && (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-emerald-600 border-t-transparent"></div>
                    )}
                    <button
                      onClick={() => toggleHabit(habit.id)}
                      disabled={loadingAnalytics.has(habit.id)}
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                        completedToday.has(habit.id)
                          ? 'bg-emerald-600 text-white shadow-lg'
                          : 'bg-sage-100 text-sage-500 hover:bg-emerald-100 hover:text-emerald-600'
                      } ${loadingAnalytics.has(habit.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {completedToday.has(habit.id) ? <CheckedIcon sx={{ fontSize: 20, color: 'white' }} /> : <UncheckedIcon sx={{ fontSize: 20, color: 'currentColor' }} />}
                    </button>
                  </div>
                </div>

                {completedToday.has(habit.id) && (
                  <div className="mt-4 text-sm text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-200/50">
                    {t('completionMessage')}
                  </div>
                )}
              </div>
            ))}

            {/* Progress Summary */}
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl p-6 mt-8 shadow-lg" data-testid="progress-summary">
              <h2 className="text-xl font-semibold mb-2">{t('todaysProgress')}</h2>
              <div className="text-white/80">
                {completedToday.size} {t('of')} {habits.length} {t('habitsCompleted')}
              </div>
              <div className="w-full bg-white/20 rounded-full h-3 mt-3">
                <div
                  className="bg-white h-3 rounded-full transition-all duration-300"
                  style={{ width: `${(completedToday.size / habits.length) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="mb-4">
              <GrowthIcon sx={{ fontSize: 64, color: '#9ca3af' }} className="mx-auto" />
            </div>
            <p className="text-sage-600 mb-4">{t('noHabitsYet')}</p>
            <a href="/tazkiyah" className="btn-primary">
              {t('createFirstPlan')}
            </a>
          </div>
        )}
    </PageContainer>
  );
}