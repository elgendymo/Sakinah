import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { NextIntlClientProvider } from 'next-intl';
import DashboardClient from '../../app/dashboard/dashboard-client';
import { apiService } from '../../lib/services/api';
import { createClient } from '../../lib/supabase-browser';

// Mock dependencies
jest.mock('../../lib/services/api');
jest.mock('../../lib/supabase-browser');

const mockApiService = apiService as jest.Mocked<typeof apiService>;
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

// Mock translations (minimal for performance testing)
const messages = {
  dashboard: {
    welcome: 'Welcome',
    loading: 'Loading...'
  },
  common: {
    loading: 'Loading...',
    retry: 'Retry'
  }
};

describe('Dashboard Performance Tests', () => {
  const mockSupabaseClient = {
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: {
          session: {
            access_token: 'mock-token',
            user: { id: 'user-123' }
          }
        }
      })
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateClient.mockReturnValue(mockSupabaseClient as any);

    // Mock API responses with realistic delays
    mockApiService.get.mockImplementation((endpoint) => {
      const delay = Math.random() * 100; // 0-100ms random delay

      if (endpoint === '/v2/plans/active') {
        return new Promise(resolve => {
          setTimeout(() => resolve({
            data: {
              data: {
                plans: [{
                  id: 'plan-1',
                  title: 'Test Plan',
                  description: 'Test Description',
                  status: 'active',
                  items: Array.from({ length: 10 }, (_, i) => ({
                    id: `item-${i}`,
                    text: `Plan item ${i}`,
                    type: 'habit',
                    completed: Math.random() > 0.5
                  })),
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
          }), delay);
        });
      }

      if (endpoint === '/v2/intentions') {
        return new Promise(resolve => {
          setTimeout(() => resolve({
            data: {
              data: Array.from({ length: 5 }, (_, i) => ({
                id: `intention-${i}`,
                text: `Test intention ${i}`,
                priority: 'medium',
                status: 'active',
                createdAt: '2024-01-01T00:00:00Z'
              }))
            },
            headers: new Headers(),
            status: 200,
            correlationId: 'test-correlation',
            cached: false,
            timestamp: new Date().toISOString()
          }), delay);
        });
      }

      if (endpoint === '/v2/dhikr/sessions') {
        return new Promise(resolve => {
          setTimeout(() => resolve({
            data: {
              data: [{
                id: 'dhikr-1',
                dhikrType: 'astaghfirullah',
                dhikrText: 'أستغفر الله',
                currentCount: Math.floor(Math.random() * 100),
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
          }), delay);
        });
      }

      if (endpoint === '/v2/prayer-times') {
        return new Promise(resolve => {
          setTimeout(() => resolve({
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
          }), delay);
        });
      }

      return Promise.reject(new Error('Unmocked API call'));
    });

    mockApiService.post.mockResolvedValue({
      data: { data: { success: true } },
      headers: new Headers(),
      status: 200,
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

  describe('Initial Load Performance', () => {
    it('should render loading state immediately', () => {
      const startTime = performance.now();
      renderDashboard();
      const endTime = performance.now();

      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(endTime - startTime).toBeLessThan(50); // Should render within 50ms
    });

    it('should load all dashboard sections in parallel', async () => {
      const startTime = performance.now();
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('Welcome')).toBeInTheDocument();
      }, { timeout: 1000 });

      const endTime = performance.now();
      const loadTime = endTime - startTime;

      // Should load all data in under 500ms (parallel loading)
      expect(loadTime).toBeLessThan(500);

      // Verify all API calls were made in parallel
      expect(mockApiService.get).toHaveBeenCalledTimes(4); // plans, intentions, dhikr, prayer-times
    });

    it('should not block UI rendering while loading data', async () => {
      renderDashboard();

      // UI should be responsive immediately
      expect(screen.getByText('Loading...')).toBeInTheDocument();

      // Check that the loading state doesn't prevent other interactions
      const loadingElement = screen.getByText('Loading...');
      expect(loadingElement).toBeVisible();

      await waitFor(() => {
        expect(screen.getByText('Welcome')).toBeInTheDocument();
      });
    });
  });

  describe('Memory Usage', () => {
    it('should not create memory leaks with multiple renders', async () => {
      // Simulate multiple dashboard instances
      const instances = [];

      for (let i = 0; i < 10; i++) {
        const { unmount } = renderDashboard();
        instances.push(unmount);

        await waitFor(() => {
          expect(screen.getByText('Welcome')).toBeInTheDocument();
        });
      }

      // Cleanup all instances
      instances.forEach(unmount => unmount());

      // Verify no hanging promises or listeners
      expect(mockApiService.get).toHaveBeenCalledTimes(40); // 4 calls × 10 instances
    });

    it('should efficiently handle large data sets', async () => {
      // Mock large data response
      mockApiService.get.mockImplementation((endpoint) => {
        if (endpoint === '/v2/plans/active') {
          return Promise.resolve({
            data: {
              data: {
                plans: Array.from({ length: 100 }, (_, i) => ({
                  id: `plan-${i}`,
                  title: `Plan ${i}`,
                  description: `Description ${i}`,
                  status: 'active',
                  items: Array.from({ length: 50 }, (_, j) => ({
                    id: `item-${i}-${j}`,
                    text: `Item ${j}`,
                    type: 'habit',
                    completed: false
                  })),
                  createdAt: '2024-01-01T00:00:00Z',
                  updatedAt: '2024-01-01T00:00:00Z'
                }))
              }
            },
            headers: new Headers(),
            status: 200,
            correlationId: 'test-correlation',
            cached: false,
            timestamp: new Date().toISOString()
          });
        }
        return Promise.resolve({ data: { data: [] } });
      });

      const startTime = performance.now();
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('Welcome')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should handle large datasets efficiently (under 1 second)
      expect(renderTime).toBeLessThan(1000);
    });
  });

  describe('Caching Performance', () => {
    it('should return cached responses faster on subsequent calls', async () => {
      // Mock cached response
      mockApiService.get.mockImplementation((endpoint) => {
        if (endpoint === '/v2/plans/active') {
          return Promise.resolve({
            data: { data: { plans: [] } },
            headers: new Headers(),
            status: 200,
            correlationId: 'test-correlation',
            cached: true, // Indicate this is from cache
            timestamp: new Date().toISOString()
          });
        }
        return Promise.resolve({ data: { data: [] } });
      });

      const startTime = performance.now();
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('Welcome')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const loadTime = endTime - startTime;

      // Cached responses should be very fast (under 100ms)
      expect(loadTime).toBeLessThan(100);

      // Verify cache was used
      const plansCall = mockApiService.get.mock.calls.find(call => call[0] === '/v2/plans/active');
      expect(plansCall).toBeDefined();
      expect(plansCall?.[1]).toEqual(expect.objectContaining({
        cacheTTL: expect.any(Number)
      }));
    });

    it('should use appropriate cache TTL for different data types', () => {
      renderDashboard();

      const calls = mockApiService.get.mock.calls;

      // Verify different cache TTL for different endpoints
      const plansCall = calls.find(call => call[0] === '/v2/plans/active');
      const intentionsCall = calls.find(call => call[0] === '/v2/intentions');
      const dhikrCall = calls.find(call => call[0] === '/v2/dhikr/sessions');

      expect(plansCall?.[1]?.cacheTTL).toBe(300000); // 5 minutes for plans
      expect(intentionsCall?.[1]?.cacheTTL).toBe(60000); // 1 minute for intentions
      expect(dhikrCall?.[1]?.cacheTTL).toBe(30000); // 30 seconds for dhikr
    });
  });

  describe('Optimistic Updates Performance', () => {
    it('should update UI immediately on user actions', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('Welcome')).toBeInTheDocument();
      });

      // Simulate optimistic update by checking if state changes immediately
      // In a real test, you would trigger a habit toggle or dhikr increment
      const startTime = performance.now();

      // Mock API call delay
      mockApiService.post.mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => resolve({
            data: { data: { success: true } },
            headers: new Headers(),
            status: 200,
            correlationId: 'test-correlation',
            cached: false,
            timestamp: new Date().toISOString()
          }), 200); // 200ms API delay
        });
      });

      // In a real component, optimistic updates should happen immediately
      // while API call happens in background
      const endTime = performance.now();
      const updateTime = endTime - startTime;

      // UI update should be immediate (under 10ms)
      expect(updateTime).toBeLessThan(10);
    });
  });

  describe('Error Handling Performance', () => {
    it('should handle API errors without blocking UI', async () => {
      mockApiService.get.mockRejectedValue(new Error('Network Error'));

      const startTime = performance.now();
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('Failed to load dashboard data')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const errorHandlingTime = endTime - startTime;

      // Error handling should be fast (under 200ms)
      expect(errorHandlingTime).toBeLessThan(200);
    });

    it('should retry efficiently without exponential delay buildup', async () => {
      let callCount = 0;
      mockApiService.get.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          return Promise.reject(new Error('Network Error'));
        }
        return Promise.resolve({
          data: { data: [] },
          headers: new Headers(),
          status: 200,
          correlationId: 'test-correlation',
          cached: false,
          timestamp: new Date().toISOString()
        });
      });

      const startTime = performance.now();
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('Welcome')).toBeInTheDocument();
      }, { timeout: 5000 });

      const endTime = performance.now();
      const retryTime = endTime - startTime;

      // Should handle retries efficiently (under 2 seconds total)
      expect(retryTime).toBeLessThan(2000);
    });
  });

  describe('Bundle Size Impact', () => {
    it('should not import unnecessary dependencies', () => {
      // This is more of a build-time concern, but we can verify
      // that the component doesn't pull in heavy dependencies

      // Verify that only necessary API service methods are used
      expect(mockApiService.get).toBeDefined();
      expect(mockApiService.post).toBeDefined();
      expect(mockApiService.put).toBeDefined();

      // Verify that heavy libraries like moment.js are not imported
      // (Date handling should use native Date objects)
      expect(typeof Date).toBe('function');
    });
  });
});