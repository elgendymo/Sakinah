import { BaseQuery, PaginationQuery, PaginatedResult } from '../base/Query';

// Habit DTO for query results
export interface HabitDTO {
  id: string;
  userId: string;
  planId: string;
  title: string;
  schedule: {
    freq: 'daily' | 'weekly' | 'custom';
    days?: number[];
  };
  streakCount: number;
  lastCompletedOn?: string;
  createdAt: string;
  isCompletedToday?: boolean;
}

// Get Habit by ID Query
export class GetHabitByIdQuery extends BaseQuery<HabitDTO | null> {
  constructor(
    public readonly habitId: string,
    public readonly userId: string,
    correlationId?: string
  ) {
    super('GetHabitByIdQuery', userId, correlationId);
  }
}

// Get Habits by User Query
export class GetHabitsByUserQuery extends BaseQuery<PaginatedResult<HabitDTO>> {
  constructor(
    public readonly userId: string,
    public readonly filters?: {
      planId?: string;
      isActive?: boolean;
      completedToday?: boolean;
    },
    public readonly pagination?: PaginationQuery,
    correlationId?: string
  ) {
    super('GetHabitsByUserQuery', userId, correlationId);
  }
}

// Get Habits by Plan Query
export class GetHabitsByPlanQuery extends BaseQuery<HabitDTO[]> {
  constructor(
    public readonly planId: string,
    public readonly userId: string,
    correlationId?: string
  ) {
    super('GetHabitsByPlanQuery', userId, correlationId);
  }
}

// Get Habit Statistics Query
export interface HabitStatistics {
  totalHabits: number;
  completedToday: number;
  averageStreak: number;
  longestStreak: number;
  completionRate: number;
  weeklyProgress: Array<{
    date: string;
    completed: number;
    total: number;
  }>;
}

export class GetHabitStatisticsQuery extends BaseQuery<HabitStatistics> {
  constructor(
    public readonly userId: string,
    public readonly dateRange?: {
      from: Date;
      to: Date;
    },
    correlationId?: string
  ) {
    super('GetHabitStatisticsQuery', userId, correlationId);
  }
}

// Get Habit Streak Information Query
export interface HabitStreakInfo {
  habitId: string;
  currentStreak: number;
  longestStreak: number;
  streakHistory: Array<{
    startDate: string;
    endDate: string;
    length: number;
  }>;
}

export class GetHabitStreakInfoQuery extends BaseQuery<HabitStreakInfo> {
  constructor(
    public readonly habitId: string,
    public readonly userId: string,
    correlationId?: string
  ) {
    super('GetHabitStreakInfoQuery', userId, correlationId);
  }
}

// Get Today's Habits Query (optimized for dashboard)
export class GetTodaysHabitsQuery extends BaseQuery<HabitDTO[]> {
  constructor(
    public readonly userId: string,
    public readonly date: Date = new Date(),
    correlationId?: string
  ) {
    super('GetTodaysHabitsQuery', userId, correlationId);
  }
}

// Search Habits Query
export class SearchHabitsQuery extends BaseQuery<PaginatedResult<HabitDTO>> {
  constructor(
    public readonly userId: string,
    public readonly searchTerm: string,
    public readonly pagination?: PaginationQuery,
    correlationId?: string
  ) {
    super('SearchHabitsQuery', userId, correlationId);
  }
}

// Get Habit Completion History Query
export interface HabitCompletionEntry {
  date: string;
  completed: boolean;
  streakCount: number;
}

export class GetHabitCompletionHistoryQuery extends BaseQuery<HabitCompletionEntry[]> {
  constructor(
    public readonly habitId: string,
    public readonly userId: string,
    public readonly dateRange?: {
      from: Date;
      to: Date;
    },
    correlationId?: string
  ) {
    super('GetHabitCompletionHistoryQuery', userId, correlationId);
  }
}