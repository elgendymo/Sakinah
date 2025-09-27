import express from 'express';
import { container } from '@/infrastructure/di/container';
import { SQLiteEventStore } from '@/infrastructure/events/SQLiteEventStore';
import { EventProjectionManager } from '@/infrastructure/events/EventProjectionManager';
import { HabitAnalyticsProjection } from '@/infrastructure/events/projections/HabitAnalyticsProjection';
import { EventSourcedEventBus } from '@/infrastructure/events/EventSourcedEventBus';
import { authMiddleware, AuthRequest } from '@/infrastructure/auth/middleware';
import {
  ErrorCode,
  createAppError,
  handleExpressError,
  getExpressTraceId,
  createSuccessResponse,
  createRequestLogger
} from '@/shared/errors';

const router = express.Router();

// Middleware
router.use(authMiddleware);

/**
 * @swagger
 * /api/events/health:
 *   get:
 *     tags: [Event Store]
 *     summary: Get event store health status
 *     description: Returns health metrics for the event sourcing system
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Event store health information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isHealthy:
 *                   type: boolean
 *                 eventCount:
 *                   type: number
 *                 streamCount:
 *                   type: number
 *                 oldestEvent:
 *                   type: string
 *                   format: date-time
 *                 newestEvent:
 *                   type: string
 *                   format: date-time
 *                 lastCheckTime:
 *                   type: string
 *                   format: date-time
 */
router.get('/health', async (req, res): Promise<void> => {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId);

  try {
    requestLogger.info('Getting event store health');

    const eventStore = container.resolve<SQLiteEventStore>('IEventStore');
    const health = await eventStore.getHealthStatus();

    requestLogger.info('Event store health retrieved successfully', {
      isHealthy: health.isHealthy,
      eventCount: health.eventCount
    });

    const response = createSuccessResponse(health, traceId);
    res.json(response);
  } catch (error) {
    requestLogger.error('Failed to get event store health', {
      error: error instanceof Error ? error.message : String(error),
      operation: 'get_event_store_health'
    }, error instanceof Error ? error : undefined);

    const errorResponse = handleExpressError(
      createAppError(ErrorCode.SERVER_ERROR, 'Failed to get event store health'),
      traceId
    );
    res.status(errorResponse.status).set(errorResponse.headers).json(errorResponse.response);
  }
});

/**
 * @swagger
 * /api/events/projections/status:
 *   get:
 *     tags: [Event Store]
 *     summary: Get event projections status
 *     description: Returns status of all event projections
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Projection status information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isRunning:
 *                   type: boolean
 *                 registeredProjections:
 *                   type: number
 *                 activeProjections:
 *                   type: number
 *                 totalEventsProcessed:
 *                   type: number
 */
router.get('/projections/status', async (req, res): Promise<void> => {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId);

  try {
    requestLogger.info('Getting projection status');

    const projectionManager = container.resolve<EventProjectionManager>('IEventProjectionStore');
    const status = await projectionManager.getProjectionStatus();

    requestLogger.info('Projection status retrieved successfully', {
      isRunning: status.isRunning,
      registeredProjections: status.registeredProjections
    });

    const response = createSuccessResponse(status, traceId);
    res.json(response);
  } catch (error) {
    requestLogger.error('Failed to get projection status', {
      error: error instanceof Error ? error.message : String(error),
      operation: 'get_projection_status'
    }, error instanceof Error ? error : undefined);

    const errorResponse = handleExpressError(
      createAppError(ErrorCode.SERVER_ERROR, 'Failed to get projection status'),
      traceId
    );
    res.status(errorResponse.status).set(errorResponse.headers).json(errorResponse.response);
  }
});

/**
 * @swagger
 * /api/events/projections:
 *   get:
 *     tags: [Event Store]
 *     summary: Get all projection states
 *     description: Returns detailed state information for all event projections
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of projection states
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   projectionName:
 *                     type: string
 *                   lastProcessedEventNumber:
 *                     type: number
 *                   lastProcessedAt:
 *                     type: string
 *                     format: date-time
 *                   isRunning:
 *                     type: boolean
 *                   errorCount:
 *                     type: number
 *                   lastError:
 *                     type: string
 *                     nullable: true
 */
router.get('/projections', async (req, res): Promise<void> => {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId);

  try {
    requestLogger.info('Getting all projections');

    const projectionManager = container.resolve<EventProjectionManager>('IEventProjectionStore');
    const projections = await projectionManager.getAllProjections();

    requestLogger.info('Projections retrieved successfully', {
      projectionsCount: projections.length
    });

    const response = createSuccessResponse(projections, traceId);
    res.json(response);
  } catch (error) {
    requestLogger.error('Failed to get projections', {
      error: error instanceof Error ? error.message : String(error),
      operation: 'get_all_projections'
    }, error instanceof Error ? error : undefined);

    const errorResponse = handleExpressError(
      createAppError(ErrorCode.SERVER_ERROR, 'Failed to get projections'),
      traceId
    );
    res.status(errorResponse.status).set(errorResponse.headers).json(errorResponse.response);
  }
});

/**
 * @swagger
 * /api/events/projections/{projectionName}/reset:
 *   post:
 *     tags: [Event Store]
 *     summary: Reset a projection
 *     description: Resets a projection to replay all events from the beginning
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectionName
 *         required: true
 *         schema:
 *           type: string
 *         description: Name of the projection to reset
 *     responses:
 *       200:
 *         description: Projection reset successfully
 *       404:
 *         description: Projection not found
 */
router.post('/projections/:projectionName/reset', async (req, res): Promise<void> => {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId);
  const { projectionName } = req.params;

  try {
    requestLogger.info('Resetting projection', { projectionName });

    const projectionManager = container.resolve<EventProjectionManager>('IEventProjectionStore');

    await projectionManager.resetProjection(projectionName);

    requestLogger.info('Projection reset successfully', { projectionName });

    const response = createSuccessResponse(
      { message: `Projection ${projectionName} reset successfully` },
      traceId
    );
    res.json(response);
  } catch (error) {
    requestLogger.error('Failed to reset projection', {
      error: error instanceof Error ? error.message : String(error),
      projectionName,
      operation: 'reset_projection'
    }, error instanceof Error ? error : undefined);

    let errorCode = ErrorCode.SERVER_ERROR;
    let errorMessage = 'Failed to reset projection';

    if (error instanceof Error && error.message.includes('not found')) {
      errorCode = ErrorCode.NOT_FOUND;
      errorMessage = error.message;
    }

    const errorResponse = handleExpressError(
      createAppError(errorCode, errorMessage),
      traceId
    );
    res.status(errorResponse.status).set(errorResponse.headers).json(errorResponse.response);
  }
});

/**
 * @swagger
 * /api/events/user-events:
 *   get:
 *     tags: [Event Store]
 *     summary: Get events for current user
 *     description: Returns audit trail of events for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for event retrieval
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for event retrieval
 *       - in: query
 *         name: eventType
 *         schema:
 *           type: string
 *         description: Filter by specific event type
 *     responses:
 *       200:
 *         description: List of user events
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   eventType:
 *                     type: string
 *                   eventData:
 *                     type: object
 *                   occurredAt:
 *                     type: string
 *                     format: date-time
 */
router.get('/user-events', async (req: AuthRequest, res): Promise<void> => {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId, req.userId);

  try {
    const userId = req.userId;
    if (!userId) {
      requestLogger.error('Missing user ID in authenticated request', {
        operation: 'get_user_events'
      });

      const errorResponse = handleExpressError(
        createAppError(ErrorCode.UNAUTHORIZED, 'User ID not found'),
        traceId
      );
      res.status(errorResponse.status).set(errorResponse.headers).json(errorResponse.response);
      return;
    }

    const { fromDate, toDate, eventType } = req.query;

    requestLogger.info('Getting user events', {
      hasFromDate: !!fromDate,
      hasToDate: !!toDate,
      eventType: eventType as string
    });

    const eventStore = container.resolve<SQLiteEventStore>('IEventStore');

    let events;

    if (eventType) {
      events = await eventStore.readEventsByType(
        eventType as string,
        fromDate ? new Date(fromDate as string) : undefined,
        toDate ? new Date(toDate as string) : undefined
      );
      // Filter by user ID after fetching
      events = events.filter(event => event.metadata.userId === userId);
    } else {
      events = await eventStore.readEventsByUserId(
        userId,
        fromDate ? new Date(fromDate as string) : undefined,
        toDate ? new Date(toDate as string) : undefined
      );
    }

    requestLogger.info('User events retrieved successfully', {
      eventsCount: events.length
    });

    const response = createSuccessResponse(events, traceId);
    res.json(response);
  } catch (error) {
    requestLogger.error('Failed to get user events', {
      error: error instanceof Error ? error.message : String(error),
      operation: 'get_user_events'
    }, error instanceof Error ? error : undefined);

    const errorResponse = handleExpressError(
      createAppError(ErrorCode.SERVER_ERROR, 'Failed to get user events'),
      traceId
    );
    res.status(errorResponse.status).set(errorResponse.headers).json(errorResponse.response);
  }
});

/**
 * @swagger
 * /api/events/analytics/habits:
 *   get:
 *     tags: [Event Store]
 *     summary: Get habit analytics for current user
 *     description: Returns spiritual habit analytics derived from event projections
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: habitId
 *         schema:
 *           type: string
 *         description: Filter by specific habit ID
 *     responses:
 *       200:
 *         description: Habit analytics data
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   habitId:
 *                     type: string
 *                   habitTitle:
 *                     type: string
 *                   totalCompletions:
 *                     type: number
 *                   currentStreak:
 *                     type: number
 *                   longestStreak:
 *                     type: number
 *                   completionRate:
 *                     type: number
 *                   lastCompletedAt:
 *                     type: string
 *                     format: date-time
 *                     nullable: true
 */
router.get('/analytics/habits', async (req: AuthRequest, res): Promise<void> => {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId, req.userId);

  try {
    const userId = req.userId;
    if (!userId) {
      requestLogger.error('Missing user ID in authenticated request', {
        operation: 'get_habit_analytics'
      });

      const errorResponse = handleExpressError(
        createAppError(ErrorCode.UNAUTHORIZED, 'User ID not found'),
        traceId
      );
      res.status(errorResponse.status).set(errorResponse.headers).json(errorResponse.response);
      return;
    }

    const { habitId } = req.query;

    requestLogger.info('Getting habit analytics', {
      habitId: habitId as string
    });

    const habitAnalytics = container.resolve<HabitAnalyticsProjection>('HabitAnalyticsProjection');

    const analytics = await habitAnalytics.getHabitAnalytics(
      userId,
      habitId as string | undefined
    );

    requestLogger.info('Habit analytics retrieved successfully', {
      analyticsCount: Array.isArray(analytics) ? analytics.length : 1
    });

    const response = createSuccessResponse(analytics, traceId);
    res.json(response);
  } catch (error) {
    requestLogger.error('Failed to get habit analytics', {
      error: error instanceof Error ? error.message : String(error),
      habitId: req.query.habitId,
      operation: 'get_habit_analytics'
    }, error instanceof Error ? error : undefined);

    const errorResponse = handleExpressError(
      createAppError(ErrorCode.SERVER_ERROR, 'Failed to get habit analytics'),
      traceId
    );
    res.status(errorResponse.status).set(errorResponse.headers).json(errorResponse.response);
  }
});

/**
 * @swagger
 * /api/events/analytics/spiritual-journey:
 *   get:
 *     tags: [Event Store]
 *     summary: Get spiritual journey analytics
 *     description: Returns comprehensive spiritual journey analytics for the current user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Spiritual journey analytics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userId:
 *                   type: string
 *                 totalDaysActive:
 *                   type: number
 *                 longestActiveStreak:
 *                   type: number
 *                 currentActiveStreak:
 *                   type: number
 *                 totalHabitsCreated:
 *                   type: number
 *                 totalCompletions:
 *                   type: number
 *                 milestonesReached:
 *                   type: number
 *                 spiritualGrowthScore:
 *                   type: number
 *                 lastActivityAt:
 *                   type: string
 *                   format: date-time
 */
router.get('/analytics/spiritual-journey', async (req: AuthRequest, res): Promise<void> => {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId, req.userId);

  try {
    const userId = req.userId;
    if (!userId) {
      requestLogger.error('Missing user ID in authenticated request', {
        operation: 'get_spiritual_journey'
      });

      const errorResponse = handleExpressError(
        createAppError(ErrorCode.UNAUTHORIZED, 'User ID not found'),
        traceId
      );
      res.status(errorResponse.status).set(errorResponse.headers).json(errorResponse.response);
      return;
    }

    requestLogger.info('Getting spiritual journey analytics');

    const habitAnalytics = container.resolve<HabitAnalyticsProjection>('HabitAnalyticsProjection');
    const journey = await habitAnalytics.getUserSpiritalJourney(userId);

    if (!journey) {
      requestLogger.error('Spiritual journey not found for user', {
        operation: 'get_spiritual_journey'
      });

      const errorResponse = handleExpressError(
        createAppError(ErrorCode.NOT_FOUND, 'Spiritual journey not found'),
        traceId
      );
      res.status(errorResponse.status).set(errorResponse.headers).json(errorResponse.response);
      return;
    }

    requestLogger.info('Spiritual journey retrieved successfully', {
      totalDaysActive: journey.totalDaysActive,
      currentActiveStreak: journey.currentActiveStreak
    });

    const response = createSuccessResponse(journey, traceId);
    res.json(response);
  } catch (error) {
    requestLogger.error('Failed to get spiritual journey', {
      error: error instanceof Error ? error.message : String(error),
      operation: 'get_spiritual_journey'
    }, error instanceof Error ? error : undefined);

    const errorResponse = handleExpressError(
      createAppError(ErrorCode.SERVER_ERROR, 'Failed to get spiritual journey'),
      traceId
    );
    res.status(errorResponse.status).set(errorResponse.headers).json(errorResponse.response);
  }
});

/**
 * @swagger
 * /api/events/analytics/daily-stats:
 *   get:
 *     tags: [Event Store]
 *     summary: Get daily habit statistics
 *     description: Returns daily habit completion statistics for the current user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for statistics (YYYY-MM-DD)
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for statistics (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Daily habit statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   date:
 *                     type: string
 *                   habitsCompleted:
 *                     type: number
 *                   totalHabits:
 *                     type: number
 *                   completionRate:
 *                     type: number
 *                   spiritualMoments:
 *                     type: number
 */
router.get('/analytics/daily-stats', async (req: AuthRequest, res): Promise<void> => {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId, req.userId);

  try {
    const userId = req.userId;
    if (!userId) {
      requestLogger.error('Missing user ID in authenticated request', {
        operation: 'get_daily_stats'
      });

      const errorResponse = handleExpressError(
        createAppError(ErrorCode.UNAUTHORIZED, 'User ID not found'),
        traceId
      );
      res.status(errorResponse.status).set(errorResponse.headers).json(errorResponse.response);
      return;
    }

    const { fromDate, toDate } = req.query;

    requestLogger.info('Getting daily stats', {
      hasFromDate: !!fromDate,
      hasToDate: !!toDate
    });

    const habitAnalytics = container.resolve<HabitAnalyticsProjection>('HabitAnalyticsProjection');

    const stats = await habitAnalytics.getDailyStats(
      userId,
      fromDate ? new Date(fromDate as string) : undefined,
      toDate ? new Date(toDate as string) : undefined
    );

    requestLogger.info('Daily stats retrieved successfully', {
      statsCount: Array.isArray(stats) ? stats.length : 1
    });

    const response = createSuccessResponse(stats, traceId);
    res.json(response);
  } catch (error) {
    requestLogger.error('Failed to get daily stats', {
      error: error instanceof Error ? error.message : String(error),
      fromDate: req.query.fromDate,
      toDate: req.query.toDate,
      operation: 'get_daily_stats'
    }, error instanceof Error ? error : undefined);

    const errorResponse = handleExpressError(
      createAppError(ErrorCode.SERVER_ERROR, 'Failed to get daily stats'),
      traceId
    );
    res.status(errorResponse.status).set(errorResponse.headers).json(errorResponse.response);
  }
});

/**
 * @swagger
 * /api/events/bus/handlers:
 *   get:
 *     tags: [Event Store]
 *     summary: Get registered event handlers
 *     description: Returns information about registered event handlers in the event bus
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Map of event types to handler counts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties:
 *                 type: number
 */
router.get('/bus/handlers', async (req, res): Promise<void> => {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId);

  try {
    requestLogger.info('Getting event bus handlers');

    const eventBus = container.resolve<EventSourcedEventBus>('IEventBus');
    const handlers = eventBus.getRegisteredHandlers();

    // Convert Map to object for JSON serialization
    const handlersObj = Object.fromEntries(handlers);

    requestLogger.info('Event handlers retrieved successfully', {
      handlerTypes: Object.keys(handlersObj).length
    });

    const response = createSuccessResponse(handlersObj, traceId);
    res.json(response);
  } catch (error) {
    requestLogger.error('Failed to get event handlers', {
      error: error instanceof Error ? error.message : String(error),
      operation: 'get_event_handlers'
    }, error instanceof Error ? error : undefined);

    const errorResponse = handleExpressError(
      createAppError(ErrorCode.SERVER_ERROR, 'Failed to get event handlers'),
      traceId
    );
    res.status(errorResponse.status).set(errorResponse.headers).json(errorResponse.response);
  }
});

export default router;