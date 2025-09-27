import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { NextIntlClientProvider } from 'next-intl';
import HabitsPage from '../../app/habits/page';
import { api } from '../../lib/api';
import { createClient } from '../../lib/supabase-browser';

// Mock dependencies
jest.mock('../../lib/api');
jest.mock('../../lib/supabase-browser');

const mockApi = api as jest.Mocked<typeof api>;
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

// Mock translations
const messages = {
  habits: {
    title: 'Habits',
    loadingHabits: 'Loading habits...',
    sampleHabits: {
      morningDhikr: 'Morning Dhikr',
      readQuran: 'Read Quran',
      eveningDua: 'Evening Dua',
      patience: 'Patience',
      knowledge: 'Knowledge',
      gratitude: 'Gratitude'
    },
    dayStreak: 'day streak',
    completion: 'completion',
    longest: 'Longest',
    total: 'Total',
    consistency: 'Consistency',
    completionMessage: 'Excellent! May Allah accept your efforts.',
    todaysProgress: 'Today\'s Progress',
    of: 'of',
    habitsCompleted: 'habits completed',
    noHabitsYet: 'No habits yet',
    createFirstPlan: 'Create your first plan'
  },
  common: {
    loading: 'Loading...',
    retry: 'Retry'
  }
};

const mockSupabaseClient = {
  auth: {
    getSession: jest.fn()
  }
};

// Mock habit data
const mockHabitsResponse = {
  habits: [
    {
      id: 'habit-1',
      title: 'Morning Dhikr',
      streakCount: 7,
      lastCompletedOn: '2024-01-01',
      plan: { target: 'Patience', kind: 'tahliyah' as const },
      stats: {
        completionRate: 0.8,
        averageStreakLength: 5,
        totalCompletions: 20
      }
    },
    {
      id: 'habit-2',
      title: 'Read Quran',
      streakCount: 3,
      lastCompletedOn: '2023-12-31',
      plan: { target: 'Knowledge', kind: 'tahliyah' as const },
      stats: {
        completionRate: 0.6,
        averageStreakLength: 3,
        totalCompletions: 15
      }
    },
    {
      id: 'habit-3',
      title: 'Evening Dua',
      streakCount: 12,
      lastCompletedOn: undefined,
      plan: { target: 'Gratitude', kind: 'tahliyah' as const },
      stats: {
        completionRate: 0.9,
        averageStreakLength: 8,
        totalCompletions: 30
      }
    }
  ],
  metadata: {
    total: 3,
    activeCount: 2
  }
};

const mockAnalyticsResponse = {
  analytics: {
    habitId: 'habit-1',
    period: '30d',
    completionRate: 0.85,
    currentStreak: 7,
    longestStreak: 15,
    totalCompletions: 25,
    recentCompletions: 20,
    consistency: {
      daily: 0.85,
      weekly: 0.9,
      monthly: 0.8
    }
  }
};

describe('HabitsPage v2 Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateClient.mockReturnValue(mockSupabaseClient as any);

    // Default session mock
    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'mock-token',
          user: { id: 'user-123' }
        }
      }
    });

    // Default API responses
    mockApi.getHabits.mockResolvedValue(mockHabitsResponse);
    mockApi.getHabitAnalytics.mockResolvedValue(mockAnalyticsResponse);
    mockApi.completeHabit.mockResolvedValue({ success: true });
    mockApi.incompleteHabit.mockResolvedValue({ success: true });
  });

  const renderHabitsPage = () => {
    return render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <HabitsPage />
      </NextIntlClientProvider>
    );
  };

  describe('Initial Loading and Data Fetching', () => {
    it('should show loading state initially', () => {
      renderHabitsPage();
      expect(screen.getByText('Loading habits...')).toBeInTheDocument();
    });

    it('should fetch habits with stats and history parameters', async () => {
      renderHabitsPage();

      await waitFor(() => {
        expect(mockApi.getHabits).toHaveBeenCalledWith({
          includeStats: true,
          includeHistory: true
        });
      });
    });

    it('should display habits after successful fetch', async () => {
      renderHabitsPage();

      await waitFor(() => {
        expect(screen.getByText('Morning Dhikr')).toBeInTheDocument();
        expect(screen.getByText('Read Quran')).toBeInTheDocument();
        expect(screen.getByText('Evening Dua')).toBeInTheDocument();
      });
    });

    it('should show habit stats when available', async () => {
      renderHabitsPage();

      await waitFor(() => {
        expect(screen.getByText('80% completion')).toBeInTheDocument();
        expect(screen.getByText('60% completion')).toBeInTheDocument();
        expect(screen.getByText('90% completion')).toBeInTheDocument();
      });
    });

    it('should identify completed habits for today', async () => {
      const today = new Date().toISOString().split('T')[0];
      const modifiedResponse = {
        ...mockHabitsResponse,
        habits: [
          { ...mockHabitsResponse.habits[0], lastCompletedOn: today },
          ...mockHabitsResponse.habits.slice(1)
        ]
      };

      mockApi.getHabits.mockResolvedValue(modifiedResponse);

      renderHabitsPage();

      await waitFor(() => {
        const completedCard = screen.getByTestId('habit-card');
        expect(completedCard).toHaveClass('ring-2', 'ring-emerald-500/30');
      });
    });
  });

  describe('Authentication Handling', () => {
    it('should show sample data when not authenticated', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null }
      });

      renderHabitsPage();

      await waitFor(() => {
        expect(screen.getByText('Morning Dhikr')).toBeInTheDocument();
        expect(mockApi.getHabits).not.toHaveBeenCalled();
      });
    });

    it('should not call API endpoints without auth token', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null }
      });

      renderHabitsPage();

      await waitFor(() => {
        expect(mockApi.getHabits).not.toHaveBeenCalled();
        expect(mockApi.getHabitAnalytics).not.toHaveBeenCalled();
      });
    });
  });

  describe('Habit Completion with v2 Endpoints', () => {
    it('should call completeHabit endpoint when marking habit complete', async () => {
      renderHabitsPage();

      await waitFor(() => {
        const toggleButton = screen.getAllByRole('button').find(btn =>
          btn.textContent === '○'
        );
        expect(toggleButton).toBeInTheDocument();
      });

      const toggleButton = screen.getAllByRole('button').find(btn =>
        btn.textContent === '○'
      );

      if (toggleButton) {
        fireEvent.click(toggleButton);

        await waitFor(() => {
          expect(mockApi.completeHabit).toHaveBeenCalledWith('habit-1');
        });
      }
    });

    it('should call incompleteHabit endpoint when marking habit incomplete', async () => {
      const today = new Date().toISOString().split('T')[0];
      const modifiedResponse = {
        ...mockHabitsResponse,
        habits: [
          { ...mockHabitsResponse.habits[0], lastCompletedOn: today },
          ...mockHabitsResponse.habits.slice(1)
        ]
      };

      mockApi.getHabits.mockResolvedValue(modifiedResponse);

      renderHabitsPage();

      await waitFor(() => {
        const toggleButton = screen.getAllByRole('button').find(btn =>
          btn.textContent === '✓'
        );
        expect(toggleButton).toBeInTheDocument();
      });

      const toggleButton = screen.getAllByRole('button').find(btn =>
        btn.textContent === '✓'
      );

      if (toggleButton) {
        fireEvent.click(toggleButton);

        await waitFor(() => {
          expect(mockApi.incompleteHabit).toHaveBeenCalledWith('habit-1');
        });
      }
    });

    it('should load analytics after successful habit completion', async () => {
      renderHabitsPage();

      await waitFor(() => {
        const toggleButton = screen.getAllByRole('button').find(btn =>
          btn.textContent === '○'
        );

        if (toggleButton) {
          fireEvent.click(toggleButton);
        }
      });

      await waitFor(() => {
        expect(mockApi.getHabitAnalytics).toHaveBeenCalledWith('habit-1');
      });
    });
  });

  describe('Optimistic UI Updates', () => {
    it('should immediately update UI when toggling habit', async () => {
      renderHabitsPage();

      await waitFor(() => {
        const toggleButton = screen.getAllByRole('button').find(btn =>
          btn.textContent === '○'
        );

        if (toggleButton) {
          fireEvent.click(toggleButton);

          // Should immediately show completed state
          expect(toggleButton.textContent).toBe('✓');
        }
      });
    });

    it('should rollback UI state on API failure', async () => {
      mockApi.completeHabit.mockRejectedValue(new Error('API Error'));

      renderHabitsPage();

      await waitFor(() => {
        const toggleButton = screen.getAllByRole('button').find(btn =>
          btn.textContent === '○'
        );

        if (toggleButton) {
          fireEvent.click(toggleButton);
        }
      });

      // Should rollback to original state
      await waitFor(() => {
        const originalButton = screen.getAllByRole('button').find(btn =>
          btn.textContent === '○'
        );
        expect(originalButton).toBeInTheDocument();
      });
    });

    it('should update streak count optimistically', async () => {
      renderHabitsPage();

      await waitFor(() => {
        expect(screen.getByText('7 day streak')).toBeInTheDocument();
      });

      const toggleButton = screen.getAllByRole('button').find(btn =>
        btn.textContent === '○'
      );

      if (toggleButton) {
        fireEvent.click(toggleButton);

        // Should immediately show updated streak
        await waitFor(() => {
          expect(screen.getByText('8 day streak')).toBeInTheDocument();
        });
      }
    });
  });

  describe('Analytics Integration', () => {
    it('should load analytics for habits without analytics data', async () => {
      renderHabitsPage();

      // Wait for initial habits to load
      await waitFor(() => {
        expect(mockApi.getHabits).toHaveBeenCalled();
      });

      // Should then load analytics for each habit
      await waitFor(() => {
        expect(mockApi.getHabitAnalytics).toHaveBeenCalledWith('habit-1');
        expect(mockApi.getHabitAnalytics).toHaveBeenCalledWith('habit-2');
        expect(mockApi.getHabitAnalytics).toHaveBeenCalledWith('habit-3');
      });
    });

    it('should display analytics data when available', async () => {
      renderHabitsPage();

      // Mock analytics loading
      await waitFor(() => {
        expect(mockApi.getHabitAnalytics).toHaveBeenCalled();
      });

      // Should display analytics in UI
      await waitFor(() => {
        expect(screen.getByText('Longest: 15')).toBeInTheDocument();
        expect(screen.getByText('Total: 25')).toBeInTheDocument();
        expect(screen.getByText('Consistency: 85%')).toBeInTheDocument();
      });
    });

    it('should show loading indicator while analytics loads', async () => {
      let resolveAnalytics: (value: any) => void;
      const analyticsPromise = new Promise(resolve => {
        resolveAnalytics = resolve;
      });

      mockApi.getHabitAnalytics.mockReturnValue(analyticsPromise as any);

      renderHabitsPage();

      // Wait for habits to load
      await waitFor(() => {
        expect(mockApi.getHabits).toHaveBeenCalled();
      });

      // Should show loading indicator
      await waitFor(() => {
        const loadingSpinner = screen.getByRole('button', { name: /○/ }).parentElement?.querySelector('.animate-spin');
        expect(loadingSpinner).toBeInTheDocument();
      });

      // Resolve analytics
      resolveAnalytics!(mockAnalyticsResponse);

      // Loading should disappear
      await waitFor(() => {
        const loadingSpinner = screen.queryByRole('button', { name: /○/ })?.parentElement?.querySelector('.animate-spin');
        expect(loadingSpinner).not.toBeInTheDocument();
      });
    });

    it('should disable habit toggle while analytics loads', async () => {
      let resolveAnalytics: (value: any) => void;
      const analyticsPromise = new Promise(resolve => {
        resolveAnalytics = resolve;
      });

      mockApi.getHabitAnalytics.mockReturnValue(analyticsPromise as any);

      renderHabitsPage();

      // Toggle a habit to trigger analytics loading
      await waitFor(() => {
        const toggleButton = screen.getAllByRole('button').find(btn =>
          btn.textContent === '○'
        );

        if (toggleButton) {
          fireEvent.click(toggleButton);
          expect(toggleButton).toBeDisabled();
        }
      });

      // Resolve analytics
      resolveAnalytics!(mockAnalyticsResponse);

      // Button should be enabled again
      await waitFor(() => {
        const toggleButton = screen.getAllByRole('button').find(btn =>
          btn.textContent === '✓'
        );
        expect(toggleButton).not.toBeDisabled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when habits loading fails', async () => {
      mockApi.getHabits.mockRejectedValue(new Error('Network Error'));

      renderHabitsPage();

      await waitFor(() => {
        expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });

    it('should provide specific error messages for different error types', async () => {
      const unauthorizedError = new Error('Unauthorized');
      (unauthorizedError as any).statusCode = 401;

      mockApi.completeHabit.mockRejectedValue(unauthorizedError);

      renderHabitsPage();

      await waitFor(() => {
        const toggleButton = screen.getAllByRole('button').find(btn =>
          btn.textContent === '○'
        );

        if (toggleButton) {
          fireEvent.click(toggleButton);
        }
      });

      await waitFor(() => {
        expect(screen.getByText(/authentication expired/i)).toBeInTheDocument();
      });
    });

    it('should handle network errors gracefully', async () => {
      const networkError = new Error('Network Error');
      (networkError as any).errorCode = 'NETWORK_ERROR';

      mockApi.completeHabit.mockRejectedValue(networkError);

      renderHabitsPage();

      await waitFor(() => {
        const toggleButton = screen.getAllByRole('button').find(btn =>
          btn.textContent === '○'
        );

        if (toggleButton) {
          fireEvent.click(toggleButton);
        }
      });

      await waitFor(() => {
        expect(screen.getByText(/network connection failed/i)).toBeInTheDocument();
      });
    });

    it('should handle rate limiting errors', async () => {
      const rateLimitError = new Error('Too Many Requests');
      (rateLimitError as any).statusCode = 429;

      mockApi.completeHabit.mockRejectedValue(rateLimitError);

      renderHabitsPage();

      await waitFor(() => {
        const toggleButton = screen.getAllByRole('button').find(btn =>
          btn.textContent === '○'
        );

        if (toggleButton) {
          fireEvent.click(toggleButton);
        }
      });

      await waitFor(() => {
        expect(screen.getByText(/too many requests/i)).toBeInTheDocument();
      });
    });

    it('should not show error for analytics failures', async () => {
      mockApi.getHabitAnalytics.mockRejectedValue(new Error('Analytics Error'));

      renderHabitsPage();

      await waitFor(() => {
        expect(mockApi.getHabitAnalytics).toHaveBeenCalled();
      });

      // Should not display error for analytics failure
      expect(screen.queryByText(/failed to load analytics/i)).not.toBeInTheDocument();
    });

    it('should retry habits loading on retry button click', async () => {
      mockApi.getHabits.mockRejectedValueOnce(new Error('Network Error'))
                      .mockResolvedValueOnce(mockHabitsResponse);

      renderHabitsPage();

      await waitFor(() => {
        const retryButton = screen.getByText('Retry');
        fireEvent.click(retryButton);
      });

      await waitFor(() => {
        expect(mockApi.getHabits).toHaveBeenCalledTimes(2);
        expect(screen.getByText('Morning Dhikr')).toBeInTheDocument();
      });
    });
  });

  describe('Progress Summary', () => {
    it('should display correct progress summary', async () => {
      const today = new Date().toISOString().split('T')[0];
      const modifiedResponse = {
        ...mockHabitsResponse,
        habits: [
          { ...mockHabitsResponse.habits[0], lastCompletedOn: today },
          { ...mockHabitsResponse.habits[1], lastCompletedOn: today },
          ...mockHabitsResponse.habits.slice(2)
        ]
      };

      mockApi.getHabits.mockResolvedValue(modifiedResponse);

      renderHabitsPage();

      await waitFor(() => {
        expect(screen.getByTestId('progress-summary')).toBeInTheDocument();
        expect(screen.getByText('2 of 3 habits completed')).toBeInTheDocument();
      });
    });

    it('should update progress summary when habits are toggled', async () => {
      renderHabitsPage();

      await waitFor(() => {
        expect(screen.getByText('0 of 3 habits completed')).toBeInTheDocument();
      });

      const toggleButton = screen.getAllByRole('button').find(btn =>
        btn.textContent === '○'
      );

      if (toggleButton) {
        fireEvent.click(toggleButton);

        await waitFor(() => {
          expect(screen.getByText('1 of 3 habits completed')).toBeInTheDocument();
        });
      }
    });

    it('should show correct progress bar percentage', async () => {
      const today = new Date().toISOString().split('T')[0];
      const modifiedResponse = {
        ...mockHabitsResponse,
        habits: [
          { ...mockHabitsResponse.habits[0], lastCompletedOn: today },
          ...mockHabitsResponse.habits.slice(1)
        ]
      };

      mockApi.getHabits.mockResolvedValue(modifiedResponse);

      renderHabitsPage();

      await waitFor(() => {
        const progressBar = screen.getByTestId('progress-summary').querySelector('.bg-white');
        expect(progressBar).toHaveStyle({ width: '33.333%' }); // 1 of 3
      });
    });
  });

  describe('Empty States', () => {
    it('should show empty state when no habits exist', async () => {
      mockApi.getHabits.mockResolvedValue({ habits: [], metadata: { total: 0, activeCount: 0 } });

      renderHabitsPage();

      await waitFor(() => {
        expect(screen.getByText('No habits yet')).toBeInTheDocument();
        expect(screen.getByText('Create your first plan')).toBeInTheDocument();
      });
    });

    it('should show link to create plan in empty state', async () => {
      mockApi.getHabits.mockResolvedValue({ habits: [], metadata: { total: 0, activeCount: 0 } });

      renderHabitsPage();

      await waitFor(() => {
        const createPlanLink = screen.getByRole('link', { name: 'Create your first plan' });
        expect(createPlanLink).toHaveAttribute('href', '/tazkiyah');
      });
    });
  });

  describe('Completion Messages', () => {
    it('should show completion message for completed habits', async () => {
      const today = new Date().toISOString().split('T')[0];
      const modifiedResponse = {
        ...mockHabitsResponse,
        habits: [
          { ...mockHabitsResponse.habits[0], lastCompletedOn: today },
          ...mockHabitsResponse.habits.slice(1)
        ]
      };

      mockApi.getHabits.mockResolvedValue(modifiedResponse);

      renderHabitsPage();

      await waitFor(() => {
        expect(screen.getByText('Excellent! May Allah accept your efforts.')).toBeInTheDocument();
      });
    });

    it('should show completion message after toggling habit', async () => {
      renderHabitsPage();

      const toggleButton = screen.getAllByRole('button').find(btn =>
        btn.textContent === '○'
      );

      if (toggleButton) {
        fireEvent.click(toggleButton);

        await waitFor(() => {
          expect(screen.getByText('Excellent! May Allah accept your efforts.')).toBeInTheDocument();
        });
      }
    });
  });
});