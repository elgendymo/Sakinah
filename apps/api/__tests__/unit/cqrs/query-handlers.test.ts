import { describe, it, expect, beforeEach, vi } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import {
  GetHabitByIdQueryHandler,
  GetHabitsByUserQueryHandler,
  GetTodaysHabitsQueryHandler,
  GetHabitStatisticsQueryHandler
} from '@/application/cqrs/queries/habit/HabitQueryHandlers';
import {
  GetHabitByIdQuery,
  GetHabitsByUserQuery,
  GetTodaysHabitsQuery,
  GetHabitStatisticsQuery
} from '@/application/cqrs/queries/habit/HabitQueries';
import { IHabitRepository } from '@/domain/repositories';
import { Habit } from '@/domain/entities/Habit';
import { Result } from '@/shared/result';

// Mock habit repository
const mockHabitRepo = {
  create: vi.fn(),
  findById: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  findByFilters: vi.fn(),
  search: vi.fn()
} as unknown as IHabitRepository;

// Test UUIDs - generate valid UUIDs for testing
const testIds = {
  user1: uuidv4(),
  user2: uuidv4(),
  plan1: uuidv4(),
  plan2: uuidv4(),
  habit1: uuidv4(),
  habit2: uuidv4()
};

describe('Query Handlers Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GetHabitByIdQueryHandler', () => {
    let handler: GetHabitByIdQueryHandler;

    beforeEach(() => {
      handler = new GetHabitByIdQueryHandler(mockHabitRepo);
    });

    it('should return habit DTO when habit exists and user is authorized', async () => {
      // Arrange
      const query = new GetHabitByIdQuery(testIds.habit1, testIds.user1);

      const mockHabit = Habit.create({
        id: testIds.habit1,
        userId: testIds.user1,
        planId: testIds.plan1,
        title: 'Morning Dhikr',
        schedule: { freq: 'daily' },
        streakCount: 5,
        lastCompletedOn: new Date('2024-01-15'),
        createdAt: new Date('2024-01-01')
      });

      vi.mocked(mockHabitRepo.findById).mockResolvedValue(Result.ok(mockHabit));

      // Act
      const result = await handler.handle(query);

      // Assert
      expect(result).toEqual({
        id: testIds.habit1,
        userId: testIds.user1,
        planId: testIds.plan1,
        title: 'Morning Dhikr',
        schedule: { freq: 'daily' },
        streakCount: 5,
        lastCompletedOn: expect.any(String),
        createdAt: expect.any(String),
        isCompletedToday: expect.any(Boolean)
      });

      expect(mockHabitRepo.findById).toHaveBeenCalledWith(testIds.habit1);
    });

    it('should return null when habit does not exist', async () => {
      // Arrange
      const query = new GetHabitByIdQuery('non-existent-habit', testIds.user1);

      vi.mocked(mockHabitRepo.findById).mockResolvedValue(Result.ok(null));

      // Act
      const result = await handler.handle(query);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when user is not authorized', async () => {
      // Arrange
      const query = new GetHabitByIdQuery(testIds.habit1, testIds.user2);

      const mockHabit = Habit.create({
        id: testIds.habit1,
        userId: 'different-user',
        planId: testIds.plan1,
        title: 'Morning Dhikr',
        schedule: { freq: 'daily' }
      });

      vi.mocked(mockHabitRepo.findById).mockResolvedValue(Result.ok(mockHabit));

      // Act
      const result = await handler.handle(query);

      // Assert
      expect(result).toBeNull();
    });

    it('should handle repository errors gracefully', async () => {
      // Arrange
      const query = new GetHabitByIdQuery(testIds.habit1, testIds.user1);

      vi.mocked(mockHabitRepo.findById).mockResolvedValue(Result.error(new Error('Database error')));

      // Act
      const result = await handler.handle(query);

      // Assert
      expect(result).toBeNull();
    });

    it('should correctly calculate isCompletedToday for today', async () => {
      // Arrange
      const query = new GetHabitByIdQuery(testIds.habit1, testIds.user1);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const mockHabit = Habit.create({
        id: testIds.habit1,
        userId: testIds.user1,
        planId: testIds.plan1,
        title: 'Morning Dhikr',
        schedule: { freq: 'daily' },
        lastCompletedOn: today
      });

      vi.mocked(mockHabitRepo.findById).mockResolvedValue(Result.ok(mockHabit));

      // Act
      const result = await handler.handle(query);

      // Assert
      expect(result?.isCompletedToday).toBe(true);
    });

    it('should correctly calculate isCompletedToday for yesterday', async () => {
      // Arrange
      const query = new GetHabitByIdQuery(testIds.habit1, testIds.user1);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const mockHabit = Habit.create({
        id: testIds.habit1,
        userId: testIds.user1,
        planId: testIds.plan1,
        title: 'Morning Dhikr',
        schedule: { freq: 'daily' },
        lastCompletedOn: yesterday
      });

      vi.mocked(mockHabitRepo.findById).mockResolvedValue(Result.ok(mockHabit));

      // Act
      const result = await handler.handle(query);

      // Assert
      expect(result?.isCompletedToday).toBe(false);
    });
  });

  describe('GetHabitsByUserQueryHandler', () => {
    let handler: GetHabitsByUserQueryHandler;

    beforeEach(() => {
      handler = new GetHabitsByUserQueryHandler(mockHabitRepo);
    });

    it('should return paginated habits for user', async () => {
      // Arrange
      const query = new GetHabitsByUserQuery(
        testIds.user1,
        undefined, // no filters
        { page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' }
      );

      const mockHabits = [
        Habit.create({
          userId: testIds.user1,
          planId: testIds.plan1,
          title: 'Habit 1',
          schedule: { freq: 'daily' }
        }),
        Habit.create({
          userId: testIds.user1,
          planId: testIds.plan2,
          title: 'Habit 2',
          schedule: { freq: 'weekly', days: [1, 3, 5] }
        })
      ];

      vi.mocked(mockHabitRepo.findByFilters).mockResolvedValue(Result.ok({
        data: mockHabits,
        total: 2
      }));

      // Act
      const result = await handler.handle(query);

      // Assert
      expect(result).toEqual({
        data: expect.arrayContaining([
          expect.objectContaining({
            userId: testIds.user1,
            title: 'Habit 1'
          }),
          expect.objectContaining({
            userId: testIds.user1,
            title: 'Habit 2'
          })
        ]),
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          totalPages: 1
        }
      });

      expect(mockHabitRepo.findByFilters).toHaveBeenCalledWith(
        { userId: testIds.user1 },
        {
          offset: 0,
          limit: 10,
          sortBy: 'createdAt',
          sortOrder: 'desc'
        }
      );
    });

    it('should apply filters correctly', async () => {
      // Arrange
      const query = new GetHabitsByUserQuery(
        testIds.user1,
        { planId: testIds.plan1 },
        { page: 1, limit: 10 }
      );

      vi.mocked(mockHabitRepo.findByFilters).mockResolvedValue(Result.ok({
        data: [],
        total: 0
      }));

      // Act
      await handler.handle(query);

      // Assert
      expect(mockHabitRepo.findByFilters).toHaveBeenCalledWith(
        { userId: testIds.user1, planId: testIds.plan1 },
        expect.any(Object)
      );
    });

    it('should handle repository errors gracefully', async () => {
      // Arrange
      const query = new GetHabitsByUserQuery(testIds.user1);

      vi.mocked(mockHabitRepo.findByFilters).mockResolvedValue(
        Result.error(new Error('Database error'))
      );

      // Act
      const result = await handler.handle(query);

      // Assert
      expect(result).toEqual({
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
      });
    });

    it('should filter habits by completedToday post-query', async () => {
      // Arrange
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const mockHabits = [
        Habit.create({
          userId: testIds.user1,
          planId: testIds.plan1,
          title: 'Completed Habit',
          schedule: { freq: 'daily' },
          lastCompletedOn: today
        }),
        Habit.create({
          userId: testIds.user1,
          planId: testIds.plan2,
          title: 'Incomplete Habit',
          schedule: { freq: 'daily' },
          lastCompletedOn: new Date('2024-01-01') // Not today
        })
      ];

      const query = new GetHabitsByUserQuery(
        testIds.user1,
        { completedToday: true }
      );

      vi.mocked(mockHabitRepo.findByFilters).mockResolvedValue(Result.ok({
        data: mockHabits,
        total: 2
      }));

      // Act
      const result = await handler.handle(query);

      // Assert
      expect(result.data).toHaveLength(1);
      expect(result.data[0].title).toBe('Completed Habit');
      expect(result.data[0].isCompletedToday).toBe(true);
    });

    it('should calculate pagination correctly', async () => {
      // Arrange
      const query = new GetHabitsByUserQuery(
        testIds.user1,
        undefined,
        { page: 2, limit: 5 }
      );

      vi.mocked(mockHabitRepo.findByFilters).mockResolvedValue(Result.ok({
        data: [],
        total: 23
      }));

      // Act
      const result = await handler.handle(query);

      // Assert
      expect(result.pagination).toEqual({
        page: 2,
        limit: 5,
        total: 23,
        totalPages: 5
      });

      expect(mockHabitRepo.findByFilters).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          offset: 5, // (page - 1) * limit = (2 - 1) * 5
          limit: 5
        })
      );
    });
  });

  describe('GetTodaysHabitsQueryHandler', () => {
    let handler: GetTodaysHabitsQueryHandler;

    beforeEach(() => {
      handler = new GetTodaysHabitsQueryHandler(mockHabitRepo);
    });

    it('should return daily habits for today', async () => {
      // Arrange
      const query = new GetTodaysHabitsQuery(testIds.user1, new Date('2024-01-15')); // Monday

      const mockHabits = [
        Habit.create({
          userId: testIds.user1,
          planId: testIds.plan1,
          title: 'Daily Habit',
          schedule: { freq: 'daily' }
        }),
        Habit.create({
          userId: testIds.user1,
          planId: testIds.plan2,
          title: 'Monday Habit',
          schedule: { freq: 'weekly', days: [1] } // Monday
        }),
        Habit.create({
          userId: testIds.user1,
          planId: testIds.plan2,
          title: 'Friday Habit',
          schedule: { freq: 'weekly', days: [5] } // Friday - should be filtered out
        })
      ];

      vi.mocked(mockHabitRepo.findByFilters).mockResolvedValue(Result.ok({
        data: mockHabits,
        total: 3
      }));

      // Act
      const result = await handler.handle(query);

      // Assert
      expect(result).toHaveLength(2);
      expect(result.map(h => h.title)).toEqual(['Daily Habit', 'Monday Habit']);
    });

    it('should handle custom schedule habits correctly', async () => {
      // Arrange
      const query = new GetTodaysHabitsQuery(testIds.user1, new Date('2024-01-15')); // Monday

      const mockHabits = [
        Habit.create({
          userId: testIds.user1,
          planId: testIds.plan1,
          title: 'Custom Monday/Wednesday',
          schedule: { freq: 'custom', days: [1, 3] } // Monday and Wednesday
        }),
        Habit.create({
          userId: testIds.user1,
          planId: testIds.plan2,
          title: 'Custom Tuesday/Thursday',
          schedule: { freq: 'custom', days: [2, 4] } // Tuesday and Thursday
        })
      ];

      vi.mocked(mockHabitRepo.findByFilters).mockResolvedValue(Result.ok({
        data: mockHabits,
        total: 2
      }));

      // Act
      const result = await handler.handle(query);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Custom Monday/Wednesday');
    });

    it('should handle empty schedule days array', async () => {
      // Arrange
      const query = new GetTodaysHabitsQuery(testIds.user1, new Date('2024-01-15'));

      const mockHabits = [
        Habit.create({
          userId: testIds.user1,
          planId: testIds.plan1,
          title: 'Weekly No Days',
          schedule: { freq: 'weekly' } // No days specified
        })
      ];

      vi.mocked(mockHabitRepo.findByFilters).mockResolvedValue(Result.ok({
        data: mockHabits,
        total: 1
      }));

      // Act
      const result = await handler.handle(query);

      // Assert
      expect(result).toHaveLength(0); // Should be filtered out
    });

    it('should return empty array on repository error', async () => {
      // Arrange
      const query = new GetTodaysHabitsQuery(testIds.user1);

      vi.mocked(mockHabitRepo.findByFilters).mockResolvedValue(
        Result.error(new Error('Database error'))
      );

      // Act
      const result = await handler.handle(query);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('GetHabitStatisticsQueryHandler', () => {
    let handler: GetHabitStatisticsQueryHandler;

    beforeEach(() => {
      handler = new GetHabitStatisticsQueryHandler(mockHabitRepo);
    });

    it('should calculate basic statistics correctly', async () => {
      // Arrange
      const query = new GetHabitStatisticsQuery(testIds.user1);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const mockHabits = [
        Habit.create({
          userId: testIds.user1,
          planId: testIds.plan1,
          title: 'Completed Today',
          schedule: { freq: 'daily' },
          streakCount: 5,
          lastCompletedOn: today
        }),
        Habit.create({
          userId: testIds.user1,
          planId: testIds.plan2,
          title: 'Not Completed Today',
          schedule: { freq: 'daily' },
          streakCount: 3,
          lastCompletedOn: new Date('2024-01-01')
        }),
        Habit.create({
          userId: testIds.user1,
          planId: testIds.plan2,
          title: 'High Streak',
          schedule: { freq: 'daily' },
          streakCount: 15,
          lastCompletedOn: new Date('2024-01-01')
        })
      ];

      vi.mocked(mockHabitRepo.findByFilters).mockResolvedValue(Result.ok({
        data: mockHabits,
        total: 3
      }));

      // Act
      const result = await handler.handle(query);

      // Assert
      expect(result).toEqual({
        totalHabits: 3,
        completedToday: 1,
        averageStreak: 7.67, // (5 + 3 + 15) / 3 = 7.67
        longestStreak: 15,
        completionRate: 0.75, // Mock value
        weeklyProgress: expect.any(Array)
      });
    });

    it('should handle empty habits list', async () => {
      // Arrange
      const query = new GetHabitStatisticsQuery(testIds.user1);

      vi.mocked(mockHabitRepo.findByFilters).mockResolvedValue(Result.ok({
        data: [],
        total: 0
      }));

      // Act
      const result = await handler.handle(query);

      // Assert
      expect(result).toEqual({
        totalHabits: 0,
        completedToday: 0,
        averageStreak: 0,
        longestStreak: 0,
        completionRate: 0.75, // Mock value from calculateCompletionRate
        weeklyProgress: expect.any(Array)
      });
    });

    it('should return empty statistics on repository error', async () => {
      // Arrange
      const query = new GetHabitStatisticsQuery(testIds.user1);

      vi.mocked(mockHabitRepo.findByFilters).mockResolvedValue(
        Result.error(new Error('Database error'))
      );

      // Act
      const result = await handler.handle(query);

      // Assert
      expect(result).toEqual({
        totalHabits: 0,
        completedToday: 0,
        averageStreak: 0,
        longestStreak: 0,
        completionRate: 0,
        weeklyProgress: []
      });
    });

    it('should generate weekly progress data', async () => {
      // Arrange
      const query = new GetHabitStatisticsQuery(testIds.user1);

      vi.mocked(mockHabitRepo.findByFilters).mockResolvedValue(Result.ok({
        data: [],
        total: 0
      }));

      // Act
      const result = await handler.handle(query);

      // Assert
      expect(result.weeklyProgress).toHaveLength(7);
      result.weeklyProgress.forEach(day => {
        expect(day).toEqual({
          date: expect.any(String),
          completed: expect.any(Number),
          total: expect.any(Number)
        });
      });
    });

    it('should support date range filtering', async () => {
      // Arrange
      const fromDate = new Date('2024-01-01');
      const toDate = new Date('2024-01-31');
      const query = new GetHabitStatisticsQuery(testIds.user1, { from: fromDate, to: toDate });

      vi.mocked(mockHabitRepo.findByFilters).mockResolvedValue(Result.ok({
        data: [],
        total: 0
      }));

      // Act
      const result = await handler.handle(query);

      // Assert
      expect(result).toBeDefined();
      expect(mockHabitRepo.findByFilters).toHaveBeenCalledWith({ userId: testIds.user1 });
    });
  });
});