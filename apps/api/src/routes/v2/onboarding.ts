import express from 'express';
import { container } from 'tsyringe';
import { z } from 'zod';
import { AuthRequest } from '@/infrastructure/auth/middleware';
import { IOnboardingRepository } from '@/domain/repositories/IOnboardingRepository';
import { OnboardingEntity, OnboardingStep, ONBOARDING_STEPS, ONBOARDING_FLOW } from '@/domain/entities/Onboarding';
import { UserId } from '@/domain/value-objects/UserId';
import { Result } from '@/shared/result';
import {
  ErrorCode,
  createAppError,
  handleExpressError,
  getExpressTraceId,
  createSuccessResponse,
  createRequestLogger
} from '@/shared/errors';
import { validateBody } from '@/infrastructure/middleware/validation';

const router = express.Router();

// Helper function to get user ID from request
function getUserIdFromRequest(req: AuthRequest): string {
  if (!req.userId) {
    throw createAppError(ErrorCode.UNAUTHORIZED, 'User not authenticated');
  }
  return req.userId;
}

// Using centralized validation middleware from @/infrastructure/middleware/validation

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
router.get('/', async (req: AuthRequest, res) => {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId, req.userId);

  try {
    requestLogger.info('Fetching onboarding status');
    const userId = getUserIdFromRequest(req);
    const repository = container.resolve<IOnboardingRepository>('IOnboardingRepository');

    const result = await repository.getByUserId(UserId.fromString(userId));

    if (Result.isError(result)) {
      const { response, status, headers } = handleExpressError(
        createAppError(ErrorCode.DATABASE_ERROR, 'Failed to fetch onboarding status'),
        traceId
      );
      Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));
      return res.status(status).json(response);
    }

    // If no onboarding record exists, create a new one
    if (!result.value) {
      requestLogger.info('Creating new onboarding record');
      const newOnboarding = OnboardingEntity.createNew(userId);
      const createResult = await repository.create(newOnboarding);

      if (Result.isError(createResult)) {
        const { response, status, headers } = handleExpressError(
          createAppError(ErrorCode.DATABASE_ERROR, 'Failed to create onboarding record'),
          traceId
        );
        Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));
        return res.status(status).json(response);
      }

      const successResponse = createSuccessResponse({
        data: createResult.value.toJSON(),
        progress: createResult.value.getProgress()
      }, traceId);
      res.setHeader('X-Trace-Id', traceId);
      requestLogger.info('New onboarding record created successfully');
      return res.json(successResponse);
    }

    const successResponse = createSuccessResponse({
      data: result.value.toJSON(),
      progress: result.value.getProgress()
    }, traceId);
    res.setHeader('X-Trace-Id', traceId);
    requestLogger.info('Onboarding status fetched successfully');
    return res.json(successResponse);
  } catch (error) {
    const { response, status, headers } = handleExpressError(error, traceId);
    Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));
    return res.status(status).json(response);
  }
});

/**
 * @route GET /api/v2/onboarding/steps
 * @description Get all available onboarding steps with their configuration
 * @access Private
 */
router.get('/steps', async (req: AuthRequest, res, next) => {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId, req.userId);

  try {
    requestLogger.info('Fetching onboarding steps configuration');
    const successResponse = createSuccessResponse({
      steps: ONBOARDING_STEPS,
      flow: ONBOARDING_FLOW
    }, traceId);
    res.setHeader('X-Trace-Id', traceId);
    requestLogger.info('Onboarding steps fetched successfully');
    return res.json(successResponse);
  } catch (error) {
    const { response, status, headers } = handleExpressError(error, traceId);
    Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));
    return res.status(status).json(response);
  }
});

/**
 * @route POST /api/v2/onboarding/complete-step
 * @description Complete an onboarding step with optional data
 * @access Private
 */
router.post('/complete-step', validateBody(CompleteStepSchema), async (req: AuthRequest, res, next) => {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId, req.userId);

  try {
    const userId = getUserIdFromRequest(req);
    const { step, data } = req.body;

    requestLogger.info('Completing onboarding step', { step, userId });
    const repository = container.resolve<IOnboardingRepository>('IOnboardingRepository');

    const result = await repository.completeStep(UserId.fromString(userId), step, data);

    if (Result.isError(result)) {
      const { response, status, headers } = handleExpressError(
        createAppError(ErrorCode.DATABASE_ERROR, 'Failed to complete onboarding step'),
        traceId
      );
      Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));
      return res.status(status).json(response);
    }

    const successResponse = createSuccessResponse({
      data: result.value.toJSON(),
      progress: result.value.getProgress(),
      message: `Step '${step}' completed successfully`
    }, traceId);
    res.setHeader('X-Trace-Id', traceId);
    requestLogger.info('Onboarding step completed successfully', { step });
    return res.json(successResponse);
  } catch (error) {
    const { response, status, headers } = handleExpressError(error, traceId);
    Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));
    return res.status(status).json(response);
  }
});

/**
 * @route POST /api/v2/onboarding/skip-step
 * @description Skip an onboarding step (only allowed for non-required steps)
 * @access Private
 */
router.post('/skip-step', validateBody(SkipStepSchema), async (req: AuthRequest, res, next) => {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId, req.userId);

  try {
    const userId = getUserIdFromRequest(req);
    const { step } = req.body;

    requestLogger.info('Attempting to skip onboarding step', { step, userId });

    // Check if step can be skipped
    const stepConfig = ONBOARDING_STEPS[step as OnboardingStep];
    if (stepConfig?.required) {
      const { response, status, headers } = handleExpressError(
        createAppError(ErrorCode.BAD_REQUEST, `Step '${step}' is required and cannot be skipped`),
        traceId
      );
      Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));
      return res.status(status).json(response);
    }

    const repository = container.resolve<IOnboardingRepository>('IOnboardingRepository');

    const result = await repository.skipStep(UserId.fromString(userId), step);

    if (Result.isError(result)) {
      const { response, status, headers } = handleExpressError(
        createAppError(ErrorCode.DATABASE_ERROR, 'Failed to skip onboarding step'),
        traceId
      );
      Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));
      return res.status(status).json(response);
    }

    const successResponse = createSuccessResponse({
      data: result.value.toJSON(),
      progress: result.value.getProgress(),
      message: `Step '${step}' skipped successfully`
    }, traceId);
    res.setHeader('X-Trace-Id', traceId);
    requestLogger.info('Onboarding step skipped successfully', { step });
    return res.json(successResponse);
  } catch (error) {
    const { response, status, headers } = handleExpressError(error, traceId);
    Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));
    return res.status(status).json(response);
  }
});

/**
 * @route POST /api/v2/onboarding/move-to-step
 * @description Move to a specific onboarding step
 * @access Private
 */
router.post('/move-to-step', validateBody(MoveToStepSchema), async (req: AuthRequest, res, next) => {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId, req.userId);

  try {
    const userId = getUserIdFromRequest(req);
    const { step } = req.body;

    requestLogger.info('Moving to onboarding step', { step, userId });
    const repository = container.resolve<IOnboardingRepository>('IOnboardingRepository');

    const result = await repository.moveToStep(UserId.fromString(userId), step);

    if (Result.isError(result)) {
      const { response, status, headers } = handleExpressError(
        createAppError(ErrorCode.DATABASE_ERROR, 'Failed to move to onboarding step'),
        traceId
      );
      Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));
      return res.status(status).json(response);
    }

    const successResponse = createSuccessResponse({
      data: result.value.toJSON(),
      progress: result.value.getProgress(),
      message: `Moved to step '${step}' successfully`
    }, traceId);
    res.setHeader('X-Trace-Id', traceId);
    requestLogger.info('Moved to onboarding step successfully', { step });
    return res.json(successResponse);
  } catch (error) {
    const { response, status, headers } = handleExpressError(error, traceId);
    Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));
    return res.status(status).json(response);
  }
});

/**
 * @route POST /api/v2/onboarding/complete
 * @description Mark onboarding as completed
 * @access Private
 */
router.post('/complete', async (req: AuthRequest, res, next) => {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId, req.userId);

  try {
    const userId = getUserIdFromRequest(req);
    requestLogger.info('Completing onboarding', { userId });
    const repository = container.resolve<IOnboardingRepository>('IOnboardingRepository');

    const result = await repository.markCompleted(UserId.fromString(userId));

    if (Result.isError(result)) {
      const { response, status, headers } = handleExpressError(
        createAppError(ErrorCode.DATABASE_ERROR, 'Failed to complete onboarding'),
        traceId
      );
      Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));
      return res.status(status).json(response);
    }

    const successResponse = createSuccessResponse({
      data: result.value.toJSON(),
      progress: result.value.getProgress(),
      message: 'Onboarding completed successfully'
    }, traceId);
    res.setHeader('X-Trace-Id', traceId);
    requestLogger.info('Onboarding completed successfully');
    return res.json(successResponse);
  } catch (error) {
    const { response, status, headers } = handleExpressError(error, traceId);
    Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));
    return res.status(status).json(response);
  }
});

/**
 * @route DELETE /api/v2/onboarding
 * @description Reset onboarding (delete current progress)
 * @access Private
 */
router.delete('/', async (req: AuthRequest, res, next) => {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId, req.userId);

  try {
    const userId = getUserIdFromRequest(req);
    requestLogger.info('Resetting onboarding', { userId });
    const repository = container.resolve<IOnboardingRepository>('IOnboardingRepository');

    const result = await repository.delete(UserId.fromString(userId));

    if (Result.isError(result)) {
      // If onboarding doesn't exist, that's fine
      if (result.error.message.includes('not found')) {
        const successResponse = createSuccessResponse({
          message: 'Onboarding reset successfully'
        }, traceId);
        res.setHeader('X-Trace-Id', traceId);
        requestLogger.info('Onboarding reset (no existing record)');
        return res.json(successResponse);
      }

      const { response, status, headers } = handleExpressError(
        createAppError(ErrorCode.DATABASE_ERROR, 'Failed to reset onboarding'),
        traceId
      );
      Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));
      return res.status(status).json(response);
    }

    const successResponse = createSuccessResponse({
      message: 'Onboarding reset successfully'
    }, traceId);
    res.setHeader('X-Trace-Id', traceId);
    requestLogger.info('Onboarding reset successfully');
    return res.json(successResponse);
  } catch (error) {
    const { response, status, headers } = handleExpressError(error, traceId);
    Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));
    return res.status(status).json(response);
  }
});

/**
 * @route PATCH /api/v2/onboarding/bulk-update
 * @description Update multiple onboarding fields at once
 * @access Private
 */
router.patch('/bulk-update', async (req: AuthRequest, res, next) => {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId, req.userId);

  try {
    const userId = getUserIdFromRequest(req);
    const updates = req.body;

    requestLogger.info('Bulk updating onboarding', { userId, updateFields: Object.keys(updates) });
    const repository = container.resolve<IOnboardingRepository>('IOnboardingRepository');

    // Get existing onboarding
    const existingResult = await repository.getByUserId(UserId.fromString(userId));
    if (Result.isError(existingResult)) {
      const { response, status, headers } = handleExpressError(
        createAppError(ErrorCode.DATABASE_ERROR, 'Failed to fetch onboarding'),
        traceId
      );
      Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));
      return res.status(status).json(response);
    }

    let onboarding = existingResult.value;
    if (!onboarding) {
      requestLogger.info('Creating new onboarding record for bulk update');
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
      const { response, status, headers } = handleExpressError(
        createAppError(ErrorCode.DATABASE_ERROR, 'Failed to update onboarding'),
        traceId
      );
      Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));
      return res.status(status).json(response);
    }

    const successResponse = createSuccessResponse({
      data: result.value.toJSON(),
      progress: result.value.getProgress(),
      message: 'Onboarding updated successfully'
    }, traceId);
    res.setHeader('X-Trace-Id', traceId);
    requestLogger.info('Onboarding bulk update completed successfully');
    return res.json(successResponse);
  } catch (error) {
    const { response, status, headers } = handleExpressError(error, traceId);
    Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));
    return res.status(status).json(response);
  }
});

export default router;