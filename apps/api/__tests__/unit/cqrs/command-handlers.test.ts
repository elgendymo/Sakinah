import { describe, it, expect, beforeEach, vi } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import {
  CreateHabitCommandHandler,
  CompleteHabitCommandHandler,
  BulkCompleteHabitsCommandHandler
} from '@/application/cqrs/commands/habit/HabitCommandHandlers';
import {
  CreateHabitCommand,
  CompleteHabitCommand,
  BulkCompleteHabitsCommand
} from '@/application/cqrs/commands/habit/HabitCommands';
import { IHabitRepository, IPlanRepository } from '@/domain/repositories';
import { IEventBus } from '@/domain/events/IEventBus';
import { Habit } from '@/domain/entities/Habit';
import { Plan } from '@/domain/entities/Plan';
import { Result } from '@/shared/result';

// Mock dependencies
const mockHabitRepo = {
  create: vi.fn(),
  findById: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  findByFilters: vi.fn(),
  search: vi.fn()
} as unknown as IHabitRepository;

const mockPlanRepo = {
  create: vi.fn(),
  findById: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  findByUserId: vi.fn()
} as unknown as IPlanRepository;

const mockEventBus = {
  publish: vi.fn(),
  publishEvents: vi.fn(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn()
} as unknown as IEventBus;

// Test UUIDs - generate valid UUIDs for testing
const testIds = {
  user1: uuidv4(),
  user2: uuidv4(),
  plan1: uuidv4(),
  plan2: uuidv4(),
  habit1: uuidv4(),
  habit2: uuidv4()
};

describe('Command Handlers Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CreateHabitCommandHandler', () => {
    let handler: CreateHabitCommandHandler;

    beforeEach(() => {
      handler = new CreateHabitCommandHandler(
        mockHabitRepo,
        mockPlanRepo,
        mockEventBus
      );
    });

    it('should create a habit successfully when plan exists', async () => {
      // Arrange
      const command = new CreateHabitCommand(
        testIds.user1,
        testIds.plan1,
        'Morning Dhikr',
        { freq: 'daily' }
      );

      const mockPlan = Plan.create({
        userId: testIds.user1,
        kind: 'tahliyah',
        target: 'Increase gratitude',
        microHabits: []
      });

      const mockHabit = Habit.create({
        userId: testIds.user1,
        planId: testIds.plan1,
        title: 'Morning Dhikr',
        schedule: { freq: 'daily' }
      });

      vi.mocked(mockPlanRepo.findById).mockResolvedValue(Result.ok(mockPlan));
      vi.mocked(mockHabitRepo.create).mockResolvedValue(Result.ok(mockHabit));
      vi.mocked(mockEventBus.publishEvents).mockResolvedValue();

      // Act
      const result = await handler.handle(command);

      // Assert
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(mockHabit.id.toString());
      }

      expect(mockPlanRepo.findById).toHaveBeenCalledWith(testIds.plan1);
      expect(mockHabitRepo.create).toHaveBeenCalledWith(expect.any(Habit));
      expect(mockEventBus.publishEvents).toHaveBeenCalledWith(expect.any(Array));
    });

    it('should fail when plan does not exist', async () => {
      // Arrange
      const command = new CreateHabitCommand(
        testIds.user1,
        'non-existent-plan',
        'Morning Dhikr',
        { freq: 'daily' }
      );

      vi.mocked(mockPlanRepo.findById).mockResolvedValue(Result.ok(null));

      // Act
      const result = await handler.handle(command);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toBe('Plan not found');
      }

      expect(mockHabitRepo.create).not.toHaveBeenCalled();
      expect(mockEventBus.publishEvents).not.toHaveBeenCalled();
    });

    it('should fail when user is not authorized for plan', async () => {
      // Arrange
      const command = new CreateHabitCommand(
        testIds.user1,
        testIds.plan1,
        'Morning Dhikr',
        { freq: 'daily' }
      );

      const mockPlan = Plan.create({
        userId: testIds.user2,
        kind: 'tahliyah',
        target: 'Increase gratitude',
        microHabits: []
      });

      vi.mocked(mockPlanRepo.findById).mockResolvedValue(Result.ok(mockPlan));

      // Act
      const result = await handler.handle(command);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toBe('Unauthorized: Plan does not belong to user');
      }

      expect(mockHabitRepo.create).not.toHaveBeenCalled();
    });

    it('should handle repository failures gracefully', async () => {
      // Arrange
      const command = new CreateHabitCommand(
        testIds.user1,
        testIds.plan1,
        'Morning Dhikr',
        { freq: 'daily' }
      );

      vi.mocked(mockPlanRepo.findById).mockResolvedValue(Result.error(new Error('Database error')));

      // Act
      const result = await handler.handle(command);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toBe('Database error');
      }
    });
  });

  describe('CompleteHabitCommandHandler', () => {
    let handler: CompleteHabitCommandHandler;

    beforeEach(() => {
      handler = new CompleteHabitCommandHandler(
        mockHabitRepo,
        mockEventBus
      );
    });

    it('should complete habit successfully', async () => {
      // Arrange
      const command = new CompleteHabitCommand(
        testIds.user1,
        testIds.habit1,
        new Date('2024-01-15')
      );

      const mockHabit = Habit.create({
        id: testIds.habit1,
        userId: testIds.user1,
        planId: testIds.plan1,
        title: 'Morning Dhikr',
        schedule: { freq: 'daily' }
      });

      vi.mocked(mockHabitRepo.findById).mockResolvedValue(Result.ok(mockHabit));
      vi.mocked(mockHabitRepo.update).mockResolvedValue(Result.ok(mockHabit));
      vi.mocked(mockEventBus.publishEvents).mockResolvedValue();

      // Mock the markCompleted method to avoid domain logic complexity in unit test
      const markCompletedSpy = vi.spyOn(mockHabit, 'markCompleted');

      // Act
      const result = await handler.handle(command);

      // Assert
      expect(result.ok).toBe(true);
      expect(markCompletedSpy).toHaveBeenCalledWith(command.completionDate);
      expect(mockHabitRepo.update).toHaveBeenCalledWith(mockHabit);
      expect(mockEventBus.publishEvents).toHaveBeenCalledWith(expect.any(Array));
    });

    it('should fail when habit does not exist', async () => {
      // Arrange
      const command = new CompleteHabitCommand(
        testIds.user1,
        'non-existent-habit',
        new Date('2024-01-15')
      );

      vi.mocked(mockHabitRepo.findById).mockResolvedValue(Result.ok(null));

      // Act
      const result = await handler.handle(command);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toBe('Habit not found');
      }

      expect(mockHabitRepo.update).not.toHaveBeenCalled();
    });

    it('should fail when user is not authorized for habit', async () => {
      // Arrange
      const command = new CompleteHabitCommand(
        testIds.user1,
        testIds.habit1,
        new Date('2024-01-15')
      );

      const mockHabit = Habit.create({
        id: testIds.habit1,
        userId: testIds.user2,
        planId: testIds.plan1,
        title: 'Morning Dhikr',
        schedule: { freq: 'daily' }
      });

      vi.mocked(mockHabitRepo.findById).mockResolvedValue(Result.ok(mockHabit));

      // Act
      const result = await handler.handle(command);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toBe('Unauthorized: Habit does not belong to user');
      }

      expect(mockHabitRepo.update).not.toHaveBeenCalled();
    });

    it('should handle domain rule violations', async () => {
      // Arrange
      const command = new CompleteHabitCommand(
        testIds.user1,
        testIds.habit1,
        new Date('2024-01-15')
      );

      const mockHabit = Habit.create({
        id: testIds.habit1,
        userId: testIds.user1,
        planId: testIds.plan1,
        title: 'Morning Dhikr',
        schedule: { freq: 'daily' }
      });

      // Mock markCompleted to throw domain error
      vi.spyOn(mockHabit, 'markCompleted').mockImplementation(() => {
        throw new Error('Habit already completed today');
      });

      vi.mocked(mockHabitRepo.findById).mockResolvedValue(Result.ok(mockHabit));

      // Act
      const result = await handler.handle(command);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toBe('Habit already completed today');
      }

      expect(mockHabitRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('BulkCompleteHabitsCommandHandler', () => {
    let handler: BulkCompleteHabitsCommandHandler;

    beforeEach(() => {
      handler = new BulkCompleteHabitsCommandHandler(
        mockHabitRepo,
        mockEventBus
      );
    });

    it('should complete multiple habits successfully', async () => {
      // Arrange
      const command = new BulkCompleteHabitsCommand(
        testIds.user1,
        [testIds.habit1, testIds.habit2, testIds.habit2],
        new Date('2024-01-15')
      );

      const mockHabits = [
        Habit.create({
          id: testIds.habit1,
          userId: testIds.user1,
          planId: testIds.plan1,
          title: 'Habit 1',
          schedule: { freq: 'daily' }
        }),
        Habit.create({
          id: testIds.habit2,
          userId: testIds.user1,
          planId: testIds.plan1,
          title: 'Habit 2',
          schedule: { freq: 'daily' }
        }),
        Habit.create({
          id: testIds.habit2,
          userId: testIds.user1,
          planId: testIds.plan1,
          title: 'Habit 3',
          schedule: { freq: 'daily' }
        })
      ];

      // Mock repository calls for each habit
      vi.mocked(mockHabitRepo.findById)
        .mockResolvedValueOnce(Result.ok(mockHabits[0]))
        .mockResolvedValueOnce(Result.ok(mockHabits[1]))
        .mockResolvedValueOnce(Result.ok(mockHabits[2]));

      vi.mocked(mockHabitRepo.update).mockResolvedValue(Result.ok(mockHabits[0]));
      vi.mocked(mockEventBus.publishEvents).mockResolvedValue();

      // Mock domain methods
      mockHabits.forEach(habit => {
        vi.spyOn(habit, 'markCompleted').mockImplementation(() => {});
        vi.spyOn(habit, 'getDomainEvents').mockReturnValue([]);
        vi.spyOn(habit, 'clearDomainEvents').mockImplementation(() => {});
      });

      // Act
      const result = await handler.handle(command);

      // Assert
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(3); // All 3 habits completed successfully
      }

      expect(mockHabitRepo.findById).toHaveBeenCalledTimes(3);
      expect(mockHabitRepo.update).toHaveBeenCalledTimes(3);
      expect(mockEventBus.publishEvents).toHaveBeenCalledWith([]);
    });

    it('should skip non-existent habits but complete valid ones', async () => {
      // Arrange
      const command = new BulkCompleteHabitsCommand(
        testIds.user1,
        [testIds.habit1, 'non-existent', testIds.habit2],
        new Date('2024-01-15')
      );

      const mockHabits = [
        Habit.create({
          id: testIds.habit1,
          userId: testIds.user1,
          planId: testIds.plan1,
          title: 'Habit 1',
          schedule: { freq: 'daily' }
        }),
        Habit.create({
          id: testIds.habit2,
          userId: testIds.user1,
          planId: testIds.plan1,
          title: 'Habit 3',
          schedule: { freq: 'daily' }
        })
      ];

      // Mock repository calls
      vi.mocked(mockHabitRepo.findById)
        .mockResolvedValueOnce(Result.ok(mockHabits[0])) // habit-1 exists
        .mockResolvedValueOnce(Result.ok(null)) // non-existent doesn't exist
        .mockResolvedValueOnce(Result.ok(mockHabits[1])); // habit-3 exists

      vi.mocked(mockHabitRepo.update).mockResolvedValue(Result.ok(mockHabits[0]));
      vi.mocked(mockEventBus.publishEvents).mockResolvedValue();

      // Mock domain methods for valid habits
      [mockHabits[0], mockHabits[1]].forEach(habit => {
        vi.spyOn(habit, 'markCompleted').mockImplementation(() => {});
        vi.spyOn(habit, 'getDomainEvents').mockReturnValue([]);
        vi.spyOn(habit, 'clearDomainEvents').mockImplementation(() => {});
      });

      // Act
      const result = await handler.handle(command);

      // Assert
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(2); // Only 2 valid habits completed
      }

      expect(mockHabitRepo.findById).toHaveBeenCalledTimes(3);
      expect(mockHabitRepo.update).toHaveBeenCalledTimes(2); // Only for valid habits
    });

    it('should skip unauthorized habits but complete authorized ones', async () => {
      // Arrange
      const command = new BulkCompleteHabitsCommand(
        testIds.user1,
        [testIds.habit1, testIds.habit2],
        new Date('2024-01-15')
      );

      const mockHabits = [
        Habit.create({
          id: testIds.habit1,
          userId: testIds.user1,
          planId: testIds.plan1,
          title: 'Authorized Habit',
          schedule: { freq: 'daily' }
        }),
        Habit.create({
          id: testIds.habit2,
          userId: testIds.user2,
          planId: testIds.plan1,
          title: 'Unauthorized Habit',
          schedule: { freq: 'daily' }
        })
      ];

      vi.mocked(mockHabitRepo.findById)
        .mockResolvedValueOnce(Result.ok(mockHabits[0]))
        .mockResolvedValueOnce(Result.ok(mockHabits[1]));

      vi.mocked(mockHabitRepo.update).mockResolvedValue(Result.ok(mockHabits[0]));
      vi.mocked(mockEventBus.publishEvents).mockResolvedValue();

      // Mock domain methods for authorized habit only
      vi.spyOn(mockHabits[0], 'markCompleted').mockImplementation(() => {});
      vi.spyOn(mockHabits[0], 'getDomainEvents').mockReturnValue([]);
      vi.spyOn(mockHabits[0], 'clearDomainEvents').mockImplementation(() => {});

      // Act
      const result = await handler.handle(command);

      // Assert
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(1); // Only authorized habit completed
      }

      expect(mockHabitRepo.update).toHaveBeenCalledTimes(1);
    });

    it('should handle partial failures gracefully', async () => {
      // Arrange
      const command = new BulkCompleteHabitsCommand(
        testIds.user1,
        [testIds.habit1, testIds.habit2],
        new Date('2024-01-15')
      );

      const mockHabits = [
        Habit.create({
          id: testIds.habit1,
          userId: testIds.user1,
          planId: testIds.plan1,
          title: 'Success Habit',
          schedule: { freq: 'daily' }
        }),
        Habit.create({
          id: testIds.habit2,
          userId: testIds.user1,
          planId: testIds.plan1,
          title: 'Failure Habit',
          schedule: { freq: 'daily' }
        })
      ];

      vi.mocked(mockHabitRepo.findById)
        .mockResolvedValueOnce(Result.ok(mockHabits[0]))
        .mockResolvedValueOnce(Result.ok(mockHabits[1]));

      // First habit succeeds, second fails
      vi.mocked(mockHabitRepo.update)
        .mockResolvedValueOnce(Result.ok(mockHabits[0]))
        .mockResolvedValueOnce(Result.error(new Error('Update failed')));

      vi.mocked(mockEventBus.publishEvents).mockResolvedValue();

      // Mock domain methods
      mockHabits.forEach(habit => {
        vi.spyOn(habit, 'markCompleted').mockImplementation(() => {});
        vi.spyOn(habit, 'getDomainEvents').mockReturnValue([]);
        vi.spyOn(habit, 'clearDomainEvents').mockImplementation(() => {});
      });

      // Act
      const result = await handler.handle(command);

      // Assert
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(1); // Only successful habit counted
      }
    });
  });
});