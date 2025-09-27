import express from 'express';
import { container } from 'tsyringe';
import { z } from 'zod';
import { AuthRequest } from '@/infrastructure/auth/middleware';
import { IOnboardingRepository } from '@/domain/repositories/IOnboardingRepository';
import { OnboardingEntity, OnboardingStep, ONBOARDING_STEPS, ONBOARDING_FLOW } from '@/domain/entities/Onboarding';
import { UserId } from '@/domain/value-objects/UserId';
import { Result } from '@/shared/result';

const router = express.Router();

// Helper function to get user ID from request
function getUserIdFromRequest(req: AuthRequest): string {
  if (!req.userId) {
    throw new Error('User not authenticated');
  }
  return req.userId;
}

// Validation middleware
function validateRequest(schema: z.ZodSchema) {
  return (req: express.Request, res: express.Response, next: express.NextFunction): void => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation error',
          details: error.errors
        });
        return;
      }
      next(error);
    }
  };
}

// Validation schemas
const OnboardingStepSchema = z.enum([
  'welcome',
  'language',
  'location',
  'prayer-calculation',
  'notifications',
  'privacy',
  'display',
  'profile',
  'complete'
]);

const LocationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  city: z.string().optional(),
  country: z.string().optional()
});

const NotificationSettingsSchema = z.object({
  fajrReminder: z.boolean().optional(),
  dailyReminder: z.boolean().optional(),
  habitStreak: z.boolean().optional(),
  prayerTimes: z.boolean().optional(),
  reminderTime: z.string().regex(/^\d{2}:\d{2}$/).optional()
});

const PrivacySettingsSchema = z.object({
  dataSharing: z.boolean().optional(),
  analytics: z.boolean().optional(),
  publicProfile: z.boolean().optional()
});

const DisplaySettingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'auto']).optional(),
  fontSize: z.enum(['small', 'medium', 'large']).optional(),
  showArabicWithTranslation: z.boolean().optional()
});

const ProfileSchema = z.object({
  displayName: z.string().min(1).optional(),
  timezone: z.string().optional()
});

const CompleteStepSchema = z.object({
  step: OnboardingStepSchema,
  data: z.object({
    language: z.enum(['en', 'ar', 'ur']).optional(),
    location: LocationSchema.optional(),
    prayerCalculationMethod: z.enum(['ISNA', 'MWL', 'Egypt', 'Makkah', 'Karachi', 'Tehran', 'Jafari']).optional(),
    notificationSettings: NotificationSettingsSchema.optional(),
    privacySettings: PrivacySettingsSchema.optional(),
    displaySettings: DisplaySettingsSchema.optional(),
    profile: ProfileSchema.optional(),
    welcomeCompleted: z.boolean().optional()
  }).optional()
});

const SkipStepSchema = z.object({
  step: OnboardingStepSchema
});

const MoveToStepSchema = z.object({
  step: OnboardingStepSchema
});

/**
 * @route GET /api/v2/onboarding
 * @description Get current user's onboarding status and progress
 * @access Private
 */
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const userId = getUserIdFromRequest(req);
    const repository = container.resolve<IOnboardingRepository>('IOnboardingRepository');

    const result = await repository.getByUserId(UserId.fromString(userId));

    if (Result.isError(result)) {
      return res.status(500).json({
        error: 'Failed to fetch onboarding status',
        message: result.error.message
      });
    }

    // If no onboarding record exists, create a new one
    if (!result.value) {
      const newOnboarding = OnboardingEntity.createNew(userId);
      const createResult = await repository.create(newOnboarding);

      if (Result.isError(createResult)) {
        return res.status(500).json({
          error: 'Failed to create onboarding record',
          message: createResult.error.message
        });
      }

      return res.json({
        data: createResult.value.toJSON(),
        progress: createResult.value.getProgress()
      });
    }

    return res.json({
      data: result.value.toJSON(),
      progress: result.value.getProgress()
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * @route GET /api/v2/onboarding/steps
 * @description Get all available onboarding steps with their configuration
 * @access Private
 */
router.get('/steps', async (req: AuthRequest, res, next) => {
  try {
    return res.json({
      steps: ONBOARDING_STEPS,
      flow: ONBOARDING_FLOW
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * @route POST /api/v2/onboarding/complete-step
 * @description Complete an onboarding step with optional data
 * @access Private
 */
router.post('/complete-step', validateRequest(CompleteStepSchema), async (req: AuthRequest, res, next) => {
  try {
    const userId = getUserIdFromRequest(req);
    const { step, data } = req.body;

    const repository = container.resolve<IOnboardingRepository>('IOnboardingRepository');

    const result = await repository.completeStep(UserId.fromString(userId), step, data);

    if (Result.isError(result)) {
      return res.status(500).json({
        error: 'Failed to complete onboarding step',
        message: result.error.message
      });
    }

    return res.json({
      data: result.value.toJSON(),
      progress: result.value.getProgress(),
      message: `Step '${step}' completed successfully`
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * @route POST /api/v2/onboarding/skip-step
 * @description Skip an onboarding step (only allowed for non-required steps)
 * @access Private
 */
router.post('/skip-step', validateRequest(SkipStepSchema), async (req: AuthRequest, res, next) => {
  try {
    const userId = getUserIdFromRequest(req);
    const { step } = req.body;

    // Check if step can be skipped
    const stepConfig = ONBOARDING_STEPS[step as OnboardingStep];
    if (stepConfig?.required) {
      return res.status(400).json({
        error: 'Cannot skip required step',
        message: `Step '${step}' is required and cannot be skipped`
      });
    }

    const repository = container.resolve<IOnboardingRepository>('IOnboardingRepository');

    const result = await repository.skipStep(UserId.fromString(userId), step);

    if (Result.isError(result)) {
      return res.status(500).json({
        error: 'Failed to skip onboarding step',
        message: result.error.message
      });
    }

    return res.json({
      data: result.value.toJSON(),
      progress: result.value.getProgress(),
      message: `Step '${step}' skipped successfully`
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * @route POST /api/v2/onboarding/move-to-step
 * @description Move to a specific onboarding step
 * @access Private
 */
router.post('/move-to-step', validateRequest(MoveToStepSchema), async (req: AuthRequest, res, next) => {
  try {
    const userId = getUserIdFromRequest(req);
    const { step } = req.body;

    const repository = container.resolve<IOnboardingRepository>('IOnboardingRepository');

    const result = await repository.moveToStep(UserId.fromString(userId), step);

    if (Result.isError(result)) {
      return res.status(500).json({
        error: 'Failed to move to onboarding step',
        message: result.error.message
      });
    }

    return res.json({
      data: result.value.toJSON(),
      progress: result.value.getProgress(),
      message: `Moved to step '${step}' successfully`
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * @route POST /api/v2/onboarding/complete
 * @description Mark onboarding as completed
 * @access Private
 */
router.post('/complete', async (req: AuthRequest, res, next) => {
  try {
    const userId = getUserIdFromRequest(req);
    const repository = container.resolve<IOnboardingRepository>('IOnboardingRepository');

    const result = await repository.markCompleted(UserId.fromString(userId));

    if (Result.isError(result)) {
      return res.status(500).json({
        error: 'Failed to complete onboarding',
        message: result.error.message
      });
    }

    return res.json({
      data: result.value.toJSON(),
      progress: result.value.getProgress(),
      message: 'Onboarding completed successfully'
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * @route DELETE /api/v2/onboarding
 * @description Reset onboarding (delete current progress)
 * @access Private
 */
router.delete('/', async (req: AuthRequest, res, next) => {
  try {
    const userId = getUserIdFromRequest(req);
    const repository = container.resolve<IOnboardingRepository>('IOnboardingRepository');

    const result = await repository.delete(UserId.fromString(userId));

    if (Result.isError(result)) {
      // If onboarding doesn't exist, that's fine
      if (result.error.message.includes('not found')) {
        return res.json({
          message: 'Onboarding reset successfully'
        });
      }

      return res.status(500).json({
        error: 'Failed to reset onboarding',
        message: result.error.message
      });
    }

    return res.json({
      message: 'Onboarding reset successfully'
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * @route PATCH /api/v2/onboarding/bulk-update
 * @description Update multiple onboarding fields at once
 * @access Private
 */
router.patch('/bulk-update', async (req: AuthRequest, res, next) => {
  try {
    const userId = getUserIdFromRequest(req);
    const updates = req.body;

    const repository = container.resolve<IOnboardingRepository>('IOnboardingRepository');

    // Get existing onboarding
    const existingResult = await repository.getByUserId(UserId.fromString(userId));
    if (Result.isError(existingResult)) {
      return res.status(500).json({
        error: 'Failed to fetch onboarding',
        message: existingResult.error.message
      });
    }

    let onboarding = existingResult.value;
    if (!onboarding) {
      onboarding = OnboardingEntity.createNew(userId);
    }

    // Apply updates to the entity
    if (updates.currentStep) {
      onboarding.moveToStep(updates.currentStep);
    }

    if (updates.dataCollected) {
      onboarding.dataCollected = { ...onboarding.dataCollected, ...updates.dataCollected };
    }

    if (updates.completedSteps) {
      onboarding.completedSteps = updates.completedSteps;
    }

    if (updates.skippedSteps) {
      onboarding.skippedSteps = updates.skippedSteps;
    }

    // Update flags based on provided data
    if (updates.languageSelected !== undefined) {
      onboarding.languageSelected = updates.languageSelected;
    }

    if (updates.locationSet !== undefined) {
      onboarding.locationSet = updates.locationSet;
    }

    if (updates.prayerCalculationMethodSet !== undefined) {
      onboarding.prayerCalculationMethodSet = updates.prayerCalculationMethodSet;
    }

    if (updates.notificationsConfigured !== undefined) {
      onboarding.notificationsConfigured = updates.notificationsConfigured;
    }

    if (updates.privacyPreferencesSet !== undefined) {
      onboarding.privacyPreferencesSet = updates.privacyPreferencesSet;
    }

    if (updates.displayPreferencesSet !== undefined) {
      onboarding.displayPreferencesSet = updates.displayPreferencesSet;
    }

    onboarding.updatedAt = new Date();

    // Upsert the onboarding record
    const result = await repository.upsert(onboarding);

    if (Result.isError(result)) {
      return res.status(500).json({
        error: 'Failed to update onboarding',
        message: result.error.message
      });
    }

    return res.json({
      data: result.value.toJSON(),
      progress: result.value.getProgress(),
      message: 'Onboarding updated successfully'
    });
  } catch (error) {
    return next(error);
  }
});

export default router;