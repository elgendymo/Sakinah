import express from 'express';
import habitsCqrsRoutes from './habits-cqrs';
import checkinsRoutes from './checkins';
import contentRoutes from './content';
import prayerTimesRoutes from './prayer-times';
import intentionsRoutes from './intentions';
import dhikrRoutes from './dhikr';
import userPreferencesRoutes from './user-preferences';
import onboardingRoutes from './onboarding';
import journalRoutes from './journal';
import aiRoutes from './ai';
import plansRoutes from './plans';

const router = express.Router();

// Mount v2 routes
router.use('/habits', habitsCqrsRoutes);
router.use('/checkins', checkinsRoutes);
router.use('/content', contentRoutes);
router.use('/prayer-times', prayerTimesRoutes);
router.use('/intentions', intentionsRoutes);
router.use('/dhikr', dhikrRoutes);
router.use('/users', userPreferencesRoutes);
router.use('/onboarding', onboardingRoutes);
router.use('/journal', journalRoutes);
router.use('/ai', aiRoutes);
router.use('/plans', plansRoutes);

export default router;