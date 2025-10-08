import { Router } from 'express';
import { versioningMiddleware } from '@/infrastructure/middleware/versioning';

// V1 Legacy routes
import aiRoutes from './ai';
import habitsRoutes from './habits';
import journalRoutes from './journal';
import plansRoutes from './plans';
import onboardingRoutes from './onboarding';

const router = Router();

// Apply versioning middleware to ensure v1 compatibility
router.use(versioningMiddleware);

// V1 routes
router.use('/ai', aiRoutes);
router.use('/habits', habitsRoutes);
router.use('/journal', journalRoutes);
router.use('/plans', plansRoutes);
router.use('/onboarding', onboardingRoutes);

export default router;