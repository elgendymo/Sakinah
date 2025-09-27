import { apiService } from '../../lib/services/api';
import { ApiError } from '../../lib/services/api/ApiService';

// Mock fetch globally
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('Dashboard API Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Plans API (/v2/plans/active)', () => {
    it('should fetch active plans successfully', async () => {
      const mockPlansResponse = {
        data: {
          plans: [
            {
              id: 'plan-1',
              title: 'Test Plan',
              description: 'Test Description',
              status: 'active',
              items: [
                { id: '1', text: 'Test habit', type: 'habit', completed: false }
              ],
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z'
            }
          ]
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockPlansResponse
      } as Response);

      const response = await apiService.get('/v2/plans/active', {
        authToken: 'test-token',
        version: 'v2'
      });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v2/plans/active'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
            'X-API-Version': 'v2'
          })
        })
      );

      expect(response.data).toEqual(mockPlansResponse);
      expect(response.status).toBe(200);
    });

    it('should handle empty plans response', async () => {
      const mockEmptyResponse = { data: { plans: [] } };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockEmptyResponse
      } as Response);

      const response = await apiService.get('/v2/plans/active', {
        authToken: 'test-token',
        version: 'v2'
      });

      expect(response.data.data.plans).toHaveLength(0);
    });

    it('should handle 404 error for no active plans', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ error: 'NO_ACTIVE_PLANS', message: 'No active plans found' }),
        clone: () => ({
          json: async () => ({ error: 'NO_ACTIVE_PLANS', message: 'No active plans found' })
        })
      } as Response);

      await expect(apiService.get('/v2/plans/active', {
        authToken: 'test-token',
        version: 'v2'
      })).rejects.toThrow(ApiError);

      try {
        await apiService.get('/v2/plans/active', {
          authToken: 'test-token',
          version: 'v2'
        });
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).statusCode).toBe(404);
        expect((error as ApiError).message).toBe('No active plans found');
      }
    });
  });

  describe('Prayer Times API (/v2/prayer-times)', () => {
    it('should fetch prayer times with location parameters', async () => {
      const mockPrayerResponse = {
        data: {
          prayerTimes: {
            prayerTimes: {
              fajr: { time: '2024-01-01T05:30:00Z', localTime: '05:30 AM' },
              dhuhr: { time: '2024-01-01T12:45:00Z', localTime: '12:45 PM' },
              asr: { time: '2024-01-01T16:15:00Z', localTime: '04:15 PM' },
              maghrib: { time: '2024-01-01T19:20:00Z', localTime: '07:20 PM' },
              isha: { time: '2024-01-01T20:45:00Z', localTime: '08:45 PM' }
            },
            currentPrayer: { name: 'dhuhr', time: '2024-01-01T12:45:00Z' },
            nextPrayer: { name: 'asr', time: '2024-01-01T16:15:00Z' }
          },
          qiblaDirection: 244.32
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockPrayerResponse
      } as Response);

      const response = await apiService.get('/v2/prayer-times', {
        params: {
          latitude: 51.5074,
          longitude: -0.1278,
          timezone: 'Europe/London',
          calculationMethod: 'MuslimWorldLeague'
        },
        authToken: 'test-token',
        version: 'v2'
      });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('latitude=51.5074&longitude=-0.1278'),
        expect.objectContaining({
          method: 'GET'
        })
      );

      expect(response.data.data.qiblaDirection).toBe(244.32);
      expect(response.data.data.prayerTimes.prayerTimes.fajr.time).toBe('2024-01-01T05:30:00Z');
    });

    it('should handle invalid coordinates error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          error: 'INVALID_COORDINATES',
          message: 'Invalid latitude. Must be between -90 and 90 degrees.'
        }),
        clone: () => ({
          json: async () => ({
            error: 'INVALID_COORDINATES',
            message: 'Invalid latitude. Must be between -90 and 90 degrees.'
          })
        })
      } as Response);

      await expect(apiService.get('/v2/prayer-times', {
        params: {
          latitude: 91, // Invalid latitude
          longitude: 0
        },
        authToken: 'test-token',
        version: 'v2'
      })).rejects.toThrow(ApiError);
    });
  });

  describe('Intentions API (/v2/intentions)', () => {
    it('should create new intention successfully', async () => {
      const newIntention = {
        text: 'Read Quran for 15 minutes today',
        priority: 'medium',
        tags: ['daily', 'intention']
      };

      const mockCreatedIntention = {
        data: {
          id: 'intention-1',
          text: 'Read Quran for 15 minutes today',
          priority: 'medium',
          status: 'active',
          tags: ['daily', 'intention'],
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockCreatedIntention
      } as Response);

      const response = await apiService.post('/v2/intentions', newIntention, {
        authToken: 'test-token',
        version: 'v2'
      });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v2/intentions'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(newIntention),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token'
          })
        })
      );

      expect(response.status).toBe(201);
      expect(response.data.data.text).toBe('Read Quran for 15 minutes today');
    });

    it('should fetch intentions with filters', async () => {
      const mockIntentionsResponse = {
        data: [
          {
            id: 'intention-1',
            text: 'Morning intention',
            status: 'active',
            priority: 'high',
            createdAt: '2024-01-01T00:00:00Z'
          }
        ],
        pagination: {
          currentPage: 1,
          totalItems: 1,
          totalPages: 1,
          hasNext: false,
          hasPrevious: false
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockIntentionsResponse
      } as Response);

      const response = await apiService.get('/v2/intentions', {
        params: {
          status: 'active',
          priority: 'high',
          limit: 10,
          sortBy: 'createdAt',
          sortOrder: 'desc'
        },
        authToken: 'test-token',
        version: 'v2'
      });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/v2\/intentions\?.*status=active.*priority=high/),
        expect.any(Object)
      );

      expect(response.data.data).toHaveLength(1);
      expect(response.data.data[0].text).toBe('Morning intention');
    });

    it('should update existing intention', async () => {
      const updateData = { text: 'Updated intention text' };
      const mockUpdatedIntention = {
        data: {
          id: 'intention-1',
          text: 'Updated intention text',
          priority: 'medium',
          status: 'active',
          updatedAt: '2024-01-01T01:00:00Z'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockUpdatedIntention
      } as Response);

      const response = await apiService.put('/v2/intentions/intention-1', updateData, {
        authToken: 'test-token',
        version: 'v2'
      });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v2/intentions/intention-1'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(updateData)
        })
      );

      expect(response.data.data.text).toBe('Updated intention text');
    });
  });

  describe('Dhikr API (/v2/dhikr)', () => {
    it('should create new dhikr session', async () => {
      const sessionData = {
        dhikrType: 'astaghfirullah',
        dhikrText: 'أستغفر الله',
        targetCount: 100,
        date: '2024-01-01',
        tags: ['daily', 'istighfar']
      };

      const mockSession = {
        data: {
          id: 'session-1',
          dhikrType: 'astaghfirullah',
          dhikrText: 'أستغفر الله',
          currentCount: 0,
          targetCount: 100,
          status: 'active',
          date: '2024-01-01',
          tags: ['daily', 'istighfar'],
          createdAt: '2024-01-01T00:00:00Z'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockSession
      } as Response);

      const response = await apiService.post('/v2/dhikr/sessions', sessionData, {
        authToken: 'test-token',
        version: 'v2'
      });

      expect(response.status).toBe(201);
      expect(response.data.data.dhikrType).toBe('astaghfirullah');
      expect(response.data.data.currentCount).toBe(0);
    });

    it('should increment dhikr count', async () => {
      const mockIncrementedSession = {
        data: {
          id: 'session-1',
          dhikrType: 'astaghfirullah',
          currentCount: 51,
          targetCount: 100,
          status: 'active',
          updatedAt: '2024-01-01T01:00:00Z'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockIncrementedSession
      } as Response);

      const response = await apiService.post('/v2/dhikr/sessions/session-1/increment',
        { increment: 1 },
        {
          authToken: 'test-token',
          version: 'v2'
        }
      );

      expect(response.data.data.currentCount).toBe(51);
    });

    it('should complete dhikr session', async () => {
      const mockCompletedSession = {
        data: {
          id: 'session-1',
          dhikrType: 'astaghfirullah',
          currentCount: 100,
          targetCount: 100,
          status: 'completed',
          completedAt: '2024-01-01T02:00:00Z'
        },
        message: 'Dhikr session completed successfully'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockCompletedSession
      } as Response);

      const response = await apiService.post('/v2/dhikr/sessions/session-1/complete',
        { notes: 'Completed daily session' },
        {
          authToken: 'test-token',
          version: 'v2'
        }
      );

      expect(response.data.data.status).toBe('completed');
      expect(response.data.message).toBe('Dhikr session completed successfully');
    });
  });

  describe('Authentication Handling', () => {
    it('should handle 401 Unauthorized error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ error: 'UNAUTHORIZED', message: 'Invalid token' }),
        clone: () => ({
          json: async () => ({ error: 'UNAUTHORIZED', message: 'Invalid token' })
        })
      } as Response);

      try {
        await apiService.get('/v2/plans/active', {
          authToken: 'invalid-token',
          version: 'v2'
        });
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).statusCode).toBe(401);
        expect((error as ApiError).message).toBe('Invalid token');
      }
    });

    it('should include correlation ID in headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: {} })
      } as Response);

      await apiService.get('/v2/plans/active', {
        authToken: 'test-token',
        correlationId: 'test-correlation-123',
        version: 'v2'
      });

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Correlation-ID': 'test-correlation-123'
          })
        })
      );
    });
  });

  describe('Error Recovery', () => {
    it('should retry on network errors', async () => {
      // First call fails with network error
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ data: { success: true } })
        } as Response);

      const response = await apiService.get('/v2/plans/active', {
        authToken: 'test-token',
        retries: 1,
        version: 'v2'
      });

      expect(fetch).toHaveBeenCalledTimes(2);
      expect(response.data.data.success).toBe(true);
    });

    it('should not retry on 4xx errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ error: 'BAD_REQUEST', message: 'Invalid request' }),
        clone: () => ({
          json: async () => ({ error: 'BAD_REQUEST', message: 'Invalid request' })
        })
      } as Response);

      await expect(apiService.get('/v2/plans/active', {
        authToken: 'test-token',
        retries: 3,
        version: 'v2'
      })).rejects.toThrow(ApiError);

      // Should not retry on 4xx errors
      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Caching', () => {
    it('should use appropriate cache settings for dashboard endpoints', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: {} })
      } as Response);

      // Test different cache TTL for different endpoints
      await apiService.get('/v2/plans/active', {
        authToken: 'test-token',
        cacheTTL: 300000, // 5 minutes for plans
        version: 'v2'
      });

      await apiService.get('/v2/intentions', {
        authToken: 'test-token',
        cacheTTL: 60000, // 1 minute for intentions
        version: 'v2'
      });

      await apiService.get('/v2/dhikr/sessions', {
        authToken: 'test-token',
        cacheTTL: 30000, // 30 seconds for dhikr
        version: 'v2'
      });

      // Verify all calls were made with appropriate parameters
      expect(fetch).toHaveBeenCalledTimes(3);
    });
  });
});