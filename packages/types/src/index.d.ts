import { z } from 'zod';
export declare const UserSchema: z.ZodObject<{
    id: z.ZodString;
    handle: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id?: string;
    handle?: string;
    createdAt?: string;
}, {
    id?: string;
    handle?: string;
    createdAt?: string;
}>;
export declare const ProfileSchema: z.ZodObject<{
    userId: z.ZodString;
    displayName: z.ZodString;
    timezone: z.ZodString;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    createdAt?: string;
    userId?: string;
    displayName?: string;
    timezone?: string;
}, {
    createdAt?: string;
    userId?: string;
    displayName?: string;
    timezone?: string;
}>;
export declare const ContentTypeEnum: z.ZodEnum<["ayah", "hadith", "dua", "note"]>;
export declare const ContentSnippetSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodEnum<["ayah", "hadith", "dua", "note"]>;
    text: z.ZodString;
    ref: z.ZodString;
    tags: z.ZodArray<z.ZodString, "many">;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type?: "ayah" | "hadith" | "dua" | "note";
    id?: string;
    text?: string;
    createdAt?: string;
    ref?: string;
    tags?: string[];
}, {
    type?: "ayah" | "hadith" | "dua" | "note";
    id?: string;
    text?: string;
    createdAt?: string;
    ref?: string;
    tags?: string[];
}>;
export declare const PlanKindEnum: z.ZodEnum<["takhliyah", "tahliyah"]>;
export declare const PlanStatusEnum: z.ZodEnum<["active", "archived"]>;
export declare const MicroHabitSchema: z.ZodObject<{
    title: z.ZodString;
    schedule: z.ZodString;
    target: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    title?: string;
    target?: number;
    schedule?: string;
}, {
    title?: string;
    target?: number;
    schedule?: string;
}>;
export declare const PlanSchema: z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodString;
    kind: z.ZodEnum<["takhliyah", "tahliyah"]>;
    target: z.ZodString;
    microHabits: z.ZodArray<z.ZodObject<{
        title: z.ZodString;
        schedule: z.ZodString;
        target: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        title?: string;
        target?: number;
        schedule?: string;
    }, {
        title?: string;
        target?: number;
        schedule?: string;
    }>, "many">;
    duaIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    contentIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    status: z.ZodEnum<["active", "archived"]>;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id?: string;
    target?: string;
    status?: "active" | "archived";
    createdAt?: string;
    userId?: string;
    kind?: "takhliyah" | "tahliyah";
    microHabits?: {
        title?: string;
        target?: number;
        schedule?: string;
    }[];
    duaIds?: string[];
    contentIds?: string[];
}, {
    id?: string;
    target?: string;
    status?: "active" | "archived";
    createdAt?: string;
    userId?: string;
    kind?: "takhliyah" | "tahliyah";
    microHabits?: {
        title?: string;
        target?: number;
        schedule?: string;
    }[];
    duaIds?: string[];
    contentIds?: string[];
}>;
export declare const HabitScheduleSchema: z.ZodObject<{
    freq: z.ZodEnum<["daily", "weekly", "custom"]>;
    days: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
}, "strip", z.ZodTypeAny, {
    days?: number[];
    freq?: "custom" | "daily" | "weekly";
}, {
    days?: number[];
    freq?: "custom" | "daily" | "weekly";
}>;
export declare const HabitSchema: z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodString;
    planId: z.ZodString;
    title: z.ZodString;
    schedule: z.ZodObject<{
        freq: z.ZodEnum<["daily", "weekly", "custom"]>;
        days: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
    }, "strip", z.ZodTypeAny, {
        days?: number[];
        freq?: "custom" | "daily" | "weekly";
    }, {
        days?: number[];
        freq?: "custom" | "daily" | "weekly";
    }>;
    streakCount: z.ZodNumber;
    lastCompletedOn: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id?: string;
    title?: string;
    createdAt?: string;
    userId?: string;
    schedule?: {
        days?: number[];
        freq?: "custom" | "daily" | "weekly";
    };
    planId?: string;
    streakCount?: number;
    lastCompletedOn?: string;
}, {
    id?: string;
    title?: string;
    createdAt?: string;
    userId?: string;
    schedule?: {
        days?: number[];
        freq?: "custom" | "daily" | "weekly";
    };
    planId?: string;
    streakCount?: number;
    lastCompletedOn?: string;
}>;
export declare const HabitCompletionSchema: z.ZodObject<{
    id: z.ZodString;
    habitId: z.ZodString;
    userId: z.ZodString;
    completedOn: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id?: string;
    userId?: string;
    habitId?: string;
    completedOn?: string;
}, {
    id?: string;
    userId?: string;
    habitId?: string;
    completedOn?: string;
}>;
export declare const CheckinSchema: z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodString;
    date: z.ZodString;
    mood: z.ZodOptional<z.ZodNumber>;
    intention: z.ZodOptional<z.ZodString>;
    reflection: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id?: string;
    date?: string;
    createdAt?: string;
    userId?: string;
    mood?: number;
    intention?: string;
    reflection?: string;
}, {
    id?: string;
    date?: string;
    createdAt?: string;
    userId?: string;
    mood?: number;
    intention?: string;
    reflection?: string;
}>;
export declare const JournalEntrySchema: z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodString;
    content: z.ZodString;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id?: string;
    content?: string;
    createdAt?: string;
    userId?: string;
    tags?: string[];
}, {
    id?: string;
    content?: string;
    createdAt?: string;
    userId?: string;
    tags?: string[];
}>;
export declare const CreatePlanInputSchema: z.ZodObject<{
    mode: z.ZodEnum<["takhliyah", "tahliyah"]>;
    input: z.ZodString;
}, "strip", z.ZodTypeAny, {
    input?: string;
    mode?: "takhliyah" | "tahliyah";
}, {
    input?: string;
    mode?: "takhliyah" | "tahliyah";
}>;
export declare const SuggestPlanResponseSchema: z.ZodObject<{
    plan: z.ZodObject<{
        id: z.ZodString;
        userId: z.ZodString;
        kind: z.ZodEnum<["takhliyah", "tahliyah"]>;
        target: z.ZodString;
        microHabits: z.ZodArray<z.ZodObject<{
            title: z.ZodString;
            schedule: z.ZodString;
            target: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            title?: string;
            target?: number;
            schedule?: string;
        }, {
            title?: string;
            target?: number;
            schedule?: string;
        }>, "many">;
        duaIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        contentIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        status: z.ZodEnum<["active", "archived"]>;
        createdAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id?: string;
        target?: string;
        status?: "active" | "archived";
        createdAt?: string;
        userId?: string;
        kind?: "takhliyah" | "tahliyah";
        microHabits?: {
            title?: string;
            target?: number;
            schedule?: string;
        }[];
        duaIds?: string[];
        contentIds?: string[];
    }, {
        id?: string;
        target?: string;
        status?: "active" | "archived";
        createdAt?: string;
        userId?: string;
        kind?: "takhliyah" | "tahliyah";
        microHabits?: {
            title?: string;
            target?: number;
            schedule?: string;
        }[];
        duaIds?: string[];
        contentIds?: string[];
    }>;
    suggestions: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodEnum<["ayah", "hadith", "dua", "note"]>;
        text: z.ZodString;
        ref: z.ZodString;
        tags: z.ZodArray<z.ZodString, "many">;
        createdAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type?: "ayah" | "hadith" | "dua" | "note";
        id?: string;
        text?: string;
        createdAt?: string;
        ref?: string;
        tags?: string[];
    }, {
        type?: "ayah" | "hadith" | "dua" | "note";
        id?: string;
        text?: string;
        createdAt?: string;
        ref?: string;
        tags?: string[];
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    plan?: {
        id?: string;
        target?: string;
        status?: "active" | "archived";
        createdAt?: string;
        userId?: string;
        kind?: "takhliyah" | "tahliyah";
        microHabits?: {
            title?: string;
            target?: number;
            schedule?: string;
        }[];
        duaIds?: string[];
        contentIds?: string[];
    };
    suggestions?: {
        type?: "ayah" | "hadith" | "dua" | "note";
        id?: string;
        text?: string;
        createdAt?: string;
        ref?: string;
        tags?: string[];
    }[];
}, {
    plan?: {
        id?: string;
        target?: string;
        status?: "active" | "archived";
        createdAt?: string;
        userId?: string;
        kind?: "takhliyah" | "tahliyah";
        microHabits?: {
            title?: string;
            target?: number;
            schedule?: string;
        }[];
        duaIds?: string[];
        contentIds?: string[];
    };
    suggestions?: {
        type?: "ayah" | "hadith" | "dua" | "note";
        id?: string;
        text?: string;
        createdAt?: string;
        ref?: string;
        tags?: string[];
    }[];
}>;
export declare const CreateCheckinInputSchema: z.ZodObject<{
    mood: z.ZodOptional<z.ZodNumber>;
    intention: z.ZodOptional<z.ZodString>;
    reflection: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    mood?: number;
    intention?: string;
    reflection?: string;
}, {
    mood?: number;
    intention?: string;
    reflection?: string;
}>;
export declare const ToggleHabitInputSchema: z.ZodObject<{
    completed: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    completed?: boolean;
}, {
    completed?: boolean;
}>;
export declare const AIExplainInputSchema: z.ZodObject<{
    struggle: z.ZodString;
}, "strip", z.ZodTypeAny, {
    struggle?: string;
}, {
    struggle?: string;
}>;
export declare const AIExplainResponseSchema: z.ZodObject<{
    guidance: z.ZodString;
    refs: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    guidance?: string;
    refs?: string[];
}, {
    guidance?: string;
    refs?: string[];
}>;
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
