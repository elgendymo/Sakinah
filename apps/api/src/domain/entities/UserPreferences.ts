export type Language = 'en' | 'ar' | 'ur';
export type PrayerCalculationMethod = 'ISNA' | 'MWL' | 'Egypt' | 'Makkah' | 'Karachi' | 'Tehran' | 'Jafari';

export interface Location {
  lat: number;
  lng: number;
  city?: string;
  country?: string;
}

export interface NotificationSettings {
  fajrReminder?: boolean;
  dailyReminder?: boolean;
  habitStreak?: boolean;
  prayerTimes?: boolean;
  reminderTime?: string; // HH:mm format
}

export interface PrivacySettings {
  dataSharing?: boolean;
  analytics?: boolean;
  publicProfile?: boolean;
}

export interface DisplaySettings {
  theme?: 'light' | 'dark' | 'auto';
  fontSize?: 'small' | 'medium' | 'large';
  showArabicWithTranslation?: boolean;
}

export interface UserPreferences {
  userId: string;
  language: Language;
  location?: Location;
  prayerCalculationMethod: PrayerCalculationMethod;
  notificationSettings: NotificationSettings;
  privacySettings: PrivacySettings;
  displaySettings: DisplaySettings;
  updatedAt: Date;
  createdAt: Date;
}

export class UserPreferencesEntity implements UserPreferences {
  constructor(
    public userId: string,
    public language: Language = 'en',
    public location: Location | undefined = undefined,
    public prayerCalculationMethod: PrayerCalculationMethod = 'ISNA',
    public notificationSettings: NotificationSettings = {},
    public privacySettings: PrivacySettings = {},
    public displaySettings: DisplaySettings = {},
    public updatedAt: Date = new Date(),
    public createdAt: Date = new Date()
  ) {}

  static createDefault(userId: string): UserPreferencesEntity {
    return new UserPreferencesEntity(
      userId,
      'en',
      undefined,
      'ISNA',
      {
        fajrReminder: true,
        dailyReminder: true,
        habitStreak: false,
        prayerTimes: true,
      },
      {
        dataSharing: false,
        analytics: false,
        publicProfile: false,
      },
      {
        theme: 'light',
        fontSize: 'medium',
        showArabicWithTranslation: true,
      }
    );
  }

  updateLanguage(language: Language): void {
    this.language = language;
    this.updatedAt = new Date();
  }

  updateLocation(location: Location): void {
    this.location = location;
    this.updatedAt = new Date();
  }

  updatePrayerCalculationMethod(method: PrayerCalculationMethod): void {
    this.prayerCalculationMethod = method;
    this.updatedAt = new Date();
  }

  updateNotificationSettings(settings: Partial<NotificationSettings>): void {
    this.notificationSettings = { ...this.notificationSettings, ...settings };
    this.updatedAt = new Date();
  }

  updatePrivacySettings(settings: Partial<PrivacySettings>): void {
    this.privacySettings = { ...this.privacySettings, ...settings };
    this.updatedAt = new Date();
  }

  updateDisplaySettings(settings: Partial<DisplaySettings>): void {
    this.displaySettings = { ...this.displaySettings, ...settings };
    this.updatedAt = new Date();
  }

  toJSON(): UserPreferences {
    return {
      userId: this.userId,
      language: this.language,
      location: this.location,
      prayerCalculationMethod: this.prayerCalculationMethod,
      notificationSettings: this.notificationSettings,
      privacySettings: this.privacySettings,
      displaySettings: this.displaySettings,
      updatedAt: this.updatedAt,
      createdAt: this.createdAt,
    };
  }
}