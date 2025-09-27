import express from 'express';
import { container } from 'tsyringe';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '@/infrastructure/auth/middleware';
import { validateRequest } from '@/infrastructure/middleware/validation';
import { GetPrayerTimesUseCase } from '@/application/usecases/GetPrayerTimesUseCase';
import { GetPrayerTimesRangeUseCase } from '@/application/usecases/GetPrayerTimesRangeUseCase';
import { CalculationMethod } from '@/domain/value-objects/CalculationMethod';
import { Result } from '@/shared/result';

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
    try {
      const {
        latitude,
        longitude,
        date,
        calculationMethod = 'MuslimWorldLeague',
        timezone
      } = req.query as any;

      const userId = req.userId!;

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
        res.status(400).json({
          error: 'PRAYER_TIMES_CALCULATION_FAILED',
          message: result.error.message
        });
        return;
      }

      res.json({
        data: {
          prayerTimes: result.value.prayerTimes.toDTO(),
          qiblaDirection: Math.round(result.value.qiblaDirection * 100) / 100
        }
      });
    } catch (error) {
      console.error('Error getting prayer times:', error);
      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get prayer times'
      });
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
    try {
      const {
        latitude,
        longitude,
        startDate,
        endDate,
        calculationMethod = 'MuslimWorldLeague',
        timezone
      } = req.query as any;

      const userId = req.userId!;

      const getPrayerTimesRangeUseCase = container.resolve(GetPrayerTimesRangeUseCase);

      const result = await getPrayerTimesRangeUseCase.execute({
        userId,
        latitude: Number(latitude),
        longitude: Number(longitude),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        calculationMethod,
        timezone
      });

      if (Result.isError(result)) {
        res.status(400).json({
          error: 'PRAYER_TIMES_RANGE_FAILED',
          message: result.error.message
        });
        return;
      }

      res.json({
        data: {
          prayerTimesList: result.value.prayerTimesList.map(pt => pt.toDTO()),
          qiblaDirection: Math.round(result.value.qiblaDirection * 100) / 100,
          totalDays: result.value.totalDays
        }
      });
    } catch (error) {
      console.error('Error getting prayer times range:', error);
      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get prayer times range'
      });
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
  try {
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

    res.json({
      data: {
        methods
      }
    });
  } catch (error) {
    console.error('Error getting calculation methods:', error);
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to get calculation methods'
    });
  }
});

export default router;