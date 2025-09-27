import request from 'supertest';
import { createTestApp } from '../helpers/test-app';
import { setupTestDatabase, cleanupTestDatabase } from '../helpers/test-database';
import { createTestUser } from '../helpers/test-user';

describe('Checkins Integration Tests', () => {
  let app: any;
  let testUserId: string;
  let authToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  beforeEach(async () => {
    const { userId, token } = await createTestUser();
    testUserId = userId;
    authToken = token;
  });

  describe('Complete Check-in Flow', () => {
    it('should handle the complete daily muhasabah workflow', async () => {
      // Step 1: Check if user has checked in today (should be false)
      const todayResponse = await request(app)
        .get('/api/v2/checkins/today')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(todayResponse.body.hasCheckedIn).toBe(false);
      expect(todayResponse.body.data).toBeNull();
      expect(todayResponse.body.streak.current).toBe(0);

      // Step 2: Create morning intention
      const morningCheckin = {
        intention: 'I intend to be more patient with my family today',
        mood: 1
      };

      const morningResponse = await request(app)
        .post('/api/v2/checkins')
        .set('Authorization', `Bearer ${authToken}`)
        .send(morningCheckin)
        .expect(200);

      expect(morningResponse.body.data.intention).toBe(morningCheckin.intention);
      expect(morningResponse.body.data.mood).toBe(1);
      expect(morningResponse.body.isUpdate).toBe(false);
      expect(morningResponse.body.streak.current).toBe(1);

      const checkinId = morningResponse.body.data.id;

      // Step 3: Check today's status again (should now be true)
      const todayResponse2 = await request(app)
        .get('/api/v2/checkins/today')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(todayResponse2.body.hasCheckedIn).toBe(true);
      expect(todayResponse2.body.data.id).toBe(checkinId);
      expect(todayResponse2.body.data.intention).toBe(morningCheckin.intention);

      // Step 4: Evening reflection update
      const eveningUpdate = {
        reflection: 'Alhamdulillah, I was able to practice patience when my child was difficult',
        gratitude: [
          'Good health from Allah',
          'Supportive family',
          'Guidance through Islamic teachings'
        ],
        improvements: 'Tomorrow I will wake up earlier for Fajr prayer',
        mood: 2
      };

      const eveningResponse = await request(app)
        .post('/api/v2/checkins')
        .set('Authorization', `Bearer ${authToken}`)
        .send(eveningUpdate)
        .expect(200);

      expect(eveningResponse.body.data.id).toBe(checkinId);
      expect(eveningResponse.body.data.mood).toBe(2);
      expect(eveningResponse.body.data.reflection).toContain('Alhamdulillah');
      expect(eveningResponse.body.data.reflection).toContain('Gratitude:');
      expect(eveningResponse.body.data.reflection).toContain('1. Good health from Allah');
      expect(eveningResponse.body.data.reflection).toContain('Improvements:');
      expect(eveningResponse.body.data.reflection).toContain('Tomorrow I will wake up earlier');
      expect(eveningResponse.body.isUpdate).toBe(true);

      // Step 5: Get all check-ins
      const allCheckinsResponse = await request(app)
        .get('/api/v2/checkins')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(allCheckinsResponse.body.data).toHaveLength(1);
      expect(allCheckinsResponse.body.pagination.total).toBe(1);
      expect(allCheckinsResponse.body.streak.current).toBe(1);

      // Step 6: Get streak information
      const streakResponse = await request(app)
        .get('/api/v2/checkins/streak')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(streakResponse.body.current).toBe(1);
      expect(streakResponse.body.longest).toBe(1);
      expect(streakResponse.body.totalCheckins).toBe(1);
      expect(streakResponse.body.lastCheckinDate).toBeTruthy();
    });

    it('should handle multiple days check-in streak', async () => {
      // Simulate check-ins for multiple consecutive days
      const days = 5;
      const checkinIds: string[] = [];

      for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (days - 1 - i));

        const checkinData = {
          mood: Math.floor(Math.random() * 5) - 2, // Random mood -2 to 2
          intention: `Day ${i + 1} intention: Grow spiritually`,
          reflection: `Day ${i + 1} reflection: Made progress in patience`,
          date: date.toISOString().split('T')[0]
        };

        const response = await request(app)
          .post('/api/v2/checkins')
          .set('Authorization', `Bearer ${authToken}`)
          .send(checkinData)
          .expect(200);

        checkinIds.push(response.body.data.id);
      }

      // Check final streak
      const streakResponse = await request(app)
        .get('/api/v2/checkins/streak')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(streakResponse.body.current).toBe(days);
      expect(streakResponse.body.longest).toBe(days);
      expect(streakResponse.body.totalCheckins).toBe(days);

      // Check pagination
      const checkinsResponse = await request(app)
        .get('/api/v2/checkins')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 3, offset: 0 })
        .expect(200);

      expect(checkinsResponse.body.data).toHaveLength(3);
      expect(checkinsResponse.body.pagination.total).toBe(days);
      expect(checkinsResponse.body.pagination.limit).toBe(3);
      expect(checkinsResponse.body.pagination.offset).toBe(0);

      // Check date filtering
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const filteredResponse = await request(app)
        .get('/api/v2/checkins')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          from: yesterdayStr,
          to: yesterdayStr
        })
        .expect(200);

      expect(filteredResponse.body.data).toHaveLength(1);
      expect(filteredResponse.body.data[0].date).toBe(yesterdayStr);
    });

    it('should handle broken streak correctly', async () => {
      // Day 1 check-in
      const day1 = new Date();
      day1.setDate(day1.getDate() - 4);

      await request(app)
        .post('/api/v2/checkins')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          mood: 1,
          intention: 'Day 1 intention',
          date: day1.toISOString().split('T')[0]
        })
        .expect(200);

      // Day 2 check-in
      const day2 = new Date();
      day2.setDate(day2.getDate() - 3);

      await request(app)
        .post('/api/v2/checkins')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          mood: 1,
          intention: 'Day 2 intention',
          date: day2.toISOString().split('T')[0]
        })
        .expect(200);

      // Skip day 3 (break streak)

      // Day 4 check-in (yesterday)
      const day4 = new Date();
      day4.setDate(day4.getDate() - 1);

      await request(app)
        .post('/api/v2/checkins')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          mood: 1,
          intention: 'Day 4 intention',
          date: day4.toISOString().split('T')[0]
        })
        .expect(200);

      // Day 5 check-in (today)
      await request(app)
        .post('/api/v2/checkins')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          mood: 1,
          intention: 'Day 5 intention'
        })
        .expect(200);

      const streakResponse = await request(app)
        .get('/api/v2/checkins/streak')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(streakResponse.body.current).toBe(2); // Yesterday and today
      expect(streakResponse.body.longest).toBe(2); // Day 1-2 consecutive, Day 4-5 consecutive
      expect(streakResponse.body.totalCheckins).toBe(4);
    });
  });

  describe('Error Handling', () => {
    it('should handle unauthorized requests', async () => {
      await request(app)
        .get('/api/v2/checkins')
        .expect(401);

      await request(app)
        .post('/api/v2/checkins')
        .send({ mood: 1 })
        .expect(401);
    });

    it('should validate input data', async () => {
      // Invalid mood value
      await request(app)
        .post('/api/v2/checkins')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ mood: 5 }) // Should be -2 to 2
        .expect(400);

      // Too long intention
      await request(app)
        .post('/api/v2/checkins')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ intention: 'a'.repeat(501) }) // Should be max 500 chars
        .expect(400);

      // Invalid date format
      await request(app)
        .post('/api/v2/checkins')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ date: '2024-13-01' }) // Invalid month
        .expect(400);

      // Too many gratitude items
      await request(app)
        .post('/api/v2/checkins')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          gratitude: ['Item 1', 'Item 2', 'Item 3', 'Item 4'] // Should be max 3
        })
        .expect(400);
    });

    it('should handle malformed requests gracefully', async () => {
      await request(app)
        .post('/api/v2/checkins')
        .set('Authorization', `Bearer ${authToken}`)
        .send('invalid json')
        .expect(400);
    });
  });

  describe('Data Isolation', () => {
    it('should only return check-ins for authenticated user', async () => {
      // Create check-in for first user
      await request(app)
        .post('/api/v2/checkins')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          mood: 1,
          intention: 'User 1 intention'
        })
        .expect(200);

      // Create second user
      const { token: token2 } = await createTestUser();

      // Second user should not see first user's check-ins
      const response = await request(app)
        .get('/api/v2/checkins')
        .set('Authorization', `Bearer ${token2}`)
        .expect(200);

      expect(response.body.data).toHaveLength(0);
      expect(response.body.streak.current).toBe(0);

      // Second user's today check should be null
      const todayResponse = await request(app)
        .get('/api/v2/checkins/today')
        .set('Authorization', `Bearer ${token2}`)
        .expect(200);

      expect(todayResponse.body.hasCheckedIn).toBe(false);
      expect(todayResponse.body.data).toBeNull();
    });
  });
});