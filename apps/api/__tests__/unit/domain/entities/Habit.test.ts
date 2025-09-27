import { describe, it, expect, beforeEach } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import { Habit } from '@/domain/entities/Habit';
import {
  HabitCreatedEvent,
  HabitCompletedEvent,
  HabitStreakBrokenEvent,
  HabitMilestoneReachedEvent
} from '@/domain/events/HabitEvents';

// Test UUIDs - generate valid UUIDs for testing
const testIds = {
  user1: uuidv4(),
  plan1: uuidv4(),
  habit1: uuidv4()
};

describe('Habit', () => {
  describe('create', () => {
    it('should create a new habit with default values', () => {
      const habit = Habit.create({
        userId: testIds.user1,
        planId: testIds.plan1,
        title: 'Morning Prayer',
        schedule: { freq: 'daily' }
      });

      expect(habit.streakCount).toBe(0);
      expect(habit.lastCompletedOn).toBeNull();
      expect(habit.title).toBe('Morning Prayer');
    });

    it('should emit HabitCreatedEvent for new habits', () => {
      const habit = Habit.create({
        userId: testIds.user1,
        planId: testIds.plan1,
        title: 'Quran Reading',
        schedule: { freq: 'daily' }
      });

      const events = habit.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(HabitCreatedEvent);
    });

    it('should not emit event when recreating existing habit', () => {
      const habit = Habit.create({
        id: testIds.habit1,
        userId: testIds.user1,
        planId: testIds.plan1,
        title: 'Dhikr',
        schedule: { freq: 'daily' }
      });

      expect(habit.getDomainEvents()).toHaveLength(0);
    });
  });

  describe('markCompleted', () => {
    it('should start streak at 1 for first completion', () => {
      const habit = Habit.create({
        userId: testIds.user1,
        planId: testIds.plan1,
        title: 'Night Prayer',
        schedule: { freq: 'daily' }
      });

      habit.clearDomainEvents(); // Clear creation event
      habit.markCompleted(new Date('2024-01-15'));

      expect(habit.streakCount).toBe(1);
      expect(habit.lastCompletedOn).toEqual(new Date('2024-01-15'));

      const events = habit.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(HabitCompletedEvent);
    });

    it('should increment streak for consecutive days', () => {
      const habit = Habit.create({
        userId: testIds.user1,
        planId: testIds.plan1,
        title: 'Fajr Prayer',
        schedule: { freq: 'daily' },
        streakCount: 5,
        lastCompletedOn: new Date('2024-01-14')
      });

      habit.markCompleted(new Date('2024-01-15'));

      expect(habit.streakCount).toBe(6);

      const events = habit.getDomainEvents();
      const completedEvent = events.find(e => e instanceof HabitCompletedEvent) as HabitCompletedEvent;
      expect(completedEvent.newStreakCount).toBe(6);
      expect(completedEvent.isStreakMaintained).toBe(true);
    });

    it('should reset streak and emit StreakBrokenEvent for missed days', () => {
      const habit = Habit.create({
        userId: testIds.user1,
        planId: testIds.plan1,
        title: 'Daily Dhikr',
        schedule: { freq: 'daily' },
        streakCount: 10,
        lastCompletedOn: new Date('2024-01-10')
      });

      habit.markCompleted(new Date('2024-01-15'));

      expect(habit.streakCount).toBe(1);

      const events = habit.getDomainEvents();
      const brokenEvent = events.find(e => e instanceof HabitStreakBrokenEvent) as HabitStreakBrokenEvent;
      expect(brokenEvent).toBeDefined();
      expect(brokenEvent.previousStreakCount).toBe(10);
      expect(brokenEvent.daysMissed).toBe(5);
    });

    it('should throw error when completing same day twice', () => {
      const habit = Habit.create({
        userId: testIds.user1,
        planId: testIds.plan1,
        title: 'Tahajjud',
        schedule: { freq: 'daily' },
        lastCompletedOn: new Date('2024-01-15')
      });

      expect(() => habit.markCompleted(new Date('2024-01-15'))).toThrow('Habit already completed today');
    });

    it('should emit milestone event at 7 days', () => {
      const habit = Habit.create({
        userId: testIds.user1,
        planId: testIds.plan1,
        title: 'Quran Memorization',
        schedule: { freq: 'daily' },
        streakCount: 6,
        lastCompletedOn: new Date('2024-01-14')
      });

      habit.markCompleted(new Date('2024-01-15'));

      const events = habit.getDomainEvents();
      const milestoneEvent = events.find(e => e instanceof HabitMilestoneReachedEvent) as HabitMilestoneReachedEvent;
      expect(milestoneEvent).toBeDefined();
      expect(milestoneEvent.milestoneType).toBe('week');
      expect(milestoneEvent.streakCount).toBe(7);
    });

    it('should emit milestone event at 30 days', () => {
      const habit = Habit.create({
        userId: testIds.user1,
        planId: testIds.plan1,
        title: 'Charity',
        schedule: { freq: 'daily' },
        streakCount: 29,
        lastCompletedOn: new Date('2024-01-14')
      });

      habit.markCompleted(new Date('2024-01-15'));

      const events = habit.getDomainEvents();
      const milestoneEvent = events.find(e => e instanceof HabitMilestoneReachedEvent) as HabitMilestoneReachedEvent;
      expect(milestoneEvent.milestoneType).toBe('month');
      expect(milestoneEvent.streakCount).toBe(30);
    });
  });

  describe('markIncomplete', () => {
    it('should decrease streak count', () => {
      const habit = Habit.create({
        userId: testIds.user1,
        planId: testIds.plan1,
        title: 'Meditation',
        schedule: { freq: 'daily' },
        streakCount: 5,
        lastCompletedOn: new Date('2024-01-15')
      });

      habit.markIncomplete(new Date('2024-01-15'));

      expect(habit.streakCount).toBe(4);
      expect(habit.lastCompletedOn).toBeNull();
    });

    it('should throw error if habit was not completed', () => {
      const habit = Habit.create({
        userId: testIds.user1,
        planId: testIds.plan1,
        title: 'Exercise',
        schedule: { freq: 'daily' }
      });

      expect(() => habit.markIncomplete()).toThrow('Habit was not completed');
    });
  });

  describe('resetStreak', () => {
    it('should reset streak count and last completion date', () => {
      const habit = Habit.create({
        userId: testIds.user1,
        planId: testIds.plan1,
        title: 'Reading',
        schedule: { freq: 'daily' },
        streakCount: 15,
        lastCompletedOn: new Date('2024-01-15')
      });

      habit.resetStreak();

      expect(habit.streakCount).toBe(0);
      expect(habit.lastCompletedOn).toBeNull();
    });
  });

  describe('toDTO', () => {
    it('should serialize habit to DTO format', () => {
      const habit = Habit.create({
        userId: testIds.user1,
        planId: testIds.plan1,
        title: 'Gratitude Journal',
        schedule: { freq: 'weekly', days: [1, 3, 5] },
        streakCount: 3,
        lastCompletedOn: new Date('2024-01-15')
      });

      const dto = habit.toDTO();

      expect(dto).toMatchObject({
        userId: testIds.user1,
        planId: testIds.plan1,
        title: 'Gratitude Journal',
        schedule: { freq: 'weekly', days: [1, 3, 5] },
        streakCount: 3,
        lastCompletedOn: '2024-01-15T00:00:00.000Z'
      });
    });
  });
});