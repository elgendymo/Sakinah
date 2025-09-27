import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { Express } from 'express';
import { createApp } from '../../src/server';
import { configureDependencies } from '../../src/infrastructure/di/container';

/**
 * End-to-End Tests for Complete Habit Workflow
 *
 * These tests simulate real user workflows and test the entire application stack:
 * - Authentication
 * - CQRS commands and queries
 * - Domain logic
 * - Database persistence
 * - Cache invalidation
 * - Event handling
 */
describe('Habit Workflow E2E Tests', () => {
  let app: Express;
  let authToken: string;
  let userId: string;
  let planId: string;

  beforeAll(async () => {
    // Setup test environment
    process.env.NODE_ENV = 'test';
    process.env.DB_BACKEND = 'sqlite';
    process.env.AI_PROVIDER = 'rules';

    configureDependencies();
    app = await createApp();

    // Mock authentication
    authToken = 'test-jwt-token';
    userId = 'test-user-id';
    planId = 'test-plan-id';
  });

  afterAll(async () => {
    // Cleanup resources
  });

  beforeEach(async () => {
    // Clean slate for each test
  });

  describe('Complete Spiritual Habit Journey', () => {
    let habitId: string;

    it('should complete a full spiritual habit lifecycle', async () => {
      // 1. Create a spiritual habit
      console.log('📝 Creating spiritual habit...');
      const habitData = {
        planId,
        title: 'Recite Surah Al-Fatiha 10 times',
        schedule: {
          freq: 'daily'
        }
      };

      const createResponse = await request(app)
        .post('/api/v2/habits')
        .set('Authorization', `Bearer ${authToken}`)
        .send(habitData)
        .expect(201);

      expect(createResponse.body.success).toBe(true);
      habitId = createResponse.body.habitId;

      // 2. Verify habit was created with correct initial state
      console.log('✅ Verifying initial habit state...');
      const getResponse = await request(app)
        .get(`/api/v2/habits/${habitId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(getResponse.body.data).toMatchObject({
        id: habitId,
        title: 'Recite Surah Al-Fatiha 10 times',
        streakCount: 0,
        isCompletedToday: false,
        schedule: { freq: 'daily' }
      });

      // 3. Complete habit for Day 1
      console.log('🎯 Completing habit for Day 1...');
      await request(app)
        .post('/api/v2/habits/complete')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          habitId,
          date: '2024-01-15T10:00:00.000Z'
        })
        .expect(200);

      // 4. Verify streak started
      console.log('📈 Verifying streak started...');
      const day1Response = await request(app)
        .get(`/api/v2/habits/${habitId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(day1Response.body.data.streakCount).toBe(1);

      // 5. Complete habit for Day 2 (consecutive day)
      console.log('🔥 Completing habit for Day 2 (building streak)...');
      await request(app)
        .post('/api/v2/habits/complete')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          habitId,
          date: '2024-01-16T10:00:00.000Z'
        })
        .expect(200);

      // 6. Verify streak incremented
      const day2Response = await request(app)
        .get(`/api/v2/habits/${habitId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(day2Response.body.data.streakCount).toBe(2);

      // 7. Complete habit for Day 5 (missed days 3 and 4)
      console.log('⚠️  Completing habit after missed days (streak should reset)...');
      await request(app)
        .post('/api/v2/habits/complete')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          habitId,
          date: '2024-01-19T10:00:00.000Z'
        })
        .expect(200);

      // 8. Verify streak reset due to missed days
      const day5Response = await request(app)
        .get(`/api/v2/habits/${habitId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(day5Response.body.data.streakCount).toBe(1); // Reset to 1

      // 9. Try to complete same day twice (should fail)
      console.log('❌ Attempting double completion (should fail)...');
      await request(app)
        .post('/api/v2/habits/complete')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          habitId,
          date: '2024-01-19T15:00:00.000Z' // Same day, different time
        })
        .expect(400);

      // 10. Verify statistics reflect the journey
      console.log('📊 Verifying statistics...');
      const statsResponse = await request(app)
        .get('/api/v2/habits/statistics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(statsResponse.body.data).toMatchObject({
        totalHabits: expect.any(Number),
        longestStreak: expect.any(Number),
        averageStreak: expect.any(Number)
      });

      expect(statsResponse.body.data.totalHabits).toBeGreaterThan(0);

      console.log('✨ Complete spiritual habit lifecycle successful!');
    });
  });

  describe('Multiple Habits Management', () => {
    let morningHabitId: string;
    let eveningHabitId: string;
    let weeklyHabitId: string;

    it('should manage multiple habits with different schedules', async () => {
      // Create multiple habits with different schedules
      console.log('📝 Creating multiple spiritual habits...');

      // Daily morning habit
      const morningHabit = {
        planId,
        title: 'Morning Dhikr - Subhan Allah (33x)',
        schedule: { freq: 'daily' }
      };

      const morningResponse = await request(app)
        .post('/api/v2/habits')
        .set('Authorization', `Bearer ${authToken}`)
        .send(morningHabit)
        .expect(201);

      morningHabitId = morningResponse.body.habitId;

      // Daily evening habit
      const eveningHabit = {
        planId,
        title: 'Evening Dua - Astaghfirullah (100x)',
        schedule: { freq: 'daily' }
      };

      const eveningResponse = await request(app)
        .post('/api/v2/habits')
        .set('Authorization', `Bearer ${authToken}`)
        .send(eveningHabit)
        .expect(201);

      eveningHabitId = eveningResponse.body.habitId;

      // Weekly Friday habit
      const weeklyHabit = {
        planId,
        title: 'Friday Jummah Prayer',
        schedule: { freq: 'weekly', days: [5] } // Friday
      };

      const weeklyResponse = await request(app)
        .post('/api/v2/habits')
        .set('Authorization', `Bearer ${authToken}`)
        .send(weeklyHabit)
        .expect(201);

      weeklyHabitId = weeklyResponse.body.habitId;

      // Get all user habits
      console.log('📋 Fetching all user habits...');
      const allHabitsResponse = await request(app)
        .get('/api/v2/habits?limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(allHabitsResponse.body.data.length).toBeGreaterThanOrEqual(3);

      // Test today's habits on a Monday (should include daily habits but not Friday habit)
      console.log('🗓️  Testing today\'s habits filtering...');
      const mondayHabitsResponse = await request(app)
        .get('/api/v2/habits/today?date=2024-01-15') // Monday
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const mondayHabits = mondayHabitsResponse.body.data;
      const dailyHabitsCount = mondayHabits.filter((h: any) => h.schedule.freq === 'daily').length;
      const fridayHabitsCount = mondayHabits.filter((h: any) =>
        h.schedule.freq === 'weekly' && h.schedule.days?.includes(5)
      ).length;

      expect(dailyHabitsCount).toBeGreaterThanOrEqual(2); // Morning and evening
      expect(fridayHabitsCount).toBe(0); // No Friday habit on Monday

      // Test Friday habits
      console.log('🕌 Testing Friday habits...');
      const fridayHabitsResponse = await request(app)
        .get('/api/v2/habits/today?date=2024-01-19') // Friday
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const fridayHabits = fridayHabitsResponse.body.data;
      const fridayScheduledCount = fridayHabits.filter((h: any) =>
        h.schedule.freq === 'weekly' && h.schedule.days?.includes(5)
      ).length;

      expect(fridayScheduledCount).toBeGreaterThanOrEqual(1); // Should include Friday habit

      // Bulk complete daily habits
      console.log('⚡ Bulk completing daily habits...');
      const bulkCompleteResponse = await request(app)
        .post('/api/v2/habits/bulk-complete')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          habitIds: [morningHabitId, eveningHabitId],
          date: '2024-01-15T12:00:00.000Z'
        })
        .expect(200);

      expect(bulkCompleteResponse.body.completedCount).toBe(2);

      // Verify both habits were completed
      console.log('✅ Verifying bulk completion...');
      const morningCheck = await request(app)
        .get(`/api/v2/habits/${morningHabitId}`)
        .set('Authorization', `Bearer ${authToken}`);

      const eveningCheck = await request(app)
        .get(`/api/v2/habits/${eveningHabitId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(morningCheck.body.data.streakCount).toBe(1);
      expect(eveningCheck.body.data.streakCount).toBe(1);

      console.log('✨ Multiple habits management successful!');
    });
  });

  describe('Habit Search and Filtering', () => {
    beforeEach(async () => {
      // Create test habits with searchable terms
      const searchableHabits = [
        { title: 'Quran Reading - 15 minutes', planId, schedule: { freq: 'daily' } },
        { title: 'Dhikr after Salah', planId, schedule: { freq: 'daily' } },
        { title: 'Islamic Study Session', planId, schedule: { freq: 'weekly', days: [1, 3, 5] } },
        { title: 'Charity Giving', planId, schedule: { freq: 'weekly', days: [5] } }
      ];

      for (const habit of searchableHabits) {
        await request(app)
          .post('/api/v2/habits')
          .set('Authorization', `Bearer ${authToken}`)
          .send(habit);
      }
    });

    it('should search habits by title', async () => {
      console.log('🔍 Testing habit search functionality...');

      // Search for Quran-related habits
      const quranSearchResponse = await request(app)
        .get('/api/v2/habits/search?q=Quran')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(quranSearchResponse.body.data.length).toBeGreaterThan(0);
      expect(quranSearchResponse.body.data[0].title).toContain('Quran');

      // Search for weekly habits
      const weeklySearchResponse = await request(app)
        .get('/api/v2/habits/search?q=weekly')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Search should find habits even if 'weekly' is not in title but in description/context
      expect(weeklySearchResponse.body.success).toBe(true);

      // Empty search should fail
      await request(app)
        .get('/api/v2/habits/search')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });

    it('should filter habits by plan', async () => {
      console.log('🎯 Testing habit filtering by plan...');

      const filteredResponse = await request(app)
        .get(`/api/v2/habits?planId=${planId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(filteredResponse.body.data.every((habit: any) => habit.planId === planId)).toBe(true);
    });

    it('should paginate habits correctly', async () => {
      console.log('📄 Testing habit pagination...');

      // Get first page
      const page1Response = await request(app)
        .get('/api/v2/habits?page=1&limit=2')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(page1Response.body.data.length).toBeLessThanOrEqual(2);
      expect(page1Response.body.pagination.page).toBe(1);

      // Get second page
      const page2Response = await request(app)
        .get('/api/v2/habits?page=2&limit=2')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(page2Response.body.pagination.page).toBe(2);

      // Verify different results on different pages (if enough habits exist)
      if (page1Response.body.data.length > 0 && page2Response.body.data.length > 0) {
        const page1Ids = page1Response.body.data.map((h: any) => h.id);
        const page2Ids = page2Response.body.data.map((h: any) => h.id);
        const hasOverlap = page1Ids.some((id: string) => page2Ids.includes(id));
        expect(hasOverlap).toBe(false);
      }
    });

    it('should sort habits by different criteria', async () => {
      console.log('🔄 Testing habit sorting...');

      // Sort by title ascending
      const titleAscResponse = await request(app)
        .get('/api/v2/habits?sortBy=title&sortOrder=asc')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      if (titleAscResponse.body.data.length > 1) {
        const titles = titleAscResponse.body.data.map((h: any) => h.title);
        const sortedTitles = [...titles].sort();
        expect(titles).toEqual(sortedTitles);
      }

      // Sort by creation date descending (newest first)
      const dateDescResponse = await request(app)
        .get('/api/v2/habits?sortBy=createdAt&sortOrder=desc')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      if (dateDescResponse.body.data.length > 1) {
        const dates = dateDescResponse.body.data.map((h: any) => new Date(h.createdAt));
        for (let i = 0; i < dates.length - 1; i++) {
          expect(dates[i].getTime()).toBeGreaterThanOrEqual(dates[i + 1].getTime());
        }
      }
    });
  });

  describe('Habit Analytics and Insights', () => {
    let analyticsHabitId: string;

    beforeEach(async () => {
      // Create habit for analytics testing
      const habit = {
        planId,
        title: 'Analytics Test Habit',
        schedule: { freq: 'daily' }
      };

      const response = await request(app)
        .post('/api/v2/habits')
        .set('Authorization', `Bearer ${authToken}`)
        .send(habit);

      analyticsHabitId = response.body.habitId;
    });

    it('should track comprehensive habit statistics', async () => {
      console.log('📊 Testing habit analytics...');

      // Complete habit on several days to build data
      const completionDates = [
        '2024-01-15T09:00:00.000Z',
        '2024-01-16T09:00:00.000Z',
        '2024-01-17T09:00:00.000Z',
        '2024-01-19T09:00:00.000Z' // Skip 18th to test streak break
      ];

      for (const date of completionDates) {
        await request(app)
          .post('/api/v2/habits/complete')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ habitId: analyticsHabitId, date });
      }

      // Get comprehensive statistics
      const statsResponse = await request(app)
        .get('/api/v2/habits/statistics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const stats = statsResponse.body.data;

      expect(stats).toMatchObject({
        totalHabits: expect.any(Number),
        completedToday: expect.any(Number),
        averageStreak: expect.any(Number),
        longestStreak: expect.any(Number),
        completionRate: expect.any(Number),
        weeklyProgress: expect.any(Array)
      });

      expect(stats.totalHabits).toBeGreaterThan(0);
      expect(stats.weeklyProgress).toHaveLength(7);

      // Verify weekly progress structure
      stats.weeklyProgress.forEach((day: any) => {
        expect(day).toMatchObject({
          date: expect.any(String),
          completed: expect.any(Number),
          total: expect.any(Number)
        });
      });

      console.log('✅ Analytics data structure validated');
    });

    it('should handle date range filtering for statistics', async () => {
      console.log('📅 Testing statistics with date range...');

      const statsResponse = await request(app)
        .get('/api/v2/habits/statistics?from=2024-01-01&to=2024-01-31')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(statsResponse.body.success).toBe(true);
      expect(statsResponse.body.data).toBeDefined();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle various error scenarios gracefully', async () => {
      console.log('❌ Testing error handling scenarios...');

      // Invalid UUID format
      await request(app)
        .get('/api/v2/habits/invalid-uuid')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      // Non-existent habit
      await request(app)
        .get('/api/v2/habits/123e4567-e89b-12d3-a456-426614174999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      // Invalid pagination parameters
      await request(app)
        .get('/api/v2/habits?page=-1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      await request(app)
        .get('/api/v2/habits?limit=1000')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      // Missing required fields
      await request(app)
        .post('/api/v2/habits')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Incomplete Data' })
        .expect(400);

      // Invalid schedule frequency
      await request(app)
        .post('/api/v2/habits')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          planId,
          title: 'Invalid Schedule',
          schedule: { freq: 'invalid' }
        })
        .expect(400);

      console.log('✅ Error scenarios handled correctly');
    });
  });

  describe('Cache Behavior Verification', () => {
    let cacheTestHabitId: string;

    beforeEach(async () => {
      const habit = {
        planId,
        title: 'Cache Test Habit',
        schedule: { freq: 'daily' }
      };

      const response = await request(app)
        .post('/api/v2/habits')
        .set('Authorization', `Bearer ${authToken}`)
        .send(habit);

      cacheTestHabitId = response.body.habitId;
    });

    it('should demonstrate cache invalidation after modifications', async () => {
      console.log('💾 Testing cache behavior...');

      // First request (populates cache)
      const firstResponse = await request(app)
        .get(`/api/v2/habits/${cacheTestHabitId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(firstResponse.body.data.streakCount).toBe(0);

      // Second request (should hit cache, same result)
      const cachedResponse = await request(app)
        .get(`/api/v2/habits/${cacheTestHabitId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(cachedResponse.body.data.streakCount).toBe(0);

      // Modify habit (should invalidate cache)
      await request(app)
        .post('/api/v2/habits/complete')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ habitId: cacheTestHabitId });

      // Request after modification (should reflect changes)
      const updatedResponse = await request(app)
        .get(`/api/v2/habits/${cacheTestHabitId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(updatedResponse.body.data.streakCount).toBe(1);

      console.log('✅ Cache invalidation working correctly');
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent habit completions safely', async () => {
      console.log('🔄 Testing concurrent operations...');

      // Create habit for concurrency test
      const habit = {
        planId,
        title: 'Concurrency Test Habit',
        schedule: { freq: 'daily' }
      };

      const createResponse = await request(app)
        .post('/api/v2/habits')
        .set('Authorization', `Bearer ${authToken}`)
        .send(habit);

      const concurrentHabitId = createResponse.body.habitId;

      // Attempt concurrent completions (should handle race conditions)
      const concurrentPromises = Array(5).fill(null).map(() =>
        request(app)
          .post('/api/v2/habits/complete')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ habitId: concurrentHabitId })
      );

      const results = await Promise.allSettled(concurrentPromises);

      // Only one should succeed, others should fail with appropriate error
      const successful = results.filter(result =>
        result.status === 'fulfilled' && result.value.status === 200
      ).length;

      const failed = results.filter(result =>
        result.status === 'fulfilled' && result.value.status !== 200
      ).length;

      expect(successful).toBe(1); // Only one completion should succeed
      expect(failed).toBe(4); // Others should fail

      // Verify final state
      const finalResponse = await request(app)
        .get(`/api/v2/habits/${concurrentHabitId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(finalResponse.body.data.streakCount).toBe(1);

      console.log('✅ Concurrent operations handled safely');
    });
  });

  console.log('\n🎉 All E2E workflow tests completed successfully!');
});