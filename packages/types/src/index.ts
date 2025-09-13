import { z } from 'zod';

// User & Auth Types
export const UserSchema = z.object({
  id: z.string().uuid(),
  handle: z.string().optional(),
  createdAt: z.string().datetime(),
});

export const ProfileSchema = z.object({
  userId: z.string().uuid(),
  displayName: z.string(),
  timezone: z.string(),
  createdAt: z.string().datetime(),
});

// Content Types
export const ContentTypeEnum = z.enum(['ayah', 'hadith', 'dua', 'note']);

export const ContentSnippetSchema = z.object({
  id: z.string().uuid(),
  type: ContentTypeEnum,
  text: z.string(),
  ref: z.string(),
  tags: z.array(z.string()),
  createdAt: z.string().datetime(),
});

// Plan Types
export const PlanKindEnum = z.enum(['takhliyah', 'tahliyah']);
export const PlanStatusEnum = z.enum(['active', 'archived']);

export const MicroHabitSchema = z.object({
  title: z.string(),
  schedule: z.string(),
  target: z.number().min(1),
});

export const PlanSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  kind: PlanKindEnum,
  target: z.string(),
  microHabits: z.array(MicroHabitSchema),
  duaIds: z.array(z.string().uuid()).optional(),
  contentIds: z.array(z.string().uuid()).optional(),
  status: PlanStatusEnum,
  createdAt: z.string().datetime(),
});

// Habit Types
export const HabitScheduleSchema = z.object({
  freq: z.enum(['daily', 'weekly', 'custom']),
  days: z.array(z.number().min(0).max(6)).optional(),
});

export const HabitSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  planId: z.string().uuid(),
  title: z.string(),
  schedule: HabitScheduleSchema,
  streakCount: z.number().min(0),
  lastCompletedOn: z.string().optional(),
  createdAt: z.string().datetime(),
});

export const HabitCompletionSchema = z.object({
  id: z.string().uuid(),
  habitId: z.string().uuid(),
  userId: z.string().uuid(),
  completedOn: z.string(),
});

// Check-in Types
export const CheckinSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  date: z.string(),
  mood: z.number().min(-2).max(2).optional(),
  intention: z.string().optional(),
  reflection: z.string().optional(),
  createdAt: z.string().datetime(),
});

// Journal Types
export const JournalEntrySchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  content: z.string(),
  tags: z.array(z.string()).optional(),
  createdAt: z.string().datetime(),
});

// API Request/Response DTOs
export const CreatePlanInputSchema = z.object({
  mode: PlanKindEnum,
  input: z.string().min(1).max(500),
});

export const SuggestPlanResponseSchema = z.object({
  plan: PlanSchema,
  suggestions: z.array(ContentSnippetSchema),
});

export const CreateCheckinInputSchema = z.object({
  mood: z.number().min(-2).max(2).optional(),
  intention: z.string().max(500).optional(),
  reflection: z.string().max(1000).optional(),
});

export const ToggleHabitInputSchema = z.object({
  completed: z.boolean(),
});

export const AIExplainInputSchema = z.object({
  struggle: z.string().min(1).max(500),
});

export const AIExplainResponseSchema = z.object({
  guidance: z.string(),
  refs: z.array(z.string()).optional(),
});

// Type exports
export type User = z.infer<typeof UserSchema>;
export type Profile = z.infer<typeof ProfileSchema>;
export type ContentSnippet = z.infer<typeof ContentSnippetSchema>;
export type ContentType = z.infer<typeof ContentTypeEnum>;
export type Plan = z.infer<typeof PlanSchema>;
export type PlanKind = z.infer<typeof PlanKindEnum>;
export type PlanStatus = z.infer<typeof PlanStatusEnum>;
export type MicroHabit = z.infer<typeof MicroHabitSchema>;
export type Habit = z.infer<typeof HabitSchema>;
export type HabitSchedule = z.infer<typeof HabitScheduleSchema>;
export type HabitCompletion = z.infer<typeof HabitCompletionSchema>;
export type Checkin = z.infer<typeof CheckinSchema>;
export type JournalEntry = z.infer<typeof JournalEntrySchema>;
export type CreatePlanInput = z.infer<typeof CreatePlanInputSchema>;
export type SuggestPlanResponse = z.infer<typeof SuggestPlanResponseSchema>;
export type CreateCheckinInput = z.infer<typeof CreateCheckinInputSchema>;
export type ToggleHabitInput = z.infer<typeof ToggleHabitInputSchema>;
export type AIExplainInput = z.infer<typeof AIExplainInputSchema>;
export type AIExplainResponse = z.infer<typeof AIExplainResponseSchema>;