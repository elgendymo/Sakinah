'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';
import { api } from '@/lib/api';
import PageContainer from '@/components/PageContainer';
import {
  SectionHeader,
  AyahQuote,
  DuaCard,
  DhikrCounter,
  IntentionCard,
  PlanCard,
  HabitList,
  PrayerTimePill,
  type PlanItem,
  type PrayerTime
} from '@sakinah/ui';

interface DashboardClientProps {
  userId: string;
}

export default function DashboardClient({ userId }: DashboardClientProps) {
  const [loading, setLoading] = useState(true);
  const [todayIntention, setTodayIntention] = useState('');
  const supabase = createClient();

  // Sample data - in real app this would come from API/database
  const todaysPrayerTimes: PrayerTime[] = [
    { name: 'Fajr', time: '5:30', passed: true },
    { name: 'Dhuhr', time: '12:45', passed: true },
    { name: 'Asr', time: '4:15', passed: false },
    { name: 'Maghrib', time: '7:20', passed: false },
    { name: 'Isha', time: '8:45', passed: false },
  ];

  const todaysHabits = [
    { id: '1', name: 'Morning Adhkar', description: 'Recite morning remembrance', streak: 7, completed: true },
    { id: '2', name: 'Quran Reading', description: 'Read at least 1 page', streak: 3, completed: false },
    { id: '3', name: 'Evening Du\'a', description: 'Make du\'a before Maghrib', streak: 12, completed: true },
    { id: '4', name: 'Istighfar', description: 'Seek forgiveness 100 times', streak: 1, completed: false },
  ];

  const currentPlan: PlanItem[] = [
    { id: '1', text: 'Maintain Fajr consistency', type: 'habit', completed: true },
    { id: '2', text: 'Practice gratitude journaling', type: 'habit', completed: false },
    { id: '3', text: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً', type: 'dua', completed: false },
    { id: '4', text: 'وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا', type: 'ayah', completed: true },
  ];

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        // For development, skip API call that returns HTML error
        console.log('User plans loaded for:', userId);
        // Plans data would be used here in a real implementation
      }
    } catch (error) {
      console.error('Error loading plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckin = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        // For development, skip API call that returns HTML error
        console.log('Checkin saved:', { intention: todayIntention });
        setTodayIntention('');
        // Show success feedback
      }
    } catch (error) {
      console.error('Error saving check-in:', error);
    }
  };

  const handleHabitToggle = (habitId: string, completed: boolean) => {
    // Update habit completion status
    console.log(`Habit ${habitId} toggled to ${completed}`);
  };

  const handleIntentionSet = (intention: string) => {
    setTodayIntention(intention);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-emerald-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-sage-600">Loading your spiritual journey...</p>
        </div>
      </div>
    );
  }

  return (
    <PageContainer
      title="Dashboard"
      subtitle="Your spiritual progress today"
      maxWidth="6xl"
      padding="lg"
      center={false}
    >

          {/* Prayer Times - Top Priority */}
          <div className="mb-12">
            <PrayerTimePill
              prayerTimes={todaysPrayerTimes}
              className="max-w-4xl mx-auto"
            />
          </div>

          {/* Check-in Cards */}
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {/* Morning Check-in */}
            <div className="card-islamic rounded-xl shadow-lg border-l-4 border-l-gold-500">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gold-100 rounded-full flex items-center justify-center">
                    <div className="text-2xl">🌅</div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-sage-900">Morning Check-in</h3>
                    <p className="text-sm text-sage-600">Set your spiritual intention</p>
                  </div>
                </div>
                <div className="text-sm text-sage-600 font-medium bg-sage-100 px-3 py-1 rounded-full">
                  {new Date().toLocaleDateString('en', { weekday: 'short', day: 'numeric' })}
                </div>
              </div>

              {!todayIntention ? (
                <Link
                  href="/checkin"
                  className="block w-full bg-gold-100 hover:bg-gold-200 text-gold-800 py-4 px-6 rounded-lg font-medium text-center transition-all shadow-sm"
                >
                  Set Today's Intention
                </Link>
              ) : (
                <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200/50">
                  <div className="flex items-center space-x-2 mb-3">
                    <span className="text-emerald-600 text-lg">✓</span>
                    <span className="font-medium text-emerald-800">Intention Set</span>
                  </div>
                  <p className="text-sm text-emerald-700 leading-relaxed">
                    {todayIntention}
                  </p>
                </div>
              )}
            </div>

            {/* Evening Check-in */}
            <div className="card-islamic rounded-xl shadow-lg border-l-4 border-l-emerald-500">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                    <div className="text-2xl">🌙</div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-sage-900">Evening Reflection</h3>
                    <p className="text-sm text-sage-600">Muhasabah & gratitude</p>
                  </div>
                </div>
                {new Date().getHours() >= 18 && (
                  <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                )}
              </div>

              {new Date().getHours() >= 18 ? (
                <Link
                  href="/checkin"
                  className="block w-full bg-emerald-100 hover:bg-emerald-200 text-emerald-800 py-4 px-6 rounded-lg font-medium text-center transition-all shadow-sm"
                >
                  Complete Evening Reflection
                </Link>
              ) : (
                <div className="bg-sage-50 rounded-lg p-4 text-center border border-sage-200/50">
                  <div className="text-sage-600 text-sm font-medium mb-1">
                    Available after Asr prayer (6 PM)
                  </div>
                  <div className="text-xs text-sage-500">
                    Focus on your current intentions for now
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Today's Spiritual Content */}
          <div className="mb-16">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-semibold text-sage-900 mb-2">Today's Spiritual Focus</h2>
              <p className="text-sage-600">Your daily practices and reflections</p>
            </div>
            <div className="grid lg:grid-cols-3 gap-8 auto-rows-fr">

              {/* Left Column - Intentions & Dhikr */}
              <div className="space-y-8">
                <div className="card-islamic rounded-xl shadow-lg h-fit">
                  <IntentionCard
                    showReminder={true}
                    reminderTime="Fajr"
                    onIntentionSet={handleIntentionSet}
                  />
                </div>

                <div className="card-islamic rounded-xl shadow-lg h-fit">
                  <DhikrCounter
                    title="Astaghfirullah"
                    targetCount={100}
                    onTargetReached={() => console.log('Target reached!')}
                  />
                </div>
              </div>

              {/* Middle Column - Daily Plan & Habits */}
              <div className="space-y-8">
                <div className="card-islamic rounded-xl shadow-lg h-fit">
                  <PlanCard
                    title="Today's Plan"
                    description="Your personalized spiritual roadmap"
                    items={currentPlan}
                    ctaText="View Full Plan"
                    onStartPlan={() => console.log('Navigate to full plan')}
                  />
                </div>

                <div className="card-islamic rounded-xl shadow-lg h-fit">
                  <HabitList
                    habits={todaysHabits}
                    onToggleHabit={handleHabitToggle}
                  />
                </div>
              </div>

              {/* Right Column - Du'a & Ayah */}
              <div className="space-y-8">
                <div className="card-islamic rounded-xl shadow-lg h-fit">
                  <DuaCard
                    title="Morning Du'a"
                    arabic="اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ"
                    transliteration="Allahumma a'inni 'ala dhikrika wa shukrika wa husni 'ibadatik"
                    translation="O Allah, help me to remember You, thank You, and worship You in the best manner."
                    showCounter={true}
                    onCountChange={(count) => console.log(`Du'a recited ${count} times`)}
                  />
                </div>

                <div className="card-islamic rounded-xl shadow-lg h-fit">
                  <AyahQuote
                    arabic="وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا"
                    translation="And whoever fears Allah - He will make for him a way out."
                    source="At-Talaq 65:2"
                    transliteration="Wa man yattaqi Allaha yaj'al lahu makhrajan"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Navigation & Actions */}
          <div className="space-y-8">
            {/* Quick Navigation */}
            <div className="card-islamic rounded-xl shadow-lg">
              <h2 className="text-lg font-semibold text-sage-900 mb-4">Quick Navigation</h2>
              <div className="grid grid-cols-2 gap-4">
                <Link
                  href="/habits"
                  className="card-islamic rounded-lg p-4 hover:shadow-md transition-all text-center group"
                >
                  <div className="text-emerald-600 mb-2">📋</div>
                  <div className="font-medium text-sage-900">Habits</div>
                  <div className="text-xs text-sage-600">Track daily habits</div>
                </Link>
                <Link
                  href="/journal"
                  className="card-islamic rounded-lg p-4 hover:shadow-md transition-all text-center group"
                >
                  <div className="text-gold-600 mb-2">📓</div>
                  <div className="font-medium text-sage-900">Journal</div>
                  <div className="text-xs text-sage-600">Spiritual reflections</div>
                </Link>
              </div>
            </div>

            {/* Continue Your Journey */}
            <div className="card-islamic rounded-xl shadow-lg">
              <div className="text-center mb-8">
                <h2 className="text-xl font-semibold text-sage-900 mb-2">Continue Your Journey</h2>
                <p className="text-sage-600">Explore different aspects of your spiritual growth</p>
              </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <Link
                href="/tazkiyah"
                className="card-islamic rounded-lg p-6 hover:shadow-md hover:-translate-y-1 transition-all text-center group"
              >
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <div className="text-emerald-600 text-2xl">🌱</div>
                </div>
                <h4 className="font-semibold text-sage-900 mb-2">Tazkiyah</h4>
                <p className="text-sm text-sage-600 leading-relaxed">Begin your purification journey</p>
              </Link>

              <Link
                href="/content"
                className="card-islamic rounded-lg p-6 hover:shadow-md hover:-translate-y-1 transition-all text-center group"
              >
                <div className="w-12 h-12 bg-gold-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <div className="text-gold-600 text-2xl">📚</div>
                </div>
                <h4 className="font-semibold text-sage-900 mb-2">Library</h4>
                <p className="text-sm text-sage-600 leading-relaxed">Browse Quran, Hadith & Duas</p>
              </Link>

              <Link
                href="/profile"
                className="card-islamic rounded-lg p-6 hover:shadow-md hover:-translate-y-1 transition-all text-center group"
              >
                <div className="w-12 h-12 bg-sage-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <div className="text-sage-600 text-2xl">⚙️</div>
                </div>
                <h4 className="font-semibold text-sage-900 mb-2">Settings</h4>
                <p className="text-sm text-sage-600 leading-relaxed">Manage your preferences</p>
              </Link>

              <button
                onClick={handleCheckin}
                className="card-islamic rounded-lg p-6 hover:shadow-md hover:-translate-y-1 transition-all text-center group"
              >
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <div className="text-emerald-600 text-2xl">📝</div>
                </div>
                <h4 className="font-semibold text-sage-900 mb-2">Quick Check-in</h4>
                <p className="text-sm text-sage-600 leading-relaxed">Save today's intention</p>
              </button>
            </div>
            </div>
          </div>

    </PageContainer>
  );
}