import { Router } from 'express';
import { correlationIdMiddleware, requestLoggingMiddleware } from '../infrastructure/middleware/observability';

// Latest functionality routes (previously V2)
import habitsRoutes from './v2/habits-cqrs';
import checkinsRoutes from './v2/checkins';
import contentRoutes from './v2/content';
import prayerTimesRoutes from './v2/prayer-times';
import intentionsRoutes from './v2/intentions';
import dhikrRoutes from './v2/dhikr';
import onboardingRoutes from './v2/onboarding';
import syncRoutes from './v2/sync';
import aiRoutes from './v2/ai';
import plansRoutes from './v2/plans';
import journalRoutes from './journal';

// Auth routes
import authRoutes from './auth';

// System routes
import healthRoutes from './health';
import cacheRoutes from './cache';
import eventsRoutes from './events';

const router = Router();

// Apply core middleware
router.use(correlationIdMiddleware);
router.use(requestLoggingMiddleware);

// Auth routes (no authentication required)
router.use('/auth', authRoutes);

// Application routes - using latest functionality without versioning
router.use('/habits', habitsRoutes);
router.use('/plans', plansRoutes);
router.use('/ai', aiRoutes);
router.use('/journal', journalRoutes);
router.use('/checkins', checkinsRoutes);
router.use('/content', contentRoutes);
router.use('/prayer-times', prayerTimesRoutes);
router.use('/intentions', intentionsRoutes);
router.use('/dhikr', dhikrRoutes);
router.use('/onboarding', onboardingRoutes);
router.use('/sync', syncRoutes);

// System routes
router.use('/health', healthRoutes);
router.use('/cache', cacheRoutes);
router.use('/events', eventsRoutes);


export default router;