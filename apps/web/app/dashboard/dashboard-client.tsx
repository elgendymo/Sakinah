'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase-browser';
import PageContainer from '@/components/PageContainer';
import { LocationSelector } from '@/components/LocationSelector';
import {
  CalculationMethod,
  PrayerTimes as AdhanPrayerTimes,
  Coordinates,
  Madhab
} from 'adhan';
import {
  AyahQuote,
  DuaCard,
  type PlanItem,
  type PrayerTime
} from '@sakinah/ui';

interface DashboardClientProps {
  userId: string;
}

interface Location {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export default function DashboardClient({ userId }: DashboardClientProps) {
  const t = useTranslations('dashboard');
  const tCommon = useTranslations('common');
  const tPrayers = useTranslations('prayers');
  const tHabits = useTranslations('habits');
  const [loading, setLoading] = useState(true);
  const [todayIntention, setTodayIntention] = useState('');
  const [isEditingIntention, setIsEditingIntention] = useState(false);
  const [tempIntention, setTempIntention] = useState('');
  const [dhikrCount, setDhikrCount] = useState(0);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [prayerTimes, setPrayerTimes] = useState<PrayerTime[]>([
    { name: tPrayers('fajr'), time: '5:30', passed: true },
    { name: tPrayers('dhuhr'), time: '12:45', passed: true },
    { name: tPrayers('asr'), time: '4:15', passed: false },
    { name: tPrayers('maghrib'), time: '7:20', passed: false },
    { name: tPrayers('isha'), time: '8:45', passed: false },
  ]);
  const supabase = createClient();

  const todaysHabits = [
    { id: '1', name: tHabits('morningAdhkar'), description: tHabits('reciteMorningRemembrance'), streak: 7, completed: true },
    { id: '2', name: tHabits('quranReading'), description: tHabits('readAtLeastOnePage'), streak: 3, completed: false },
    { id: '3', name: tHabits('eveningDua'), description: tHabits('makeDuaBeforeMaghrib'), streak: 12, completed: true },
    { id: '4', name: tHabits('istighfar'), description: tHabits('seekForgiveness100Times'), streak: 1, completed: false },
  ];

  const currentPlan: PlanItem[] = [
    { id: '1', text: 'Maintain Fajr consistency', type: 'habit', completed: true },
    { id: '2', text: 'Practice gratitude journaling', type: 'habit', completed: false },
    { id: '3', text: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً', type: 'dua', completed: false },
    { id: '4', text: 'وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا', type: 'ayah', completed: true },
  ];

  useEffect(() => {
    loadPlans();

    // Load saved location from localStorage
    const savedLocation = localStorage.getItem('selectedLocation');
    if (savedLocation) {
      setSelectedLocation(JSON.parse(savedLocation));
    } else {
      // Default to London if no location is set
      const defaultLocation: Location = {
        city: 'London',
        country: 'UK',
        latitude: 51.5074,
        longitude: -0.1278,
        timezone: 'Europe/London'
      };
      setSelectedLocation(defaultLocation);
      localStorage.setItem('selectedLocation', JSON.stringify(defaultLocation));
    }
  }, []);

  // Calculate prayer times whenever location changes
  useEffect(() => {
    if (selectedLocation) {
      calculatePrayerTimes();
    }
  }, [selectedLocation]);

  const calculatePrayerTimes = () => {
    if (!selectedLocation) return;

    const date = new Date();
    const coordinates = new Coordinates(selectedLocation.latitude, selectedLocation.longitude);
    const params = CalculationMethod.MuslimWorldLeague();
    params.madhab = Madhab.Shafi;

    const adhanTimes = new AdhanPrayerTimes(coordinates, date, params);

    const formatTime = (date: Date | null | undefined) => {
      if (!date) return '00:00';
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    };

    const now = new Date();

    const prayers: PrayerTime[] = [
      {
        name: 'Fajr',
        time: formatTime(adhanTimes.fajr),
        passed: adhanTimes.fajr ? now > adhanTimes.fajr : false
      },
      {
        name: 'Dhuhr',
        time: formatTime(adhanTimes.dhuhr),
        passed: adhanTimes.dhuhr ? now > adhanTimes.dhuhr : false
      },
      {
        name: 'Asr',
        time: formatTime(adhanTimes.asr),
        passed: adhanTimes.asr ? now > adhanTimes.asr : false
      },
      {
        name: 'Maghrib',
        time: formatTime(adhanTimes.maghrib),
        passed: adhanTimes.maghrib ? now > adhanTimes.maghrib : false
      },
      {
        name: 'Isha',
        time: formatTime(adhanTimes.isha),
        passed: adhanTimes.isha ? now > adhanTimes.isha : false
      },
    ];

    setPrayerTimes(prayers);
  };

  const handleLocationSelect = (location: Location) => {
    setSelectedLocation(location);
    localStorage.setItem('selectedLocation', JSON.stringify(location));
  };

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
      // Set a shorter timeout for better UX
      setTimeout(() => setLoading(false), 800);
    }
  };

  const handleHabitToggle = (habitId: string, completed: boolean) => {
    // Update habit completion status
    console.log(`Habit ${habitId} toggled to ${completed}`);
  };


  const handlePrayerToggle = (prayerName: string) => {
    setPrayerTimes(prevTimes =>
      prevTimes.map(prayer =>
        prayer.name === prayerName
          ? { ...prayer, passed: !prayer.passed }
          : prayer
      )
    );
    // In a real app, this would also update the backend
    console.log(`Prayer ${prayerName} toggled`);
  };

  const handleSetIntention = (intention: string) => {
    setTodayIntention(intention);
    setIsEditingIntention(false);
  };

  const handleEditIntention = () => {
    setTempIntention(todayIntention);
    setIsEditingIntention(true);
  };

  const handleSaveIntention = () => {
    setTodayIntention(tempIntention);
    setIsEditingIntention(false);
  };

  const handleCancelEdit = () => {
    setTempIntention('');
    setIsEditingIntention(false);
  };

  const handleDhikrIncrement = () => {
    setDhikrCount(prev => prev < 100 ? prev + 1 : prev);
  };

  const handleDhikrReset = () => {
    setDhikrCount(0);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-emerald-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-sage-600">{tCommon('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <PageContainer
      title={t('welcome')}
      subtitle={t('welcomeMessage')}
      maxWidth="6xl"
      padding="lg"
      center={false}
    >

          {/* Prayer Times - Enhanced Card Design */}
          <div className="mb-16">
            <div className="relative overflow-hidden max-w-5xl mx-auto">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/80 via-sage-50/60 to-gold-50/40 rounded-2xl"></div>
              <div className="relative bg-white/95 backdrop-blur-sm rounded-2xl border border-emerald-100/50 shadow-lg overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-sage-400 to-gold-400"></div>

                {/* Header */}
                <div className="p-6 pb-4">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-xl">🕌</span>
                    </div>
                    <div className="flex-1">
                      <h2 className="text-xl font-semibold text-sage-800">{t('todaysPrayers')}</h2>
                      <p className="text-sm text-sage-600">{t('prayersDescription')}</p>
                    </div>

                    {/* Location Selector */}
                    <LocationSelector
                      onLocationSelect={handleLocationSelect}
                      currentLocation={selectedLocation || undefined}
                    />

                    <div className="ml-4 text-right">
                      <div className="text-xs text-sage-500 mb-1">{t('nextPrayer')}</div>
                      <div className="text-lg font-semibold text-emerald-600">
                        {prayerTimes.find(p => !p.passed)?.name || t('allComplete')}
                        <span className="text-sm text-sage-600 ml-1">
                          at {prayerTimes.find(p => !p.passed)?.time || ''}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Prayer Times Grid */}
                  <div className="grid grid-cols-5 gap-4">
                    {prayerTimes.map((prayer, index) => (
                      <button
                        key={prayer.name}
                        onClick={() => handlePrayerToggle(prayer.name)}
                        className={`
                          relative p-4 rounded-xl text-center transition-all duration-300
                          hover:scale-105 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-300/50
                          cursor-pointer group
                          ${prayer.passed
                            ? 'bg-emerald-50/50 border border-emerald-200/50 hover:bg-emerald-100/60'
                            : prayer.name === prayerTimes.find(p => !p.passed)?.name
                              ? 'bg-gradient-to-br from-emerald-100 to-emerald-50 border-2 border-emerald-300 shadow-md hover:from-emerald-200 hover:to-emerald-100'
                              : 'bg-sage-50/50 border border-sage-200/50 hover:bg-sage-100/60'
                          }
                        `}
                      >
                        {/* Prayer completion indicator */}
                        {prayer.passed && (
                          <div className="absolute -top-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center transition-transform group-hover:scale-110">
                            <span className="text-white text-xs">✓</span>
                          </div>
                        )}

                        {/* Next prayer glow effect */}
                        {!prayer.passed && prayer.name === prayerTimes.find(p => !p.passed)?.name && (
                          <div className="absolute inset-0 bg-emerald-400/10 rounded-xl animate-pulse"></div>
                        )}

                        {/* Click indicator for incomplete prayers */}
                        {!prayer.passed && (
                          <div className="absolute -top-1 -left-1 w-5 h-5 bg-sage-400/70 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-white text-xs">+</span>
                          </div>
                        )}

                        <div className="relative">
                          {/* Prayer icon */}
                          <div className={`
                            w-8 h-8 mx-auto mb-2 rounded-full flex items-center justify-center text-sm
                            transition-all duration-200 group-hover:scale-110
                            ${prayer.passed
                              ? 'bg-emerald-100 text-emerald-600'
                              : prayer.name === prayerTimes.find(p => !p.passed)?.name
                                ? 'bg-emerald-200 text-emerald-700'
                                : 'bg-sage-100 text-sage-600'
                            }
                          `}>
                            {index === 0 ? '🌅' :
                             index === 1 ? '☀️' :
                             index === 2 ? '🌇' :
                             index === 3 ? '🌆' : '🌙'}
                          </div>

                          {/* Prayer name */}
                          <div className={`
                            text-sm font-medium mb-1
                            ${prayer.passed
                              ? 'text-emerald-700'
                              : prayer.name === prayerTimes.find(p => !p.passed)?.name
                                ? 'text-emerald-800'
                                : 'text-sage-700'
                            }
                          `}>
                            {prayer.name}
                          </div>

                          {/* Prayer time */}
                          <div className={`
                            text-xs
                            ${prayer.passed
                              ? 'text-emerald-600'
                              : prayer.name === prayerTimes.find(p => !p.passed)?.name
                                ? 'text-emerald-700 font-semibold'
                                : 'text-sage-600'
                            }
                          `}>
                            {prayer.time}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Progress indicator */}
                  <div className="mt-6 pt-4 border-t border-sage-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-sage-600">{t('todaysProgress')}</span>
                      <span className="text-xs font-medium text-sage-700">
                        {prayerTimes.filter(p => p.passed).length}/{prayerTimes.length} {t('completed')}
                      </span>
                    </div>
                    <div className="h-2 bg-sage-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-500"
                        style={{
                          width: `${(prayerTimes.filter(p => p.passed).length / prayerTimes.length) * 100}%`
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
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
                    <h3 className="text-lg font-semibold text-sage-900">{t('morningCheckin')}</h3>
                    <p className="text-sm text-sage-600">{t('setIntention')}</p>
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
                  {t('setTodaysIntention')}
                </Link>
              ) : (
                <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200/50">
                  <div className="flex items-center space-x-2 mb-3">
                    <span className="text-emerald-600 text-lg">✓</span>
                    <span className="font-medium text-emerald-800">{t('intentionSet')}</span>
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
                    <h3 className="text-lg font-semibold text-sage-900">{t('eveningReflection')}</h3>
                    <p className="text-sm text-sage-600">{t('muhasabahGratitude')}</p>
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
                  {t('completeEveningReflection')}
                </Link>
              ) : (
                <div className="bg-sage-50 rounded-lg p-4 text-center border border-sage-200/50">
                  <div className="text-sage-600 text-sm font-medium mb-1">
                    {t('availableAfterAsr')}
                  </div>
                  <div className="text-xs text-sage-500">
                    {t('focusOnCurrentIntentions')}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Today's Spiritual Focus - Enhanced Design */}
          <div className="mb-20">
            {/* Section Header with Decorative Elements */}
            <div className="text-center mb-12">
              <div className="relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-32 h-px bg-gradient-to-r from-transparent via-emerald-300/50 to-transparent"></div>
                </div>
                <div className="relative bg-sage-50 px-6 py-2 mx-auto w-fit">
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-semibold text-sage-800 tracking-wide">{t('todaysSpiritualFocus')}</h2>
                  </div>
                </div>
              </div>
              <p className="text-sage-600 mt-4 text-lg leading-relaxed">{t('dailyNourishment')}</p>
            </div>

            {/* Enhanced Grid Layout */}
            <div className="grid lg:grid-cols-12 gap-8">

              {/* Primary Spiritual Content - Takes more space */}
              <div className="lg:col-span-8 space-y-8">

                {/* Today's Ayah - Featured prominently */}
                <div className="relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 via-sage-50 to-emerald-50/30 rounded-2xl"></div>
                  <div className="relative p-8 rounded-2xl border border-emerald-100/50 shadow-lg backdrop-blur-sm">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-lg">📖</span>
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-sage-800">{t('todaysGuidance')}</h3>
                        <p className="text-sm text-sage-600">{t('reflectionOfDay')}</p>
                      </div>
                    </div>

                    <AyahQuote
                      arabic="وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا"
                      translation="And whoever fears Allah - He will make for him a way out."
                      source="At-Talaq 65:2"
                      transliteration="Wa man yattaqi Allaha yaj'al lahu makhrajan"
                      className="border-0 shadow-none bg-transparent p-0"
                      showCopy={true}
                    />
                  </div>
                </div>

                {/* Daily Plan & Habits Row */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Today's Plan */}
                  <div className="relative">
                    <div className="absolute -inset-1 bg-gradient-to-r from-gold-200/50 to-emerald-200/50 rounded-2xl blur-sm"></div>
                    <div className="relative bg-white p-6 rounded-2xl border border-gold-100/50 shadow-md">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 bg-gradient-to-br from-gold-400 to-gold-500 rounded-lg flex items-center justify-center">
                          <span className="text-white text-sm">📋</span>
                        </div>
                        <h3 className="text-lg font-semibold text-sage-800">{t('todaysPlan')}</h3>
                      </div>
                      <div className="space-y-4">
                        {/* Description */}
                        <p className="text-sm text-sage-600 leading-relaxed">
                          {t('spiritualRoadmap')}
                        </p>

                        {/* Plan Items */}
                        <div className="space-y-3">
                          {currentPlan.map((item) => (
                            <div
                              key={item.id}
                              className={`flex items-start gap-3 p-3 rounded-lg transition-all duration-200 hover:bg-sage-50/50 group ${item.completed ? 'opacity-70' : ''}`}
                            >
                              {/* Completion toggle */}
                              <button
                                onClick={() => {
                                  // Toggle item completion
                                  console.log(`Plan item ${item.id} toggled`);
                                }}
                                className="flex-shrink-0 mt-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-300/50 rounded-full"
                              >
                                {item.completed ? (
                                  <div className="w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                                    <span className="text-white text-xs">✓</span>
                                  </div>
                                ) : (
                                  <div className="w-4 h-4 border-2 border-sage-300 rounded-full hover:border-emerald-400 transition-colors"></div>
                                )}
                              </button>

                              {/* Item content */}
                              <div className="flex-1 min-w-0">
                                {/* Type badge */}
                                <div className="flex items-center gap-2 mb-2">
                                  <span className={`
                                    text-xs font-medium px-2 py-0.5 rounded-full
                                    ${item.type === 'habit' ? 'bg-emerald-100 text-emerald-700' :
                                      item.type === 'dua' ? 'bg-gold-100 text-gold-700' :
                                      'bg-sage-100 text-sage-700'}
                                  `}>
                                    {item.type === 'habit' ? t('habit') :
                                     item.type === 'dua' ? t('dua') : t('ayah')}
                                  </span>
                                </div>

                                {/* Item text */}
                                <p className={`
                                  text-sm leading-relaxed
                                  ${item.completed ? 'text-sage-600 line-through' : 'text-sage-800'}
                                  ${item.type === 'ayah' || item.type === 'dua' ? 'font-serif text-right' : ''}
                                `}
                                  style={item.type === 'ayah' || item.type === 'dua' ? {
                                    direction: 'rtl',
                                    color: item.completed ? '#6b7280' : '#059669',
                                    fontSize: '16px',
                                    lineHeight: '1.7'
                                  } : {}}
                                >
                                  {item.text}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Progress summary */}
                        <div className="mt-4 pt-3 border-t border-sage-100">
                          <div className="flex items-center justify-between text-xs text-sage-600 mb-2">
                            <span>{t('progress')}</span>
                            <span className="font-medium">
                              {currentPlan.filter(p => p.completed).length}/{currentPlan.length} {t('completed')}
                            </span>
                          </div>
                          <div className="h-1.5 bg-sage-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-gold-400 to-gold-500 rounded-full transition-all duration-500"
                              style={{
                                width: `${(currentPlan.filter(p => p.completed).length / currentPlan.length) * 100}%`
                              }}
                            ></div>
                          </div>
                        </div>

                        {/* Action button */}
                        <button
                          onClick={() => console.log('Navigate to full plan')}
                          className="w-full mt-4 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-white py-2.5 px-4 rounded-lg font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2"
                        >
                          {t('viewDetails')}
                          <span className="text-xs">→</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Habits Progress */}
                  <div className="relative">
                    <div className="relative bg-white p-6 rounded-2xl border border-emerald-100/50 shadow-md">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-lg flex items-center justify-center">
                          <span className="text-white text-sm">✓</span>
                        </div>
                        <h3 className="text-lg font-semibold text-sage-800">{t('dailyHabits')}</h3>
                      </div>
                      <div className="space-y-3">
                        {todaysHabits.map((habit) => (
                          <div
                            key={habit.id}
                            className="flex items-center gap-4 p-3 rounded-lg hover:bg-sage-50/50 transition-all duration-200 group"
                          >
                            {/* Completion toggle */}
                            <button
                              onClick={() => handleHabitToggle(habit.id, !habit.completed)}
                              className="flex-shrink-0 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-300/50 rounded-full"
                              aria-label={`Mark ${habit.name} as ${habit.completed ? 'incomplete' : 'complete'}`}
                            >
                              {habit.completed ? (
                                <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                                  <span className="text-white text-xs">✓</span>
                                </div>
                              ) : (
                                <div className="w-5 h-5 border-2 border-sage-300 rounded-full hover:border-emerald-400 transition-colors"></div>
                              )}
                            </button>

                            {/* Habit content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className={`font-medium text-sm ${habit.completed ? 'text-sage-600 line-through' : 'text-sage-800'}`}>
                                  {habit.name}
                                </h4>
                                {/* Streak indicator */}
                                {habit.streak > 0 && (
                                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
                                    <span className="text-orange-500">🔥</span>
                                    <span>{habit.streak}</span>
                                  </div>
                                )}
                              </div>
                              {habit.description && (
                                <p className="text-xs text-sage-600 leading-relaxed">
                                  {habit.description}
                                </p>
                              )}
                            </div>

                            {/* Completion indicator */}
                            {habit.completed && (
                              <div className="flex-shrink-0 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                                {t('done')}
                              </div>
                            )}
                          </div>
                        ))}

                        {/* Progress summary */}
                        <div className="mt-4 pt-3 border-t border-sage-100">
                          <div className="flex items-center justify-between text-xs text-sage-600">
                            <span>{t('progress')}</span>
                            <span className="font-medium">
                              {todaysHabits.filter(h => h.completed).length}/{todaysHabits.length} {t('completed')}
                            </span>
                          </div>
                          <div className="mt-2 h-1.5 bg-sage-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-500"
                              style={{
                                width: `${(todaysHabits.filter(h => h.completed).length / todaysHabits.length) * 100}%`
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Du'a Section */}
                <div className="relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-sage-50 via-emerald-25/30 to-sage-50 rounded-2xl"></div>
                  <div className="relative p-8 rounded-2xl border border-sage-100/50 shadow-lg backdrop-blur-sm">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-gradient-to-br from-sage-500 to-sage-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-lg">🤲</span>
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-sage-800">{t('morningDua')}</h3>
                        <p className="text-sm text-sage-600">{t('startWithRemembrance')}</p>
                      </div>
                    </div>

                    <DuaCard
                      title=""
                      arabic="اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ"
                      transliteration="Allahumma a'inni 'ala dhikrika wa shukrika wa husni 'ibadatik"
                      translation="O Allah, help me to remember You, thank You, and worship You in the best manner."
                      showCounter={true}
                      onCountChange={(count) => console.log(`Du'a recited ${count} times`)}
                      className="border-0 shadow-none bg-transparent p-0"
                    />
                  </div>
                </div>
              </div>

              {/* Sidebar - Intentions & Dhikr */}
              <div className="lg:col-span-4 space-y-6">

                {/* Daily Intention */}
                <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-r from-emerald-200/30 to-gold-200/30 rounded-2xl blur-sm"></div>
                  <div className="relative bg-white/95 backdrop-blur-sm rounded-2xl border border-emerald-100/50 shadow-lg overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-gold-400 to-emerald-400"></div>
                    <div className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-lg flex items-center justify-center">
                          <span className="text-white text-sm">💚</span>
                        </div>
                        <h3 className="text-lg font-semibold text-sage-800">{t('dailyIntention')}</h3>
                      </div>
                      <div className="space-y-4">
                        {/* Daily Intention Content */}
                        <div className="space-y-3">
                          {/* Editing Mode */}
                          {isEditingIntention ? (
                            <div className="space-y-3">
                              <textarea
                                value={tempIntention}
                                onChange={(e) => setTempIntention(e.target.value)}
                                placeholder={t('writeIntention')}
                                className="w-full p-3 bg-white border border-emerald-200 rounded-lg text-sm text-sage-800 leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-emerald-300/50 focus:border-emerald-300"
                                rows={3}
                                autoFocus
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={handleSaveIntention}
                                  disabled={!tempIntention.trim()}
                                  className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 px-3 rounded-lg font-medium text-sm transition-all duration-200"
                                >
                                  {t('save')}
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  className="px-3 py-2 bg-sage-100 hover:bg-sage-200 text-sage-700 rounded-lg font-medium text-sm transition-all duration-200"
                                >
                                  {t('cancel')}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              {/* Intention Display */}
                              {!todayIntention ? (
                                <div className="p-4 bg-emerald-50/50 rounded-lg border border-emerald-100">
                                  <p className="text-sm text-emerald-700 leading-relaxed italic text-center">
                                    "{t('sampleIntention')}"
                                  </p>
                                </div>
                              ) : (
                                <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className="w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                                      <span className="text-white text-xs">✓</span>
                                    </div>
                                    <span className="text-sm font-medium text-emerald-800">{t('intentionSet')}</span>
                                  </div>
                                  <p className="text-sm text-emerald-700 leading-relaxed">
                                    {todayIntention}
                                  </p>
                                </div>
                              )}

                              {/* Action Buttons */}
                              {!todayIntention ? (
                                <button
                                  onClick={() => handleSetIntention(t('sampleIntention'))}
                                  className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white py-2.5 px-4 rounded-lg font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2"
                                >
                                  {t('setTodaysIntention')}
                                  <span className="text-xs">💚</span>
                                </button>
                              ) : (
                                <button
                                  onClick={handleEditIntention}
                                  className="w-full bg-sage-100 hover:bg-sage-200 text-sage-700 py-2 px-4 rounded-lg font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2"
                                >
                                  {t('editIntention')}
                                  <span className="text-xs">✏️</span>
                                </button>
                              )}
                            </>
                          )}
                        </div>

                        {/* Reminder */}
                        <div className="pt-3 border-t border-emerald-100">
                          <p className="text-xs text-sage-600 text-center">
                            {t('dailyIntentionReminder')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dhikr Counter */}
                <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-r from-gold-200/30 to-emerald-200/30 rounded-2xl blur-sm"></div>
                  <div className="relative bg-white/95 backdrop-blur-sm rounded-2xl border border-gold-100/50 shadow-lg overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gold-400 via-emerald-400 to-gold-400"></div>
                    <div className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 bg-gradient-to-br from-gold-400 to-gold-500 rounded-lg flex items-center justify-center">
                          <span className="text-white text-sm">📿</span>
                        </div>
                        <h3 className="text-lg font-semibold text-sage-800">{t('dhikrCounter')}</h3>
                      </div>
                      <div className="space-y-4">
                        {/* Dhikr Title */}
                        <div className="text-center">
                          <h4 className="text-lg font-semibold text-sage-800 mb-1">{t('astaghfirullah')}</h4>
                          <p className="text-xs text-sage-600">أستغفر الله</p>
                        </div>

                        {/* Counter Display */}
                        <div className="flex flex-col items-center">
                          {/* Progress Circle */}
                          <div className="relative mb-4">
                            <svg className="w-24 h-24 -rotate-90 transform" viewBox="0 0 100 100">
                              {/* Background circle */}
                              <circle
                                cx="50"
                                cy="50"
                                r="40"
                                fill="none"
                                stroke="#e5e7eb"
                                strokeWidth="6"
                              />
                              {/* Progress circle */}
                              <circle
                                cx="50"
                                cy="50"
                                r="40"
                                fill="none"
                                stroke="#f59e0b"
                                strokeWidth="6"
                                strokeLinecap="round"
                                strokeDasharray={`${2 * Math.PI * 40}`}
                                strokeDashoffset={2 * Math.PI * 40 - (dhikrCount / 100) * 2 * Math.PI * 40}
                                className="transition-all duration-500"
                              />
                            </svg>

                            {/* Count display */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <span className="text-2xl font-bold text-sage-800">{dhikrCount}</span>
                              <span className="text-xs text-sage-600">{t('of100')}</span>
                            </div>
                          </div>

                          {/* Increment Button */}
                          <button
                            onClick={handleDhikrIncrement}
                            disabled={dhikrCount >= 100}
                            className="w-12 h-12 bg-gradient-to-br from-gold-400 to-gold-500 hover:from-gold-500 hover:to-gold-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-full flex items-center justify-center font-semibold text-lg shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 disabled:hover:scale-100"
                          >
                            {dhikrCount >= 100 ? '✓' : '+1'}
                          </button>
                        </div>

                        {/* Completion message or Progress Info */}
                        <div className="text-center pt-3 border-t border-gold-100">
                          {dhikrCount >= 100 ? (
                            <div className="space-y-2">
                              <p className="text-sm font-medium text-gold-700">
                                {t('alhamdulillahTargetReached')}
                              </p>
                              <button
                                onClick={handleDhikrReset}
                                className="text-xs text-sage-600 hover:text-sage-800 underline transition-colors"
                              >
                                {t('resetCounter')}
                              </button>
                            </div>
                          ) : (
                            <p className="text-xs text-sage-600">
                              {t('tapToCount')}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Spiritual Moment */}
                <div className="relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-sage-100/80 to-emerald-50/60 rounded-2xl"></div>
                  <div className="relative p-6 rounded-2xl border border-sage-200/50 shadow-md">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-gradient-to-br from-sage-400 to-sage-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-white text-xl">🌸</span>
                      </div>
                      <h3 className="text-lg font-semibold text-sage-800 mb-2">{t('momentOfReflection')}</h3>
                      <p className="text-sm text-sage-600 leading-relaxed italic">
                        "{t('heartsAtRest')}"
                      </p>
                      <p className="text-xs text-sage-500 mt-2">{t('quranReference')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

    </PageContainer>
  );
}