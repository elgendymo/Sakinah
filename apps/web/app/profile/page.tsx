'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';
import PageContainer from '@/components/PageContainer';

export default function ProfilePage() {
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: 'en',
    notifications: {
      fajr: true,
      daily_reminder: true,
      habit_streak: false,
    },
    privacy: {
      data_sharing: false,
      analytics: false,
    },
  });

  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        setProfile(prev => ({
          ...prev,
          email: user.email || '',
          name: user.user_metadata?.name || '',
        }));
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const saveProfile = async () => {
    setLoading(true);
    try {
      // In a real app, save to API/database
      console.log('Saving profile:', profile);

      // Update user metadata
      if (profile.name) {
        await supabase.auth.updateUser({
          data: { name: profile.name }
        });
      }

      alert('Profile saved successfully!');
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save profile');
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
      title="Profile & Settings"
      subtitle="Manage your spiritual journey preferences"
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
                    <span className="text-white text-2xl">
                      {profile.name ? profile.name.charAt(0).toUpperCase() : '👤'}
                    </span>
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-400 rounded-full border-2 border-white flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                </div>

                {/* User Info */}
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-sage-800 mb-1">
                    {profile.name || 'Spiritual Seeker'}
                  </h2>
                  <p className="text-sage-600 mb-2">{profile.email}</p>
                  <div className="flex items-center gap-4 text-sm text-sage-500">
                    <span className="flex items-center gap-1">
                      <span>🕌</span>
                      Member since {new Date().getFullYear()}
                    </span>
                    <span className="flex items-center gap-1">
                      <span>🌍</span>
                      {profile.timezone}
                    </span>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="hidden md:flex gap-6 text-center">
                  <div className="px-4 py-2 bg-emerald-50 rounded-lg border border-emerald-100">
                    <div className="text-lg font-semibold text-emerald-700">7</div>
                    <div className="text-xs text-emerald-600">Days Active</div>
                  </div>
                  <div className="px-4 py-2 bg-gold-50 rounded-lg border border-gold-100">
                    <div className="text-lg font-semibold text-gold-700">3</div>
                    <div className="text-xs text-gold-600">Habits</div>
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
                    <span className="text-white text-lg">👤</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-sage-800">Basic Information</h3>
                    <p className="text-sm text-sage-600">Your personal details</p>
                  </div>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-sage-700 mb-2">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={profile.name}
                      onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="How would you like to be addressed?"
                      className="w-full px-4 py-3 bg-white border border-sage-200 rounded-xl focus:ring-2 focus:ring-emerald-300/50 focus:border-emerald-300 transition-all duration-200 text-sage-800 placeholder-sage-400"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-sage-700 mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        value={profile.email}
                        disabled
                        className="w-full px-4 py-3 bg-sage-50 border border-sage-200 rounded-xl text-sage-600 cursor-not-allowed"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-sage-400">🔒</span>
                      </div>
                    </div>
                    <p className="text-xs text-sage-500 mt-1">
                      Email cannot be changed. Contact support if needed.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-sage-700 mb-2">
                      Timezone
                    </label>
                    <select
                      value={profile.timezone}
                      onChange={(e) => setProfile(prev => ({ ...prev, timezone: e.target.value }))}
                      className="w-full px-4 py-3 bg-white border border-sage-200 rounded-xl focus:ring-2 focus:ring-emerald-300/50 focus:border-emerald-300 transition-all duration-200 text-sage-800"
                    >
                      <option value={Intl.DateTimeFormat().resolvedOptions().timeZone}>
                        {Intl.DateTimeFormat().resolvedOptions().timeZone} (Auto-detected)
                      </option>
                      <option value="America/New_York">Eastern Time (US)</option>
                      <option value="America/Chicago">Central Time (US)</option>
                      <option value="America/Denver">Mountain Time (US)</option>
                      <option value="America/Los_Angeles">Pacific Time (US)</option>
                      <option value="Europe/London">London</option>
                      <option value="Asia/Dubai">Dubai</option>
                      <option value="Asia/Riyadh">Riyadh</option>
                      <option value="Asia/Karachi">Karachi</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-sage-700 mb-2">
                      Language
                    </label>
                    <select
                      value={profile.language}
                      onChange={(e) => setProfile(prev => ({ ...prev, language: e.target.value }))}
                      className="w-full px-4 py-3 bg-white border border-sage-200 rounded-xl focus:ring-2 focus:ring-emerald-300/50 focus:border-emerald-300 transition-all duration-200 text-sage-800"
                    >
                      <option value="en">🇺🇸 English</option>
                      <option value="ar">🇸🇦 العربية (Arabic)</option>
                      <option value="ur">🇵🇰 اردو (Urdu)</option>
                    </select>
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
                    <span className="text-white text-lg">🔔</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-sage-800">Notifications</h3>
                    <p className="text-sm text-sage-600">Spiritual reminders</p>
                  </div>
                </div>

                <div className="space-y-5">
                  {[
                    {
                      key: 'fajr',
                      title: 'Fajr Prayer Reminder',
                      description: 'Get notified for Fajr prayer time',
                      icon: '🌅'
                    },
                    {
                      key: 'daily_reminder',
                      title: 'Daily Spiritual Reminder',
                      description: 'Daily encouragement and Quranic verses',
                      icon: '📖'
                    },
                    {
                      key: 'habit_streak',
                      title: 'Habit Streak Reminders',
                      description: 'Gentle reminders to maintain habits',
                      icon: '🔥'
                    }
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between p-4 rounded-xl bg-sage-50/50 border border-sage-100 transition-all duration-200 hover:bg-sage-50">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{item.icon}</span>
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
                <span>Saving...</span>
              </>
            ) : (
              <>
                <span>Save Changes</span>
                <span className="text-sm">💾</span>
              </>
            )}
          </button>

          <button
            onClick={signOut}
            className="px-6 py-3 bg-white border border-sage-200 rounded-xl font-medium text-sage-700 hover:bg-sage-50 hover:border-sage-300 transition-all duration-200 flex items-center justify-center gap-2"
          >
            <span>Sign Out</span>
            <span className="text-sm">🚪</span>
          </button>
        </div>

        {/* Account Deletion */}
        <div className="relative overflow-hidden rounded-xl">
          <div className="absolute inset-0 bg-gradient-to-r from-red-50 to-rose-50"></div>
          <div className="relative p-6 border border-red-200/50">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-red-600 text-lg">⚠️</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-800 mb-2">Account Deletion</h3>
                <p className="text-red-700 text-sm mb-4 leading-relaxed">
                  Need to delete your account? All your spiritual data will be permanently removed and cannot be recovered.
                </p>
                <button className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 hover:text-red-800 rounded-lg font-medium text-sm transition-all duration-200">
                  <span>Request Account Deletion</span>
                  <span className="text-xs">🗑️</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}