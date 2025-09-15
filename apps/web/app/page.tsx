'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  SectionHeader,
  AyahQuote,
  type PlanItem
} from '@sakinah/ui';

export default function HomePage() {
    useRouter();
    const [scrollY, setScrollY] = useState(0);
    const [isVisible, setIsVisible] = useState({
    hero: false,
    features: false,
    how: false,
    testimonial: false,
    cta: false
  });

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);

    // Trigger animations on mount
    setTimeout(() => setIsVisible(prev => ({ ...prev, hero: true })), 100);
    setTimeout(() => setIsVisible(prev => ({ ...prev, features: true })), 400);

    // Intersection observer for scroll animations
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            setIsVisible(prev => ({ ...prev, [id]: true }));
          }
        });
      },
      { threshold: 0.1 }
    );

    ['how', 'testimonial', 'cta'].forEach(id => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      observer.disconnect();
    };
  }, []);

  const samplePlanItems: PlanItem[] = [
    { id: '1', text: 'Morning dhikr after Fajr', type: 'habit', completed: true },
    { id: '2', text: 'Read 1 page of Quran with reflection', type: 'habit', completed: false },
    { id: '3', text: 'اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ وَشُكْرِكَ', type: 'dua', completed: false },
    { id: '4', text: 'Practice patience in daily interactions', type: 'habit', completed: false },
  ];

  const sampleHabits = [
    { id: '1', name: 'Morning Adhkar', streak: 21, completed: true },
    { id: '2', name: 'Quran Recitation', streak: 14, completed: true },
    { id: '3', name: 'Night Prayer (Tahajjud)', streak: 7, completed: false },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-gold-50/30">
      {/* Hero Section with Parallax */}
      <section
        className={`relative min-h-screen flex items-center justify-center overflow-hidden transition-all duration-1000 ${
          isVisible.hero ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        {/* Islamic Geometric Pattern Background */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2310b981' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            transform: `translateY(${scrollY * 0.5}px)`
          }}
        />

        <div className="relative z-10 max-w-6xl mx-auto px-6 text-center">
          {/* Bismillah */}
          <div className="mb-8 animate-pulse">
            <p className="text-3xl md:text-4xl text-emerald-700 font-arabic">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</p>
            <p className="text-sm text-sage-600 mt-2">In the name of Allah, the Most Gracious, the Most Merciful</p>
          </div>

          {/* Main Title */}
          <h1 className="text-5xl md:text-7xl font-bold text-sage-900 mb-6">
            Find Your <span className="text-emerald-600">Sakinah</span>
          </h1>

          <p className="text-xl md:text-2xl text-sage-700 mb-4 max-w-3xl mx-auto">
            Your personal companion for spiritual purification and growth through authentic Islamic teachings
          </p>

          <p className="text-lg text-sage-600 mb-12 max-w-2xl mx-auto">
            Build daily habits, track your progress, and strengthen your connection with Allah in complete privacy
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <button
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-8 py-4 bg-emerald-600 text-white font-semibold rounded-xl text-lg transition-all hover:bg-emerald-700 hover:shadow-xl hover:scale-105 focus:outline-none focus:ring-4 focus:ring-emerald-300"
            >
              Explore Features
            </button>
            <button
              onClick={() => document.getElementById('cta')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-8 py-4 border-2 border-emerald-600 text-emerald-700 font-semibold rounded-xl text-lg transition-all hover:bg-emerald-50 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-emerald-200"
            >
              Start Your Journey
            </button>
          </div>

          {/* Trust Indicators */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-3">
                <span className="text-2xl">🔒</span>
              </div>
              <h3 className="font-semibold text-sage-800">100% Private</h3>
              <p className="text-sm text-sage-600">Your journey stays between you and Allah</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-gold-100 rounded-full flex items-center justify-center mb-3">
                <span className="text-2xl">📖</span>
              </div>
              <h3 className="font-semibold text-sage-800">Authentic Sources</h3>
              <p className="text-sm text-sage-600">Based on Quran & verified Hadith</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-3">
                <span className="text-2xl">🌙</span>
              </div>
              <h3 className="font-semibold text-sage-800">Daily Guidance</h3>
              <p className="text-sm text-sage-600">Personalized spiritual development</p>
            </div>
          </div>
        </div>

      </section>

      {/* Features Section */}
      <section
        id="features"
        className={`py-20 px-6 transition-all duration-1000 ${
          isVisible.features ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="max-w-7xl mx-auto">
          <SectionHeader
            title="Transform Your Spiritual Life"
            subtitle="Comprehensive tools designed to nurture your soul and strengthen your faith"
            level={2}
            className="text-center mb-16 [&_h2]:text-sage-900"
          />

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Tazkiyah Feature */}
            <div className="group relative bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-emerald-100">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10 group-hover:text-white transition-colors duration-300">
                <div className="w-14 h-14 bg-emerald-100 group-hover:bg-white/20 rounded-xl flex items-center justify-center mb-4 transition-colors duration-300">
                  <span className="text-2xl">🌱</span>
                </div>
                <h3 className="text-xl font-bold mb-3 text-sage-900 group-hover:text-white">Tazkiyah Plans</h3>
                <p className="text-sage-600 group-hover:text-white/90 mb-4">
                  Personalized spiritual purification journey with daily actionable steps
                </p>
                <ul className="space-y-2 text-sm text-sage-600 group-hover:text-white/80">
                  <li className="flex items-start">
                    <span>Remove spiritual diseases (takhliyah)</span>
                  </li>
                  <li className="flex items-start">
                    <span>Build beautiful virtues (tahliyah)</span>
                  </li>
                  <li className="flex items-start">
                    <span>AI-powered recommendations</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Habit Tracking Feature */}
            <div className="group relative bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gold-100">
              <div className="absolute inset-0 bg-gradient-to-br from-gold-500 to-gold-600 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10 group-hover:text-white transition-colors duration-300">
                <div className="w-14 h-14 bg-gold-100 group-hover:bg-white/20 rounded-xl flex items-center justify-center mb-4 transition-colors duration-300">
                  <span className="text-2xl">✨</span>
                </div>
                <h3 className="text-xl font-bold mb-3 text-sage-900 group-hover:text-white">Habit Building</h3>
                <p className="text-sage-600 group-hover:text-white/90 mb-4">
                  Track and maintain consistent spiritual practices with streak counting
                </p>
                <ul className="space-y-2 text-sm text-sage-600 group-hover:text-white/80">
                  <li className="flex items-start">
                    <span>Daily prayer tracking</span>
                  </li>
                  <li className="flex items-start">
                    <span>Quran reading goals</span>
                  </li>
                  <li className="flex items-start">
                    <span>Dhikr reminders & counter</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Muhasabah Feature */}
            <div className="group relative bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-emerald-100">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10 group-hover:text-white transition-colors duration-300">
                <div className="w-14 h-14 bg-emerald-100 group-hover:bg-white/20 rounded-xl flex items-center justify-center mb-4 transition-colors duration-300">
                  <span className="text-2xl">🌙</span>
                </div>
                <h3 className="text-xl font-bold mb-3 text-sage-900 group-hover:text-white">Daily Muhasabah</h3>
                <p className="text-sage-600 group-hover:text-white/90 mb-4">
                  Self-accountability and reflection to improve your character daily
                </p>
                <ul className="space-y-2 text-sm text-sage-600 group-hover:text-white/80">
                  <li className="flex items-start">
                    <span>Evening self-reflection</span>
                  </li>
                  <li className="flex items-start">
                    <span>Track spiritual progress</span>
                  </li>
                  <li className="flex items-start">
                    <span>Identify areas to improve</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Journal Feature */}
            <div className="group relative bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gold-100">
              <div className="absolute inset-0 bg-gradient-to-br from-gold-500 to-gold-600 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10 group-hover:text-white transition-colors duration-300">
                <div className="w-14 h-14 bg-gold-100 group-hover:bg-white/20 rounded-xl flex items-center justify-center mb-4 transition-colors duration-300">
                  <span className="text-2xl">📝</span>
                </div>
                <h3 className="text-xl font-bold mb-3 text-sage-900 group-hover:text-white">Spiritual Journal</h3>
                <p className="text-sage-600 group-hover:text-white/90 mb-4">
                  Document your spiritual journey and moments of gratitude
                </p>
                <ul className="space-y-2 text-sm text-sage-600 group-hover:text-white/80">
                  <li className="flex items-start">
                    <span>Private reflections</span>
                  </li>
                  <li className="flex items-start">
                    <span>Gratitude logging</span>
                  </li>
                  <li className="flex items-start">
                    <span>Spiritual insights</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section
        id="how"
        className={`py-20 px-6 bg-gradient-to-br from-emerald-50 to-gold-50 transition-all duration-1000 ${
          isVisible.how ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="max-w-6xl mx-auto">
          <SectionHeader
            title="Your Path to Inner Peace"
            subtitle="Simple steps to begin your spiritual transformation"
            level={2}
            className="text-center mb-16 [&_h2]:text-sage-900"
          />

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="text-center">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <span className="text-3xl font-bold text-emerald-600">1</span>
              </div>
              <h3 className="text-xl font-bold mb-3 text-sage-900">Set Your Intention</h3>
              <p className="text-sage-600">
                Begin with a sincere intention to improve your relationship with Allah and purify your heart
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <span className="text-3xl font-bold text-gold-600">2</span>
              </div>
              <h3 className="text-xl font-bold mb-3 text-sage-900">Choose Your Focus</h3>
              <p className="text-sage-600">
                Select spiritual goals, virtues to develop, or challenges to overcome with guided support
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <span className="text-3xl font-bold text-emerald-600">3</span>
              </div>
              <h3 className="text-xl font-bold mb-3 text-sage-900">Track & Reflect</h3>
              <p className="text-sage-600">
                Build daily habits, complete your spiritual tasks, and reflect on your progress each night
              </p>
            </div>
          </div>

          {/* Sample Dashboard Preview - Exact Dashboard Style */}
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-32 h-px bg-gradient-to-r from-transparent via-emerald-300/50 to-transparent"></div>
                </div>
                <div className="relative bg-white px-6 py-2 mx-auto w-fit">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                    <h2 className="text-2xl font-semibold text-sage-800 tracking-wide">Experience the Journey</h2>
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                  </div>
                </div>
              </div>
              <p className="text-sage-600 mt-4 text-lg leading-relaxed">Preview your daily spiritual dashboard</p>
            </div>

            <div className="grid lg:grid-cols-12 gap-8">
              {/* Primary Spiritual Content */}
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
                        <h3 className="text-xl font-semibold text-sage-800">Today's Guidance</h3>
                        <p className="text-sm text-sage-600">Reflection of the day</p>
                      </div>
                    </div>

                    <AyahQuote
                      arabic="إِنَّ اللَّهَ لَا يُغَيِّرُ مَا بِقَوْمٍ حَتَّىٰ يُغَيِّرُوا مَا بِأَنفُسِهِمْ"
                      translation="Indeed, Allah will not change the condition of a people until they change what is in themselves"
                      source="Surah Ar-Ra'd 13:11"
                      transliteration="Inna Allaha la yughayyiru ma biqawmin hatta yughayyiru ma bi'anfusihim"
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
                        <h3 className="text-lg font-semibold text-sage-800">Today's Plan</h3>
                      </div>
                      <div className="space-y-4">
                        <p className="text-sm text-sage-600 leading-relaxed">
                          Your spiritual roadmap for today
                        </p>

                        {/* Plan Items with exact dashboard styling */}
                        <div className="space-y-3">
                          {samplePlanItems.map((item) => (
                            <div
                              key={item.id}
                              className={`flex items-start gap-3 p-3 rounded-lg transition-all duration-200 hover:bg-sage-50/50 group ${item.completed ? 'opacity-70' : ''}`}
                            >
                              <button className="flex-shrink-0 mt-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-300/50 rounded-full">
                                {item.completed ? (
                                  <div className="w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                                    <span className="text-white text-xs">✓</span>
                                  </div>
                                ) : (
                                  <div className="w-4 h-4 border-2 border-sage-300 rounded-full hover:border-emerald-400 transition-colors"></div>
                                )}
                              </button>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className={`
                                    text-xs font-medium px-2 py-0.5 rounded-full
                                    ${item.type === 'habit' ? 'bg-emerald-100 text-emerald-700' :
                                      item.type === 'dua' ? 'bg-gold-100 text-gold-700' :
                                      'bg-sage-100 text-sage-700'}
                                  `}>
                                    {item.type === 'habit' ? 'Habit' :
                                     item.type === 'dua' ? "Du'a" : 'Ayah'}
                                  </span>
                                </div>

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
                            <span>Progress</span>
                            <span className="font-medium">
                              {samplePlanItems.filter(p => p.completed).length}/{samplePlanItems.length} completed
                            </span>
                          </div>
                          <div className="h-1.5 bg-sage-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-gold-400 to-gold-500 rounded-full transition-all duration-500"
                              style={{
                                width: `${(samplePlanItems.filter(p => p.completed).length / samplePlanItems.length) * 100}%`
                              }}
                            ></div>
                          </div>
                        </div>

                        <button className="w-full mt-4 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-white py-2.5 px-4 rounded-lg font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2">
                          View Details
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
                        <h3 className="text-lg font-semibold text-sage-800">Daily Habits</h3>
                      </div>
                      <div className="space-y-3">
                        {sampleHabits.map((habit) => (
                          <div
                            key={habit.id}
                            className="flex items-center gap-4 p-3 rounded-lg hover:bg-sage-50/50 transition-all duration-200 group"
                          >
                            <button className="flex-shrink-0 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-300/50 rounded-full">
                              {habit.completed ? (
                                <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                                  <span className="text-white text-xs">✓</span>
                                </div>
                              ) : (
                                <div className="w-5 h-5 border-2 border-sage-300 rounded-full hover:border-emerald-400 transition-colors"></div>
                              )}
                            </button>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className={`font-medium text-sm ${habit.completed ? 'text-sage-600 line-through' : 'text-sage-800'}`}>
                                  {habit.name}
                                </h4>
                                {habit.streak > 0 && (
                                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
                                    <span className="text-orange-500">🔥</span>
                                    <span>{habit.streak}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {habit.completed && (
                              <div className="flex-shrink-0 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                                Done
                              </div>
                            )}
                          </div>
                        ))}

                        {/* Progress summary */}
                        <div className="mt-4 pt-3 border-t border-sage-100">
                          <div className="flex items-center justify-between text-xs text-sage-600">
                            <span>Progress</span>
                            <span className="font-medium">
                              {sampleHabits.filter(h => h.completed).length}/{sampleHabits.length} completed
                            </span>
                          </div>
                          <div className="mt-2 h-1.5 bg-sage-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-500"
                              style={{
                                width: `${(sampleHabits.filter(h => h.completed).length / sampleHabits.length) * 100}%`
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
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
                        <h3 className="text-lg font-semibold text-sage-800">Daily Intention</h3>
                      </div>
                      <div className="space-y-4">
                        <div className="p-4 bg-emerald-50/50 rounded-lg border border-emerald-100">
                          <p className="text-sm text-emerald-700 leading-relaxed italic text-center">
                            "Today, I intend to worship Allah with sincerity and mindfulness."
                          </p>
                        </div>

                        <button className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white py-2.5 px-4 rounded-lg font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2">
                          Set Today's Intention
                          <span className="text-xs">💚</span>
                        </button>

                        <div className="pt-3 border-t border-emerald-100">
                          <p className="text-xs text-sage-600 text-center">
                            💡 Set your daily intention after Fajr prayer
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
                        <h3 className="text-lg font-semibold text-sage-800">Dhikr Counter</h3>
                      </div>
                      <div className="space-y-4">
                        {/* Dhikr Title */}
                        <div className="text-center">
                          <h4 className="text-lg font-semibold text-sage-800 mb-1">SubhanAllah</h4>
                          <p className="text-xs text-sage-600">سُبْحَانَ اللَّهِ</p>
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
                                strokeDashoffset={2 * Math.PI * 40 - (15 / 33) * 2 * Math.PI * 40}
                                className="transition-all duration-500"
                              />
                            </svg>

                            {/* Count display */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <span className="text-2xl font-bold text-sage-800">15</span>
                              <span className="text-xs text-sage-600">of 33</span>
                            </div>
                          </div>

                          {/* Increment Button */}
                          <button
                            className="w-12 h-12 bg-gradient-to-br from-gold-400 to-gold-500 hover:from-gold-500 hover:to-gold-600 text-white rounded-full flex items-center justify-center font-semibold text-lg shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105"
                          >
                            +1
                          </button>
                        </div>

                        {/* Progress Info */}
                        <div className="text-center pt-3 border-t border-gold-100">
                          <p className="text-xs text-sage-600">
                            Tap to count your dhikr
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial/Value Section */}
      <section
        id="testimonial"
        className={`py-20 px-6 transition-all duration-1000 ${
          isVisible.testimonial ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-3xl p-12 text-white shadow-2xl">
            <div className="text-5xl mb-6">🕌</div>

            <blockquote className="text-2xl md:text-3xl font-medium mb-6 italic">
              "Verily, in the remembrance of Allah do hearts find rest"
            </blockquote>

            <cite className="text-lg opacity-90">— Quran 13:28</cite>

            <div className="mt-8 pt-8 border-t border-white/20">
              <p className="text-lg mb-6">
                Join thousands of Muslims worldwide on their journey to spiritual excellence.
                Every day is a new opportunity to grow closer to Allah.
              </p>

              <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
                <div>
                  <div className="text-3xl font-bold mb-2">100%</div>
                  <div className="text-sm opacity-90">Private & Secure</div>
                </div>
                <div>
                  <div className="text-3xl font-bold mb-2">365</div>
                  <div className="text-sm opacity-90">Days of Growth</div>
                </div>
                <div>
                  <div className="text-3xl font-bold mb-2">5x</div>
                  <div className="text-sm opacity-90">Daily Reminders</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section with Login */}
      <section
        id="cta"
        className={`py-20 px-6 bg-gradient-to-t from-emerald-50 to-white transition-all duration-1000 ${
          isVisible.cta ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 border border-emerald-100">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-sage-900">
                Begin Your Spiritual Journey Today
              </h2>
              <p className="text-lg text-sage-600 max-w-2xl mx-auto">
                Take the first step towards inner peace and spiritual growth.
                Your path to Allah starts with a single intention.
              </p>
            </div>

            <div className="max-w-md mx-auto">
              <div className="space-y-4 mb-6">
                <Link
                  href="/login"
                  className="block w-full px-6 py-4 bg-emerald-600 text-white font-semibold rounded-xl text-center text-lg transition-all hover:bg-emerald-700 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-emerald-300"
                >
                  Sign In to Continue
                </Link>

                <Link
                  href="/signup"
                  className="block w-full px-6 py-4 border-2 border-emerald-600 text-emerald-700 font-semibold rounded-xl text-center text-lg transition-all hover:bg-emerald-50 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-emerald-200"
                >
                  Create New Account
                </Link>
              </div>

              <div className="text-center">
                <p className="text-sm text-sage-600 mb-4">
                  Or continue with
                </p>

                <div className="flex justify-center gap-4">
                  <Link
                    href="/login?provider=google"
                    className="flex items-center gap-2 px-6 py-3 border border-sage-300 rounded-lg hover:bg-sage-50 transition-colors"
                  >
                    <span className="text-lg">🔍</span>
                    <span className="text-sage-700">Google</span>
                  </Link>

                  <Link
                    href="/demo"
                    className="flex items-center gap-2 px-6 py-3 border border-sage-300 rounded-lg hover:bg-sage-50 transition-colors"
                  >
                    <span className="text-lg">👁️</span>
                    <span className="text-sage-700">View Demo</span>
                  </Link>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-sage-200">
                <div className="flex items-center justify-center gap-6 text-sm text-sage-600">
                  <span className="flex items-center gap-2">
                    <span>🔒</span>
                    <span>Fully Private</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span>📖</span>
                    <span>Shariah Compliant</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span>❤️</span>
                    <span>Free Forever</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-sage-900 text-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-bold text-lg mb-4">Sakinah</h3>
              <p className="text-sage-300 text-sm">
                Your companion for spiritual growth through authentic Islamic teachings
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Features</h4>
              <ul className="space-y-2 text-sm text-sage-300">
                <li><Link href="/tazkiyah" className="hover:text-white transition-colors">Tazkiyah Plans</Link></li>
                <li><Link href="/habits" className="hover:text-white transition-colors">Habit Tracking</Link></li>
                <li><Link href="/checkin" className="hover:text-white transition-colors">Daily Muhasabah</Link></li>
                <li><Link href="/journal" className="hover:text-white transition-colors">Spiritual Journal</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-sage-300">
                <li><Link href="/content" className="hover:text-white transition-colors">Content Library</Link></li>
                <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Connect</h4>
              <ul className="space-y-2 text-sm text-sage-300">
                <li><a href="#" className="hover:text-white transition-colors">Contact Support</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Feature Requests</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Community</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-sage-700 text-center text-sm text-sage-400">
            <p>© 2024 Sakinah. Made with ❤️ for the Ummah</p>
            <p className="mt-2">Privacy-first | Shariah-compliant | Ad-free</p>
          </div>
        </div>
      </footer>
    </div>
  );
}