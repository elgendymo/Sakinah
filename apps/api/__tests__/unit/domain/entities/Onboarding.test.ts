import { OnboardingEntity, OnboardingStep, ONBOARDING_STEPS, ONBOARDING_FLOW } from '../../../../src/domain/entities/Onboarding';

describe('OnboardingEntity', () => {
  let onboarding: OnboardingEntity;
  const userId = 'test-user-id';

  beforeEach(() => {
    onboarding = OnboardingEntity.createNew(userId);
  });

  describe('createNew', () => {
    it('should create a new onboarding entity with default values', () => {
      expect(onboarding.userId).toBe(userId);
      expect(onboarding.currentStep).toBe('welcome');
      expect(onboarding.completedSteps).toEqual([]);
      expect(onboarding.profileCompletionPercentage).toBe(0);
      expect(onboarding.dataCollected).toEqual({});
      expect(onboarding.languageSelected).toBeNull();
      expect(onboarding.locationSet).toBe(false);
      expect(onboarding.prayerCalculationMethodSet).toBe(false);
      expect(onboarding.notificationsConfigured).toBe(false);
      expect(onboarding.privacyPreferencesSet).toBe(false);
      expect(onboarding.displayPreferencesSet).toBe(false);
      expect(onboarding.isCompleted).toBe(false);
      expect(onboarding.skippedSteps).toEqual([]);
      expect(onboarding.completionDate).toBeNull();
    });

    it('should generate a unique ID', () => {
      const onboarding1 = OnboardingEntity.createNew(userId);
      const onboarding2 = OnboardingEntity.createNew(userId);
      expect(onboarding1.id).not.toBe(onboarding2.id);
    });
  });

  describe('fromData', () => {
    it('should create an entity from data object', () => {
      const data = {
        id: 'test-id',
        userId: 'test-user',
        currentStep: 'language',
        completedSteps: ['welcome'],
        profileCompletionPercentage: 25,
        dataCollected: { welcomeCompleted: true },
        languageSelected: 'en',
        locationSet: false,
        prayerCalculationMethodSet: false,
        notificationsConfigured: false,
        privacyPreferencesSet: false,
        displayPreferencesSet: false,
        isCompleted: false,
        skippedSteps: [],
        completionDate: null,
        startedAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T01:00:00Z'
      };

      const entity = OnboardingEntity.fromData(data);

      expect(entity.id).toBe(data.id);
      expect(entity.userId).toBe(data.userId);
      expect(entity.currentStep).toBe(data.currentStep);
      expect(entity.completedSteps).toEqual(data.completedSteps);
      expect(entity.profileCompletionPercentage).toBe(data.profileCompletionPercentage);
      expect(entity.dataCollected).toEqual(data.dataCollected);
      expect(entity.languageSelected).toBe(data.languageSelected);
    });
  });

  describe('completeStep', () => {
    it('should complete a step and move to next step', () => {
      onboarding.completeStep('welcome');

      expect(onboarding.completedSteps).toContain('welcome');
      expect(onboarding.currentStep).toBe('language');
      expect(onboarding.profileCompletionPercentage).toBeGreaterThan(0);
    });

    it('should update language flag when completing language step', () => {
      onboarding.completeStep('language', { language: 'ar' });

      expect(onboarding.languageSelected).toBe('ar');
      expect(onboarding.completedSteps).toContain('language');
      expect(onboarding.currentStep).toBe('location');
    });

    it('should update location flag when completing location step', () => {
      onboarding.completeStep('location', {
        location: { lat: 40.7128, lng: -74.0060, city: 'New York' }
      });

      expect(onboarding.locationSet).toBe(true);
      expect(onboarding.completedSteps).toContain('location');
    });

    it('should update prayer calculation flag when completing prayer-calculation step', () => {
      onboarding.completeStep('prayer-calculation', {
        prayerCalculationMethod: 'ISNA'
      });

      expect(onboarding.prayerCalculationMethodSet).toBe(true);
      expect(onboarding.completedSteps).toContain('prayer-calculation');
    });

    it('should update notifications flag when completing notifications step', () => {
      onboarding.completeStep('notifications', {
        notificationSettings: { fajrReminder: true }
      });

      expect(onboarding.notificationsConfigured).toBe(true);
      expect(onboarding.completedSteps).toContain('notifications');
    });

    it('should update privacy flag when completing privacy step', () => {
      onboarding.completeStep('privacy', {
        privacySettings: { dataSharing: false }
      });

      expect(onboarding.privacyPreferencesSet).toBe(true);
      expect(onboarding.completedSteps).toContain('privacy');
    });

    it('should update display flag when completing display step', () => {
      onboarding.completeStep('display', {
        displaySettings: { theme: 'dark' }
      });

      expect(onboarding.displayPreferencesSet).toBe(true);
      expect(onboarding.completedSteps).toContain('display');
    });

    it('should store collected data', () => {
      const stepData = { language: 'ar' };
      onboarding.completeStep('language', stepData);

      expect(onboarding.dataCollected).toEqual(stepData);
    });

    it('should not duplicate completed steps', () => {
      onboarding.completeStep('welcome');
      onboarding.completeStep('welcome');

      expect(onboarding.completedSteps.filter(step => step === 'welcome')).toHaveLength(1);
    });

    it('should mark as completed when reaching complete step', () => {
      // Complete all steps to reach the complete step
      const steps: OnboardingStep[] = ['welcome', 'language', 'location', 'prayer-calculation', 'notifications', 'privacy', 'display', 'profile'];

      steps.forEach(step => {
        onboarding.completeStep(step);
      });

      expect(onboarding.currentStep).toBe('complete');
      expect(onboarding.isCompleted).toBe(true);
      expect(onboarding.completionDate).toBeInstanceOf(Date);
    });
  });

  describe('skipStep', () => {
    it('should skip a step and move to next step', () => {
      onboarding.skipStep('welcome');

      expect(onboarding.skippedSteps).toContain('welcome');
      expect(onboarding.currentStep).toBe('language');
    });

    it('should not duplicate skipped steps', () => {
      onboarding.skipStep('notifications');
      onboarding.skipStep('notifications');

      expect(onboarding.skippedSteps.filter(step => step === 'notifications')).toHaveLength(1);
    });
  });

  describe('moveToStep', () => {
    it('should move to a specific step', () => {
      onboarding.moveToStep('profile');

      expect(onboarding.currentStep).toBe('profile');
    });

    it('should mark as completed when moving to complete step', () => {
      onboarding.moveToStep('complete');

      expect(onboarding.isCompleted).toBe(true);
      expect(onboarding.completionDate).toBeInstanceOf(Date);
    });
  });

  describe('getNextStep', () => {
    it('should return the next step in the flow', () => {
      expect(onboarding.getNextStep()).toBe('language');

      onboarding.moveToStep('language');
      expect(onboarding.getNextStep()).toBe('location');
    });

    it('should return null when at the last step', () => {
      onboarding.moveToStep('complete');
      expect(onboarding.getNextStep()).toBeNull();
    });
  });

  describe('getPreviousStep', () => {
    it('should return the previous step in the flow', () => {
      onboarding.moveToStep('language');
      expect(onboarding.getPreviousStep()).toBe('welcome');

      onboarding.moveToStep('location');
      expect(onboarding.getPreviousStep()).toBe('language');
    });

    it('should return null when at the first step', () => {
      expect(onboarding.getPreviousStep()).toBeNull();
    });
  });

  describe('isStepCompleted', () => {
    it('should return true for completed steps', () => {
      onboarding.completeStep('welcome');

      expect(onboarding.isStepCompleted('welcome')).toBe(true);
      expect(onboarding.isStepCompleted('language')).toBe(false);
    });
  });

  describe('isStepSkipped', () => {
    it('should return true for skipped steps', () => {
      onboarding.skipStep('notifications');

      expect(onboarding.isStepSkipped('notifications')).toBe(true);
      expect(onboarding.isStepSkipped('privacy')).toBe(false);
    });
  });

  describe('canSkipStep', () => {
    it('should return true for non-required steps', () => {
      expect(onboarding.canSkipStep('notifications')).toBe(true);
      expect(onboarding.canSkipStep('privacy')).toBe(true);
      expect(onboarding.canSkipStep('display')).toBe(true);
    });

    it('should return false for required steps', () => {
      expect(onboarding.canSkipStep('welcome')).toBe(false);
      expect(onboarding.canSkipStep('language')).toBe(false);
      expect(onboarding.canSkipStep('location')).toBe(false);
      expect(onboarding.canSkipStep('prayer-calculation')).toBe(false);
      expect(onboarding.canSkipStep('profile')).toBe(false);
    });
  });

  describe('getRemainingSteps', () => {
    it('should return remaining steps in the flow', () => {
      expect(onboarding.getRemainingSteps()).toEqual([
        'language', 'location', 'prayer-calculation', 'notifications',
        'privacy', 'display', 'profile', 'complete'
      ]);

      onboarding.moveToStep('location');
      expect(onboarding.getRemainingSteps()).toEqual([
        'prayer-calculation', 'notifications', 'privacy', 'display', 'profile', 'complete'
      ]);
    });

    it('should return empty array when at the last step', () => {
      onboarding.moveToStep('complete');
      expect(onboarding.getRemainingSteps()).toEqual([]);
    });
  });

  describe('getProgress', () => {
    it('should return progress information', () => {
      const progress = onboarding.getProgress();

      expect(progress.currentStep).toBe('welcome');
      expect(progress.currentStepIndex).toBe(0);
      expect(progress.totalSteps).toBe(ONBOARDING_FLOW.length);
      expect(progress.completionPercentage).toBe(0);
      expect(progress.isCompleted).toBe(false);
    });

    it('should update progress after completing steps', () => {
      onboarding.completeStep('welcome');
      const progress = onboarding.getProgress();

      expect(progress.currentStep).toBe('language');
      expect(progress.currentStepIndex).toBe(1);
      expect(progress.completionPercentage).toBeGreaterThan(0);
    });

    it('should show 100% completion when finished', () => {
      onboarding.moveToStep('complete');
      const progress = onboarding.getProgress();

      expect(progress.isCompleted).toBe(true);
    });
  });

  describe('toJSON', () => {
    it('should serialize to JSON correctly', () => {
      onboarding.completeStep('welcome');
      const json = onboarding.toJSON();

      expect(json.id).toBe(onboarding.id);
      expect(json.userId).toBe(onboarding.userId);
      expect(json.currentStep).toBe(onboarding.currentStep);
      expect(json.completedSteps).toEqual(onboarding.completedSteps);
      expect(json.profileCompletionPercentage).toBe(onboarding.profileCompletionPercentage);
      expect(json.dataCollected).toEqual(onboarding.dataCollected);
      expect(json.startedAt).toBeInstanceOf(Date);
      expect(json.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('completion percentage calculation', () => {
    it('should calculate completion percentage based on step weights', () => {
      expect(onboarding.profileCompletionPercentage).toBe(0);

      // Complete welcome step (weight: 5)
      onboarding.completeStep('welcome');
      expect(onboarding.profileCompletionPercentage).toBeGreaterThan(0);

      // Complete language step (weight: 15)
      onboarding.completeStep('language');
      expect(onboarding.profileCompletionPercentage).toBeGreaterThan(5);

      // Complete location step (weight: 15)
      onboarding.completeStep('location');
      expect(onboarding.profileCompletionPercentage).toBeGreaterThan(20);
    });

    it('should reach 100% when all weighted steps are completed', () => {
      // Complete all steps except 'complete' (which has weight 0)
      const stepsToComplete: OnboardingStep[] = [
        'welcome', 'language', 'location', 'prayer-calculation',
        'notifications', 'privacy', 'display', 'profile'
      ];

      stepsToComplete.forEach(step => {
        onboarding.completeStep(step);
      });

      expect(onboarding.profileCompletionPercentage).toBe(100);
    });
  });

  describe('updatedAt timestamp', () => {
    it('should update timestamp when completing steps', () => {
      const initialTimestamp = onboarding.updatedAt;

      // Wait a bit to ensure timestamp difference
      setTimeout(() => {
        onboarding.completeStep('welcome');
        expect(onboarding.updatedAt.getTime()).toBeGreaterThan(initialTimestamp.getTime());
      }, 10);
    });

    it('should update timestamp when skipping steps', () => {
      const initialTimestamp = onboarding.updatedAt;

      setTimeout(() => {
        onboarding.skipStep('notifications');
        expect(onboarding.updatedAt.getTime()).toBeGreaterThan(initialTimestamp.getTime());
      }, 10);
    });

    it('should update timestamp when moving to steps', () => {
      const initialTimestamp = onboarding.updatedAt;

      setTimeout(() => {
        onboarding.moveToStep('profile');
        expect(onboarding.updatedAt.getTime()).toBeGreaterThan(initialTimestamp.getTime());
      }, 10);
    });
  });
});

describe('ONBOARDING_STEPS configuration', () => {
  it('should have correct step configurations', () => {
    expect(ONBOARDING_STEPS.welcome.required).toBe(true);
    expect(ONBOARDING_STEPS.language.required).toBe(true);
    expect(ONBOARDING_STEPS.location.required).toBe(true);
    expect(ONBOARDING_STEPS['prayer-calculation'].required).toBe(true);
    expect(ONBOARDING_STEPS.profile.required).toBe(true);

    expect(ONBOARDING_STEPS.notifications.required).toBe(false);
    expect(ONBOARDING_STEPS.privacy.required).toBe(false);
    expect(ONBOARDING_STEPS.display.required).toBe(false);
  });

  it('should have weights that sum to 100', () => {
    const totalWeight = Object.values(ONBOARDING_STEPS).reduce(
      (sum, step) => sum + step.weight,
      0
    );
    expect(totalWeight).toBe(100);
  });

  it('should have all steps in the flow', () => {
    const stepNames = Object.keys(ONBOARDING_STEPS) as OnboardingStep[];

    stepNames.forEach(stepName => {
      expect(ONBOARDING_FLOW).toContain(stepName);
    });
  });
});

describe('ONBOARDING_FLOW', () => {
  it('should have correct flow order', () => {
    const expectedFlow: OnboardingStep[] = [
      'welcome',
      'language',
      'location',
      'prayer-calculation',
      'notifications',
      'privacy',
      'display',
      'profile',
      'complete'
    ];

    expect(ONBOARDING_FLOW).toEqual(expectedFlow);
  });

  it('should start with welcome and end with complete', () => {
    expect(ONBOARDING_FLOW[0]).toBe('welcome');
    expect(ONBOARDING_FLOW[ONBOARDING_FLOW.length - 1]).toBe('complete');
  });
});