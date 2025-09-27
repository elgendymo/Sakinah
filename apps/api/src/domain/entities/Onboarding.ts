export type OnboardingStep =
  | 'welcome'
  | 'language'
  | 'location'
  | 'prayer-calculation'
  | 'notifications'
  | 'privacy'
  | 'display'
  | 'profile'
  | 'complete';

export interface OnboardingStepConfig {
  name: OnboardingStep;
  title: string;
  description: string;
  required: boolean;
  weight: number; // For completion percentage calculation
}

export const ONBOARDING_STEPS: Record<OnboardingStep, OnboardingStepConfig> = {
  welcome: {
    name: 'welcome',
    title: 'Welcome to Sakinah',
    description: 'Let\'s get you started on your spiritual journey',
    required: true,
    weight: 5,
  },
  language: {
    name: 'language',
    title: 'Choose your language',
    description: 'Select your preferred language for the app',
    required: true,
    weight: 15,
  },
  location: {
    name: 'location',
    title: 'Set your location',
    description: 'We need your location for accurate prayer times',
    required: true,
    weight: 15,
  },
  'prayer-calculation': {
    name: 'prayer-calculation',
    title: 'Prayer calculation method',
    description: 'Choose your preferred method for prayer time calculations',
    required: true,
    weight: 15,
  },
  notifications: {
    name: 'notifications',
    title: 'Notification preferences',
    description: 'Configure how you want to be reminded',
    required: false,
    weight: 15,
  },
  privacy: {
    name: 'privacy',
    title: 'Privacy settings',
    description: 'Control your data and privacy preferences',
    required: false,
    weight: 15,
  },
  display: {
    name: 'display',
    title: 'Display preferences',
    description: 'Customize how the app looks and feels',
    required: false,
    weight: 10,
  },
  profile: {
    name: 'profile',
    title: 'Complete your profile',
    description: 'Add your display name and timezone',
    required: true,
    weight: 10,
  },
  complete: {
    name: 'complete',
    title: 'All set!',
    description: 'Your onboarding is complete',
    required: true,
    weight: 0,
  },
};

export const ONBOARDING_FLOW: OnboardingStep[] = [
  'welcome',
  'language',
  'location',
  'prayer-calculation',
  'notifications',
  'privacy',
  'display',
  'profile',
  'complete',
];

export interface OnboardingCollectedData {
  welcomeCompleted?: boolean;
  language?: 'en' | 'ar' | 'ur';
  location?: {
    lat: number;
    lng: number;
    city?: string;
    country?: string;
  };
  prayerCalculationMethod?: 'ISNA' | 'MWL' | 'Egypt' | 'Makkah' | 'Karachi' | 'Tehran' | 'Jafari';
  notificationSettings?: {
    fajrReminder?: boolean;
    dailyReminder?: boolean;
    habitStreak?: boolean;
    prayerTimes?: boolean;
    reminderTime?: string;
  };
  privacySettings?: {
    dataSharing?: boolean;
    analytics?: boolean;
    publicProfile?: boolean;
  };
  displaySettings?: {
    theme?: 'light' | 'dark' | 'auto';
    fontSize?: 'small' | 'medium' | 'large';
    showArabicWithTranslation?: boolean;
  };
  profile?: {
    displayName?: string;
    timezone?: string;
  };
}

export interface Onboarding {
  id: string;
  userId: string;
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  profileCompletionPercentage: number;
  dataCollected: OnboardingCollectedData;
  languageSelected: string | null;
  locationSet: boolean;
  prayerCalculationMethodSet: boolean;
  notificationsConfigured: boolean;
  privacyPreferencesSet: boolean;
  displayPreferencesSet: boolean;
  isCompleted: boolean;
  skippedSteps: OnboardingStep[];
  completionDate: Date | null;
  startedAt: Date;
  updatedAt: Date;
}

export class OnboardingEntity implements Onboarding {
  constructor(
    public id: string,
    public userId: string,
    public currentStep: OnboardingStep = 'welcome',
    public completedSteps: OnboardingStep[] = [],
    public profileCompletionPercentage: number = 0,
    public dataCollected: OnboardingCollectedData = {},
    public languageSelected: string | null = null,
    public locationSet: boolean = false,
    public prayerCalculationMethodSet: boolean = false,
    public notificationsConfigured: boolean = false,
    public privacyPreferencesSet: boolean = false,
    public displayPreferencesSet: boolean = false,
    public isCompleted: boolean = false,
    public skippedSteps: OnboardingStep[] = [],
    public completionDate: Date | null = null,
    public startedAt: Date = new Date(),
    public updatedAt: Date = new Date()
  ) {}

  static createNew(userId: string, id?: string): OnboardingEntity {
    return new OnboardingEntity(
      id || crypto.randomUUID(),
      userId,
      'welcome',
      [],
      0,
      {},
      null,
      false,
      false,
      false,
      false,
      false,
      false,
      [],
      null,
      new Date(),
      new Date()
    );
  }

  static fromData(data: {
    id: string;
    userId: string;
    currentStep: string;
    completedSteps: string[];
    profileCompletionPercentage: number;
    dataCollected: Record<string, any>;
    languageSelected: string | null;
    locationSet: boolean;
    prayerCalculationMethodSet: boolean;
    notificationsConfigured: boolean;
    privacyPreferencesSet: boolean;
    displayPreferencesSet: boolean;
    isCompleted: boolean;
    skippedSteps: string[];
    completionDate: string | null;
    startedAt: string;
    updatedAt: string;
  }): OnboardingEntity {
    return new OnboardingEntity(
      data.id,
      data.userId,
      data.currentStep as OnboardingStep,
      data.completedSteps as OnboardingStep[],
      data.profileCompletionPercentage,
      data.dataCollected as OnboardingCollectedData,
      data.languageSelected,
      data.locationSet,
      data.prayerCalculationMethodSet,
      data.notificationsConfigured,
      data.privacyPreferencesSet,
      data.displayPreferencesSet,
      data.isCompleted,
      data.skippedSteps as OnboardingStep[],
      data.completionDate ? new Date(data.completionDate) : null,
      new Date(data.startedAt),
      new Date(data.updatedAt)
    );
  }

  completeStep(step: OnboardingStep, data?: Record<string, any>): void {
    if (!this.completedSteps.includes(step)) {
      this.completedSteps.push(step);
    }

    // Update specific flags based on step
    switch (step) {
      case 'language':
        this.languageSelected = data?.language || null;
        break;
      case 'location':
        this.locationSet = true;
        break;
      case 'prayer-calculation':
        this.prayerCalculationMethodSet = true;
        break;
      case 'notifications':
        this.notificationsConfigured = true;
        break;
      case 'privacy':
        this.privacyPreferencesSet = true;
        break;
      case 'display':
        this.displayPreferencesSet = true;
        break;
    }

    // Store collected data
    if (data) {
      this.dataCollected = { ...this.dataCollected, ...data };
    }

    // Update completion percentage
    this.calculateCompletionPercentage();

    // Move to next step after the completed step
    this.moveToStepAfter(step);

    this.updatedAt = new Date();
  }

  private moveToStepAfter(completedStep: OnboardingStep): void {
    const completedIndex = ONBOARDING_FLOW.indexOf(completedStep);
    if (completedIndex < ONBOARDING_FLOW.length - 1) {
      this.currentStep = ONBOARDING_FLOW[completedIndex + 1];
    }

    // If we've reached the complete step, mark as completed
    if (this.currentStep === 'complete') {
      this.isCompleted = true;
      this.completionDate = new Date();
    }
  }

  skipStep(step: OnboardingStep): void {
    if (!this.skippedSteps.includes(step)) {
      this.skippedSteps.push(step);
    }

    // Move to next step after the skipped step
    this.moveToStepAfter(step);
    this.updatedAt = new Date();
  }

  moveToStep(step: OnboardingStep): void {
    this.currentStep = step;

    // If we've reached the complete step, mark as completed
    if (this.currentStep === 'complete') {
      this.isCompleted = true;
      this.completionDate = new Date();
    }

    this.updatedAt = new Date();
  }

  private moveToNextStep(): void {
    const currentIndex = ONBOARDING_FLOW.indexOf(this.currentStep);
    if (currentIndex < ONBOARDING_FLOW.length - 1) {
      this.currentStep = ONBOARDING_FLOW[currentIndex + 1];
    }

    // If we've reached the complete step, mark as completed
    if (this.currentStep === 'complete') {
      this.isCompleted = true;
      this.completionDate = new Date();
    }
  }

  private calculateCompletionPercentage(): void {
    const completedWeight = this.completedSteps.reduce((total, step) => {
      return total + (ONBOARDING_STEPS[step]?.weight || 0);
    }, 0);

    const totalWeight = Object.values(ONBOARDING_STEPS).reduce((total, step) => {
      return total + step.weight;
    }, 0);

    this.profileCompletionPercentage = Math.round((completedWeight / totalWeight) * 100);
  }

  getNextStep(): OnboardingStep | null {
    const currentIndex = ONBOARDING_FLOW.indexOf(this.currentStep);
    if (currentIndex < ONBOARDING_FLOW.length - 1) {
      return ONBOARDING_FLOW[currentIndex + 1];
    }
    return null;
  }

  getPreviousStep(): OnboardingStep | null {
    const currentIndex = ONBOARDING_FLOW.indexOf(this.currentStep);
    if (currentIndex > 0) {
      return ONBOARDING_FLOW[currentIndex - 1];
    }
    return null;
  }

  isStepCompleted(step: OnboardingStep): boolean {
    return this.completedSteps.includes(step);
  }

  isStepSkipped(step: OnboardingStep): boolean {
    return this.skippedSteps.includes(step);
  }

  canSkipStep(step: OnboardingStep): boolean {
    return !ONBOARDING_STEPS[step]?.required;
  }

  getRemainingSteps(): OnboardingStep[] {
    const currentIndex = ONBOARDING_FLOW.indexOf(this.currentStep);
    return ONBOARDING_FLOW.slice(currentIndex + 1);
  }

  getProgress(): {
    currentStep: OnboardingStep;
    currentStepIndex: number;
    totalSteps: number;
    completionPercentage: number;
    isCompleted: boolean;
  } {
    return {
      currentStep: this.currentStep,
      currentStepIndex: ONBOARDING_FLOW.indexOf(this.currentStep),
      totalSteps: ONBOARDING_FLOW.length,
      completionPercentage: this.profileCompletionPercentage,
      isCompleted: this.isCompleted,
    };
  }

  toJSON(): Onboarding {
    return {
      id: this.id,
      userId: this.userId,
      currentStep: this.currentStep,
      completedSteps: this.completedSteps,
      profileCompletionPercentage: this.profileCompletionPercentage,
      dataCollected: this.dataCollected,
      languageSelected: this.languageSelected,
      locationSet: this.locationSet,
      prayerCalculationMethodSet: this.prayerCalculationMethodSet,
      notificationsConfigured: this.notificationsConfigured,
      privacyPreferencesSet: this.privacyPreferencesSet,
      displayPreferencesSet: this.displayPreferencesSet,
      isCompleted: this.isCompleted,
      skippedSteps: this.skippedSteps,
      completionDate: this.completionDate,
      startedAt: this.startedAt,
      updatedAt: this.updatedAt,
    };
  }
}