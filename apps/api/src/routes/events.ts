import express from 'express';
import { container } from '@/infrastructure/di/container';
import { SQLiteEventStore } from '@/infrastructure/events/SQLiteEventStore';
import { EventProjectionManager } from '@/infrastructure/events/EventProjectionManager';
import { HabitAnalyticsProjection } from '@/infrastructure/events/projections/HabitAnalyticsProjection';
import { EventSourcedEventBus } from '@/infrastructure/events/EventSourcedEventBus';
import { authMiddleware, AuthRequest } from '@/infrastructure/auth/middleware';
import { logger } from '@/shared/logger';

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
router.get('/health', async (_req, res) => {
  try {
    const eventStore = container.resolve<SQLiteEventStore>('IEventStore');
    const health = await eventStore.getHealthStatus();

    res.json(health);
  } catch (error) {
    logger.error('Failed to get event store health:', error);
    res.status(500).json({ error: 'Failed to get event store health' });
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
router.get('/projections/status', async (_req, res) => {
  try {
    const projectionManager = container.resolve<EventProjectionManager>('IEventProjectionStore');
    const status = await projectionManager.getProjectionStatus();

    res.json(status);
  } catch (error) {
    logger.error('Failed to get projection status:', error);
    res.status(500).json({ error: 'Failed to get projection status' });
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
router.get('/projections', async (_req, res) => {
  try {
    const projectionManager = container.resolve<EventProjectionManager>('IEventProjectionStore');
    const projections = await projectionManager.getAllProjections();

    res.json(projections);
  } catch (error) {
    logger.error('Failed to get projections:', error);
    res.status(500).json({ error: 'Failed to get projections' });
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
  try {
    const { projectionName } = req.params;
    const projectionManager = container.resolve<EventProjectionManager>('IEventProjectionStore');

    await projectionManager.resetProjection(projectionName);

    res.json({ message: `Projection ${projectionName} reset successfully` });
  } catch (error) {
    logger.error(`Failed to reset projection ${req.params.projectionName}:`, error);
    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to reset projection' });
    }
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
router.get('/user-events', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User ID not found' });
    }

    const { fromDate, toDate, eventType } = req.query;
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

    return res.json(events);
  } catch (error) {
    logger.error('Failed to get user events:', error);
    return res.status(500).json({ error: 'Failed to get user events' });
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
router.get('/analytics/habits', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User ID not found' });
    }

    const { habitId } = req.query;
    const habitAnalytics = container.resolve<HabitAnalyticsProjection>('HabitAnalyticsProjection');

    const analytics = await habitAnalytics.getHabitAnalytics(
      userId,
      habitId as string | undefined
    );

    return res.json(analytics);
  } catch (error) {
    logger.error('Failed to get habit analytics:', error);
    return res.status(500).json({ error: 'Failed to get habit analytics' });
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
router.get('/analytics/spiritual-journey', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User ID not found' });
    }

    const habitAnalytics = container.resolve<HabitAnalyticsProjection>('HabitAnalyticsProjection');
    const journey = await habitAnalytics.getUserSpiritalJourney(userId);

    if (!journey) {
      return res.status(404).json({ error: 'Spiritual journey not found' });
    }

    return res.json(journey);
  } catch (error) {
    logger.error('Failed to get spiritual journey:', error);
    return res.status(500).json({ error: 'Failed to get spiritual journey' });
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
router.get('/analytics/daily-stats', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User ID not found' });
    }

    const { fromDate, toDate } = req.query;
    const habitAnalytics = container.resolve<HabitAnalyticsProjection>('HabitAnalyticsProjection');

    const stats = await habitAnalytics.getDailyStats(
      userId,
      fromDate ? new Date(fromDate as string) : undefined,
      toDate ? new Date(toDate as string) : undefined
    );

    return res.json(stats);
  } catch (error) {
    logger.error('Failed to get daily stats:', error);
    return res.status(500).json({ error: 'Failed to get daily stats' });
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
router.get('/bus/handlers', async (_req, res) => {
  try {
    const eventBus = container.resolve<EventSourcedEventBus>('IEventBus');
    const handlers = eventBus.getRegisteredHandlers();

    // Convert Map to object for JSON serialization
    const handlersObj = Object.fromEntries(handlers);

    res.json(handlersObj);
  } catch (error) {
    logger.error('Failed to get event handlers:', error);
    res.status(500).json({ error: 'Failed to get event handlers' });
  }
});

export default router;