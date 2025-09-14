import { HabitSchedule } from '@sakinah/types';

// Repository method input types for better type safety

export interface CreateCheckinInput {
  userId: string;
  date: string;
  mood?: number;
  intention?: string;
  reflection?: string;
}

export interface UpdateCheckinInput {
  mood?: number;
  intention?: string;
  reflection?: string;
}

export interface CreateHabitInput {
  userId: string;
  planId: string;
  title: string;
  schedule: HabitSchedule;
}

export interface CreateHabitCompletionInput {
  habitId: string;
  userId: string;
  completedOn: string;
}

// Repository result wrapper for consistent error handling
export interface RepositoryResult<T> {
  data: T | null;
  error?: Error;
}

export interface RepositoryMultiResult<T> {
  data: T[];
  error?: Error;
}