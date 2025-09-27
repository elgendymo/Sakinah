import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { NextIntlClientProvider } from 'next-intl';
import DashboardClient from '../../app/dashboard/dashboard-client';
import { apiService } from '../../lib/services/api';
import { createClient } from '../../lib/supabase-browser';

// Mock dependencies
jest.mock('../../lib/services/api');
jest.mock('../../lib/supabase-browser');
jest.mock('adhan');

const mockApiService = apiService as jest.Mocked<typeof apiService>;
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

// Mock translations
const messages = {
  dashboard: {
    welcome: 'Welcome',
    welcomeMessage: 'Welcome to your spiritual journey',
    todaysPrayers: 'Today\'s Prayers',
    prayersDescription: 'Track your daily prayers',
    nextPrayer: 'Next Prayer',
    allComplete: 'All Complete',
    todaysProgress: 'Today\'s Progress',
    completed: 'completed',
    morningCheckin: 'Morning Check-in',
    setIntention: 'Set Intention',
    eveningReflection: 'Evening Reflection',
    muhasabahGratitude: 'Muhasabah & Gratitude',
    setTodaysIntention: 'Set Today\'s Intention',
    completeEveningReflection: 'Complete Evening Reflection',
    availableAfterAsr: 'Available After Asr',
    focusOnCurrentIntentions: 'Focus on Current Intentions',
    todaysSpiritualFocus: 'Today\'s Spiritual Focus',
    dailyNourishment: 'Daily Nourishment',
    todaysGuidance: 'Today\'s Guidance',
    reflectionOfDay: 'Reflection of the Day',
    todaysPlan: 'Today\'s Plan',
    spiritualRoadmap: 'Spiritual Roadmap',
    dailyHabits: 'Daily Habits',
    progress: 'Progress',
    viewDetails: 'View Details',
    habit: 'Habit',
    dua: 'Dua',
    ayah: 'Ayah',
    done: 'Done',
    morningDua: 'Morning Dua',
    startWithRemembrance: 'Start with Remembrance',
    dailyIntention: 'Daily Intention',
    writeIntention: 'Write your intention...',
    save: 'Save',
    cancel: 'Cancel',
    sampleIntention: 'Read Quran for 15 minutes with reflection',
    intentionSet: 'Intention Set',
    editIntention: 'Edit Intention',
    dailyIntentionReminder: 'Renew your intention daily',
    dhikrCounter: 'Dhikr Counter',
    astaghfirullah: 'Astaghfirullah',
    of100: 'of 100',
    alhamdulillahTargetReached: 'Alhamdulillah! Target reached',
    resetCounter: 'Reset Counter',
    tapToCount: 'Tap to count',
    momentOfReflection: 'Moment of Reflection',
    heartsAtRest: 'Hearts find rest in the remembrance of Allah',
    quranReference: 'Quran 13:28'
  },
  common: {
    loading: 'Loading...',
    retry: 'Retry'
  },
  prayers: {
    fajr: 'Fajr',
    dhuhr: 'Dhuhr',
    asr: 'Asr',
    maghrib: 'Maghrib',
    isha: 'Isha'
  },
  habits: {
    morningAdhkar: 'Morning Adhkar',
    reciteMorningRemembrance: 'Recite morning remembrance',
    quranReading: 'Quran Reading',
    readAtLeastOnePage: 'Read at least one page',
    eveningDua: 'Evening Dua',
    makeDuaBeforeMaghrib: 'Make dua before Maghrib',
    istighfar: 'Istighfar',
    seekForgiveness100Times: 'Seek forgiveness 100 times'
  }
};

const mockSupabaseClient = {
  auth: {
    getSession: jest.fn(),
    getUser: jest.fn()
  }
};

describe('DashboardClient', () => {
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
    mockApiService.get.mockImplementation((endpoint) => {
      if (endpoint === '/v2/plans/active') {
        return Promise.resolve({
          data: {
            data: {
              plans: [{
                id: 'plan-1',
                title: 'Test Plan',
                description: 'Test Description',
                status: 'active',
                items: [
                  { id: '1', text: 'Test habit', type: 'habit', completed: false }
                ],
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-01-01T00:00:00Z'
              }]
            }
          },
          headers: new Headers(),
          status: 200,
          correlationId: 'test-correlation',
          cached: false,
          timestamp: new Date().toISOString()
        });
      }

      if (endpoint === '/v2/intentions') {
        return Promise.resolve({
          data: {
            data: [{
              id: 'intention-1',
              text: 'Test intention',
              priority: 'medium',
              status: 'active',
              createdAt: '2024-01-01T00:00:00Z'
            }]
          },
          headers: new Headers(),
          status: 200,
          correlationId: 'test-correlation',
          cached: false,
          timestamp: new Date().toISOString()
        });
      }

      if (endpoint === '/v2/dhikr/sessions') {
        return Promise.resolve({
          data: {
            data: [{
              id: 'dhikr-1',
              dhikrType: 'astaghfirullah',
              dhikrText: 'أستغفر الله',
              currentCount: 50,
              targetCount: 100,
              status: 'active',
              date: '2024-01-01'
            }]
          },
          headers: new Headers(),
          status: 200,
          correlationId: 'test-correlation',
          cached: false,
          timestamp: new Date().toISOString()
        });
      }

      if (endpoint === '/v2/prayer-times') {
        return Promise.resolve({
          data: {
            data: {
              prayerTimes: {
                prayerTimes: {
                  fajr: { time: '2024-01-01T05:30:00Z' },
                  dhuhr: { time: '2024-01-01T12:45:00Z' },
                  asr: { time: '2024-01-01T16:15:00Z' },
                  maghrib: { time: '2024-01-01T19:20:00Z' },
                  isha: { time: '2024-01-01T20:45:00Z' }
                }
              },
              qiblaDirection: 244.32
            }
          },
          headers: new Headers(),
          status: 200,
          correlationId: 'test-correlation',
          cached: false,
          timestamp: new Date().toISOString()
        });
      }

      return Promise.reject(new Error('Unmocked API call'));
    });

    mockApiService.post.mockResolvedValue({
      data: {
        data: {
          id: 'new-item',
          success: true
        }
      },
      headers: new Headers(),
      status: 201,
      correlationId: 'test-correlation',
      cached: false,
      timestamp: new Date().toISOString()
    });
  });

  const renderDashboard = () => {
    return render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <DashboardClient userId="user-123" />
      </NextIntlClientProvider>
    );
  };

  describe('Initial Loading', () => {
    it('should show loading state initially', () => {
      renderDashboard();
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should load dashboard data after mounting', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(mockApiService.get).toHaveBeenCalledWith('/v2/plans/active', expect.any(Object));
        expect(mockApiService.get).toHaveBeenCalledWith('/v2/intentions', expect.any(Object));
        expect(mockApiService.get).toHaveBeenCalledWith('/v2/dhikr/sessions', expect.any(Object));
      });
    });

    it('should display welcome message after loading', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('Welcome')).toBeInTheDocument();
      });
    });
  });

  describe('Prayer Times Integration', () => {
    it('should display prayer times from API', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('Today\'s Prayers')).toBeInTheDocument();
        expect(screen.getByText('Fajr')).toBeInTheDocument();
        expect(screen.getByText('Dhuhr')).toBeInTheDocument();
        expect(screen.getByText('Asr')).toBeInTheDocument();
        expect(screen.getByText('Maghrib')).toBeInTheDocument();
        expect(screen.getByText('Isha')).toBeInTheDocument();
      });
    });

    it('should handle prayer times API error gracefully', async () => {
      mockApiService.get.mockImplementation((endpoint) => {
        if (endpoint === '/v2/prayer-times') {
          return Promise.reject(new Error('API Error'));
        }
        return Promise.resolve({ data: { data: [] } });
      });

      renderDashboard();

      await waitFor(() => {
        // Should fallback to client-side calculation
        expect(screen.getByText('Today\'s Prayers')).toBeInTheDocument();
      });
    });
  });

  describe('Intentions Integration', () => {
    it('should display today\'s intention when loaded', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('Test intention')).toBeInTheDocument();
        expect(screen.getByText('Intention Set')).toBeInTheDocument();
      });
    });

    it('should allow setting new intention', async () => {
      mockApiService.get.mockImplementation((endpoint) => {
        if (endpoint === '/v2/intentions') {
          return Promise.resolve({
            data: { data: [] },
            headers: new Headers(),
            status: 200,
            correlationId: 'test',
            cached: false,
            timestamp: new Date().toISOString()
          });
        }
        return Promise.resolve({ data: { data: [] } });
      });

      renderDashboard();

      await waitFor(() => {
        const setIntentionButton = screen.getByText('Set Today\'s Intention');
        expect(setIntentionButton).toBeInTheDocument();
      });

      const setIntentionButton = screen.getByText('Set Today\'s Intention');
      fireEvent.click(setIntentionButton);

      await waitFor(() => {
        expect(mockApiService.post).toHaveBeenCalledWith('/v2/intentions',
          expect.objectContaining({
            text: expect.any(String),
            priority: 'medium',
            tags: ['daily', 'intention']
          }),
          expect.any(Object)
        );
      });
    });

    it('should handle intention creation error', async () => {
      mockApiService.post.mockRejectedValueOnce(new Error('API Error'));
      mockApiService.get.mockImplementation(() =>
        Promise.resolve({ data: { data: [] } })
      );

      renderDashboard();

      await waitFor(() => {
        const setIntentionButton = screen.getByText('Set Today\'s Intention');
        fireEvent.click(setIntentionButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Failed to set intention. Please try again.')).toBeInTheDocument();
      });
    });
  });

  describe('Dhikr Counter Integration', () => {
    it('should display dhikr session data', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('Dhikr Counter')).toBeInTheDocument();
        expect(screen.getByText('50')).toBeInTheDocument(); // Current count
        expect(screen.getByText('of 100')).toBeInTheDocument();
      });
    });

    it('should increment dhikr count when clicked', async () => {
      renderDashboard();

      await waitFor(() => {
        const incrementButton = screen.getByText('+1');
        expect(incrementButton).toBeInTheDocument();
      });

      const incrementButton = screen.getByText('+1');
      fireEvent.click(incrementButton);

      await waitFor(() => {
        expect(mockApiService.post).toHaveBeenCalledWith(
          '/v2/dhikr/sessions/dhikr-1/increment',
          { increment: 1 },
          expect.any(Object)
        );
      });
    });

    it('should create new dhikr session if none exists', async () => {
      mockApiService.get.mockImplementation((endpoint) => {
        if (endpoint === '/v2/dhikr/sessions') {
          return Promise.resolve({
            data: { data: [] },
            headers: new Headers(),
            status: 200,
            correlationId: 'test',
            cached: false,
            timestamp: new Date().toISOString()
          });
        }
        return Promise.resolve({ data: { data: [] } });
      });

      renderDashboard();

      await waitFor(() => {
        expect(mockApiService.post).toHaveBeenCalledWith('/v2/dhikr/sessions',
          expect.objectContaining({
            dhikrType: 'astaghfirullah',
            dhikrText: 'أستغفر الله',
            targetCount: 100,
            tags: ['daily', 'istighfar']
          }),
          expect.any(Object)
        );
      });
    });
  });

  describe('Plans Integration', () => {
    it('should display active plans', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('Today\'s Plan')).toBeInTheDocument();
        expect(screen.getByText('Test habit')).toBeInTheDocument();
      });
    });

    it('should handle empty plans gracefully', async () => {
      mockApiService.get.mockImplementation((endpoint) => {
        if (endpoint === '/v2/plans/active') {
          return Promise.resolve({
            data: { data: { plans: [] } },
            headers: new Headers(),
            status: 200,
            correlationId: 'test',
            cached: false,
            timestamp: new Date().toISOString()
          });
        }
        return Promise.resolve({ data: { data: [] } });
      });

      renderDashboard();

      await waitFor(() => {
        // Should show default plan items
        expect(screen.getByText('Today\'s Plan')).toBeInTheDocument();
        expect(screen.getByText('Maintain Fajr consistency')).toBeInTheDocument();
      });
    });
  });

  describe('Habit Management', () => {
    it('should toggle habit completion optimistically', async () => {
      renderDashboard();

      await waitFor(() => {
        const habitCheckbox = screen.getAllByRole('button').find(btn =>
          btn.getAttribute('aria-label')?.includes('Mark')
        );
        expect(habitCheckbox).toBeInTheDocument();
      });

      const habitCheckbox = screen.getAllByRole('button').find(btn =>
        btn.getAttribute('aria-label')?.includes('Mark')
      );

      if (habitCheckbox) {
        fireEvent.click(habitCheckbox);

        await waitFor(() => {
          expect(mockApiService.post).toHaveBeenCalledWith(
            expect.stringMatching(/\/v2\/habits\/\w+\/(complete|incomplete)/),
            {},
            expect.any(Object)
          );
        });
      }
    });

    it('should revert optimistic update on API error', async () => {
      mockApiService.post.mockRejectedValueOnce(new Error('API Error'));

      renderDashboard();

      await waitFor(() => {
        const habitCheckbox = screen.getAllByRole('button').find(btn =>
          btn.getAttribute('aria-label')?.includes('Mark')
        );

        if (habitCheckbox) {
          fireEvent.click(habitCheckbox);
        }
      });

      await waitFor(() => {
        expect(screen.getByText('Failed to update habit. Please try again.')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error state when initialization fails', async () => {
      mockApiService.get.mockRejectedValue(new Error('Network Error'));

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('Failed to load dashboard data')).toBeInTheDocument();
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });

    it('should retry on error button click', async () => {
      mockApiService.get.mockRejectedValueOnce(new Error('Network Error'));

      renderDashboard();

      await waitFor(() => {
        const retryButton = screen.getByText('Retry');
        fireEvent.click(retryButton);
      });

      // Should attempt to reload data
      await waitFor(() => {
        expect(mockApiService.get).toHaveBeenCalledTimes(4); // Initial + retry calls
      });
    });
  });

  describe('Authentication Integration', () => {
    it('should handle missing authentication gracefully', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null }
      });

      renderDashboard();

      await waitFor(() => {
        // Should still render but without API calls
        expect(screen.getByText('Welcome')).toBeInTheDocument();
      });

      // Should not make authenticated API calls
      expect(mockApiService.get).not.toHaveBeenCalledWith('/v2/plans/active',
        expect.objectContaining({
          authToken: expect.any(String)
        })
      );
    });
  });

  describe('Cache Integration', () => {
    it('should use appropriate cache settings for different endpoints', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(mockApiService.get).toHaveBeenCalledWith('/v2/plans/active',
          expect.objectContaining({
            cacheTTL: 300000 // 5 minutes for plans
          })
        );

        expect(mockApiService.get).toHaveBeenCalledWith('/v2/intentions',
          expect.objectContaining({
            cacheTTL: 60000 // 1 minute for intentions
          })
        );

        expect(mockApiService.get).toHaveBeenCalledWith('/v2/dhikr/sessions',
          expect.objectContaining({
            cacheTTL: 30000 // 30 seconds for dhikr sessions
          })
        );
      });
    });
  });
});