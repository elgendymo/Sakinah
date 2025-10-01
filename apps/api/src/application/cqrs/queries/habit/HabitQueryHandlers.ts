import { injectable, inject } from 'tsyringe';
import { QueryHandler } from '../base/Query';
import {
  GetHabitByIdQuery,
  GetHabitsByUserQuery,
  GetHabitStatisticsQuery,
  GetTodaysHabitsQuery,
  SearchHabitsQuery,
  HabitDTO,
  HabitStatistics
} from './HabitQueries';
import { IHabitRepository } from '@/domain/repositories';
import { PaginatedResult } from '../base/Query';

@injectable()
export class GetHabitByIdQueryHandler implements QueryHandler<GetHabitByIdQuery, HabitDTO | null> {
  constructor(
    @inject('IHabitRepository') private _habitRepo: IHabitRepository
  ) {}

  async handle(query: GetHabitByIdQuery): Promise<HabitDTO | null> {
    const { HabitId } = await import('@/domain/value-objects/HabitId');
    const habitId = HabitId.fromString(query.habitId);

    const result = await this._habitRepo.findById(habitId);
    if (!result.ok || !result.value) {
      return null;
    }

    const habit = result.value;
    return {
      id: habit.id.toString(),
      userId: habit.userId.toString(),
      planId: habit.planId.toString(),
      title: habit.title,
      schedule: habit.schedule,
      streakCount: habit.streakCount,
      lastCompletedOn: habit.lastCompletedOn?.toISOString(),
      createdAt: habit.createdAt.toISOString()
    };
  }
}

@injectable()
export class GetHabitsByUserQueryHandler implements QueryHandler<GetHabitsByUserQuery, PaginatedResult<HabitDTO>> {
  constructor(
    @inject('IHabitRepository') private _habitRepo: IHabitRepository
  ) {}

  async handle(query: GetHabitsByUserQuery): Promise<PaginatedResult<HabitDTO>> {
    const { UserId } = await import('@/domain/value-objects/UserId');
    const userId = UserId.fromString(query.userId);

    const result = await this._habitRepo.findByUserId(userId);
    if (!result.ok) {
      return {
        data: [],
        pagination: {
          page: query.pagination?.page || 1,
          limit: query.pagination?.limit || 10,
          total: 0,
          totalPages: 0
        }
      };
    }

    const habits = result.value || [];

    // Convert domain habits to DTOs
    const habitDTOs: HabitDTO[] = habits.map(habit => ({
      id: habit.id.toString(),
      userId: habit.userId.toString(),
      planId: habit.planId.toString(),
      title: habit.title,
      schedule: habit.schedule,
      streakCount: habit.streakCount,
      lastCompletedOn: habit.lastCompletedOn?.toISOString(),
      createdAt: habit.createdAt.toISOString()
    }));

    // Apply pagination
    const page = query.pagination?.page || 1;
    const limit = query.pagination?.limit || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedHabits = habitDTOs.slice(startIndex, endIndex);

    return {
      data: paginatedHabits,
      pagination: {
        page,
        limit,
        total: habitDTOs.length,
        totalPages: Math.ceil(habitDTOs.length / limit)
      }
    };
  }
}

@injectable()
export class GetTodaysHabitsQueryHandler implements QueryHandler<GetTodaysHabitsQuery, HabitDTO[]> {
  constructor(
    @inject('IHabitRepository') private _habitRepo: IHabitRepository
  ) {}

  async handle(_query: GetTodaysHabitsQuery): Promise<HabitDTO[]> {
    // TODO: Implement findByFilters method in repository
    // For now, return empty array
    return [];
  }
}

@injectable()
export class GetHabitStatisticsQueryHandler implements QueryHandler<GetHabitStatisticsQuery, HabitStatistics> {
  constructor(
    @inject('IHabitRepository') private _habitRepo: IHabitRepository
  ) {}

  async handle(_query: GetHabitStatisticsQuery): Promise<HabitStatistics> {
    // TODO: Implement statistics calculation when repository methods are available
    return {
      totalHabits: 0,
      completedToday: 0,
      longestStreak: 0,
      averageStreak: 0,
      completionRate: 0,
      weeklyProgress: []
    };
  }

  private async calculateCompletionRate(_userId: string, _from: Date, _to: Date): Promise<number> {
    // TODO: Implement when repository has the necessary methods
    return 0;
  }

  private async calculateWeeklyProgress(_userId: string): Promise<Array<{date: string, completed: number, total: number}>> {
    // TODO: Implement when repository has the necessary methods
    return [];
  }
}

@injectable()
export class SearchHabitsQueryHandler implements QueryHandler<SearchHabitsQuery, PaginatedResult<HabitDTO>> {
  constructor(
    @inject('IHabitRepository') private _habitRepo: IHabitRepository
  ) {}

  async handle(_query: SearchHabitsQuery): Promise<PaginatedResult<HabitDTO>> {
    // TODO: Implement search method in repository
    // For now, return empty result with correct pagination properties
    return {
      data: [],
      pagination: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0
      }
    };
  }
}