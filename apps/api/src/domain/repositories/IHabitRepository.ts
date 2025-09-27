import { Result } from '@/shared/result';
import { Habit } from '../entities/Habit';
import { UserId } from '../value-objects/UserId';
import { HabitId } from '../value-objects/HabitId';
import { PlanId } from '../value-objects/PlanId';

export interface IHabitRepository {
  create(habit: Habit): Promise<Result<Habit>>;
  findById(id: HabitId): Promise<Result<Habit | null>>;
  findByUserId(userId: UserId): Promise<Result<Habit[]>>;
  findByPlanId(planId: PlanId): Promise<Result<Habit[]>>;
  updateStreak(habit: Habit): Promise<Result<Habit>>;
  createCompletion(habitId: HabitId, userId: UserId, date: Date): Promise<Result<void>>;
  deleteCompletion(habitId: HabitId, userId: UserId, date: Date): Promise<Result<void>>;
  findCompletionByDate(habitId: HabitId, userId: UserId, date: Date): Promise<Result<boolean>>;
}