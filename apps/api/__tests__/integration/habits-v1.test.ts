import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { Express } from 'express';
import { createApp } from '../../src/server';
import { HabitRepository } from '../../src/infrastructure/repos/HabitRepository';
import { Result } from '../../src/shared/result';

// Mock the HabitRepository
vi.mock('../../src/infrastructure/repos/HabitRepository');

describe('Habits V1 API Integration Tests', () => {
  let app: Express;
  let authToken: string;
  let userId: string;
  let mockHabitRepo: any;

  beforeAll(async () => {
    // Configure test environment
    process.env.NODE_ENV = 'test';
    process.env.DB_BACKEND = 'sqlite';
    process.env.AI_PROVIDER = 'rules';

    app = await createApp();

    // Mock authentication
    authToken = 'test-jwt-token';
    userId = 'test-user-id';

    // Setup mock repository
    mockHabitRepo = {
      getHabitsByUser: vi.fn(),
      getHabit: vi.fn(),
      markCompleted: vi.fn(),
      markIncomplete: vi.fn(),
      updateHabitStreak: vi.fn(),
      getHabitCompletions: vi.fn()
    };

    // Mock the constructor to return our mock
    vi.mocked(HabitRepository).mockImplementation(() => mockHabitRepo);
  });

  afterAll(async () => {
    vi.clearAllMocks();
  });

  beforeEach(async () => {
    // Reset mocks before each test
    vi.clearAllMocks();
  });

  describe('GET /api/v1/habits - Get User Habits', () => {
    it('should return user habits successfully', async () => {
      const mockHabits = [
        {
          id: 'habit-1',
          userId,
          title: 'Morning Dhikr',
          streakCount: 5,
          lastCompletedOn: '2024-01-15',
          createdAt: '2024-01-01T00:00:00Z'
        },
        {
          id: 'habit-2',
          userId,
          title: 'Evening Prayer',
          streakCount: 3,
          lastCompletedOn: '2024-01-14',
          createdAt: '2024-01-02T00:00:00Z'
        }
      ];

      mockHabitRepo.getHabitsByUser.mockResolvedValue(Result.ok(mockHabits));

      const response = await request(app)
        .get('/api/v1/habits')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        habits: expect.arrayContaining([
          expect.objectContaining({
            id: 'habit-1',
            title: 'Morning Dhikr',
            streakCount: 5
          }),
          expect.objectContaining({
            id: 'habit-2',
            title: 'Evening Prayer',
            streakCount: 3
          })
        ]),
        metadata: {
          total: 2,
          activeCount: 2
        }
      });

      expect(mockHabitRepo.getHabitsByUser).toHaveBeenCalledWith(userId);
    });

    it('should include stats when requested', async () => {
      const mockHabits = [
        {
          id: 'habit-1',
          userId,
          title: 'Morning Dhikr',
          streakCount: 5
        }
      ];

      const mockCompletions = ['2024-01-10', '2024-01-11', '2024-01-12'];

      mockHabitRepo.getHabitsByUser.mockResolvedValue(Result.ok(mockHabits));
      mockHabitRepo.getHabitCompletions.mockResolvedValue(Result.ok(mockCompletions));

      const response = await request(app)
        .get('/api/v1/habits?includeStats=true')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.habits[0]).toHaveProperty('stats');
      expect(response.body.habits[0].stats).toMatchObject({
        completionRate: expect.any(Number),
        averageStreakLength: expect.any(Number),
        totalCompletions: expect.any(Number)
      });
    });

    it('should include history when requested', async () => {
      const mockHabits = [
        {
          id: 'habit-1',
          userId,
          title: 'Morning Dhikr',
          streakCount: 5
        }
      ];

      const mockCompletions = ['2024-01-10', '2024-01-11', '2024-01-12'];

      mockHabitRepo.getHabitsByUser.mockResolvedValue(Result.ok(mockHabits));
      mockHabitRepo.getHabitCompletions.mockResolvedValue(Result.ok(mockCompletions));

      const response = await request(app)
        .get('/api/v1/habits?includeHistory=true')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.habits[0]).toHaveProperty('history');
      expect(response.body.habits[0].history).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            date: expect.any(String),
            completed: expect.any(Boolean)
          })
        ])
      );
    });

    it('should handle repository error gracefully', async () => {
      mockHabitRepo.getHabitsByUser.mockResolvedValue(
        Result.error(new Error('Database connection failed'))
      );

      const response = await request(app)
        .get('/api/v1/habits')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      expect(response.body).toMatchObject({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch habits'
        }
      });
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/v1/habits')
        .expect(401);
    });
  });

  describe('POST /api/v1/habits/:id/complete - Complete Habit', () => {
    const habitId = 'test-habit-id';

    it('should complete habit successfully', async () => {
      const mockHabit = {
        id: habitId,
        userId,
        title: 'Morning Dhikr',
        streakCount: 4,
        lastCompletedOn: '2024-01-14'
      };

      mockHabitRepo.getHabit.mockResolvedValue(Result.ok(mockHabit));
      mockHabitRepo.markCompleted.mockResolvedValue(Result.ok(undefined));
      mockHabitRepo.updateHabitStreak.mockResolvedValue(Result.ok(undefined));

      const response = await request(app)
        .post(`/api/v1/habits/${habitId}/complete`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ notes: 'Completed with gratitude' })
        .expect(200);

      expect(response.body).toMatchObject({
        habit: {
          id: habitId,
          completed: true,
          streakCount: 5, // Should increment from 4 to 5
          notes: 'Completed with gratitude'
        },
        events: []
      });

      expect(mockHabitRepo.getHabit).toHaveBeenCalledWith(habitId, userId);
      expect(mockHabitRepo.markCompleted).toHaveBeenCalledWith(
        habitId,
        userId,
        expect.any(String)
      );
      expect(mockHabitRepo.updateHabitStreak).toHaveBeenCalledWith(
        habitId,
        userId,
        5,
        expect.any(String)
      );
    });

    it('should reset streak if not consecutive', async () => {
      const mockHabit = {
        id: habitId,
        userId,
        title: 'Morning Dhikr',
        streakCount: 4,
        lastCompletedOn: '2024-01-12' // Not yesterday
      };

      mockHabitRepo.getHabit.mockResolvedValue(Result.ok(mockHabit));
      mockHabitRepo.markCompleted.mockResolvedValue(Result.ok(undefined));
      mockHabitRepo.updateHabitStreak.mockResolvedValue(Result.ok(undefined));

      const response = await request(app)
        .post(`/api/v1/habits/${habitId}/complete`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(200);

      expect(response.body.habit.streakCount).toBe(1); // Reset to 1
    });

    it('should handle custom completion date', async () => {
      const mockHabit = {
        id: habitId,
        userId,
        title: 'Morning Dhikr',
        streakCount: 0
      };

      const customDate = '2024-01-10';

      mockHabitRepo.getHabit.mockResolvedValue(Result.ok(mockHabit));
      mockHabitRepo.markCompleted.mockResolvedValue(Result.ok(undefined));
      mockHabitRepo.updateHabitStreak.mockResolvedValue(Result.ok(undefined));

      const response = await request(app)
        .post(`/api/v1/habits/${habitId}/complete`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ date: customDate })
        .expect(200);

      expect(mockHabitRepo.markCompleted).toHaveBeenCalledWith(
        habitId,
        userId,
        customDate
      );
    });

    it('should return 404 for non-existent habit', async () => {
      mockHabitRepo.getHabit.mockResolvedValue(Result.ok(null));

      const response = await request(app)
        .post(`/api/v1/habits/${habitId}/complete`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(404);

      expect(response.body).toMatchObject({
        error: {
          code: 'HABIT_NOT_FOUND',
          message: 'Habit not found or access denied'
        }
      });
    });

    it('should handle marking completion failure', async () => {
      const mockHabit = {
        id: habitId,
        userId,
        title: 'Morning Dhikr',
        streakCount: 0
      };

      mockHabitRepo.getHabit.mockResolvedValue(Result.ok(mockHabit));
      mockHabitRepo.markCompleted.mockResolvedValue(
        Result.error(new Error('Completion already exists'))
      );

      const response = await request(app)
        .post(`/api/v1/habits/${habitId}/complete`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(500);

      expect(response.body).toMatchObject({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to complete habit'
        }
      });
    });
  });

  describe('POST /api/v1/habits/:id/incomplete - Mark Habit Incomplete', () => {
    const habitId = 'test-habit-id';

    it('should mark habit incomplete successfully', async () => {
      const mockHabit = {
        id: habitId,
        userId,
        title: 'Morning Dhikr',
        streakCount: 5,
        lastCompletedOn: '2024-01-15'
      };

      mockHabitRepo.getHabit.mockResolvedValue(Result.ok(mockHabit));
      mockHabitRepo.markIncomplete.mockResolvedValue(Result.ok(undefined));

      const response = await request(app)
        .post(`/api/v1/habits/${habitId}/incomplete`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(200);

      expect(response.body).toMatchObject({
        habit: {
          id: habitId,
          completed: false,
          streakCount: 5 // Should maintain streak for today's incompletion
        }
      });

      expect(mockHabitRepo.markIncomplete).toHaveBeenCalledWith(
        habitId,
        userId,
        expect.any(String)
      );
    });

    it('should reset streak when uncompleting last completed date', async () => {
      const lastCompletedDate = '2024-01-10';
      const mockHabit = {
        id: habitId,
        userId,
        title: 'Morning Dhikr',
        streakCount: 5,
        lastCompletedOn: lastCompletedDate
      };

      mockHabitRepo.getHabit.mockResolvedValue(Result.ok(mockHabit));
      mockHabitRepo.markIncomplete.mockResolvedValue(Result.ok(undefined));
      mockHabitRepo.updateHabitStreak.mockResolvedValue(Result.ok(undefined));

      const response = await request(app)
        .post(`/api/v1/habits/${habitId}/incomplete`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ date: lastCompletedDate })
        .expect(200);

      expect(response.body.habit.streakCount).toBe(0);
      expect(mockHabitRepo.updateHabitStreak).toHaveBeenCalledWith(
        habitId,
        userId,
        0,
        undefined
      );
    });

    it('should handle custom incompletion date', async () => {
      const customDate = '2024-01-10';
      const mockHabit = {
        id: habitId,
        userId,
        title: 'Morning Dhikr',
        streakCount: 3
      };

      mockHabitRepo.getHabit.mockResolvedValue(Result.ok(mockHabit));
      mockHabitRepo.markIncomplete.mockResolvedValue(Result.ok(undefined));

      const response = await request(app)
        .post(`/api/v1/habits/${habitId}/incomplete`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ date: customDate })
        .expect(200);

      expect(mockHabitRepo.markIncomplete).toHaveBeenCalledWith(
        habitId,
        userId,
        customDate
      );
    });

    it('should return 404 for non-existent habit', async () => {
      mockHabitRepo.getHabit.mockResolvedValue(Result.ok(null));

      const response = await request(app)
        .post(`/api/v1/habits/${habitId}/incomplete`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(404);

      expect(response.body).toMatchObject({
        error: {
          code: 'HABIT_NOT_FOUND',
          message: 'Habit not found or access denied'
        }
      });
    });
  });

  describe('GET /api/v1/habits/:id/analytics - Get Habit Analytics', () => {
    const habitId = 'test-habit-id';

    it('should return habit analytics successfully', async () => {
      const mockHabit = {
        id: habitId,
        userId,
        title: 'Morning Dhikr',
        streakCount: 7
      };

      const mockCompletions = [
        '2024-01-01', '2024-01-02', '2024-01-03', '2024-01-05',
        '2024-01-06', '2024-01-07', '2024-01-10', '2024-01-11',
        '2024-01-12', '2024-01-13', '2024-01-14', '2024-01-15'
      ];

      mockHabitRepo.getHabit.mockResolvedValue(Result.ok(mockHabit));
      mockHabitRepo.getHabitCompletions.mockResolvedValue(Result.ok(mockCompletions));

      const response = await request(app)
        .get(`/api/v1/habits/${habitId}/analytics`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        analytics: {
          habitId,
          period: '30d',
          completionRate: expect.any(Number),
          currentStreak: 7,
          longestStreak: expect.any(Number),
          totalCompletions: 12,
          recentCompletions: expect.any(Number),
          consistency: {
            daily: expect.any(Number),
            weekly: expect.any(Number),
            monthly: expect.any(Number)
          }
        }
      });
    });

    it('should support different time periods', async () => {
      const mockHabit = {
        id: habitId,
        userId,
        title: 'Morning Dhikr',
        streakCount: 7
      };

      const mockCompletions = ['2024-01-01', '2024-01-02', '2024-01-03'];

      mockHabitRepo.getHabit.mockResolvedValue(Result.ok(mockHabit));
      mockHabitRepo.getHabitCompletions.mockResolvedValue(Result.ok(mockCompletions));

      const response = await request(app)
        .get(`/api/v1/habits/${habitId}/analytics?period=7d`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.analytics.period).toBe('7d');
    });

    it('should return 404 for non-existent habit', async () => {
      mockHabitRepo.getHabit.mockResolvedValue(Result.ok(null));

      const response = await request(app)
        .get(`/api/v1/habits/${habitId}/analytics`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toMatchObject({
        error: {
          code: 'HABIT_NOT_FOUND',
          message: 'Habit not found or access denied'
        }
      });
    });

    it('should handle completions fetch error', async () => {
      const mockHabit = {
        id: habitId,
        userId,
        title: 'Morning Dhikr',
        streakCount: 7
      };

      mockHabitRepo.getHabit.mockResolvedValue(Result.ok(mockHabit));
      mockHabitRepo.getHabitCompletions.mockResolvedValue(
        Result.error(new Error('Database error'))
      );

      const response = await request(app)
        .get(`/api/v1/habits/${habitId}/analytics`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      expect(response.body).toMatchObject({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch habit completions'
        }
      });
    });
  });

  describe('Authentication Requirements', () => {
    const endpoints = [
      { method: 'get', path: '/api/v1/habits' },
      { method: 'post', path: '/api/v1/habits/test-id/complete' },
      { method: 'post', path: '/api/v1/habits/test-id/incomplete' },
      { method: 'get', path: '/api/v1/habits/test-id/analytics' }
    ];

    endpoints.forEach(({ method, path }) => {
      it(`should require authentication for ${method.toUpperCase()} ${path}`, async () => {
        await request(app)
          [method as keyof request.Test](path)
          .expect(401);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle unexpected errors gracefully', async () => {
      mockHabitRepo.getHabitsByUser.mockRejectedValue(new Error('Unexpected error'));

      const response = await request(app)
        .get('/api/v1/habits')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      expect(response.body).toMatchObject({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch habits'
        }
      });
    });
  });
});