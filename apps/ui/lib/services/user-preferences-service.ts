'use client';

import { BaseService } from './base-service';
import { EnhancedServiceResult } from '../utils/service-result';

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
  reminderTime?: string;
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
  updatedAt: string;
  createdAt: string;
}

export interface UpdatePreferencesDto {
  language?: Language;
  location?: Location;
  prayerCalculationMethod?: PrayerCalculationMethod;
  notificationSettings?: Partial<NotificationSettings>;
  privacySettings?: Partial<PrivacySettings>;
  displaySettings?: Partial<DisplaySettings>;
}

export class UserPreferencesService extends BaseService {
  constructor() {
    super('UserPreferencesService');
  }

  /**
   * Get the current user's preferences
   */
  async getPreferences(): Promise<EnhancedServiceResult<UserPreferences>> {
    return this.executeOperation(async () => {
      // Check if we're in development mode without a backend API
      const isDevelopmentMode = process.env.NODE_ENV === 'development';

      try {
        const response = await fetch('/api/v2/users/preferences', {
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        if (!response.ok) {
          if (isDevelopmentMode && (response.status === 404 || response.status === 500)) {
            // Return mock preferences in development mode if API is not available
            return this.getMockPreferences();
          }
          throw new Error(`Failed to fetch preferences: ${response.statusText}`);
        }

        const data = await response.json();
        return data.data;
      } catch (error) {
        // If fetch fails (e.g., network error, CORS), return mock data in development
        if (isDevelopmentMode) {
          console.warn('[UserPreferencesService] API not available, using mock preferences:', error);
          return this.getMockPreferences();
        }
        throw error;
      }
    }, 'getPreferences');
  }

  /**
   * Get mock preferences for development mode
   */
  private getMockPreferences(): UserPreferences {
    return {
      userId: 'dev-user-123',
      language: 'en',
      location: {
        lat: 51.5074,
        lng: -0.1278,
        city: 'London',
        country: 'UK'
      },
      prayerCalculationMethod: 'ISNA',
      notificationSettings: {
        fajrReminder: true,
        dailyReminder: true,
        habitStreak: false,
        prayerTimes: true,
        reminderTime: '06:00'
      },
      privacySettings: {
        dataSharing: false,
        analytics: false,
        publicProfile: false
      },
      displaySettings: {
        theme: 'light',
        fontSize: 'medium',
        showArabicWithTranslation: true
      },
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Update the current user's preferences
   */
  async updatePreferences(updates: UpdatePreferencesDto): Promise<EnhancedServiceResult<UserPreferences>> {
    return this.executeOperation(async () => {
      const isDevelopmentMode = process.env.NODE_ENV === 'development';

      try {
        const response = await fetch('/api/v2/users/preferences', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(updates),
        });

        if (!response.ok) {
          if (isDevelopmentMode && (response.status === 404 || response.status === 500)) {
            // Return mock updated preferences in development mode
            const mockPrefs = this.getMockPreferences();
            return { ...mockPrefs, ...updates };
          }
          throw new Error(`Failed to update preferences: ${response.statusText}`);
        }

        const data = await response.json();
        return data.data;
      } catch (error) {
        if (isDevelopmentMode) {
          console.warn('[UserPreferencesService] Update API not available, using mock response:', error);
          const mockPrefs = this.getMockPreferences();
          return { ...mockPrefs, ...updates };
        }
        throw error;
      }
    }, 'updatePreferences');
  }

  /**
   * Update only the language preference
   */
  async updateLanguage(language: Language): Promise<EnhancedServiceResult<{ language: Language }>> {
    return this.executeOperation(async () => {
      const response = await fetch('/api/v2/users/preferences/language', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ language }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update language: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data;
    }, 'updateLanguage');
  }

  /**
   * Update only the location
   */
  async updateLocation(location: Location): Promise<EnhancedServiceResult<{ location: Location }>> {
    return this.executeOperation(async () => {
      const response = await fetch('/api/v2/users/preferences/location', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(location),
      });

      if (!response.ok) {
        throw new Error(`Failed to update location: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data;
    }, 'updateLocation');
  }

  /**
   * Reset preferences to defaults
   */
  async resetPreferences(): Promise<EnhancedServiceResult<void>> {
    return this.executeOperation(async () => {
      const response = await fetch('/api/v2/users/preferences', {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to reset preferences: ${response.statusText}`);
      }

      return undefined;
    }, 'resetPreferences');
  }

  /**
   * Get or create default preferences for a user
   */
  async ensurePreferences(): Promise<EnhancedServiceResult<UserPreferences>> {
    const result = await this.getPreferences();

    // The backend automatically creates defaults if none exist
    // So we just return the result
    return result;
  }
}