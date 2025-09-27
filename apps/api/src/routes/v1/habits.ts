import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '@/infrastructure/auth/middleware';
import { HabitRepository } from '@/infrastructure/repos/HabitRepository';
import { Result } from '@/shared/result';
import {
  ErrorCode,
  createAppError,
  handleExpressError,
  getExpressTraceId,
  createSuccessResponse,
  createRequestLogger
} from '@/shared/errors';
import {
  validateQuery,
  validateBody,
  validateParams
} from '@/infrastructure/middleware/validation';

const router = Router();

// Validation schemas
const getHabitsQuerySchema = z.object({
  includeStats: z.string().optional().default('false'),
  includeHistory: z.string().optional().default('false')
});

const habitIdParamsSchema = z.object({
  id: z.string().min(1, 'Habit ID is required')
});

const completeHabitBodySchema = z.object({
  notes: z.string().optional(),
  date: z.string().optional()
});

const incompleteHabitBodySchema = z.object({
  date: z.string().optional()
});

const analyticsQuerySchema = z.object({
  period: z.string().optional().default('30d')
});

/**
 * @api {get} /api/v1/habits Get user habits with detailed information
 * @apiVersion 1.0.0
 * @apiName GetHabits
 * @apiGroup Habits
 */
router.get('/', authMiddleware, validateQuery(getHabitsQuerySchema), async (req, res): Promise<void> => {
    const traceId = getExpressTraceId(req);
    const requestLogger = createRequestLogger(traceId, (req as any).userId);
    const userId = (req as any).userId;
    const { includeStats, includeHistory } = req.query as z.infer<typeof getHabitsQuerySchema>;

    try {
        const habitRepo = new HabitRepository();
        const habitsResult = await habitRepo.getHabitsByUser(userId);

        if (Result.isError(habitsResult)) {
            requestLogger.error('Error fetching habits v1', { error: habitsResult.error });
            const { response, status, headers } = handleExpressError(
                createAppError(ErrorCode.DATABASE_ERROR, 'Failed to fetch habits'),
                traceId
            );
            res.status(status).set(headers).json(response);
            return;
        }

        const habits = habitsResult.value;

        // Enhance habits with stats and history if requested
        const enhancedHabits = await Promise.all(habits.map(async (habit) => {
            let habitData: any = { ...habit };

            if (includeStats === 'true') {
                const stats = await getHabitStats(habit.id);
                habitData = { ...habitData, stats };
            }

            if (includeHistory === 'true') {
                const history = await getHabitHistory(habit.id);
                habitData = { ...habitData, history };
            }

            return habitData;
        }));

        // v1 enhanced response format
        const responseData = {
            habits: enhancedHabits,
            metadata: {
                total: enhancedHabits.length,
                activeCount: enhancedHabits.filter(h => h.streakCount > 0).length
            }
        };

        requestLogger.info('Habits retrieved successfully', { count: enhancedHabits.length, includeStats: includeStats === 'true', includeHistory: includeHistory === 'true' });
        res.json(createSuccessResponse(responseData, traceId));
    } catch (error) {
        requestLogger.error('Error fetching habits v1', { error: error instanceof Error ? error.message : String(error) }, error instanceof Error ? error : undefined);
        const { response, status, headers } = handleExpressError(error, traceId);
        res.status(status).set(headers).json(response);
    }
});

/**
 * @api {post} /api/v1/habits/:id/complete Complete a habit
 * @apiVersion 1.0.0
 * @apiName CompleteHabit
 * @apiGroup Habits
 */
router.post('/:id/complete', authMiddleware, validateParams(habitIdParamsSchema), validateBody(completeHabitBodySchema), async (req, res): Promise<void> => {
    const traceId = getExpressTraceId(req);
    const requestLogger = createRequestLogger(traceId, (req as any).userId);
    const userId = (req as any).userId;
    const { id } = req.params as z.infer<typeof habitIdParamsSchema>;
    const { notes, date } = req.body as z.infer<typeof completeHabitBodySchema>;

    try {
        const habitRepo = new HabitRepository();

        // Get the habit first to verify ownership
        const habitResult = await habitRepo.getHabit(id, userId);
        if (Result.isError(habitResult)) {
            requestLogger.error('Error fetching habit for completion', { error: habitResult.error, habitId: id });
            const { response, status, headers } = handleExpressError(
                createAppError(ErrorCode.DATABASE_ERROR, 'Failed to fetch habit'),
                traceId
            );
            res.status(status).set(headers).json(response);
            return;
        }

        if (!habitResult.value) {
            requestLogger.warn('Habit not found for completion', { habitId: id });
            const { response, status, headers } = handleExpressError(
                createAppError(ErrorCode.HABIT_NOT_FOUND, 'Habit not found or access denied'),
                traceId
            );
            res.status(status).set(headers).json(response);
            return;
        }

        const habit = habitResult.value;
        const completionDate = date || new Date().toISOString().split('T')[0];

        // Mark as completed
        const markResult = await habitRepo.markCompleted(id, userId, completionDate);
        if (Result.isError(markResult)) {
            requestLogger.error('Error marking habit complete', { error: markResult.error, habitId: id });
            const { response, status, headers } = handleExpressError(
                createAppError(ErrorCode.DATABASE_ERROR, 'Failed to complete habit'),
                traceId
            );
            res.status(status).set(headers).json(response);
            return;
        }

        // Calculate and update streak
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        const isConsecutive = habit.lastCompletedOn === yesterday;
        const newStreakCount = isConsecutive ? habit.streakCount + 1 : 1;

        const streakResult = await habitRepo.updateHabitStreak(id, userId, newStreakCount, completionDate);
        if (Result.isError(streakResult)) {
            requestLogger.warn('Error updating habit streak', { error: streakResult.error, habitId: id });
            // Continue even if streak update fails
        }

        const responseData = {
            habit: {
                id,
                completed: true,
                streakCount: newStreakCount,
                lastCompletedOn: completionDate,
                notes
            },
            events: []
        };

        requestLogger.info('Habit completed successfully', { habitId: id, newStreak: newStreakCount, completionDate });
        res.json(createSuccessResponse(responseData, traceId));
    } catch (error) {
        requestLogger.error('Error completing habit v1', { error: error instanceof Error ? error.message : String(error), habitId: req.params.id }, error instanceof Error ? error : undefined);
        const { response, status, headers } = handleExpressError(error, traceId);
        res.status(status).set(headers).json(response);
    }
});

/**
 * @api {post} /api/v1/habits/:id/incomplete Mark habit as incomplete
 * @apiVersion 1.0.0
 * @apiName IncompleteHabit
 * @apiGroup Habits
 */
router.post('/:id/incomplete', authMiddleware, validateParams(habitIdParamsSchema), validateBody(incompleteHabitBodySchema), async (req, res): Promise<void> => {
    const traceId = getExpressTraceId(req);
    const requestLogger = createRequestLogger(traceId, (req as any).userId);
    const userId = (req as any).userId;
    const { id } = req.params as z.infer<typeof habitIdParamsSchema>;
    const { date } = req.body as z.infer<typeof incompleteHabitBodySchema>;

    try {
        const habitRepo = new HabitRepository();

        // Get the habit first to verify ownership
        const habitResult = await habitRepo.getHabit(id, userId);
        if (Result.isError(habitResult)) {
            requestLogger.error('Error fetching habit for incompletion', { error: habitResult.error, habitId: id });
            const { response, status, headers } = handleExpressError(
                createAppError(ErrorCode.DATABASE_ERROR, 'Failed to fetch habit'),
                traceId
            );
            res.status(status).set(headers).json(response);
            return;
        }

        if (!habitResult.value) {
            requestLogger.warn('Habit not found for incompletion', { habitId: id });
            const { response, status, headers } = handleExpressError(
                createAppError(ErrorCode.HABIT_NOT_FOUND, 'Habit not found or access denied'),
                traceId
            );
            res.status(status).set(headers).json(response);
            return;
        }

        const habit = habitResult.value;
        const incompletionDate = date || new Date().toISOString().split('T')[0];

        // Mark as incomplete
        const unmarkResult = await habitRepo.markIncomplete(id, userId, incompletionDate);
        if (Result.isError(unmarkResult)) {
            requestLogger.error('Error marking habit incomplete', { error: unmarkResult.error, habitId: id });
            const { response, status, headers } = handleExpressError(
                createAppError(ErrorCode.DATABASE_ERROR, 'Failed to mark habit incomplete'),
                traceId
            );
            res.status(status).set(headers).json(response);
            return;
        }

        // Don't reset streak if uncompleting today, only reset if it's a past date
        const today = new Date().toISOString().split('T')[0];
        let newStreakCount = habit.streakCount;

        if (incompletionDate !== today && incompletionDate === habit.lastCompletedOn) {
            // If we're uncompleting the last completed date, recalculate streak
            newStreakCount = 0; // Simple reset for now, could be more sophisticated
            const streakResult = await habitRepo.updateHabitStreak(id, userId, newStreakCount, undefined);
            if (Result.isError(streakResult)) {
                requestLogger.warn('Error updating habit streak', { error: streakResult.error, habitId: id });
                // Continue even if streak update fails
            }
        }

        const responseData = {
            habit: {
                id,
                completed: false,
                streakCount: newStreakCount
            }
        };

        requestLogger.info('Habit marked incomplete successfully', { habitId: id, newStreak: newStreakCount, incompletionDate });
        res.json(createSuccessResponse(responseData, traceId));
    } catch (error) {
        requestLogger.error('Error marking habit incomplete v1', { error: error instanceof Error ? error.message : String(error), habitId: req.params.id }, error instanceof Error ? error : undefined);
        const { response, status, headers } = handleExpressError(error, traceId);
        res.status(status).set(headers).json(response);
    }
});

/**
 * @api {get} /api/v1/habits/:id/analytics Get habit analytics
 * @apiVersion 1.0.0
 * @apiName GetHabitAnalytics
 * @apiGroup Habits
 */
router.get('/:id/analytics', authMiddleware, validateParams(habitIdParamsSchema), validateQuery(analyticsQuerySchema), async (req, res): Promise<void> => {
    const traceId = getExpressTraceId(req);
    const requestLogger = createRequestLogger(traceId, (req as any).userId);
    const userId = (req as any).userId;
    const { id } = req.params as z.infer<typeof habitIdParamsSchema>;
    const { period } = req.query as z.infer<typeof analyticsQuerySchema>;

    try {
        const habitRepo = new HabitRepository();

        // Verify habit ownership
        const habitResult = await habitRepo.getHabit(id, userId);
        if (Result.isError(habitResult)) {
            requestLogger.error('Error fetching habit for analytics', { error: habitResult.error, habitId: id });
            const { response, status, headers } = handleExpressError(
                createAppError(ErrorCode.DATABASE_ERROR, 'Failed to fetch habit'),
                traceId
            );
            res.status(status).set(headers).json(response);
            return;
        }

        if (!habitResult.value) {
            requestLogger.warn('Habit not found for analytics', { habitId: id });
            const { response, status, headers } = handleExpressError(
                createAppError(ErrorCode.HABIT_NOT_FOUND, 'Habit not found or access denied'),
                traceId
            );
            res.status(status).set(headers).json(response);
            return;
        }

        const habit = habitResult.value;

        // Get habit completions
        const completionsResult = await habitRepo.getHabitCompletions(id);
        if (Result.isError(completionsResult)) {
            requestLogger.error('Error fetching habit completions', { error: completionsResult.error, habitId: id });
            const { response, status, headers } = handleExpressError(
                createAppError(ErrorCode.DATABASE_ERROR, 'Failed to fetch habit completions'),
                traceId
            );
            res.status(status).set(headers).json(response);
            return;
        }

        const completions = completionsResult.value;

        // Calculate analytics based on period
        const daysInPeriod = getPeriodDays(period);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysInPeriod);

        const recentCompletions = completions.filter(date =>
            new Date(date) >= startDate
        );

        const completionRate = daysInPeriod > 0 ? recentCompletions.length / daysInPeriod : 0;

        // Calculate longest streak from all completions
        const longestStreak = calculateLongestStreak(completions);

        const analytics = {
            habitId: id,
            period,
            completionRate: Math.round(completionRate * 100) / 100,
            currentStreak: habit.streakCount || 0,
            longestStreak,
            totalCompletions: completions.length,
            recentCompletions: recentCompletions.length,
            consistency: {
                daily: completionRate,
                weekly: calculateWeeklyConsistency(recentCompletions, daysInPeriod),
                monthly: calculateMonthlyConsistency(recentCompletions, daysInPeriod)
            }
        };

        requestLogger.info('Habit analytics retrieved successfully', { habitId: id, period, completionRate: analytics.completionRate });
        res.json(createSuccessResponse({ analytics }, traceId));
    } catch (error) {
        requestLogger.error('Error fetching habit analytics', { error: error instanceof Error ? error.message : String(error), habitId: req.params.id, period }, error instanceof Error ? error : undefined);
        const { response, status, headers } = handleExpressError(error, traceId);
        res.status(status).set(headers).json(response);
    }
});

// Helper functions
async function getHabitStats(habitId: string) {
    const habitRepo = new HabitRepository();
    const completionsResult = await habitRepo.getHabitCompletions(habitId);

    if (Result.isError(completionsResult)) {
        return {
            completionRate: 0,
            averageStreakLength: 0,
            totalCompletions: 0
        };
    }

    const completions = completionsResult.value;
    const last30Days = 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - last30Days);

    const recentCompletions = completions.filter(date =>
        new Date(date) >= startDate
    );

    return {
        completionRate: Math.round((recentCompletions.length / last30Days) * 100) / 100,
        averageStreakLength: calculateAverageStreakLength(completions),
        totalCompletions: completions.length
    };
}

async function getHabitHistory(habitId: string) {
    const habitRepo = new HabitRepository();
    const completionsResult = await habitRepo.getHabitCompletions(habitId);

    if (Result.isError(completionsResult)) {
        return [];
    }

    const completions = completionsResult.value;
    const last7Days = 7;
    const history = [];

    for (let i = 0; i < last7Days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        history.push({
            date: dateStr,
            completed: completions.includes(dateStr)
        });
    }

    return history.reverse(); // Return in chronological order
}

function getPeriodDays(period: string): number {
    switch (period) {
        case '7d': return 7;
        case '30d': return 30;
        case '90d': return 90;
        case '1y': return 365;
        default: return 30;
    }
}

function calculateLongestStreak(completions: string[]): number {
    if (completions.length === 0) return 0;

    const sortedDates = completions.sort();
    let longestStreak = 1;
    let currentStreak = 1;

    for (let i = 1; i < sortedDates.length; i++) {
        const prevDate = new Date(sortedDates[i - 1]);
        const currentDate = new Date(sortedDates[i]);
        const dayDiff = Math.floor((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

        if (dayDiff === 1) {
            currentStreak++;
            longestStreak = Math.max(longestStreak, currentStreak);
        } else {
            currentStreak = 1;
        }
    }

    return longestStreak;
}

function calculateAverageStreakLength(completions: string[]): number {
    if (completions.length === 0) return 0;

    const sortedDates = completions.sort();
    const streaks: number[] = [];
    let currentStreak = 1;

    for (let i = 1; i < sortedDates.length; i++) {
        const prevDate = new Date(sortedDates[i - 1]);
        const currentDate = new Date(sortedDates[i]);
        const dayDiff = Math.floor((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

        if (dayDiff === 1) {
            currentStreak++;
        } else {
            streaks.push(currentStreak);
            currentStreak = 1;
        }
    }
    streaks.push(currentStreak);

    return streaks.length > 0 ? streaks.reduce((a, b) => a + b, 0) / streaks.length : 0;
}

function calculateWeeklyConsistency(completions: string[], totalDays: number): number {
    const weeks = Math.ceil(totalDays / 7);
    if (weeks === 0) return 0;

    // Simple weekly consistency: completions per week
    return Math.round((completions.length / weeks) * 100) / 100;
}

function calculateMonthlyConsistency(completions: string[], totalDays: number): number {
    const months = Math.ceil(totalDays / 30);
    if (months === 0) return 0;

    // Simple monthly consistency: completions per month
    return Math.round((completions.length / months) * 100) / 100;
}

export default router;