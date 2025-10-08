'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export interface SurveyProgress {
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
}

export interface SurveyProgressHook {
  progress: SurveyProgress | null;
  loading: boolean;
  error: string | null;
  refreshProgress: () => Promise<void>;
  canAccessPhase: (phase: number) => boolean;
  getRedirectPath: () => string;
  isPhaseAccessDenied: boolean;
}

const STORAGE_KEY = 'sakinah_survey_progress';

/**
 * Hook for managing survey progress and route protection
 */
export function useSurveyProgress(): SurveyProgressHook {
  const [progress, setProgress] = useState<SurveyProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPhaseAccessDenied, setIsPhaseAccessDenied] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();

  // Check if we were redirected due to phase access denial
  useEffect(() => {
    const reason = searchParams.get('reason');
    if (reason === 'phase_progression') {
      setIsPhaseAccessDenied(true);
      // Clear the search param after handling it
      const url = new URL(window.location.href);
      url.searchParams.delete('reason');
      window.history.replaceState({}, '', url.toString());
    }
  }, [searchParams]);

  /**
   * Load progress from localStorage as fallback
   */
  const loadProgressFromStorage = useCallback((): SurveyProgress | null => {
    try {
      if (typeof window === 'undefined') return null;

      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;

      return JSON.parse(stored);
    } catch (error) {
      console.error('Failed to load survey progress from localStorage:', error);
      return null;
    }
  }, []);

  /**
   * Save progress to localStorage
   */
  const saveProgressToStorage = useCallback((progressData: SurveyProgress) => {
    try {
      if (typeof window === 'undefined') return;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progressData));
    } catch (error) {
      console.error('Failed to save survey progress to localStorage:', error);
    }
  }, []);

  /**
   * Fetch progress from API
   */
  const fetchProgress = useCallback(async (): Promise<SurveyProgress | null> => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${apiUrl}/v1/onboarding/progress`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // If API call fails, try to load from localStorage
        if (response.status === 401) {
          throw new Error('Not authenticated');
        }
        throw new Error(`Failed to fetch progress: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.data.progress) {
        const progressData = data.data.progress;
        saveProgressToStorage(progressData);
        return progressData;
      }

      return null;
    } catch (error) {
      console.error('Failed to fetch survey progress:', error);
      // Fallback to localStorage
      return loadProgressFromStorage();
    }
  }, [loadProgressFromStorage, saveProgressToStorage]);

  /**
   * Refresh progress from API
   */
  const refreshProgress = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const progressData = await fetchProgress();
      setProgress(progressData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage);

      // Try localStorage as final fallback
      const storedProgress = loadProgressFromStorage();
      setProgress(storedProgress);
    } finally {
      setLoading(false);
    }
  }, [fetchProgress, loadProgressFromStorage]);

  /**
   * Check if user can access a specific phase
   */
  const canAccessPhase = useCallback((targetPhase: number): boolean => {
    if (!progress) return targetPhase === 0; // Allow welcome phase if no progress

    switch (targetPhase) {
      case 0: // Welcome
        return true;
      case 1: // Phase 1
        return progress.currentPhase >= 1 || progress.currentPhase === 0;
      case 2: // Phase 2
        return progress.phase1Completed;
      case 3: // Reflection
        return progress.phase1Completed && progress.phase2Completed;
      case 4: // Results
        return progress.phase1Completed && progress.phase2Completed && progress.reflectionCompleted;
      default:
        return false;
    }
  }, [progress]);

  /**
   * Get the appropriate redirect path based on current progress
   */
  const getRedirectPath = useCallback((): string => {
    if (!progress) return '/onboarding/welcome';

    if (progress.isCompleted) {
      return '/onboarding/results';
    }

    if (progress.currentPhase === 0) {
      return '/onboarding/welcome';
    } else if (progress.currentPhase === 1 && !progress.phase1Completed) {
      return '/onboarding/phase1';
    } else if (progress.currentPhase === 2 && !progress.phase2Completed) {
      return '/onboarding/phase2';
    } else if (progress.currentPhase === 3 && !progress.reflectionCompleted) {
      return '/onboarding/reflection';
    } else if (progress.currentPhase === 4) {
      return '/onboarding/results';
    }

    return '/onboarding/welcome';
  }, [progress]);

  /**
   * Auto-redirect if user is on wrong phase
   */
  useEffect(() => {
    if (!loading && progress && typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      const expectedPath = getRedirectPath();

      // Only redirect if we're on a survey page but not the correct one
      if (currentPath.startsWith('/onboarding/') &&
          currentPath !== expectedPath &&
          currentPath !== '/onboarding') {

        const phaseMap: Record<string, number> = {
          '/onboarding/welcome': 0,
          '/onboarding/phase1': 1,
          '/onboarding/phase2': 2,
          '/onboarding/reflection': 3,
          '/onboarding/results': 4,
        };

        const targetPhase = phaseMap[currentPath];
        if (targetPhase !== undefined && !canAccessPhase(targetPhase)) {
          router.push(expectedPath);
        }
      }
    }
  }, [loading, progress, getRedirectPath, canAccessPhase, router]);

  // Load progress on mount
  useEffect(() => {
    refreshProgress();
  }, [refreshProgress]);

  return {
    progress,
    loading,
    error,
    refreshProgress,
    canAccessPhase,
    getRedirectPath,
    isPhaseAccessDenied,
  };
}

/**
 * Hook for updating survey progress after completing phases
 */
export function useSurveyProgressUpdater() {
  const { refreshProgress } = useSurveyProgress();

  const updateProgress = useCallback(async (phaseCompleted: number) => {
    try {
      // Auto-refresh progress after phase completion
      await new Promise(resolve => setTimeout(resolve, 500)); // Brief delay for API
      await refreshProgress();
    } catch (error) {
      console.error('Failed to update survey progress:', error);
    }
  }, [refreshProgress]);

  return { updateProgress };
}