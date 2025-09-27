import express from 'express';
import { container } from 'tsyringe';
import { AuthRequest } from '@/infrastructure/auth/middleware';
import { validateRequest, validateBody } from '@/infrastructure/middleware/validation';
import { IUserPreferencesRepository } from '@/infrastructure/repos/UserPreferencesRepository';
import { UserPreferencesEntity } from '@/domain/entities/UserPreferences';
import { Result } from '@/shared/result';
import { ErrorCode, createAppError, handleExpressError, getExpressTraceId, createSuccessResponse, createRequestLogger } from '@/shared/errors';
import { z } from 'zod';

const router = express.Router();

// Helper function to get user ID from request
function getUserIdFromRequest(req: AuthRequest): string {
  if (!req.userId) {
    throw createAppError(ErrorCode.UNAUTHORIZED, 'User not authenticated');
  }
  return req.userId;
}

// Note: Using centralized validation middleware from @/infrastructure/middleware/validation

// Validation schemas
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

const UpdatePreferencesSchema = z.object({
  language: z.enum(['en', 'ar', 'ur']).optional(),
  location: LocationSchema.optional(),
  prayerCalculationMethod: z.enum(['ISNA', 'MWL', 'Egypt', 'Makkah', 'Karachi', 'Tehran', 'Jafari']).optional(),
  notificationSettings: NotificationSettingsSchema.optional(),
  privacySettings: PrivacySettingsSchema.optional(),
  displaySettings: DisplaySettingsSchema.optional()
});

const UpdateLanguageSchema = z.object({
  language: z.enum(['en', 'ar', 'ur'], {
    errorMap: () => ({ message: 'Language must be one of: en, ar, ur' })
  })
});

/**
 * @route GET /api/v2/users/preferences
 * @description Get current user's preferences
 * @access Private
 */
router.get('/preferences', async (req: AuthRequest, res) => {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId);

  try {
    const userId = getUserIdFromRequest(req);
    requestLogger.info('Fetching user preferences', { userId });

    const repository = container.resolve<IUserPreferencesRepository>('IUserPreferencesRepository');
    const result = await repository.getByUserId(userId);

    if (Result.isError(result)) {
      requestLogger.error('Failed to fetch preferences from repository', {
        userId,
        error: result.error.message
      });

      const { response, status } = handleExpressError(
        createAppError(ErrorCode.DATABASE_ERROR, 'Failed to fetch preferences'),
        traceId
      );
      return res.status(status).json(response);
    }

    // If preferences don't exist, create default ones
    if (!result.value) {
      requestLogger.info('No preferences found, creating default preferences', { userId });

      const defaultPreferences = UserPreferencesEntity.createDefault(userId);
      const createResult = await repository.create(defaultPreferences);

      if (Result.isError(createResult)) {
        requestLogger.error('Failed to create default preferences', {
          userId,
          error: createResult.error.message
        });

        const { response, status } = handleExpressError(
          createAppError(ErrorCode.DATABASE_ERROR, 'Failed to create default preferences'),
          traceId
        );
        return res.status(status).json(response);
      }

      requestLogger.info('Default preferences created successfully', { userId });
      const successResponse = createSuccessResponse(createResult.value.toJSON(), traceId);
      return res.json(successResponse);
    }

    requestLogger.info('User preferences fetched successfully', { userId });
    const successResponse = createSuccessResponse(result.value.toJSON(), traceId);
    return res.json(successResponse);
  } catch (error) {
    requestLogger.error('Unexpected error in GET /preferences', { error });
    const { response, status } = handleExpressError(error, traceId);
    return res.status(status).json(response);
  }
});

/**
 * @route PUT /api/v2/users/preferences
 * @description Update current user's preferences
 * @access Private
 */
router.put('/preferences', validateRequest(UpdatePreferencesSchema), async (req: AuthRequest, res) => {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId);

  try {
    const userId = getUserIdFromRequest(req);
    const updates = req.body;

    requestLogger.info('Updating user preferences', {
      userId,
      updatesKeys: Object.keys(updates)
    });

    const repository = container.resolve<IUserPreferencesRepository>('IUserPreferencesRepository');

    // Get existing preferences or create new ones
    const existingResult = await repository.getByUserId(userId);

    let preferences: UserPreferencesEntity;

    if (Result.isError(existingResult)) {
      requestLogger.error('Failed to fetch existing preferences', {
        userId,
        error: existingResult.error.message
      });

      const { response, status } = handleExpressError(
        createAppError(ErrorCode.DATABASE_ERROR, 'Failed to fetch preferences'),
        traceId
      );
      return res.status(status).json(response);
    }

    if (!existingResult.value) {
      requestLogger.info('No existing preferences found, creating new ones', { userId });
      preferences = UserPreferencesEntity.createDefault(userId);
    } else {
      preferences = existingResult.value;
    }

    // Apply updates
    if (updates.language) {
      preferences.updateLanguage(updates.language);
    }

    if (updates.location) {
      preferences.updateLocation(updates.location);
    }

    if (updates.prayerCalculationMethod) {
      preferences.updatePrayerCalculationMethod(updates.prayerCalculationMethod);
    }

    if (updates.notificationSettings) {
      preferences.updateNotificationSettings(updates.notificationSettings);
    }

    if (updates.privacySettings) {
      preferences.updatePrivacySettings(updates.privacySettings);
    }

    if (updates.displaySettings) {
      preferences.updateDisplaySettings(updates.displaySettings);
    }

    // Upsert the preferences
    const result = await repository.upsert(preferences);

    if (Result.isError(result)) {
      requestLogger.error('Failed to update preferences in repository', {
        userId,
        error: result.error.message
      });

      const { response, status } = handleExpressError(
        createAppError(ErrorCode.DATABASE_ERROR, 'Failed to update preferences'),
        traceId
      );
      return res.status(status).json(response);
    }

    requestLogger.info('User preferences updated successfully', { userId });
    const successResponse = createSuccessResponse({
      data: result.value.toJSON(),
      message: 'Preferences updated successfully'
    }, traceId);
    return res.json(successResponse);
  } catch (error) {
    requestLogger.error('Unexpected error in PUT /preferences', { error });
    const { response, status } = handleExpressError(error, traceId);
    return res.status(status).json(response);
  }
});

/**
 * @route PATCH /api/v2/users/preferences/language
 * @description Update user's language preference
 * @access Private
 */
router.patch('/preferences/language', validateBody(UpdateLanguageSchema), async (req: AuthRequest, res) => {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId);

  try {
    const userId = getUserIdFromRequest(req);
    const { language } = req.body;

    requestLogger.info('Updating user language preference', { userId, language });

    const repository = container.resolve<IUserPreferencesRepository>('IUserPreferencesRepository');
    const existingResult = await repository.getByUserId(userId);

    if (Result.isError(existingResult)) {
      requestLogger.error('Failed to fetch existing preferences for language update', {
        userId,
        error: existingResult.error.message
      });

      const { response, status } = handleExpressError(
        createAppError(ErrorCode.DATABASE_ERROR, 'Failed to fetch preferences'),
        traceId
      );
      return res.status(status).json(response);
    }

    const preferences = existingResult.value || UserPreferencesEntity.createDefault(userId);
    preferences.updateLanguage(language);

    const result = await repository.upsert(preferences);

    if (Result.isError(result)) {
      requestLogger.error('Failed to update language preference in repository', {
        userId,
        language,
        error: result.error.message
      });

      const { response, status } = handleExpressError(
        createAppError(ErrorCode.DATABASE_ERROR, 'Failed to update language'),
        traceId
      );
      return res.status(status).json(response);
    }

    requestLogger.info('Language preference updated successfully', { userId, language });
    const successResponse = createSuccessResponse({
      data: { language },
      message: 'Language updated successfully'
    }, traceId);
    return res.json(successResponse);
  } catch (error) {
    requestLogger.error('Unexpected error in PATCH /preferences/language', { error });
    const { response, status } = handleExpressError(error, traceId);
    return res.status(status).json(response);
  }
});

/**
 * @route PATCH /api/v2/users/preferences/location
 * @description Update user's location
 * @access Private
 */
router.patch('/preferences/location', validateBody(LocationSchema), async (req: AuthRequest, res) => {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId);

  try {
    const userId = getUserIdFromRequest(req);
    const location = req.body;

    requestLogger.info('Updating user location preference', {
      userId,
      location: { lat: location.lat, lng: location.lng, city: location.city, country: location.country }
    });

    const repository = container.resolve<IUserPreferencesRepository>('IUserPreferencesRepository');
    const existingResult = await repository.getByUserId(userId);

    if (Result.isError(existingResult)) {
      requestLogger.error('Failed to fetch existing preferences for location update', {
        userId,
        error: existingResult.error.message
      });

      const { response, status } = handleExpressError(
        createAppError(ErrorCode.DATABASE_ERROR, 'Failed to fetch preferences'),
        traceId
      );
      return res.status(status).json(response);
    }

    const preferences = existingResult.value || UserPreferencesEntity.createDefault(userId);
    preferences.updateLocation(location);

    const result = await repository.upsert(preferences);

    if (Result.isError(result)) {
      requestLogger.error('Failed to update location preference in repository', {
        userId,
        location,
        error: result.error.message
      });

      const { response, status } = handleExpressError(
        createAppError(ErrorCode.DATABASE_ERROR, 'Failed to update location'),
        traceId
      );
      return res.status(status).json(response);
    }

    requestLogger.info('Location preference updated successfully', { userId });
    const successResponse = createSuccessResponse({
      data: { location },
      message: 'Location updated successfully'
    }, traceId);
    return res.json(successResponse);
  } catch (error) {
    requestLogger.error('Unexpected error in PATCH /preferences/location', { error });
    const { response, status } = handleExpressError(error, traceId);
    return res.status(status).json(response);
  }
});

/**
 * @route DELETE /api/v2/users/preferences
 * @description Delete user's preferences (reset to defaults)
 * @access Private
 */
router.delete('/preferences', async (req: AuthRequest, res) => {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId);

  try {
    const userId = getUserIdFromRequest(req);
    requestLogger.info('Resetting user preferences to defaults', { userId });

    const repository = container.resolve<IUserPreferencesRepository>('IUserPreferencesRepository');
    const result = await repository.delete(userId);

    if (Result.isError(result)) {
      // If preferences don't exist, that's fine
      if (result.error.message.includes('not found')) {
        requestLogger.info('No preferences found to delete, considering reset successful', { userId });
        const successResponse = createSuccessResponse({
          message: 'Preferences reset successfully'
        }, traceId);
        return res.json(successResponse);
      }

      requestLogger.error('Failed to delete preferences from repository', {
        userId,
        error: result.error.message
      });

      const { response, status } = handleExpressError(
        createAppError(ErrorCode.DATABASE_ERROR, 'Failed to delete preferences'),
        traceId
      );
      return res.status(status).json(response);
    }

    requestLogger.info('User preferences reset successfully', { userId });
    const successResponse = createSuccessResponse({
      message: 'Preferences reset successfully'
    }, traceId);
    return res.json(successResponse);
  } catch (error) {
    requestLogger.error('Unexpected error in DELETE /preferences', { error });
    const { response, status } = handleExpressError(error, traceId);
    return res.status(status).json(response);
  }
});

export default router;