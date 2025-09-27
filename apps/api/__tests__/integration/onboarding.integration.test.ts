import { DevelopmentDatabaseClient } from '../../src/infrastructure/database/sqlite/development';
import { OnboardingRepositoryAdapter } from '../../src/infrastructure/repos/OnboardingRepositoryAdapter';
import { OnboardingEntity, OnboardingStep } from '../../src/domain/entities/Onboarding';
import { UserId } from '../../src/domain/value-objects/UserId';
import { container } from 'tsyringe';

describe('Onboarding Integration Tests', () => {
  let database: DevelopmentDatabaseClient;
  let repository: OnboardingRepositoryAdapter;
  const testUserId = 'test-user-integration';

  beforeAll(async () => {
    // Use in-memory SQLite for testing
    process.env.DATABASE_PATH = ':memory:';
    database = new DevelopmentDatabaseClient();

    // Register the database client in the container
    container.register('IDatabaseClient', { useValue: database });

    repository = new OnboardingRepositoryAdapter(database);
  });

  afterAll(async () => {
    await database.close();
  });

  beforeEach(async () => {
    // Clean up any existing onboarding data
    try {
      await repository.delete(UserId.fromString(testUserId));
    } catch (error) {
      // Ignore if doesn't exist
    }
  });

  describe('create and retrieve onboarding', () => {
    it('should create and retrieve an onboarding record', async () => {
      const onboarding = OnboardingEntity.createNew(testUserId);

      const createResult = await repository.create(onboarding);
      expect(createResult.ok).toBe(true);
      expect(createResult.value!.userId).toBe(testUserId);

      const retrieveResult = await repository.getByUserId(UserId.fromString(testUserId));
      expect(retrieveResult.ok).toBe(true);
      expect(retrieveResult.value!.userId).toBe(testUserId);
      expect(retrieveResult.value!.currentStep).toBe('welcome');
    });

    it('should return null when onboarding does not exist', async () => {
      const result = await repository.getByUserId(UserId.fromString('non-existent-user'));
      expect(result.ok).toBe(true);
      expect(result.value).toBeNull();
    });
  });

  describe('complete onboarding steps', () => {
    it('should complete a step and update the record', async () => {
      const result = await repository.completeStep(
        UserId.fromString(testUserId),
        'welcome',
        { welcomeCompleted: true }
      );

      expect(result.ok).toBe(true);
      expect(result.value!.completedSteps).toContain('welcome');
      expect(result.value!.currentStep).toBe('language');
      expect(result.value!.dataCollected.welcomeCompleted).toBe(true);
      expect(result.value!.profileCompletionPercentage).toBeGreaterThan(0);
    });

    it('should complete language step with language data', async () => {
      const result = await repository.completeStep(
        UserId.fromString(testUserId),
        'language',
        { language: 'ar' }
      );

      expect(result.ok).toBe(true);
      expect(result.value!.languageSelected).toBe('ar');
      expect(result.value!.completedSteps).toContain('language');
      expect(result.value!.currentStep).toBe('location');
    });

    it('should complete location step and set location flag', async () => {
      const locationData = {
        location: {
          lat: 40.7128,
          lng: -74.0060,
          city: 'New York',
          country: 'USA'
        }
      };

      const result = await repository.completeStep(
        UserId.fromString(testUserId),
        'location',
        locationData
      );

      expect(result.ok).toBe(true);
      expect(result.value!.locationSet).toBe(true);
      expect(result.value!.dataCollected.location).toEqual(locationData.location);
    });

    it('should complete prayer calculation step', async () => {
      const result = await repository.completeStep(
        UserId.fromString(testUserId),
        'prayer-calculation',
        { prayerCalculationMethod: 'ISNA' }
      );

      expect(result.ok).toBe(true);
      expect(result.value!.prayerCalculationMethodSet).toBe(true);
      expect(result.value!.dataCollected.prayerCalculationMethod).toBe('ISNA');
    });

    it('should complete notification configuration step', async () => {
      const notificationData = {
        notificationSettings: {
          fajrReminder: true,
          dailyReminder: false,
          prayerTimes: true,
          reminderTime: '06:00'
        }
      };

      const result = await repository.completeStep(
        UserId.fromString(testUserId),
        'notifications',
        notificationData
      );

      expect(result.ok).toBe(true);
      expect(result.value!.notificationsConfigured).toBe(true);
      expect(result.value!.dataCollected.notificationSettings).toEqual(notificationData.notificationSettings);
    });

    it('should complete privacy preferences step', async () => {
      const privacyData = {
        privacySettings: {
          dataSharing: false,
          analytics: false,
          publicProfile: false
        }
      };

      const result = await repository.completeStep(
        UserId.fromString(testUserId),
        'privacy',
        privacyData
      );

      expect(result.ok).toBe(true);
      expect(result.value!.privacyPreferencesSet).toBe(true);
      expect(result.value!.dataCollected.privacySettings).toEqual(privacyData.privacySettings);
    });

    it('should complete display preferences step', async () => {
      const displayData = {
        displaySettings: {
          theme: 'dark' as const,
          fontSize: 'medium' as const,
          showArabicWithTranslation: true
        }
      };

      const result = await repository.completeStep(
        UserId.fromString(testUserId),
        'display',
        displayData
      );

      expect(result.ok).toBe(true);
      expect(result.value!.displayPreferencesSet).toBe(true);
      expect(result.value!.dataCollected.displaySettings).toEqual(displayData.displaySettings);
    });
  });

  describe('skip onboarding steps', () => {
    it('should skip a step and move to next step', async () => {
      // First complete welcome to get to language
      await repository.completeStep(UserId.fromString(testUserId), 'welcome');

      // Skip language (though it's required, testing the functionality)
      const result = await repository.skipStep(
        UserId.fromString(testUserId),
        'language'
      );

      expect(result.ok).toBe(true);
      expect(result.value!.skippedSteps).toContain('language');
      expect(result.value!.currentStep).toBe('location');
    });

    it('should skip optional notification step', async () => {
      // Set up onboarding to be at notifications step
      await repository.completeStep(UserId.fromString(testUserId), 'welcome');
      await repository.completeStep(UserId.fromString(testUserId), 'language', { language: 'en' });
      await repository.completeStep(UserId.fromString(testUserId), 'location', {
        location: { lat: 40.7128, lng: -74.0060 }
      });
      await repository.completeStep(UserId.fromString(testUserId), 'prayer-calculation', {
        prayerCalculationMethod: 'ISNA'
      });

      const result = await repository.skipStep(
        UserId.fromString(testUserId),
        'notifications'
      );

      expect(result.ok).toBe(true);
      expect(result.value!.skippedSteps).toContain('notifications');
      expect(result.value!.currentStep).toBe('privacy');
      expect(result.value!.notificationsConfigured).toBe(false);
    });
  });

  describe('move to specific step', () => {
    it('should move to a specific step', async () => {
      const result = await repository.moveToStep(
        UserId.fromString(testUserId),
        'profile'
      );

      expect(result.ok).toBe(true);
      expect(result.value!.currentStep).toBe('profile');
    });

    it('should move to complete step and mark as completed', async () => {
      const result = await repository.moveToStep(
        UserId.fromString(testUserId),
        'complete'
      );

      expect(result.ok).toBe(true);
      expect(result.value!.currentStep).toBe('complete');
      expect(result.value!.isCompleted).toBe(true);
      expect(result.value!.completionDate).toBeDefined();
    });
  });

  describe('mark onboarding as completed', () => {
    it('should mark onboarding as completed', async () => {
      // First create an onboarding record
      await repository.completeStep(UserId.fromString(testUserId), 'welcome');

      const result = await repository.markCompleted(UserId.fromString(testUserId));

      expect(result.ok).toBe(true);
      expect(result.value!.isCompleted).toBe(true);
      expect(result.value!.currentStep).toBe('complete');
      expect(result.value!.completionDate).toBeInstanceOf(Date);
    });

    it('should handle marking completion when no onboarding exists', async () => {
      const result = await repository.markCompleted(UserId.fromString('non-existent-user'));

      expect(result.ok).toBe(false);
      expect(result.error.message).toContain('No onboarding found for user');
    });
  });

  describe('update onboarding record', () => {
    it('should update an existing onboarding record', async () => {
      // Create initial onboarding
      const onboarding = OnboardingEntity.createNew(testUserId);
      await repository.create(onboarding);

      // Update it
      onboarding.completeStep('welcome');
      onboarding.completeStep('language', { language: 'ar' });

      const result = await repository.update(onboarding);

      expect(result.ok).toBe(true);
      expect(result.value!.completedSteps).toContain('welcome');
      expect(result.value!.completedSteps).toContain('language');
      expect(result.value!.languageSelected).toBe('ar');
      expect(result.value!.currentStep).toBe('location');
    });
  });

  describe('upsert onboarding record', () => {
    it('should create new onboarding when none exists', async () => {
      const onboarding = OnboardingEntity.createNew(testUserId);
      onboarding.completeStep('welcome');

      const result = await repository.upsert(onboarding);

      expect(result.ok).toBe(true);
      expect(result.value!.userId).toBe(testUserId);
      expect(result.value!.completedSteps).toContain('welcome');
    });

    it('should update existing onboarding when it exists', async () => {
      // Create initial onboarding
      const initialOnboarding = OnboardingEntity.createNew(testUserId);
      await repository.create(initialOnboarding);

      // Update with upsert
      const updatedOnboarding = OnboardingEntity.createNew(testUserId);
      updatedOnboarding.id = initialOnboarding.id;
      updatedOnboarding.completeStep('welcome');
      updatedOnboarding.completeStep('language', { language: 'ar' });

      const result = await repository.upsert(updatedOnboarding);

      expect(result.ok).toBe(true);
      expect(result.value!.completedSteps).toContain('welcome');
      expect(result.value!.completedSteps).toContain('language');
      expect(result.value!.languageSelected).toBe('ar');
    });
  });

  describe('delete onboarding record', () => {
    it('should delete an existing onboarding record', async () => {
      // Create onboarding
      const onboarding = OnboardingEntity.createNew(testUserId);
      await repository.create(onboarding);

      // Verify it exists
      const beforeDelete = await repository.getByUserId(UserId.fromString(testUserId));
      expect(beforeDelete.value).not.toBeNull();

      // Delete it
      const deleteResult = await repository.delete(UserId.fromString(testUserId));
      expect(deleteResult.ok).toBe(true);

      // Verify it's gone
      const afterDelete = await repository.getByUserId(UserId.fromString(testUserId));
      expect(afterDelete.value).toBeNull();
    });

    it('should handle deleting non-existent onboarding', async () => {
      const result = await repository.delete(UserId.fromString('non-existent-user'));

      expect(result.ok).toBe(false);
      expect(result.error.message).toContain('not found');
    });
  });

  describe('data persistence and retrieval', () => {
    it('should persist complex onboarding data correctly', async () => {
      const complexData = {
        language: 'ar',
        location: {
          lat: 21.3891,
          lng: 39.8579,
          city: 'Mecca',
          country: 'Saudi Arabia'
        },
        prayerCalculationMethod: 'Makkah' as const,
        notificationSettings: {
          fajrReminder: true,
          dailyReminder: true,
          habitStreak: false,
          prayerTimes: true,
          reminderTime: '05:30'
        },
        privacySettings: {
          dataSharing: false,
          analytics: false,
          publicProfile: false
        },
        displaySettings: {
          theme: 'dark' as const,
          fontSize: 'large' as const,
          showArabicWithTranslation: true
        },
        profile: {
          displayName: 'Test User',
          timezone: 'Asia/Riyadh'
        }
      };

      // Complete all steps with data
      await repository.completeStep(UserId.fromString(testUserId), 'welcome', { welcomeCompleted: true });
      await repository.completeStep(UserId.fromString(testUserId), 'language', { language: complexData.language });
      await repository.completeStep(UserId.fromString(testUserId), 'location', { location: complexData.location });
      await repository.completeStep(UserId.fromString(testUserId), 'prayer-calculation', { prayerCalculationMethod: complexData.prayerCalculationMethod });
      await repository.completeStep(UserId.fromString(testUserId), 'notifications', { notificationSettings: complexData.notificationSettings });
      await repository.completeStep(UserId.fromString(testUserId), 'privacy', { privacySettings: complexData.privacySettings });
      await repository.completeStep(UserId.fromString(testUserId), 'display', { displaySettings: complexData.displaySettings });

      const result = await repository.completeStep(UserId.fromString(testUserId), 'profile', { profile: complexData.profile });

      expect(result.ok).toBe(true);

      // Retrieve and verify all data is persisted correctly
      const retrieved = await repository.getByUserId(UserId.fromString(testUserId));
      expect(retrieved.ok).toBe(true);

      const onboarding = retrieved.value!;
      expect(onboarding.languageSelected).toBe(complexData.language);
      expect(onboarding.locationSet).toBe(true);
      expect(onboarding.prayerCalculationMethodSet).toBe(true);
      expect(onboarding.notificationsConfigured).toBe(true);
      expect(onboarding.privacyPreferencesSet).toBe(true);
      expect(onboarding.displayPreferencesSet).toBe(true);

      expect(onboarding.dataCollected.language).toBe(complexData.language);
      expect(onboarding.dataCollected.location).toEqual(complexData.location);
      expect(onboarding.dataCollected.prayerCalculationMethod).toBe(complexData.prayerCalculationMethod);
      expect(onboarding.dataCollected.notificationSettings).toEqual(complexData.notificationSettings);
      expect(onboarding.dataCollected.privacySettings).toEqual(complexData.privacySettings);
      expect(onboarding.dataCollected.displaySettings).toEqual(complexData.displaySettings);
      expect(onboarding.dataCollected.profile).toEqual(complexData.profile);

      // Check completion percentage
      expect(onboarding.profileCompletionPercentage).toBeGreaterThan(90);
    });

    it('should handle JSON serialization of arrays correctly', async () => {
      // Complete multiple steps and skip some
      await repository.completeStep(UserId.fromString(testUserId), 'welcome');
      await repository.completeStep(UserId.fromString(testUserId), 'language', { language: 'en' });
      await repository.skipStep(UserId.fromString(testUserId), 'notifications');
      await repository.skipStep(UserId.fromString(testUserId), 'privacy');

      const result = await repository.getByUserId(UserId.fromString(testUserId));

      expect(result.ok).toBe(true);
      expect(result.value!.completedSteps).toEqual(['welcome', 'language']);
      expect(result.value!.skippedSteps).toEqual(['notifications', 'privacy']);
    });
  });

  describe('concurrent onboarding operations', () => {
    it('should handle concurrent step completions correctly', async () => {
      // Simulate concurrent completion of different steps
      const promises = [
        repository.completeStep(UserId.fromString(testUserId), 'welcome'),
        repository.skipStep(UserId.fromString(testUserId), 'notifications')
      ];

      const results = await Promise.all(promises);

      // Both operations should succeed
      results.forEach(result => {
        expect(result.ok).toBe(true);
      });

      // Verify final state
      const finalState = await repository.getByUserId(UserId.fromString(testUserId));
      expect(finalState.value!.completedSteps).toContain('welcome');
      expect(finalState.value!.skippedSteps).toContain('notifications');
    });
  });
});