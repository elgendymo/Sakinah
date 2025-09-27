import { useState, useCallback } from 'react';
import { api } from '@/lib/api';

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

interface HabitCompletionState {
  [habitId: string]: {
    isCompleted: boolean;
    isOptimistic: boolean;
    isFailing: boolean;
    originalStreakCount: number;
    retryCount: number;
  };
}

interface UseOptimisticHabitsReturn {
  habits: Habit[];
  completedToday: Set<string>;
  completionStates: HabitCompletionState;
  isLoading: boolean;
  pendingOperations: number;
  toggleHabit: (habitId: string, token: string) => Promise<void>;
  retryFailedHabit: (habitId: string, token: string) => Promise<void>;
  setHabits: (habits: Habit[]) => void;
  clearFailedState: (habitId: string) => void;
}

export function useOptimisticHabits(initialHabits: Habit[] = []): UseOptimisticHabitsReturn {
  const [habits, setHabits] = useState<Habit[]>(initialHabits);
  const [completedToday, setCompletedToday] = useState<Set<string>>(new Set());
  const [completionStates, setCompletionStates] = useState<HabitCompletionState>({});
  const [isLoading, setIsLoading] = useState(false);
  const [pendingOperations, setPendingOperations] = useState(0);

  const toggleHabit = useCallback(async (habitId: string, token: string) => {
    const currentHabit = habits.find(h => h.id === habitId);
    if (!currentHabit) return;

    const wasCompleted = completedToday.has(habitId);
    const newCompletionStatus = !wasCompleted;

    // Store original state for potential rollback
    const originalStreakCount = currentHabit.streakCount;

    // Apply optimistic update immediately
    const updatedCompletedToday = new Set(completedToday);
    if (newCompletionStatus) {
      updatedCompletedToday.add(habitId);
    } else {
      updatedCompletedToday.delete(habitId);
    }
    setCompletedToday(updatedCompletedToday);

    // Update completion state
    setCompletionStates(prev => ({
      ...prev,
      [habitId]: {
        isCompleted: newCompletionStatus,
        isOptimistic: true,
        isFailing: false,
        originalStreakCount,
        retryCount: 0
      }
    }));

    // Update habit streak optimistically
    setHabits(prev => prev.map(habit => {
      if (habit.id === habitId) {
        return {
          ...habit,
          streakCount: newCompletionStatus
            ? habit.streakCount + 1
            : Math.max(0, habit.streakCount - 1),
          lastCompletedOn: newCompletionStatus
            ? new Date().toISOString().split('T')[0]
            : undefined,
        };
      }
      return habit;
    }));

    // Update loading state
    setPendingOperations(prev => prev + 1);
    setIsLoading(true);

    try {
      // Make API call
      await api.toggleHabit(habitId, newCompletionStatus, token);

      // Success - mark as confirmed
      setCompletionStates(prev => ({
        ...prev,
        [habitId]: {
          ...prev[habitId],
          isOptimistic: false
        }
      }));

      // Add small delay for better UX feedback
      setTimeout(() => {
        setCompletionStates(prev => {
          const newState = { ...prev };
          if (newState[habitId] && !newState[habitId].isFailing) {
            delete newState[habitId];
          }
          return newState;
        });
      }, 2000);

    } catch (error) {
      console.error('Failed to toggle habit:', error);

      // Revert optimistic changes
      const revertedCompletedToday = new Set(completedToday);
      if (wasCompleted) {
        revertedCompletedToday.add(habitId);
      } else {
        revertedCompletedToday.delete(habitId);
      }
      setCompletedToday(revertedCompletedToday);

      // Revert habit streak
      setHabits(prev => prev.map(habit => {
        if (habit.id === habitId) {
          return {
            ...habit,
            streakCount: originalStreakCount,
            lastCompletedOn: wasCompleted ? new Date().toISOString().split('T')[0] : undefined,
          };
        }
        return habit;
      }));

      // Mark as failed
      setCompletionStates(prev => ({
        ...prev,
        [habitId]: {
          isCompleted: wasCompleted,
          isOptimistic: false,
          isFailing: true,
          originalStreakCount,
          retryCount: prev[habitId]?.retryCount + 1 || 1
        }
      }));

    } finally {
      setPendingOperations(prev => Math.max(0, prev - 1));
      setPendingOperations(count => {
        setIsLoading(count > 0);
        return count;
      });
    }
  }, [habits, completedToday]);

  const retryFailedHabit = useCallback(async (habitId: string, token: string) => {
    const failedState = completionStates[habitId];
    if (!failedState || !failedState.isFailing) return;

    // Clear failed state and try again
    setCompletionStates(prev => ({
      ...prev,
      [habitId]: {
        ...prev[habitId],
        isFailing: false,
        isOptimistic: true
      }
    }));

    await toggleHabit(habitId, token);
  }, [completionStates, toggleHabit]);

  const clearFailedState = useCallback((habitId: string) => {
    setCompletionStates(prev => {
      const newState = { ...prev };
      delete newState[habitId];
      return newState;
    });
  }, []);

  return {
    habits,
    completedToday,
    completionStates,
    isLoading,
    pendingOperations,
    toggleHabit,
    retryFailedHabit,
    setHabits,
    clearFailedState
  };
}

// Hook for habit-specific retry functionality
export function useHabitRetry() {
  const [retryStates, setRetryStates] = useState<Record<string, {
    isRetrying: boolean;
    retryCount: number;
    maxRetries: number;
  }>>({});

  const markRetrying = useCallback((habitId: string) => {
    setRetryStates(prev => ({
      ...prev,
      [habitId]: {
        isRetrying: true,
        retryCount: (prev[habitId]?.retryCount || 0) + 1,
        maxRetries: 3
      }
    }));
  }, []);

  const clearRetrying = useCallback((habitId: string) => {
    setRetryStates(prev => {
      const newState = { ...prev };
      delete newState[habitId];
      return newState;
    });
  }, []);

  const canRetry = useCallback((habitId: string) => {
    const state = retryStates[habitId];
    return !state || state.retryCount < state.maxRetries;
  }, [retryStates]);

  return {
    retryStates,
    markRetrying,
    clearRetrying,
    canRetry
  };
}