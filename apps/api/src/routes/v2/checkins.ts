import express from 'express';
import { container } from 'tsyringe';
import { authMiddleware } from '@/infrastructure/auth/middleware';
import { validateRequest, validateQuery } from '@/infrastructure/middleware/validation';
import { LogCheckinUseCase } from '@/application/usecases/LogCheckinUseCase';
import { ICheckinRepository } from '@/domain/repositories/ICheckinRepository';
import { UserId } from '@/domain/value-objects/UserId';
import { Result } from '@/shared/result';
import { z } from 'zod';
import {
  ErrorCode,
  createAppError,
  handleExpressError,
  getExpressTraceId,
  createSuccessResponse,
  createRequestLogger
} from '@/shared/errors';

const router = express.Router();

// Validation schemas for v2
const createCheckinSchemaV2 = z.object({
  mood: z.number().min(-2).max(2).optional(),
  intention: z.string().max(500).optional(),
  reflection: z.string().max(1000).optional(),
  gratitude: z.array(z.string().max(200)).max(3).optional(),
  improvements: z.string().max(500).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
});

const getCheckinsSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0)
});

/**
 * @openapi
 * /v2/checkins:
 *   post:
 *     summary: Create or update daily muhasabah (check-in)
 *     description: Submit daily spiritual reflection and self-accountability. Creates new entry or updates existing for the day.
 *     tags: [Check-ins]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               mood:
 *                 type: integer
 *                 minimum: -2
 *                 maximum: 2
 *                 description: Spiritual mood rating (-2=struggling, 0=neutral, 2=blessed)
 *                 example: 1
 *               intention:
 *                 type: string
 *                 maxLength: 500
 *                 description: Daily spiritual intention
 *                 example: "I intend to remember Allah more throughout the day"
 *               reflection:
 *                 type: string
 *                 maxLength: 1000
 *                 description: Evening reflection on spiritual progress
 *                 example: "Today I was more patient with my family and made extra dhikr"
 *               gratitude:
 *                 type: array
 *                 items:
 *                   type: string
 *                   maxLength: 200
 *                 maxItems: 3
 *                 description: Three things to be grateful for
 *                 example: ["Good health", "Family support", "Guidance from Allah"]
 *               improvements:
 *                 type: string
 *                 maxLength: 500
 *                 description: Areas for improvement tomorrow
 *                 example: "Be more consistent with prayer times"
 *               date:
 *                 type: string
 *                 format: date
 *                 description: Date for the check-in (defaults to today)
 *                 example: "2024-01-15"
 *           examples:
 *             complete_checkin:
 *               summary: Complete daily muhasabah
 *               value:
 *                 mood: 1
 *                 intention: "I intend to be more patient today"
 *                 reflection: "Alhamdulillah, I was able to control my temper better"
 *                 gratitude: ["Health", "Family", "Islam"]
 *                 improvements: "Wake up earlier for Fajr"
 *     responses:
 *       200:
 *         description: Check-in created or updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/CheckinDTO'
 *                 streak:
 *                   type: object
 *                   properties:
 *                     current:
 *                       type: integer
 *                       description: Current check-in streak
 *                     longest:
 *                       type: integer
 *                       description: Longest check-in streak
 *                 isUpdate:
 *                   type: boolean
 *                   description: Whether this was an update to existing check-in
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/',
  authMiddleware,
  validateRequest(createCheckinSchemaV2),
  async (req: any, res): Promise<void> => {
    const traceId = getExpressTraceId(req);
    const userId = req.userId;
    const requestLogger = createRequestLogger(traceId, userId);

    try {
      const { mood, intention, reflection, gratitude, improvements, date } = req.body;

      requestLogger.info('Creating/updating daily check-in', {
        hasIntention: !!intention,
        hasReflection: !!reflection,
        hasGratitude: !!gratitude?.length,
        hasImprovements: !!improvements,
        mood,
        date
      });

      // Combine gratitude and improvements into reflection for storage compatibility
      let combinedReflection = reflection || '';

      if (gratitude && gratitude.length > 0) {
        const gratitudeText = gratitude
          .filter((item: string) => item.trim())
          .map((item: string, index: number) => `${index + 1}. ${item}`)
          .join('\n');

        if (gratitudeText) {
          combinedReflection += combinedReflection ? '\n\nGratitude:\n' + gratitudeText : 'Gratitude:\n' + gratitudeText;
        }
      }

      if (improvements && improvements.trim()) {
        combinedReflection += combinedReflection ? '\n\nImprovements:\n' + improvements : 'Improvements:\n' + improvements;
      }

      const logCheckinUseCase = container.resolve(LogCheckinUseCase);
      const result = await logCheckinUseCase.execute({
        userId,
        mood,
        intention,
        reflection: combinedReflection || undefined
      });

      if (Result.isError(result)) {
        const error = createAppError(
          ErrorCode.SERVER_ERROR,
          'Failed to save check-in',
          (result as any).error
        );
        requestLogger.error('Error creating/updating check-in', { result: result }, (result as any).error);
        const { response, status, headers } = handleExpressError(error, traceId);
        res.status(status).set(headers).json(response);
        return;
      }

      // Calculate streak information
      const streakInfo = await calculateCheckinStreak(userId, traceId);

      // Check if this was an update (check if checkin already existed for today)
      const targetDate = date || new Date().toISOString().split('T')[0];
      const isUpdate = await checkIfCheckinExistsForDate(userId, targetDate, traceId);

      const responseData = {
        data: result.value.toDTO(),
        streak: streakInfo,
        isUpdate
      };

      requestLogger.info('Check-in created/updated successfully', {
        isUpdate,
        currentStreak: streakInfo.current,
        longestStreak: streakInfo.longest
      });

      const successResponse = createSuccessResponse(responseData, traceId);
      res.set('X-Trace-Id', traceId).json(successResponse);
    } catch (error) {
      requestLogger.error('Unexpected error in POST /v2/checkins', {}, error as Error);
      const { response, status, headers } = handleExpressError(error, traceId, 'Failed to save check-in');
      res.status(status).set(headers).json(response);
    }
  }
);

/**
 * @openapi
 * /v2/checkins:
 *   get:
 *     summary: Get user's check-ins with filtering
 *     description: Retrieve check-ins with optional date range filtering and pagination
 *     tags: [Check-ins]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: from
 *         in: query
 *         description: Start date filter (YYYY-MM-DD)
 *         schema:
 *           type: string
 *           format: date
 *         example: "2024-01-01"
 *       - name: to
 *         in: query
 *         description: End date filter (YYYY-MM-DD)
 *         schema:
 *           type: string
 *           format: date
 *         example: "2024-01-31"
 *       - name: limit
 *         in: query
 *         description: Maximum number of check-ins to return
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *       - name: offset
 *         in: query
 *         description: Number of check-ins to skip
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *     responses:
 *       200:
 *         description: Check-ins retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/CheckinDTO'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     offset:
 *                       type: integer
 *                 streak:
 *                   type: object
 *                   properties:
 *                     current:
 *                       type: integer
 *                     longest:
 *                       type: integer
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/',
  authMiddleware,
  validateQuery(getCheckinsSchema),
  async (req: any, res): Promise<void> => {
    const traceId = getExpressTraceId(req);
    const userId = req.userId;
    const requestLogger = createRequestLogger(traceId, userId);

    try {
      const { from, to, limit, offset } = req.query;

      requestLogger.info('Retrieving check-ins', {
        from,
        to,
        limit,
        offset
      });

      // Get check-ins using repository pattern
      const checkins = await getCheckinsForUser(userId, { from, to, limit, offset }, traceId);
      const streakInfo = await calculateCheckinStreak(userId, traceId);
      const total = await getCheckinsCount(userId, { from, to }, traceId);

      const responseData = {
        data: checkins.map(checkin => checkin.toDTO()),
        pagination: {
          total,
          limit,
          offset
        },
        streak: streakInfo
      };

      requestLogger.info('Check-ins retrieved successfully', {
        count: checkins.length,
        total,
        currentStreak: streakInfo.current,
        longestStreak: streakInfo.longest
      });

      const successResponse = createSuccessResponse(responseData, traceId);
      res.set('X-Trace-Id', traceId).json(successResponse);
    } catch (error) {
      requestLogger.error('Unexpected error in GET /v2/checkins', {}, error as Error);
      const { response, status, headers } = handleExpressError(error, traceId, 'Failed to retrieve check-ins');
      res.status(status).set(headers).json(response);
    }
  }
);

/**
 * @openapi
 * /v2/checkins/today:
 *   get:
 *     summary: Get today's check-in
 *     description: Retrieve the check-in for today, if it exists
 *     tags: [Check-ins]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Today's check-in retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   oneOf:
 *                     - $ref: '#/components/schemas/CheckinDTO'
 *                     - type: null
 *                 hasCheckedIn:
 *                   type: boolean
 *                   description: Whether user has checked in today
 *                 streak:
 *                   type: object
 *                   properties:
 *                     current:
 *                       type: integer
 *                     longest:
 *                       type: integer
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/today',
  authMiddleware,
  async (req: any, res): Promise<void> => {
    const traceId = getExpressTraceId(req);
    const userId = req.userId;
    const requestLogger = createRequestLogger(traceId, userId);

    try {
      requestLogger.info('Getting today\'s check-in');

      const logCheckinUseCase = container.resolve(LogCheckinUseCase);
      const result = await logCheckinUseCase.getToday(userId);

      if (Result.isError(result)) {
        const error = createAppError(
          ErrorCode.SERVER_ERROR,
          'Failed to retrieve today\'s check-in',
          (result as any).error
        );
        requestLogger.error('Error getting today\'s check-in', { result: result }, (result as any).error);
        const { response, status, headers } = handleExpressError(error, traceId);
        res.status(status).set(headers).json(response);
        return;
      }

      const streakInfo = await calculateCheckinStreak(userId, traceId);

      const responseData = {
        data: result.value ? result.value.toDTO() : null,
        hasCheckedIn: !!result.value,
        streak: streakInfo
      };

      requestLogger.info('Today\'s check-in retrieved successfully', {
        hasCheckedIn: !!result.value,
        currentStreak: streakInfo.current,
        longestStreak: streakInfo.longest
      });

      const successResponse = createSuccessResponse(responseData, traceId);
      res.set('X-Trace-Id', traceId).json(successResponse);
    } catch (error) {
      requestLogger.error('Unexpected error in GET /v2/checkins/today', {}, error as Error);
      const { response, status, headers } = handleExpressError(error, traceId, 'Failed to retrieve today\'s check-in');
      res.status(status).set(headers).json(response);
    }
  }
);

/**
 * @openapi
 * /v2/checkins/streak:
 *   get:
 *     summary: Get check-in streak information
 *     description: Get current and longest check-in streaks
 *     tags: [Check-ins]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Streak information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 current:
 *                   type: integer
 *                   description: Current consecutive days checked in
 *                 longest:
 *                   type: integer
 *                   description: Longest streak achieved
 *                 lastCheckinDate:
 *                   type: string
 *                   format: date
 *                   description: Date of last check-in
 *                 totalCheckins:
 *                   type: integer
 *                   description: Total number of check-ins
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/streak',
  authMiddleware,
  async (req: any, res): Promise<void> => {
    const traceId = getExpressTraceId(req);
    const userId = req.userId;
    const requestLogger = createRequestLogger(traceId, userId);

    try {
      requestLogger.info('Getting check-in streak information');

      const streakInfo = await calculateCheckinStreak(userId, traceId);
      const totalCheckins = await getCheckinsCount(userId, {}, traceId);
      const lastCheckin = await getLastCheckin(userId, traceId);

      const responseData = {
        ...streakInfo,
        lastCheckinDate: lastCheckin?.date || null,
        totalCheckins
      };

      requestLogger.info('Streak information retrieved successfully', {
        currentStreak: streakInfo.current,
        longestStreak: streakInfo.longest,
        totalCheckins,
        hasLastCheckin: !!lastCheckin
      });

      const successResponse = createSuccessResponse(responseData, traceId);
      res.set('X-Trace-Id', traceId).json(successResponse);
    } catch (error) {
      requestLogger.error('Unexpected error in GET /v2/checkins/streak', {}, error as Error);
      const { response, status, headers } = handleExpressError(error, traceId, 'Failed to retrieve streak information');
      res.status(status).set(headers).json(response);
    }
  }
);

// Helper functions

async function calculateCheckinStreak(userId: string, traceId?: string): Promise<{ current: number; longest: number }> {
  const requestLogger = createRequestLogger(traceId || 'no-trace', userId);
  try {
    const checkinRepo = container.resolve<ICheckinRepository>('ICheckinRepository');
    const result = await checkinRepo.findAllByUser(new UserId(userId));

    if (!result.ok || result.value.length === 0) {
      return { current: 0, longest: 0 };
    }

    const checkins = result.value;

    // Sort by date descending
    const sortedCheckins = checkins.sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // Calculate current streak (from today backwards)
    let currentStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let checkDate = new Date(today);
    for (const checkin of sortedCheckins) {
      const checkinDate = new Date(checkin.date);
      checkinDate.setHours(0, 0, 0, 0);

      if (checkinDate.getTime() === checkDate.getTime()) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (checkinDate.getTime() < checkDate.getTime()) {
        break;
      }
    }

    // Calculate longest streak
    let longestStreak = 0;
    let tempStreak = 0;
    let previousDate: Date | null = null;

    // Sort by date ascending for longest streak calculation
    const ascendingCheckins = [...checkins].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    for (const checkin of ascendingCheckins) {
      const checkinDate = new Date(checkin.date);
      checkinDate.setHours(0, 0, 0, 0);

      if (previousDate === null) {
        tempStreak = 1;
      } else {
        const dayDiff = Math.floor((checkinDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24));

        if (dayDiff === 1) {
          tempStreak++;
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
      }

      previousDate = checkinDate;
    }

    longestStreak = Math.max(longestStreak, tempStreak);

    return { current: currentStreak, longest: longestStreak };
  } catch (error) {
    requestLogger.error('Error calculating check-in streak', {}, error as Error);
    return { current: 0, longest: 0 };
  }
}

async function checkIfCheckinExistsForDate(userId: string, date: string, traceId?: string): Promise<boolean> {
  const requestLogger = createRequestLogger(traceId || 'no-trace', userId);
  try {
    const checkinRepo = container.resolve<ICheckinRepository>('ICheckinRepository');
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    const result = await checkinRepo.findByUserAndDate(new UserId(userId), targetDate);
    return result.ok && result.value !== null;
  } catch (error) {
    requestLogger.error('Error checking if checkin exists for date', { date }, error as Error);
    return false;
  }
}

async function getCheckinsForUser(userId: string, filters: any, traceId?: string): Promise<any[]> {
  const requestLogger = createRequestLogger(traceId || 'no-trace', userId);
  try {
    const checkinRepo = container.resolve<ICheckinRepository>('ICheckinRepository');

    const result = await checkinRepo.findByUser(new UserId(userId), {
      from: filters.from ? new Date(filters.from) : undefined,
      to: filters.to ? new Date(filters.to) : undefined,
      limit: filters.limit,
      offset: filters.offset
    });

    return result.ok ? result.value : [];
  } catch (error) {
    requestLogger.error('Error getting checkins for user', { filters }, error as Error);
    return [];
  }
}

async function getCheckinsCount(userId: string, filters: any = {}, traceId?: string): Promise<number> {
  const requestLogger = createRequestLogger(traceId || 'no-trace', userId);
  try {
    const checkinRepo = container.resolve<ICheckinRepository>('ICheckinRepository');

    const result = await checkinRepo.countByUser(new UserId(userId), {
      from: filters.from ? new Date(filters.from) : undefined,
      to: filters.to ? new Date(filters.to) : undefined
    });

    return result.ok ? result.value : 0;
  } catch (error) {
    requestLogger.error('Error getting checkins count', { filters }, error as Error);
    return 0;
  }
}

async function getLastCheckin(userId: string, traceId?: string): Promise<any | null> {
  const requestLogger = createRequestLogger(traceId || 'no-trace', userId);
  try {
    const checkinRepo = container.resolve<ICheckinRepository>('ICheckinRepository');

    const result = await checkinRepo.findLatestByUser(new UserId(userId));
    return result.ok ? result.value : null;
  } catch (error) {
    requestLogger.error('Error getting last checkin', {}, error as Error);
    return null;
  }
}

export default router;