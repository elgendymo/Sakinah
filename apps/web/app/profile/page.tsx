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
      title="Profile Settings"
      subtitle="Manage your account and spiritual preferences"
      maxWidth="lg"
      padding="lg"
    >

        <div className="space-y-8">

          {/* Basic Information */}
          <div className="card-islamic rounded-xl p-6 shadow-lg">
            <h2 className="text-xl font-semibold text-sage-900 mb-4">Basic Information</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-sage-900 mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="How would you like to be addressed?"
                  className="w-full px-4 py-3 border border-sage-200 rounded-lg focus:ring-2 focus:ring-accent/20 focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-sage-900 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={profile.email}
                  disabled
                  className="w-full px-4 py-3 border border-sage-200 rounded-lg bg-sage-100-muted text-sage-900-muted cursor-not-allowed"
                />
                <p className="text-xs text-sage-900-muted mt-1">
                  Email cannot be changed. Contact support if needed.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-sage-900 mb-2">
                  Timezone
                </label>
                <select
                  value={profile.timezone}
                  onChange={(e) => setProfile(prev => ({ ...prev, timezone: e.target.value }))}
                  className="w-full px-4 py-3 border border-sage-200 rounded-lg focus:ring-2 focus:ring-accent/20 focus:border-accent"
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
                <label className="block text-sm font-medium text-sage-900 mb-2">
                  Language
                </label>
                <select
                  value={profile.language}
                  onChange={(e) => setProfile(prev => ({ ...prev, language: e.target.value }))}
                  className="w-full px-4 py-3 border border-sage-200 rounded-lg focus:ring-2 focus:ring-accent/20 focus:border-accent"
                >
                  <option value="en">English</option>
                  <option value="ar">العربية (Arabic)</option>
                  <option value="ur">اردو (Urdu)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Notification Preferences */}
          <div className="card-islamic rounded-xl p-6 shadow-lg">
            <h2 className="text-xl font-semibold text-sage-900 mb-4">Notifications</h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-sage-900">Fajr Prayer Reminder</h3>
                  <p className="text-sm text-sage-900-muted">Get notified for Fajr prayer time</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profile.notifications.fajr}
                    onChange={(e) => setProfile(prev => ({
                      ...prev,
                      notifications: { ...prev.notifications, fajr: e.target.checked }
                    }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-accent/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-sage-900">Daily Spiritual Reminder</h3>
                  <p className="text-sm text-sage-900-muted">Daily encouragement and Quranic verses</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profile.notifications.daily_reminder}
                    onChange={(e) => setProfile(prev => ({
                      ...prev,
                      notifications: { ...prev.notifications, daily_reminder: e.target.checked }
                    }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-accent/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-sage-900">Habit Streak Reminders</h3>
                  <p className="text-sm text-sage-900-muted">Gentle reminders to maintain habits</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profile.notifications.habit_streak}
                    onChange={(e) => setProfile(prev => ({
                      ...prev,
                      notifications: { ...prev.notifications, habit_streak: e.target.checked }
                    }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-accent/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Privacy Settings */}
          <div className="card-islamic rounded-xl p-6 shadow-lg">
            <h2 className="text-xl font-semibold text-sage-900 mb-4">Privacy & Data</h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-sage-900">Data Sharing</h3>
                  <p className="text-sm text-sage-900-muted">Allow anonymous usage data for app improvement</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profile.privacy.data_sharing}
                    onChange={(e) => setProfile(prev => ({
                      ...prev,
                      privacy: { ...prev.privacy, data_sharing: e.target.checked }
                    }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-accent/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-sage-900">Analytics</h3>
                  <p className="text-sm text-sage-900-muted">Help us understand app performance</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profile.privacy.analytics}
                    onChange={(e) => setProfile(prev => ({
                      ...prev,
                      privacy: { ...prev.privacy, analytics: e.target.checked }
                    }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-accent/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                </label>
              </div>

              <div className="bg-accent/5 rounded-lg p-4 mt-4">
                <p className="text-sm text-sage-900-muted">
                  <strong>Privacy Promise:</strong> Your spiritual data (prayers, habits, reflections) is never shared or analyzed.
                  This data stays private between you and Allah.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              onClick={saveProfile}
              disabled={loading}
              className="flex-1 bg-accent text-white py-3 px-6 rounded-lg font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>

            <button
              onClick={signOut}
              className="px-6 py-3 border border-sage-200 rounded-lg font-medium hover:bg-sage-100-muted transition-colors"
            >
              Sign Out
            </button>
          </div>

          {/* Account Actions */}
          <div className="bg-red-50 rounded-lg p-6 border border-red-200">
            <h3 className="text-lg font-semibold text-red-800 mb-2">Account Actions</h3>
            <p className="text-red-700 text-sm mb-4">
              Need to delete your account? All your data will be permanently removed.
            </p>
            <button className="text-red-600 hover:text-red-800 font-medium text-sm">
              Request Account Deletion
            </button>
          </div>
        </div>
    </PageContainer>
  );
}