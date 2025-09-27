import express from 'express';
import { container } from 'tsyringe';
import { AuthRequest } from '@/infrastructure/auth/middleware';
import { IUserPreferencesRepository } from '@/infrastructure/repos/UserPreferencesRepository';
import { UserPreferencesEntity } from '@/domain/entities/UserPreferences';
import { Result } from '@/shared/result';
import { z } from 'zod';

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

/**
 * @route GET /api/v2/users/preferences
 * @description Get current user's preferences
 * @access Private
 */
router.get('/preferences', async (req: AuthRequest, res, next) => {
  try {
    const userId = getUserIdFromRequest(req);
    const repository = container.resolve<IUserPreferencesRepository>('IUserPreferencesRepository');

    const result = await repository.getByUserId(userId);

    if (Result.isError(result)) {
      return res.status(500).json({
        error: 'Failed to fetch preferences',
        message: result.error.message
      });
    }

    // If preferences don't exist, create default ones
    if (!result.value) {
      const defaultPreferences = UserPreferencesEntity.createDefault(userId);
      const createResult = await repository.create(defaultPreferences);

      if (Result.isError(createResult)) {
        return res.status(500).json({
          error: 'Failed to create default preferences',
          message: createResult.error.message
        });
      }

      return res.json({
        success: true,
        data: createResult.value.toJSON()
      });
    }

    return res.json({
      success: true,
      data: result.value.toJSON()
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * @route PUT /api/v2/users/preferences
 * @description Update current user's preferences
 * @access Private
 */
router.put('/preferences', validateRequest(UpdatePreferencesSchema), async (req: AuthRequest, res, next) => {
  try {
    const userId = getUserIdFromRequest(req);
    const updates = req.body;

    const repository = container.resolve<IUserPreferencesRepository>('IUserPreferencesRepository');

    // Get existing preferences or create new ones
    const existingResult = await repository.getByUserId(userId);

    let preferences: UserPreferencesEntity;

    if (Result.isError(existingResult)) {
      return res.status(500).json({
        error: 'Failed to fetch preferences',
        message: existingResult.error.message
      });
    }

    if (!existingResult.value) {
      // Create new preferences with updates
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
      return res.status(500).json({
        error: 'Failed to update preferences',
        message: result.error.message
      });
    }

    return res.json({
      success: true,
      data: result.value.toJSON(),
      message: 'Preferences updated successfully'
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * @route PATCH /api/v2/users/preferences/language
 * @description Update user's language preference
 * @access Private
 */
router.patch('/preferences/language', async (req: AuthRequest, res, next) => {
  try {
    const userId = getUserIdFromRequest(req);
    const { language } = req.body;

    if (!['en', 'ar', 'ur'].includes(language)) {
      return res.status(400).json({
        error: 'Invalid language',
        message: 'Language must be one of: en, ar, ur'
      });
    }

    const repository = container.resolve<IUserPreferencesRepository>('IUserPreferencesRepository');

    const existingResult = await repository.getByUserId(userId);

    if (Result.isError(existingResult)) {
      return res.status(500).json({
        error: 'Failed to fetch preferences',
        message: existingResult.error.message
      });
    }

    const preferences = existingResult.value || UserPreferencesEntity.createDefault(userId);
    preferences.updateLanguage(language);

    const result = await repository.upsert(preferences);

    if (Result.isError(result)) {
      return res.status(500).json({
        error: 'Failed to update language',
        message: result.error.message
      });
    }

    return res.json({
      success: true,
      data: { language },
      message: 'Language updated successfully'
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * @route PATCH /api/v2/users/preferences/location
 * @description Update user's location
 * @access Private
 */
router.patch('/preferences/location', validateRequest(LocationSchema), async (req: AuthRequest, res, next) => {
  try {
    const userId = getUserIdFromRequest(req);
    const location = req.body;

    const repository = container.resolve<IUserPreferencesRepository>('IUserPreferencesRepository');

    const existingResult = await repository.getByUserId(userId);

    if (Result.isError(existingResult)) {
      return res.status(500).json({
        error: 'Failed to fetch preferences',
        message: existingResult.error.message
      });
    }

    const preferences = existingResult.value || UserPreferencesEntity.createDefault(userId);
    preferences.updateLocation(location);

    const result = await repository.upsert(preferences);

    if (Result.isError(result)) {
      return res.status(500).json({
        error: 'Failed to update location',
        message: result.error.message
      });
    }

    return res.json({
      success: true,
      data: { location },
      message: 'Location updated successfully'
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * @route DELETE /api/v2/users/preferences
 * @description Delete user's preferences (reset to defaults)
 * @access Private
 */
router.delete('/preferences', async (req: AuthRequest, res, next) => {
  try {
    const userId = getUserIdFromRequest(req);
    const repository = container.resolve<IUserPreferencesRepository>('IUserPreferencesRepository');

    const result = await repository.delete(userId);

    if (Result.isError(result)) {
      // If preferences don't exist, that's fine
      if (result.error.message.includes('not found')) {
        return res.json({
          success: true,
          message: 'Preferences reset successfully'
        });
      }

      return res.status(500).json({
        error: 'Failed to delete preferences',
        message: result.error.message
      });
    }

    return res.json({
      success: true,
      message: 'Preferences reset successfully'
    });
  } catch (error) {
    return next(error);
  }
});

export default router;