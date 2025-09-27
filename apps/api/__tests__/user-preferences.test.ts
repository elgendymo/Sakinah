import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserPreferencesEntity } from '../src/domain/entities/UserPreferences';
import { UserPreferencesRepository } from '../src/infrastructure/repos/UserPreferencesRepository';
import { Result } from '../src/shared/result';
import { IDatabaseClient } from '../src/infrastructure/database/types';

describe('UserPreferences', () => {
  describe('UserPreferencesEntity', () => {
    it('should create a user preferences entity with default values', () => {
      const userId = 'test-user-123';
      const preferences = UserPreferencesEntity.createDefault(userId);

      expect(preferences.userId).toBe(userId);
      expect(preferences.language).toBe('en');
      expect(preferences.location).toBeUndefined();
      expect(preferences.prayerCalculationMethod).toBe('ISNA');
      expect(preferences.notificationSettings.fajrReminder).toBe(true);
      expect(preferences.notificationSettings.dailyReminder).toBe(true);
      expect(preferences.notificationSettings.habitStreak).toBe(false);
      expect(preferences.privacySettings.dataSharing).toBe(false);
      expect(preferences.privacySettings.analytics).toBe(false);
      expect(preferences.displaySettings.theme).toBe('light');
      expect(preferences.displaySettings.fontSize).toBe('medium');
    });

    it('should update language', () => {
      const preferences = UserPreferencesEntity.createDefault('test-user');
      const originalUpdatedAt = preferences.updatedAt;

      // Wait a bit to ensure time difference
      setTimeout(() => {
        preferences.updateLanguage('ar');

        expect(preferences.language).toBe('ar');
        expect(preferences.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
      }, 10);
    });

    it('should update location', () => {
      const preferences = UserPreferencesEntity.createDefault('test-user');
      const location = { lat: 40.7128, lng: -74.0060, city: 'New York', country: 'USA' };

      preferences.updateLocation(location);

      expect(preferences.location).toEqual(location);
    });

    it('should update prayer calculation method', () => {
      const preferences = UserPreferencesEntity.createDefault('test-user');

      preferences.updatePrayerCalculationMethod('Makkah');

      expect(preferences.prayerCalculationMethod).toBe('Makkah');
    });

    it('should update notification settings', () => {
      const preferences = UserPreferencesEntity.createDefault('test-user');

      preferences.updateNotificationSettings({
        habitStreak: true,
        reminderTime: '09:00',
      });

      expect(preferences.notificationSettings.habitStreak).toBe(true);
      expect(preferences.notificationSettings.reminderTime).toBe('09:00');
      expect(preferences.notificationSettings.fajrReminder).toBe(true); // Should remain unchanged
    });

    it('should update privacy settings', () => {
      const preferences = UserPreferencesEntity.createDefault('test-user');

      preferences.updatePrivacySettings({
        analytics: true,
      });

      expect(preferences.privacySettings.analytics).toBe(true);
      expect(preferences.privacySettings.dataSharing).toBe(false); // Should remain unchanged
    });

    it('should update display settings', () => {
      const preferences = UserPreferencesEntity.createDefault('test-user');

      preferences.updateDisplaySettings({
        theme: 'dark',
        fontSize: 'large',
      });

      expect(preferences.displaySettings.theme).toBe('dark');
      expect(preferences.displaySettings.fontSize).toBe('large');
      expect(preferences.displaySettings.showArabicWithTranslation).toBe(true); // Should remain unchanged
    });

    it('should convert to JSON', () => {
      const preferences = UserPreferencesEntity.createDefault('test-user');
      const json = preferences.toJSON();

      expect(json).toHaveProperty('userId');
      expect(json).toHaveProperty('language');
      expect(json).toHaveProperty('prayerCalculationMethod');
      expect(json).toHaveProperty('notificationSettings');
      expect(json).toHaveProperty('privacySettings');
      expect(json).toHaveProperty('displaySettings');
      expect(json).toHaveProperty('updatedAt');
      expect(json).toHaveProperty('createdAt');
    });
  });

  describe('UserPreferencesRepository', () => {
    let repository: UserPreferencesRepository;
    let mockDb: Partial<IDatabaseClient>;

    beforeEach(() => {
      mockDb = {
        getUserPreferences: vi.fn(),
        createUserPreferences: vi.fn(),
        updateUserPreferences: vi.fn(),
        upsertUserPreferences: vi.fn(),
        deleteUserPreferences: vi.fn(),
      };

      repository = new UserPreferencesRepository(mockDb as IDatabaseClient);
    });

    describe('getByUserId', () => {
      it('should return preferences when found', async () => {
        const mockData = {
          userId: 'test-user',
          language: 'en' as const,
          location: { lat: 40.7128, lng: -74.0060 },
          prayerCalculationMethod: 'ISNA' as const,
          notificationSettings: {},
          privacySettings: {},
          displaySettings: {},
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        };

        vi.mocked(mockDb.getUserPreferences!).mockResolvedValue({
          data: mockData,
          error: null,
        });

        const result = await repository.getByUserId('test-user');

        expect(result.isSuccess).toBe(true);
        expect(result.data).toBeInstanceOf(UserPreferencesEntity);
        expect(result.data?.userId).toBe('test-user');
      });

      it('should return null when preferences not found', async () => {
        vi.mocked(mockDb.getUserPreferences!).mockResolvedValue({
          data: null,
          error: null,
        });

        const result = await repository.getByUserId('test-user');

        expect(result.isSuccess).toBe(true);
        expect(result.data).toBeNull();
      });

      it('should return error when database error occurs', async () => {
        vi.mocked(mockDb.getUserPreferences!).mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        });

        const result = await repository.getByUserId('test-user');

        expect(result.isSuccess).toBe(false);
        expect(result.error?.message).toBe('Database error');
      });
    });

    describe('create', () => {
      it('should create preferences successfully', async () => {
        const preferences = UserPreferencesEntity.createDefault('test-user');
        const mockData = {
          userId: 'test-user',
          language: 'en' as const,
          location: undefined,
          prayerCalculationMethod: 'ISNA' as const,
          notificationSettings: preferences.notificationSettings,
          privacySettings: preferences.privacySettings,
          displaySettings: preferences.displaySettings,
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        };

        vi.mocked(mockDb.createUserPreferences!).mockResolvedValue({
          data: mockData,
          error: null,
        });

        const result = await repository.create(preferences);

        expect(result.isSuccess).toBe(true);
        expect(result.data).toBeInstanceOf(UserPreferencesEntity);
        expect(result.data?.userId).toBe('test-user');
      });

      it('should return error when creation fails', async () => {
        const preferences = UserPreferencesEntity.createDefault('test-user');

        vi.mocked(mockDb.createUserPreferences!).mockResolvedValue({
          data: null,
          error: { message: 'Failed to create' },
        });

        const result = await repository.create(preferences);

        expect(result.isSuccess).toBe(false);
        expect(result.error?.message).toBe('Failed to create');
      });
    });

    describe('update', () => {
      it('should update preferences successfully', async () => {
        const preferences = UserPreferencesEntity.createDefault('test-user');
        preferences.updateLanguage('ar');

        const mockData = {
          userId: 'test-user',
          language: 'ar' as const,
          location: undefined,
          prayerCalculationMethod: 'ISNA' as const,
          notificationSettings: preferences.notificationSettings,
          privacySettings: preferences.privacySettings,
          displaySettings: preferences.displaySettings,
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        };

        vi.mocked(mockDb.updateUserPreferences!).mockResolvedValue({
          data: mockData,
          error: null,
        });

        const result = await repository.update(preferences);

        expect(result.isSuccess).toBe(true);
        expect(result.data?.language).toBe('ar');
      });
    });

    describe('upsert', () => {
      it('should upsert preferences successfully', async () => {
        const preferences = UserPreferencesEntity.createDefault('test-user');

        const mockData = {
          userId: 'test-user',
          language: 'en' as const,
          location: undefined,
          prayerCalculationMethod: 'ISNA' as const,
          notificationSettings: preferences.notificationSettings,
          privacySettings: preferences.privacySettings,
          displaySettings: preferences.displaySettings,
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        };

        vi.mocked(mockDb.upsertUserPreferences!).mockResolvedValue({
          data: mockData,
          error: null,
        });

        const result = await repository.upsert(preferences);

        expect(result.isSuccess).toBe(true);
        expect(result.data).toBeInstanceOf(UserPreferencesEntity);
      });
    });

    describe('delete', () => {
      it('should delete preferences successfully', async () => {
        vi.mocked(mockDb.deleteUserPreferences!).mockResolvedValue({
          data: undefined,
          error: null,
        });

        const result = await repository.delete('test-user');

        expect(result.isSuccess).toBe(true);
        expect(result.data).toBeUndefined();
      });

      it('should return error when deletion fails', async () => {
        vi.mocked(mockDb.deleteUserPreferences!).mockResolvedValue({
          data: undefined,
          error: { message: 'User preferences not found' },
        });

        const result = await repository.delete('test-user');

        expect(result.isSuccess).toBe(false);
        expect(result.error?.message).toBe('User preferences not found');
      });
    });
  });
});