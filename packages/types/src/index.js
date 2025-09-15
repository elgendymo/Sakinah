"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIExplainResponseSchema = exports.AIExplainInputSchema = exports.ToggleHabitInputSchema = exports.CreateCheckinInputSchema = exports.SuggestPlanResponseSchema = exports.CreatePlanInputSchema = exports.JournalEntrySchema = exports.CheckinSchema = exports.HabitCompletionSchema = exports.HabitSchema = exports.HabitScheduleSchema = exports.PlanSchema = exports.MicroHabitSchema = exports.PlanStatusEnum = exports.PlanKindEnum = exports.ContentSnippetSchema = exports.ContentTypeEnum = exports.ProfileSchema = exports.UserSchema = void 0;
var zod_1 = require("zod");
// User & Auth Types
exports.UserSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    handle: zod_1.z.string().optional(),
    createdAt: zod_1.z.string().datetime(),
});
exports.ProfileSchema = zod_1.z.object({
    userId: zod_1.z.string().uuid(),
    displayName: zod_1.z.string(),
    timezone: zod_1.z.string(),
    createdAt: zod_1.z.string().datetime(),
});
// Content Types
exports.ContentTypeEnum = zod_1.z.enum(['ayah', 'hadith', 'dua', 'note']);
exports.ContentSnippetSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    type: exports.ContentTypeEnum,
    text: zod_1.z.string(),
    ref: zod_1.z.string(),
    tags: zod_1.z.array(zod_1.z.string()),
    createdAt: zod_1.z.string().datetime(),
});
// Plan Types
exports.PlanKindEnum = zod_1.z.enum(['takhliyah', 'tahliyah']);
exports.PlanStatusEnum = zod_1.z.enum(['active', 'archived']);
exports.MicroHabitSchema = zod_1.z.object({
    title: zod_1.z.string(),
    schedule: zod_1.z.string(),
    target: zod_1.z.number().min(1),
});
exports.PlanSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    userId: zod_1.z.string().uuid(),
    kind: exports.PlanKindEnum,
    target: zod_1.z.string(),
    microHabits: zod_1.z.array(exports.MicroHabitSchema),
    duaIds: zod_1.z.array(zod_1.z.string().uuid()).optional(),
    contentIds: zod_1.z.array(zod_1.z.string().uuid()).optional(),
    status: exports.PlanStatusEnum,
    createdAt: zod_1.z.string().datetime(),
});
// Habit Types
exports.HabitScheduleSchema = zod_1.z.object({
    freq: zod_1.z.enum(['daily', 'weekly', 'custom']),
    days: zod_1.z.array(zod_1.z.number().min(0).max(6)).optional(),
});
exports.HabitSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    userId: zod_1.z.string().uuid(),
    planId: zod_1.z.string().uuid(),
    title: zod_1.z.string(),
    schedule: exports.HabitScheduleSchema,
    streakCount: zod_1.z.number().min(0),
    lastCompletedOn: zod_1.z.string().optional(),
    createdAt: zod_1.z.string().datetime(),
});
exports.HabitCompletionSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    habitId: zod_1.z.string().uuid(),
    userId: zod_1.z.string().uuid(),
    completedOn: zod_1.z.string(),
});
// Check-in Types
exports.CheckinSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    userId: zod_1.z.string().uuid(),
    date: zod_1.z.string(),
    mood: zod_1.z.number().min(-2).max(2).optional(),
    intention: zod_1.z.string().optional(),
    reflection: zod_1.z.string().optional(),
    createdAt: zod_1.z.string().datetime(),
});
// Journal Types
exports.JournalEntrySchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    userId: zod_1.z.string().uuid(),
    content: zod_1.z.string(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    createdAt: zod_1.z.string().datetime(),
});
// API Request/Response DTOs
exports.CreatePlanInputSchema = zod_1.z.object({
    mode: exports.PlanKindEnum,
    input: zod_1.z.string().min(1).max(500),
});
exports.SuggestPlanResponseSchema = zod_1.z.object({
    plan: exports.PlanSchema,
    suggestions: zod_1.z.array(exports.ContentSnippetSchema),
});
exports.CreateCheckinInputSchema = zod_1.z.object({
    mood: zod_1.z.number().min(-2).max(2).optional(),
    intention: zod_1.z.string().max(500).optional(),
    reflection: zod_1.z.string().max(1000).optional(),
});
exports.ToggleHabitInputSchema = zod_1.z.object({
    completed: zod_1.z.boolean(),
});
exports.AIExplainInputSchema = zod_1.z.object({
    struggle: zod_1.z.string().min(1).max(500),
});
exports.AIExplainResponseSchema = zod_1.z.object({
    guidance: zod_1.z.string(),
    refs: zod_1.z.array(zod_1.z.string()).optional(),
});
