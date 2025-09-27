import express from 'express';
import { container } from 'tsyringe';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '@/infrastructure/auth/middleware';
import { validateRequest } from '@/infrastructure/middleware/validation';
import { GetPrayerTimesUseCase } from '@/application/usecases/GetPrayerTimesUseCase';
import { GetPrayerTimesRangeUseCase } from '@/application/usecases/GetPrayerTimesRangeUseCase';
import { Result } from '@/shared/result';
import {
  ErrorCode,
  createAppError,
  handleExpressError,
  getExpressTraceId,
  createSuccessResponse,
  createRequestLogger
} from '@/shared/errors';

const router = express.Router();

// Validation schemas
const getPrayerTimesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  date: z.string().datetime().optional(),
  calculationMethod: z.enum([
    'MuslimWorldLeague',
    'Egyptian',
    'Karachi',
    'UmmAlQura',
    'Dubai',
    'MoonsightingCommittee',
    'NorthAmerica',
    'Kuwait',
    'Qatar',
    'Singapore',
    'Tehran',
    'Turkey'
  ]).optional(),
  timezone: z.string().optional()
});

const getPrayerTimesRangeSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  calculationMethod: z.enum([
    'MuslimWorldLeague',
    'Egyptian',
    'Karachi',
    'UmmAlQura',
    'Dubai',
    'MoonsightingCommittee',
    'NorthAmerica',
    'Kuwait',
    'Qatar',
    'Singapore',
    'Tehran',
    'Turkey'
  ]).optional(),
  timezone: z.string().optional()
});

/**
 * @openapi
 * /v2/prayer-times:
 *   get:
 *     summary: Get prayer times for a specific location and date
 *     description: Calculate and retrieve Islamic prayer times based on geographical location, date, and calculation method
 *     tags: [Prayer Times]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: latitude
 *         in: query
 *         required: true
 *         description: Latitude of the location (-90 to 90)
 *         schema:
 *           type: number
 *           minimum: -90
 *           maximum: 90
 *           example: 24.7136
 *       - name: longitude
 *         in: query
 *         required: true
 *         description: Longitude of the location (-180 to 180)
 *         schema:
 *           type: number
 *           minimum: -180
 *           maximum: 180
 *           example: 46.6753
 *       - name: date
 *         in: query
 *         required: false
 *         description: Date for prayer times (ISO format). Defaults to current date.
 *         schema:
 *           type: string
 *           format: date-time
 *           example: "2024-01-15T00:00:00Z"
 *       - name: calculationMethod
 *         in: query
 *         required: false
 *         description: Islamic calculation method for prayer times
 *         schema:
 *           type: string
 *           enum: [MuslimWorldLeague, Egyptian, Karachi, UmmAlQura, Dubai, MoonsightingCommittee, NorthAmerica, Kuwait, Qatar, Singapore, Tehran, Turkey]
 *           default: MuslimWorldLeague
 *       - name: timezone
 *         in: query
 *         required: false
 *         description: Timezone for displaying local times (e.g., 'Asia/Riyadh')
 *         schema:
 *           type: string
 *           example: "Asia/Riyadh"
 *     responses:
 *       200:
 *         description: Prayer times retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     prayerTimes:
 *                       $ref: '#/components/schemas/PrayerTimesResponse'
 *                     qiblaDirection:
 *                       type: number
 *                       description: Qibla direction in degrees from North
 *                       example: 244.32
 *             examples:
 *               riyadh_prayer_times:
 *                 summary: Prayer times for Riyadh, Saudi Arabia
 *                 value:
 *                   data:
 *                     prayerTimes:
 *                       id: "abc123"
 *                       date: "2024-01-15T00:00:00.000Z"
 *                       location:
 *                         latitude: 24.7136
 *                         longitude: 46.6753
 *                         city: "Riyadh"
 *                         country: "Saudi Arabia"
 *                         timezone: "Asia/Riyadh"
 *                       calculationMethod: "UmmAlQura"
 *                       prayerTimes:
 *                         fajr:
 *                           time: "2024-01-15T02:45:00.000Z"
 *                           localTime: "05:45 AM"
 *                         dhuhr:
 *                           time: "2024-01-15T09:18:00.000Z"
 *                           localTime: "12:18 PM"
 *                         asr:
 *                           time: "2024-01-15T12:12:00.000Z"
 *                           localTime: "03:12 PM"
 *                         maghrib:
 *                           time: "2024-01-15T14:42:00.000Z"
 *                           localTime: "05:42 PM"
 *                         isha:
 *                           time: "2024-01-15T16:12:00.000Z"
 *                           localTime: "07:12 PM"
 *                       currentPrayer:
 *                         name: "dhuhr"
 *                         time: "2024-01-15T09:18:00.000Z"
 *                         localTime: "12:18 PM"
 *                       nextPrayer:
 *                         name: "asr"
 *                         time: "2024-01-15T12:12:00.000Z"
 *                         localTime: "03:12 PM"
 *                       hijriDate: "6/7/1445 AH"
 *                     qiblaDirection: 244.32
 *       400:
 *         description: Invalid request parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "INVALID_COORDINATES"
 *                 message:
 *                   type: string
 *                   example: "Invalid latitude. Must be between -90 and 90 degrees."
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/',
  authMiddleware,
  validateRequest(getPrayerTimesSchema),
  async (req: AuthRequest, res): Promise<void> => {
    const traceId = getExpressTraceId(req);
    const userId = req.userId!;
    const requestLogger = createRequestLogger(traceId, userId);

    try {
      const {
        latitude,
        longitude,
        date,
        calculationMethod = 'MuslimWorldLeague',
        timezone
      } = req.query as any;

      requestLogger.info('Fetching prayer times', {
        latitude: Number(latitude),
        longitude: Number(longitude),
        calculationMethod,
        timezone,
        hasDate: !!date
      });

      const getPrayerTimesUseCase = container.resolve(GetPrayerTimesUseCase);

      const result = await getPrayerTimesUseCase.execute({
        userId,
        latitude: Number(latitude),
        longitude: Number(longitude),
        date: date ? new Date(date) : undefined,
        calculationMethod,
        timezone
      });

      if (Result.isError(result)) {
        requestLogger.warn('Prayer times calculation failed', {
          error: result.error.message,
          calculationMethod,
          coordinates: `${latitude},${longitude}`
        });

        const errorResponse = handleExpressError(
          createAppError(ErrorCode.BAD_REQUEST, result.error.message),
          traceId,
          'Failed to calculate prayer times'
        );

        res.status(errorResponse.status)
          .set(errorResponse.headers)
          .json(errorResponse.response);
        return;
      }

      const responseData = {
        prayerTimes: result.value.prayerTimes.toDTO(),
        qiblaDirection: Math.round(result.value.qiblaDirection * 100) / 100
      };

      requestLogger.info('Prayer times calculated successfully', {
        calculationMethod,
        qiblaDirection: responseData.qiblaDirection
      });

      const successResponse = createSuccessResponse(responseData, traceId);
      res.set('X-Trace-Id', traceId).json(successResponse);

    } catch (error) {
      requestLogger.error('Unexpected error getting prayer times', { error: (error as Error).message }, error as Error);

      const errorResponse = handleExpressError(
        error,
        traceId,
        'Failed to get prayer times'
      );

      res.status(errorResponse.status)
        .set(errorResponse.headers)
        .json(errorResponse.response);
    }
  }
);

/**
 * @openapi
 * /v2/prayer-times/range:
 *   get:
 *     summary: Get prayer times for a date range
 *     description: Calculate and retrieve Islamic prayer times for multiple days within a specified date range
 *     tags: [Prayer Times]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: latitude
 *         in: query
 *         required: true
 *         description: Latitude of the location (-90 to 90)
 *         schema:
 *           type: number
 *           minimum: -90
 *           maximum: 90
 *       - name: longitude
 *         in: query
 *         required: true
 *         description: Longitude of the location (-180 to 180)
 *         schema:
 *           type: number
 *           minimum: -180
 *           maximum: 180
 *       - name: startDate
 *         in: query
 *         required: true
 *         description: Start date of the range (ISO format)
 *         schema:
 *           type: string
 *           format: date-time
 *       - name: endDate
 *         in: query
 *         required: true
 *         description: End date of the range (ISO format)
 *         schema:
 *           type: string
 *           format: date-time
 *       - name: calculationMethod
 *         in: query
 *         required: false
 *         description: Islamic calculation method for prayer times
 *         schema:
 *           type: string
 *           enum: [MuslimWorldLeague, Egyptian, Karachi, UmmAlQura, Dubai, MoonsightingCommittee, NorthAmerica, Kuwait, Qatar, Singapore, Tehran, Turkey]
 *           default: MuslimWorldLeague
 *       - name: timezone
 *         in: query
 *         required: false
 *         description: Timezone for displaying local times
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Prayer times range retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     prayerTimesList:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/PrayerTimesResponse'
 *                     qiblaDirection:
 *                       type: number
 *                       description: Qibla direction in degrees from North
 *                     totalDays:
 *                       type: integer
 *                       description: Number of days in the response
 *       400:
 *         description: Invalid request parameters or date range too large
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/range',
  authMiddleware,
  validateRequest(getPrayerTimesRangeSchema),
  async (req: AuthRequest, res): Promise<void> => {
    const traceId = getExpressTraceId(req);
    const userId = req.userId!;
    const requestLogger = createRequestLogger(traceId, userId);

    try {
      const {
        latitude,
        longitude,
        startDate,
        endDate,
        calculationMethod = 'MuslimWorldLeague',
        timezone
      } = req.query as any;

      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);
      const daysDiff = Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24));

      requestLogger.info('Fetching prayer times range', {
        latitude: Number(latitude),
        longitude: Number(longitude),
        startDate,
        endDate,
        dayCount: daysDiff,
        calculationMethod,
        timezone
      });

      const getPrayerTimesRangeUseCase = container.resolve(GetPrayerTimesRangeUseCase);

      const result = await getPrayerTimesRangeUseCase.execute({
        userId,
        latitude: Number(latitude),
        longitude: Number(longitude),
        startDate: startDateObj,
        endDate: endDateObj,
        calculationMethod,
        timezone
      });

      if (Result.isError(result)) {
        requestLogger.warn('Prayer times range calculation failed', {
          error: result.error.message,
          calculationMethod,
          coordinates: `${latitude},${longitude}`,
          dateRange: `${startDate} to ${endDate}`
        });

        const errorResponse = handleExpressError(
          createAppError(ErrorCode.BAD_REQUEST, result.error.message),
          traceId,
          'Failed to calculate prayer times range'
        );

        res.status(errorResponse.status)
          .set(errorResponse.headers)
          .json(errorResponse.response);
        return;
      }

      const responseData = {
        prayerTimesList: result.value.prayerTimesList.map(pt => pt.toDTO()),
        qiblaDirection: Math.round(result.value.qiblaDirection * 100) / 100,
        totalDays: result.value.totalDays
      };

      requestLogger.info('Prayer times range calculated successfully', {
        calculationMethod,
        qiblaDirection: responseData.qiblaDirection,
        totalDays: responseData.totalDays
      });

      const successResponse = createSuccessResponse(responseData, traceId);
      res.set('X-Trace-Id', traceId).json(successResponse);

    } catch (error) {
      requestLogger.error('Unexpected error getting prayer times range', { error: (error as Error).message }, error as Error);

      const errorResponse = handleExpressError(
        error,
        traceId,
        'Failed to get prayer times range'
      );

      res.status(errorResponse.status)
        .set(errorResponse.headers)
        .json(errorResponse.response);
    }
  }
);

/**
 * @openapi
 * /v2/prayer-times/methods:
 *   get:
 *     summary: Get available calculation methods
 *     description: Retrieve the list of supported Islamic prayer time calculation methods
 *     tags: [Prayer Times]
 *     responses:
 *       200:
 *         description: Available calculation methods retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     methods:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             description: Method identifier
 *                           name:
 *                             type: string
 *                             description: Human-readable method name
 *                           description:
 *                             type: string
 *                             description: Description of the method
 *                           region:
 *                             type: string
 *                             description: Primary region where this method is used
 *             example:
 *               data:
 *                 methods:
 *                   - id: "MuslimWorldLeague"
 *                     name: "Muslim World League"
 *                     description: "Standard method used by Muslim World League"
 *                     region: "Global"
 *                   - id: "UmmAlQura"
 *                     name: "Umm Al-Qura University, Makkah"
 *                     description: "Method used in Saudi Arabia"
 *                     region: "Saudi Arabia"
 */
router.get('/methods', async (req, res): Promise<void> => {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId);

  try {
    requestLogger.info('Fetching available prayer time calculation methods');

    const methods = [
      {
        id: 'MuslimWorldLeague',
        name: 'Muslim World League',
        description: 'Standard method used by Muslim World League',
        region: 'Global'
      },
      {
        id: 'Egyptian',
        name: 'Egyptian General Authority of Survey',
        description: 'Method used in Egypt',
        region: 'Egypt'
      },
      {
        id: 'Karachi',
        name: 'University of Islamic Sciences, Karachi',
        description: 'Method used in Pakistan, Bangladesh, India, Afghanistan',
        region: 'South Asia'
      },
      {
        id: 'UmmAlQura',
        name: 'Umm Al-Qura University, Makkah',
        description: 'Method used in Saudi Arabia',
        region: 'Saudi Arabia'
      },
      {
        id: 'Dubai',
        name: 'Dubai',
        description: 'Method used in UAE',
        region: 'UAE'
      },
      {
        id: 'MoonsightingCommittee',
        name: 'Moonsighting Committee Worldwide',
        description: 'Method used by Moonsighting Committee Worldwide',
        region: 'Global'
      },
      {
        id: 'NorthAmerica',
        name: 'Islamic Society of North America',
        description: 'Method used in North America',
        region: 'North America'
      },
      {
        id: 'Kuwait',
        name: 'Kuwait',
        description: 'Method used in Kuwait',
        region: 'Kuwait'
      },
      {
        id: 'Qatar',
        name: 'Qatar',
        description: 'Method used in Qatar',
        region: 'Qatar'
      },
      {
        id: 'Singapore',
        name: 'Singapore',
        description: 'Method used in Singapore',
        region: 'Singapore'
      },
      {
        id: 'Tehran',
        name: 'Institute of Geophysics, University of Tehran',
        description: 'Method used in Iran',
        region: 'Iran'
      },
      {
        id: 'Turkey',
        name: 'Turkey',
        description: 'Method used in Turkey',
        region: 'Turkey'
      }
    ];

    const responseData = {
      methods
    };

    requestLogger.info('Prayer time calculation methods retrieved successfully', {
      methodCount: methods.length
    });

    const successResponse = createSuccessResponse(responseData, traceId);
    res.set('X-Trace-Id', traceId).json(successResponse);

  } catch (error) {
    requestLogger.error('Unexpected error getting calculation methods', { error: (error as Error).message }, error as Error);

    const errorResponse = handleExpressError(
      error,
      traceId,
      'Failed to get calculation methods'
    );

    res.status(errorResponse.status)
      .set(errorResponse.headers)
      .json(errorResponse.response);
  }
});

export default router;