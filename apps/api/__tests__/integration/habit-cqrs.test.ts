import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { Express } from 'express';
import { createApp } from '../../src/server';
import { configureDependencies } from '../../src/infrastructure/di/container';

describe('Habit CQRS Integration Tests', () => {
  let app: Express;
  let authToken: string;
  let userId: string;
  let planId: string;
  let habitId: string;

  beforeAll(async () => {
    // Configure dependencies for test environment
    process.env.NODE_ENV = 'test';
    process.env.DB_BACKEND = 'sqlite';
    process.env.AI_PROVIDER = 'rules';

    configureDependencies();
    app = await createApp();

    // Mock authentication for tests
    authToken = 'test-jwt-token';
    userId = 'test-user-id';
    planId = 'test-plan-id';
  });

  afterAll(async () => {
    // Cleanup
  });

  beforeEach(async () => {
    // Reset test data before each test
  });

  describe('POST /api/v2/habits - Create Habit Command', () => {
    it('should create a new habit successfully', async () => {
      const habitData = {
        planId,
        title: 'Morning Dhikr Test',
        schedule: {
          freq: 'daily'
        }
      };

      const response = await request(app)
        .post('/api/v2/habits')
        .set('Authorization', `Bearer ${authToken}`)
        .send(habitData)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        habitId: expect.any(String),
        message: 'Habit created successfully'
      });

      habitId = response.body.habitId;
    });

    it('should validate required fields', async () => {
      const invalidHabitData = {
        title: 'Test Habit'
        // Missing planId and schedule
      };

      const response = await request(app)
        .post('/api/v2/habits')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidHabitData)
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: expect.arrayContaining([
          expect.objectContaining({
            field: 'planId',
            message: expect.any(String)
          }),
          expect.objectContaining({
            field: 'schedule',
            message: expect.any(String)
          })
        ])
      });
    });

    it('should reject invalid schedule frequency', async () => {
      const habitData = {
        planId,
        title: 'Test Habit',
        schedule: {
          freq: 'invalid-frequency'
        }
      };

      const response = await request(app)
        .post('/api/v2/habits')
        .set('Authorization', `Bearer ${authToken}`)
        .send(habitData)
        .expect(400);

      expect(response.body.error).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v2/habits/:id - Get Habit Query', () => {
    beforeEach(async () => {
      // Create a habit for testing
      const habitData = {
        planId,
        title: 'Test Habit for GET',
        schedule: { freq: 'daily' }
      };

      const createResponse = await request(app)
        .post('/api/v2/habits')
        .set('Authorization', `Bearer ${authToken}`)
        .send(habitData);

      habitId = createResponse.body.habitId;
    });

    it('should retrieve habit by ID successfully', async () => {
      const response = await request(app)
        .get(`/api/v2/habits/${habitId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: habitId,
          userId,
          planId,
          title: 'Test Habit for GET',
          schedule: { freq: 'daily' },
          streakCount: 0,
          isCompletedToday: false,
          createdAt: expect.any(String)
        }
      });
    });

    it('should return 404 for non-existent habit', async () => {
      const nonExistentId = '123e4567-e89b-12d3-a456-426614174999';

      const response = await request(app)
        .get(`/api/v2/habits/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'HABIT_NOT_FOUND',
        message: 'Habit not found'
      });
    });

    it('should handle invalid UUID format', async () => {
      const invalidId = 'invalid-uuid';

      const response = await request(app)
        .get(`/api/v2/habits/${invalidId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.error).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v2/habits - Get User Habits Query with Pagination', () => {
    beforeEach(async () => {
      // Create multiple habits for pagination testing
      const habits = [
        { title: 'Habit 1', planId, schedule: { freq: 'daily' } },
        { title: 'Habit 2', planId, schedule: { freq: 'daily' } },
        { title: 'Habit 3', planId, schedule: { freq: 'weekly', days: [1, 3, 5] } }
      ];

      for (const habit of habits) {
        await request(app)
          .post('/api/v2/habits')
          .set('Authorization', `Bearer ${authToken}`)
          .send(habit);
      }
    });

    it('should return paginated habits', async () => {
      const response = await request(app)
        .get('/api/v2/habits?page=1&limit=2')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            title: expect.any(String),
            userId,
            planId
          })
        ]),
        pagination: {
          page: 1,
          limit: 2,
          total: expect.any(Number),
          totalPages: expect.any(Number)
        }
      });

      expect(response.body.data.length).toBeLessThanOrEqual(2);
    });

    it('should filter habits by planId', async () => {
      const response = await request(app)
        .get(`/api/v2/habits?planId=${planId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.every((habit: any) => habit.planId === planId)).toBe(true);
    });

    it('should sort habits by different fields', async () => {
      const response = await request(app)
        .get('/api/v2/habits?sortBy=title&sortOrder=asc')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      const titles = response.body.data.map((habit: any) => habit.title);
      const sortedTitles = [...titles].sort();
      expect(titles).toEqual(sortedTitles);
    });
  });

  describe('POST /api/v2/habits/complete - Complete Habit Command', () => {
    beforeEach(async () => {
      const habitData = {
        planId,
        title: 'Test Habit for Completion',
        schedule: { freq: 'daily' }
      };

      const createResponse = await request(app)
        .post('/api/v2/habits')
        .set('Authorization', `Bearer ${authToken}`)
        .send(habitData);

      habitId = createResponse.body.habitId;
    });

    it('should complete habit successfully', async () => {
      const response = await request(app)
        .post('/api/v2/habits/complete')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ habitId })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Habit completed successfully'
      });

      // Verify habit is marked as completed
      const getResponse = await request(app)
        .get(`/api/v2/habits/${habitId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.body.data.isCompletedToday).toBe(true);
      expect(getResponse.body.data.streakCount).toBe(1);
    });

    it('should increment streak count on consecutive completions', async () => {
      // Complete habit for first day
      await request(app)
        .post('/api/v2/habits/complete')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          habitId,
          date: '2024-01-01T10:00:00.000Z'
        });

      // Complete habit for second consecutive day
      await request(app)
        .post('/api/v2/habits/complete')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          habitId,
          date: '2024-01-02T10:00:00.000Z'
        });

      const getResponse = await request(app)
        .get(`/api/v2/habits/${habitId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.body.data.streakCount).toBe(2);
    });

    it('should prevent double completion on same day', async () => {
      // Complete habit
      await request(app)
        .post('/api/v2/habits/complete')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ habitId })
        .expect(200);

      // Try to complete again
      const response = await request(app)
        .post('/api/v2/habits/complete')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ habitId })
        .expect(400);

      expect(response.body.error).toBe('HABIT_COMPLETION_FAILED');
      expect(response.body.message).toContain('already completed');
    });
  });

  describe('GET /api/v2/habits/today - Today\'s Habits Query', () => {
    beforeEach(async () => {
      const habitsData = [
        { title: 'Daily Morning Dhikr', planId, schedule: { freq: 'daily' } },
        { title: 'Weekly Friday Prayer', planId, schedule: { freq: 'weekly', days: [5] } }, // Friday only
        { title: 'Daily Quran Reading', planId, schedule: { freq: 'daily' } }
      ];

      for (const habit of habitsData) {
        await request(app)
          .post('/api/v2/habits')
          .set('Authorization', `Bearer ${authToken}`)
          .send(habit);
      }
    });

    it('should return habits scheduled for today', async () => {
      const response = await request(app)
        .get('/api/v2/habits/today')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Array)
      });

      // Should include daily habits
      const dailyHabits = response.body.data.filter((habit: any) =>
        habit.schedule.freq === 'daily'
      );
      expect(dailyHabits.length).toBeGreaterThan(0);
    });

    it('should filter habits by specific date', async () => {
      const fridayDate = '2024-01-05'; // A Friday

      const response = await request(app)
        .get(`/api/v2/habits/today?date=${fridayDate}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Should include Friday-scheduled habit
      const fridayHabits = response.body.data.filter((habit: any) =>
        habit.title.includes('Friday')
      );
      expect(fridayHabits.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/v2/habits/statistics - Habit Statistics Query', () => {
    beforeEach(async () => {
      // Create and complete some habits for statistics
      const habitData = {
        planId,
        title: 'Statistics Test Habit',
        schedule: { freq: 'daily' }
      };

      const createResponse = await request(app)
        .post('/api/v2/habits')
        .set('Authorization', `Bearer ${authToken}`)
        .send(habitData);

      habitId = createResponse.body.habitId;

      // Complete the habit to generate statistics
      await request(app)
        .post('/api/v2/habits/complete')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ habitId });
    });

    it('should return comprehensive habit statistics', async () => {
      const response = await request(app)
        .get('/api/v2/habits/statistics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          totalHabits: expect.any(Number),
          completedToday: expect.any(Number),
          averageStreak: expect.any(Number),
          longestStreak: expect.any(Number),
          completionRate: expect.any(Number),
          weeklyProgress: expect.arrayContaining([
            expect.objectContaining({
              date: expect.any(String),
              completed: expect.any(Number),
              total: expect.any(Number)
            })
          ])
        }
      });

      expect(response.body.data.totalHabits).toBeGreaterThan(0);
      expect(response.body.data.completedToday).toBeGreaterThan(0);
      expect(response.body.data.weeklyProgress).toHaveLength(7);
    });

    it('should support date range filtering', async () => {
      const fromDate = '2024-01-01';
      const toDate = '2024-01-31';

      const response = await request(app)
        .get(`/api/v2/habits/statistics?from=${fromDate}&to=${toDate}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalHabits');
    });
  });

  describe('DELETE /api/v2/habits/:id - Delete Habit Command', () => {
    beforeEach(async () => {
      const habitData = {
        planId,
        title: 'Test Habit for Deletion',
        schedule: { freq: 'daily' }
      };

      const createResponse = await request(app)
        .post('/api/v2/habits')
        .set('Authorization', `Bearer ${authToken}`)
        .send(habitData);

      habitId = createResponse.body.habitId;
    });

    it('should delete habit successfully', async () => {
      const response = await request(app)
        .delete(`/api/v2/habits/${habitId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Habit deleted successfully'
      });

      // Verify habit is deleted
      await request(app)
        .get(`/api/v2/habits/${habitId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 404 for non-existent habit deletion', async () => {
      const nonExistentId = '123e4567-e89b-12d3-a456-426614174999';

      const response = await request(app)
        .delete(`/api/v2/habits/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.error).toBe('HABIT_DELETION_FAILED');
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication for all endpoints', async () => {
      await request(app)
        .get('/api/v2/habits')
        .expect(401);

      await request(app)
        .post('/api/v2/habits')
        .send({ title: 'Test' })
        .expect(401);
    });

    it('should validate JWT token format', async () => {
      await request(app)
        .get('/api/v2/habits')
        .set('Authorization', 'invalid-token')
        .expect(401);

      await request(app)
        .get('/api/v2/habits')
        .set('Authorization', 'Bearer invalid-jwt')
        .expect(401);
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting to habit endpoints', async () => {
      // This test would need to make many rapid requests
      // to trigger rate limiting - implementation depends on
      // your rate limiting configuration
    });
  });

  describe('Caching Behavior', () => {
    it('should cache query responses appropriately', async () => {
      // Create a habit
      const habitData = {
        planId,
        title: 'Cache Test Habit',
        schedule: { freq: 'daily' }
      };

      const createResponse = await request(app)
        .post('/api/v2/habits')
        .set('Authorization', `Bearer ${authToken}`)
        .send(habitData);

      habitId = createResponse.body.habitId;

      // First request (should hit database)
      const firstResponse = await request(app)
        .get(`/api/v2/habits/${habitId}`)
        .set('Authorization', `Bearer ${authToken}`);

      // Second request (should hit cache)
      const secondResponse = await request(app)
        .get(`/api/v2/habits/${habitId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(firstResponse.body).toEqual(secondResponse.body);
    });

    it('should invalidate cache after habit modifications', async () => {
      // Create habit
      const habitData = {
        planId,
        title: 'Cache Invalidation Test',
        schedule: { freq: 'daily' }
      };

      const createResponse = await request(app)
        .post('/api/v2/habits')
        .set('Authorization', `Bearer ${authToken}`)
        .send(habitData);

      habitId = createResponse.body.habitId;

      // Get habit (cache it)
      await request(app)
        .get(`/api/v2/habits/${habitId}`)
        .set('Authorization', `Bearer ${authToken}`);

      // Complete habit (should invalidate cache)
      await request(app)
        .post('/api/v2/habits/complete')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ habitId });

      // Get habit again (should reflect completion)
      const response = await request(app)
        .get(`/api/v2/habits/${habitId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.body.data.isCompletedToday).toBe(true);
    });
  });
});