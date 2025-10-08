import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import SurveyResultsCard from '@/components/dashboard/SurveyResultsCard';
import { AuthUtils } from '@/lib/auth-utils';
import { apiService } from '@/lib/services/api';

// Mock dependencies
vi.mock('@/lib/auth-utils');
vi.mock('@/lib/services/api');

const mockAuthUtils = vi.mocked(AuthUtils);
const mockApiService = vi.mocked(apiService);

// Mock translations
const messages = {
  dashboard: {
    retry: 'Retry',
    viewDetails: 'View Details'
  },
  survey: {
    tazkiyahDiscovery: 'Tazkiyah Discovery',
    completeOnboardingDescription: 'Complete the onboarding survey to get personalized spiritual insights',
    startSurvey: 'Start Survey',
    spiritualInsights: 'Spiritual Insights',
    completedOn: 'Completed on',
    criticalAreas: 'Critical',
    moderateAreas: 'Moderate',
    strengths: 'Strengths',
    personalizedHabits: 'Personalized Habits',
    moreHabits: 'more habits',
    tazkiyahPlan: 'Tazkiyah Plan',
    focusAreas: 'Focus areas',
    duration: 'Duration',
    integratingHabits: 'Integrating habits...',
    addToHabitTracker: 'Add to Habit Tracker',
    habitsIntegrated: 'Habits Integrated'
  }
};

const renderWithIntl = (ui: React.ReactElement) => {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
};

describe('SurveyResultsCard', () => {
  const mockUserId = 'test-user-123';
  const mockOnHabitsIntegration = vi.fn();

  const mockSurveyResults = {
    id: 'survey-result-1',
    diseaseScores: {
      envy: 4,
      arrogance: 3,
      lust: 2
    },
    categorizedDiseases: {
      critical: ['envy'],
      moderate: ['arrogance'],
      strengths: ['lust']
    },
    personalizedHabits: [
      {
        id: 'habit-1',
        title: 'Morning Dhikr Practice',
        targetDisease: 'envy',
        frequency: 'daily'
      },
      {
        id: 'habit-2',
        title: 'Evening Reflection',
        targetDisease: 'arrogance',
        frequency: 'weekly'
      },
      {
        id: 'habit-3',
        title: 'Weekly Quran Study',
        targetDisease: 'lust',
        frequency: 'bi-weekly'
      },
      {
        id: 'habit-4',
        title: 'Daily Gratitude Journal',
        targetDisease: 'pride',
        frequency: 'daily'
      }
    ],
    tazkiyahPlan: {
      criticalDiseases: ['envy'],
      expectedDuration: '3 months',
      phases: [
        {
          title: 'Phase 1: Awareness',
          description: 'Building awareness of spiritual diseases'
        }
      ]
    },
    generatedAt: new Date('2024-01-15T10:00:00Z').toISOString()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthUtils.getAuthTokenWithFallback.mockResolvedValue('mock-token');
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Loading State', () => {
    it('should show loading state initially', () => {
      mockApiService.get.mockImplementation(() => new Promise(() => {})); // Never resolves

      renderWithIntl(
        <SurveyResultsCard userId={mockUserId} onHabitsIntegration={mockOnHabitsIntegration} />
      );

      expect(screen.getByRole('generic')).toHaveClass('animate-pulse');
    });
  });

  describe('No Survey Results', () => {
    it('should show onboarding prompt when no survey results exist', async () => {
      const mockError = { statusCode: 404 };
      mockApiService.get.mockRejectedValue(mockError);

      renderWithIntl(
        <SurveyResultsCard userId={mockUserId} onHabitsIntegration={mockOnHabitsIntegration} />
      );

      await waitFor(() => {
        expect(screen.getByText('Tazkiyah Discovery')).toBeInTheDocument();
        expect(screen.getByText('Complete the onboarding survey to get personalized spiritual insights')).toBeInTheDocument();
        expect(screen.getByText('Start Survey')).toBeInTheDocument();
      });

      const startButton = screen.getByText('Start Survey');
      expect(startButton.closest('a')).toHaveAttribute('href', '/onboarding/welcome');
    });
  });

  describe('Survey Results Display', () => {
    beforeEach(() => {
      mockApiService.get.mockResolvedValue({
        data: {
          data: {
            results: mockSurveyResults
          }
        }
      });
    });

    it('should display survey results correctly', async () => {
      renderWithIntl(
        <SurveyResultsCard userId={mockUserId} onHabitsIntegration={mockOnHabitsIntegration} />
      );

      await waitFor(() => {
        expect(screen.getByText('Spiritual Insights')).toBeInTheDocument();
      });

      // Check completion date
      expect(screen.getByText(/Completed on:/)).toBeInTheDocument();
      expect(screen.getByText(/1\/15\/2024/)).toBeInTheDocument();

      // Check categorized diseases counts
      expect(screen.getByText('1')).toBeInTheDocument(); // Critical count
      expect(screen.getByText('Critical')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument(); // Moderate count
      expect(screen.getByText('Moderate')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument(); // Strengths count
      expect(screen.getByText('Strengths')).toBeInTheDocument();
    });

    it('should display personalized habits summary', async () => {
      renderWithIntl(
        <SurveyResultsCard userId={mockUserId} onHabitsIntegration={mockOnHabitsIntegration} />
      );

      await waitFor(() => {
        expect(screen.getByText('4 Personalized Habits')).toBeInTheDocument();
      });

      // Should show first 3 habits
      expect(screen.getByText('Morning Dhikr Practice')).toBeInTheDocument();
      expect(screen.getByText('Evening Reflection')).toBeInTheDocument();
      expect(screen.getByText('Weekly Quran Study')).toBeInTheDocument();

      // Should show "+X more habits" for additional habits
      expect(screen.getByText('+1 more habits')).toBeInTheDocument();
    });

    it('should display Tazkiyah plan overview', async () => {
      renderWithIntl(
        <SurveyResultsCard userId={mockUserId} onHabitsIntegration={mockOnHabitsIntegration} />
      );

      await waitFor(() => {
        expect(screen.getByText('Tazkiyah Plan')).toBeInTheDocument();
      });

      expect(screen.getByText(/Focus areas: envy/)).toBeInTheDocument();
      expect(screen.getByText(/Duration: 3 months/)).toBeInTheDocument();
    });

    it('should have a link to view full results', async () => {
      renderWithIntl(
        <SurveyResultsCard userId={mockUserId} onHabitsIntegration={mockOnHabitsIntegration} />
      );

      await waitFor(() => {
        const viewDetailsLink = screen.getByText('View Details');
        expect(viewDetailsLink.closest('a')).toHaveAttribute('href', '/onboarding/results');
      });
    });
  });

  describe('Habits Integration', () => {
    beforeEach(() => {
      mockApiService.get.mockResolvedValue({
        data: {
          data: {
            results: mockSurveyResults
          }
        }
      });
    });

    it('should show integration button when habits are not integrated', async () => {
      renderWithIntl(
        <SurveyResultsCard userId={mockUserId} onHabitsIntegration={mockOnHabitsIntegration} />
      );

      await waitFor(() => {
        expect(screen.getByText('Add to Habit Tracker')).toBeInTheDocument();
      });

      const integrationButton = screen.getByText('Add to Habit Tracker');
      expect(integrationButton).toBeEnabled();
    });

    it('should integrate habits when button is clicked', async () => {
      mockApiService.post.mockResolvedValue({
        data: {
          data: {
            integration: {
              completed: true
            }
          }
        }
      });

      renderWithIntl(
        <SurveyResultsCard userId={mockUserId} onHabitsIntegration={mockOnHabitsIntegration} />
      );

      await waitFor(() => {
        expect(screen.getByText('Add to Habit Tracker')).toBeInTheDocument();
      });

      const integrationButton = screen.getByText('Add to Habit Tracker');
      fireEvent.click(integrationButton);

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByText('Integrating habits...')).toBeInTheDocument();
      });

      // Wait for integration to complete
      await waitFor(() => {
        expect(screen.getByText('Habits Integrated')).toBeInTheDocument();
      });

      // Verify API calls
      expect(mockApiService.post).toHaveBeenCalledWith(
        'v1/onboarding/integrate-habits',
        {},
        { authToken: 'mock-token' }
      );

      // Verify callback was called
      expect(mockOnHabitsIntegration).toHaveBeenCalled();
    });

    it('should show completed state when habits are already integrated', async () => {
      const mockSurveyResultsWithIntegratedHabits = {
        ...mockSurveyResults,
        personalizedHabits: mockSurveyResults.personalizedHabits.map(habit => ({
          ...habit,
          integrated: true
        }))
      };

      mockApiService.get.mockResolvedValue({
        data: {
          data: {
            results: mockSurveyResultsWithIntegratedHabits
          }
        }
      });

      renderWithIntl(
        <SurveyResultsCard userId={mockUserId} onHabitsIntegration={mockOnHabitsIntegration} />
      );

      await waitFor(() => {
        expect(screen.getByText('Habits Integrated')).toBeInTheDocument();
      });

      // Should not show integration button
      expect(screen.queryByText('Add to Habit Tracker')).not.toBeInTheDocument();
    });

    it('should handle integration errors', async () => {
      mockApiService.post.mockRejectedValue(new Error('Integration failed'));

      renderWithIntl(
        <SurveyResultsCard userId={mockUserId} onHabitsIntegration={mockOnHabitsIntegration} />
      );

      await waitFor(() => {
        expect(screen.getByText('Add to Habit Tracker')).toBeInTheDocument();
      });

      const integrationButton = screen.getByText('Add to Habit Tracker');
      fireEvent.click(integrationButton);

      await waitFor(() => {
        expect(screen.getByText('Add to Habit Tracker')).toBeInTheDocument(); // Button returns to normal state
      });

      // Should not call the callback on error
      expect(mockOnHabitsIntegration).not.toHaveBeenCalled();
    });

    it('should disable button during integration', async () => {
      mockApiService.post.mockImplementation(() => new Promise(() => {})); // Never resolves

      renderWithIntl(
        <SurveyResultsCard userId={mockUserId} onHabitsIntegration={mockOnHabitsIntegration} />
      );

      await waitFor(() => {
        expect(screen.getByText('Add to Habit Tracker')).toBeInTheDocument();
      });

      const integrationButton = screen.getByText('Add to Habit Tracker');
      fireEvent.click(integrationButton);

      await waitFor(() => {
        const loadingButton = screen.getByText('Integrating habits...');
        expect(loadingButton).toBeDisabled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error state when API call fails', async () => {
      mockApiService.get.mockRejectedValue(new Error('API Error'));

      renderWithIntl(
        <SurveyResultsCard userId={mockUserId} onHabitsIntegration={mockOnHabitsIntegration} />
      );

      await waitFor(() => {
        expect(screen.getByText('Failed to load survey results')).toBeInTheDocument();
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });

    it('should retry loading when retry button is clicked', async () => {
      mockApiService.get
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce({
          data: {
            data: {
              results: mockSurveyResults
            }
          }
        });

      renderWithIntl(
        <SurveyResultsCard userId={mockUserId} onHabitsIntegration={mockOnHabitsIntegration} />
      );

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });

      const retryButton = screen.getByText('Retry');
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('Spiritual Insights')).toBeInTheDocument();
      });

      // Verify API was called twice
      expect(mockApiService.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle survey results with no personalized habits', async () => {
      const surveyResultsWithNoHabits = {
        ...mockSurveyResults,
        personalizedHabits: []
      };

      mockApiService.get.mockResolvedValue({
        data: {
          data: {
            results: surveyResultsWithNoHabits
          }
        }
      });

      renderWithIntl(
        <SurveyResultsCard userId={mockUserId} onHabitsIntegration={mockOnHabitsIntegration} />
      );

      await waitFor(() => {
        expect(screen.getByText('0 Personalized Habits')).toBeInTheDocument();
      });

      // Should not show "more habits" text
      expect(screen.queryByText(/more habits/)).not.toBeInTheDocument();
    });

    it('should handle survey results with exactly 3 habits', async () => {
      const surveyResultsWith3Habits = {
        ...mockSurveyResults,
        personalizedHabits: mockSurveyResults.personalizedHabits.slice(0, 3)
      };

      mockApiService.get.mockResolvedValue({
        data: {
          data: {
            results: surveyResultsWith3Habits
          }
        }
      });

      renderWithIntl(
        <SurveyResultsCard userId={mockUserId} onHabitsIntegration={mockOnHabitsIntegration} />
      );

      await waitFor(() => {
        expect(screen.getByText('3 Personalized Habits')).toBeInTheDocument();
      });

      // Should not show "more habits" text for exactly 3 habits
      expect(screen.queryByText(/more habits/)).not.toBeInTheDocument();
    });
  });
});