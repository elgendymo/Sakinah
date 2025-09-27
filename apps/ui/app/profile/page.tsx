'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';
import PageContainer from '@/components/PageContainer';
import { UserPreferencesService, Language, PrayerCalculationMethod, Location } from '@/lib/services/user-preferences-service';
import { LocationSelector } from '@/components/LocationSelector';
import {
  Person,
  CheckCircle,
  AccountBalance,
  Public,
  Lock,
  Notifications,
  WbSunny,
  MenuBook,
  LocalFireDepartment,
  Warning,
  Close,
  Save,
  ExitToApp,
  Delete
} from '@mui/icons-material';

export default function ProfilePage() {
  const t = useTranslations('profile');

  const [profile, setProfile] = useState({
    name: '',
    email: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: 'en' as Language,
    location: null as Location | null,
    prayerCalculationMethod: 'ISNA' as PrayerCalculationMethod,
    notifications: {
      fajr: true,
      daily_reminder: true,
      habit_streak: false,
    },
    privacy: {
      data_sharing: false,
      analytics: false,
    },
    display: {
      theme: 'light' as 'light' | 'dark' | 'auto',
      fontSize: 'medium' as 'small' | 'medium' | 'large',
      showArabicWithTranslation: true,
    },
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [preferencesService] = useState(() => new UserPreferencesService());

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setProfile(prev => ({
          ...prev,
          email: user.email || '',
          name: user.user_metadata?.name || '',
        }));

        // Load preferences from backend
        const result = await preferencesService.getPreferences();
        if (result.success && result.data) {
          const prefs = result.data;
          setProfile(prev => ({
            ...prev,
            language: prefs.language,
            location: prefs.location || null,
            prayerCalculationMethod: prefs.prayerCalculationMethod,
            notifications: {
              fajr: prefs.notificationSettings.fajrReminder ?? true,
              daily_reminder: prefs.notificationSettings.dailyReminder ?? true,
              habit_streak: prefs.notificationSettings.habitStreak ?? false,
            },
            privacy: {
              data_sharing: prefs.privacySettings.dataSharing ?? false,
              analytics: prefs.privacySettings.analytics ?? false,
            },
            display: {
              theme: prefs.displaySettings.theme || 'light',
              fontSize: prefs.displaySettings.fontSize || 'medium',
              showArabicWithTranslation: prefs.displaySettings.showArabicWithTranslation ?? true,
            },
          }));
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const saveProfile = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Validate required fields
      if (!profile.name?.trim()) {
        setError(t('nameRequired'));
        setLoading(false);
        return;
      }

      // Update user metadata
      if (profile.name) {
        const { error: authError } = await supabase.auth.updateUser({
          data: { name: profile.name }
        });

        if (authError) {
          throw new Error(`Failed to update profile: ${authError.message}`);
        }
      }

      // Save preferences to backend
      const result = await preferencesService.updatePreferences({
        language: profile.language,
        location: profile.location || undefined,
        prayerCalculationMethod: profile.prayerCalculationMethod,
        notificationSettings: {
          fajrReminder: profile.notifications.fajr,
          dailyReminder: profile.notifications.daily_reminder,
          habitStreak: profile.notifications.habit_streak,
          prayerTimes: true,
        },
        privacySettings: {
          dataSharing: profile.privacy.data_sharing,
          analytics: profile.privacy.analytics,
          publicProfile: false,
        },
        displaySettings: {
          theme: profile.display.theme,
          fontSize: profile.display.fontSize,
          showArabicWithTranslation: profile.display.showArabicWithTranslation,
        },
      });

      if (result.success) {
        setSuccess(t('profileSaved'));
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.error?.message || t('saveFailed'));
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      setError(error instanceof Error ? error.message : t('saveFailed'));
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <PageContainer
      title={t('title')}
      subtitle={t('subtitle')}
      maxWidth="4xl"
      padding="lg"
      center={false}
    >
      <div className="space-y-8 max-w-4xl mx-auto">

        {/* Profile Header */}
        <div className="relative overflow-hidden">
          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-200/30 via-gold-200/30 to-emerald-200/30 rounded-2xl blur-sm"></div>
          <div className="relative bg-white/95 backdrop-blur-sm rounded-2xl border border-emerald-100/50 shadow-lg overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-gold-400 to-emerald-400"></div>

            <div className="p-8">
              <div className="flex items-center gap-6">
                {/* Avatar */}
                <div className="relative">
                  <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg">
                    {profile.name ? (
                      <span className="text-white text-2xl">
                        {profile.name.charAt(0).toUpperCase()}
                      </span>
                    ) : (
                      <Person sx={{ color: 'white', fontSize: 32 }} />
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-400 rounded-full border-2 border-white flex items-center justify-center">
                    <CheckCircle sx={{ color: 'white', fontSize: 16 }} />
                  </div>
                </div>

                {/* User Info */}
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-sage-800 mb-1">
                    {profile.name || t('spiritualSeeker')}
                  </h2>
                  <p className="text-sage-600 mb-2">{profile.email}</p>
                  <div className="flex items-center gap-4 text-sm text-sage-500">
                    <span className="flex items-center gap-1">
                      <AccountBalance sx={{ fontSize: 16 }} />
                      {t('memberSince')} {new Date().getFullYear()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Public sx={{ fontSize: 16 }} />
                      {profile.timezone}
                    </span>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="hidden md:flex gap-6 text-center">
                  <div className="px-4 py-2 bg-emerald-50 rounded-lg border border-emerald-100">
                    <div className="text-lg font-semibold text-emerald-700">7</div>
                    <div className="text-xs text-emerald-600">{t('daysActive')}</div>
                  </div>
                  <div className="px-4 py-2 bg-gold-50 rounded-lg border border-gold-100">
                    <div className="text-lg font-semibold text-gold-700">3</div>
                    <div className="text-xs text-gold-600">{t('habits')}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Basic Information */}
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-100/50 to-sage-100/50 rounded-2xl blur-sm"></div>
            <div className="relative bg-white/95 backdrop-blur-sm rounded-2xl border border-emerald-100/50 shadow-lg overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-400 to-sage-400"></div>

              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-lg flex items-center justify-center">
                    <Person sx={{ color: 'white', fontSize: 24 }} />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-sage-800">{t('basicInformation')}</h3>
                    <p className="text-sm text-sage-600">{t('personalDetails')}</p>
                  </div>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-sage-700 mb-2">
                      {t('displayName')}
                    </label>
                    <input
                      type="text"
                      value={profile.name}
                      onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                      placeholder={t('displayNamePlaceholder')}
                      className="w-full px-4 py-3 bg-white border border-sage-200 rounded-xl focus:ring-2 focus:ring-emerald-300/50 focus:border-emerald-300 transition-all duration-200 text-sage-800 placeholder-sage-400"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-sage-700 mb-2">
                      {t('emailAddress')}
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        value={profile.email}
                        disabled
                        className="w-full px-4 py-3 bg-sage-50 border border-sage-200 rounded-xl text-sage-600 cursor-not-allowed"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <Lock sx={{ color: '#6b7280', fontSize: 20 }} />
                      </div>
                    </div>
                    <p className="text-xs text-sage-500 mt-1">
                      {t('emailNote')}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-sage-700 mb-2">
                      {t('timezone')}
                    </label>
                    <select
                      value={profile.timezone}
                      onChange={(e) => setProfile(prev => ({ ...prev, timezone: e.target.value }))}
                      className="w-full px-4 py-3 bg-white border border-sage-200 rounded-xl focus:ring-2 focus:ring-emerald-300/50 focus:border-emerald-300 transition-all duration-200 text-sage-800"
                    >
                      <option value={Intl.DateTimeFormat().resolvedOptions().timeZone}>
                        {Intl.DateTimeFormat().resolvedOptions().timeZone} ({t('autoDetected')})
                      </option>
                      <option value="America/New_York">{t('timezones.eastern')}</option>
                      <option value="America/Chicago">{t('timezones.central')}</option>
                      <option value="America/Denver">{t('timezones.mountain')}</option>
                      <option value="America/Los_Angeles">{t('timezones.pacific')}</option>
                      <option value="Europe/London">{t('timezones.london')}</option>
                      <option value="Asia/Dubai">{t('timezones.dubai')}</option>
                      <option value="Asia/Riyadh">{t('timezones.riyadh')}</option>
                      <option value="Asia/Karachi">{t('timezones.karachi')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-sage-700 mb-2">
                      {t('language')}
                    </label>
                    <select
                      value={profile.language}
                      onChange={(e) => setProfile(prev => ({ ...prev, language: e.target.value as any }))}
                      className="w-full px-4 py-3 bg-white border border-sage-200 rounded-xl focus:ring-2 focus:ring-emerald-300/50 focus:border-emerald-300 transition-all duration-200 text-sage-800"
                    >
                      <option value="en">English</option>
                      <option value="ar">العربية (Arabic)</option>
                      <option value="ur">اردو (Urdu)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-sage-700 mb-2">
                      {t('prayerCalculationMethod')}
                    </label>
                    <select
                      value={profile.prayerCalculationMethod}
                      onChange={(e) => setProfile(prev => ({ ...prev, prayerCalculationMethod: e.target.value as any }))}
                      className="w-full px-4 py-3 bg-white border border-sage-200 rounded-xl focus:ring-2 focus:ring-emerald-300/50 focus:border-emerald-300 transition-all duration-200 text-sage-800"
                    >
                      <option value="ISNA">ISNA (Islamic Society of North America)</option>
                      <option value="MWL">Muslim World League</option>
                      <option value="Egypt">Egyptian General Authority</option>
                      <option value="Makkah">Umm Al-Qura, Makkah</option>
                      <option value="Karachi">University of Islamic Sciences, Karachi</option>
                      <option value="Tehran">Institute of Geophysics, Tehran</option>
                      <option value="Jafari">Shia Ithna-Ashari</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-sage-700 mb-2">
                      {t('location')}
                    </label>
                    <div className="w-full">
                      <LocationSelector
                        onLocationSelect={(location) => {
                          setProfile(prev => ({
                            ...prev,
                            location: {
                              lat: location.latitude,
                              lng: location.longitude,
                              city: location.city,
                              country: location.country
                            }
                          }));
                        }}
                        currentLocation={profile.location ? {
                          city: profile.location.city || '',
                          country: profile.location.country || '',
                          latitude: profile.location.lat,
                          longitude: profile.location.lng,
                          timezone: profile.timezone
                        } : undefined}
                      />
                    </div>
                    <p className="text-xs text-sage-500 mt-1">
                      {t('locationNote')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Notification Preferences */}
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-gold-100/50 to-emerald-100/50 rounded-2xl blur-sm"></div>
            <div className="relative bg-white/95 backdrop-blur-sm rounded-2xl border border-gold-100/50 overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-gold-400 to-emerald-400"></div>

              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-gold-400 to-gold-500 rounded-lg flex items-center justify-center">
                    <Notifications sx={{ color: 'white', fontSize: 24 }} />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-sage-800">{t('notifications')}</h3>
                    <p className="text-sm text-sage-600">{t('spiritualReminders')}</p>
                  </div>
                </div>

                <div className="space-y-5">
                  {[
                    {
                      key: 'fajr',
                      title: t('fajrReminder'),
                      description: t('fajrDescription'),
                      icon: <WbSunny sx={{ fontSize: 20, color: '#6b7280' }} />
                    },
                    {
                      key: 'daily_reminder',
                      title: t('dailyReminder'),
                      description: t('dailyDescription'),
                      icon: <MenuBook sx={{ fontSize: 20, color: '#6b7280' }} />
                    },
                    {
                      key: 'habit_streak',
                      title: t('habitStreak'),
                      description: t('habitDescription'),
                      icon: <LocalFireDepartment sx={{ fontSize: 20, color: '#6b7280' }} />
                    }
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between p-4 rounded-xl bg-sage-50/50 border border-sage-100 transition-all duration-200 hover:bg-sage-50">
                      <div className="flex items-center gap-3">
                        <div>{item.icon}</div>
                        <div>
                          <h4 className="font-medium text-sage-800">{item.title}</h4>
                          <p className="text-sm text-sage-600">{item.description}</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={profile.notifications[item.key as keyof typeof profile.notifications]}
                          onChange={(e) => setProfile(prev => ({
                            ...prev,
                            notifications: { ...prev.notifications, [item.key]: e.target.checked }
                          }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-sage-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-300/50 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 peer-checked:shadow-md"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Error and Success Messages */}
        {error && (
          <div className="relative overflow-hidden rounded-xl">
            <div className="absolute inset-0 bg-gradient-to-r from-red-50 to-rose-50"></div>
            <div className="relative p-4 border border-red-200/50">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Warning sx={{ color: '#dc2626', fontSize: 20 }} />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-red-800 mb-1">{t('error')}</h4>
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
                <button
                  onClick={() => setError('')}
                  className="p-1 hover:bg-red-200 rounded-lg transition-colors"
                >
                  <Close sx={{ color: '#ef4444', fontSize: 20 }} />
                </button>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="relative overflow-hidden rounded-xl">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-50 to-green-50"></div>
            <div className="relative p-4 border border-emerald-200/50">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <CheckCircle sx={{ color: '#059669', fontSize: 20 }} />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-emerald-800 mb-1">{t('success')}</h4>
                  <p className="text-emerald-700 text-sm">{success}</p>
                </div>
                <button
                  onClick={() => setSuccess('')}
                  className="p-1 hover:bg-emerald-200 rounded-lg transition-colors"
                >
                  <Close sx={{ color: '#10b981', fontSize: 20 }} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={saveProfile}
            disabled={loading}
            className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 px-6 rounded-xl font-medium transition-all duration-200 shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                <span>{t('saving')}</span>
              </>
            ) : (
              <>
                <span>{t('saveChanges')}</span>
                <Save sx={{ fontSize: 18 }} />
              </>
            )}
          </button>

          <button
            onClick={signOut}
            className="px-6 py-3 bg-white border border-sage-200 rounded-xl font-medium text-sage-700 hover:bg-sage-50 hover:border-sage-300 transition-all duration-200 flex items-center justify-center gap-2"
          >
            <span>{t('signOut')}</span>
            <ExitToApp sx={{ fontSize: 18 }} />
          </button>
        </div>

        {/* Account Deletion */}
        <div className="relative overflow-hidden rounded-xl">
          <div className="absolute inset-0 bg-gradient-to-r from-red-50 to-rose-50"></div>
          <div className="relative p-6 border border-red-200/50">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Warning sx={{ color: '#dc2626', fontSize: 24 }} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-800 mb-2">{t('accountDeletion')}</h3>
                <p className="text-red-700 text-sm mb-4 leading-relaxed">
                  {t('deletionWarning')}
                </p>
                <button className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 hover:text-red-800 rounded-lg font-medium text-sm transition-all duration-200">
                  <span>{t('requestDeletion')}</span>
                  <Delete sx={{ fontSize: 16 }} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}