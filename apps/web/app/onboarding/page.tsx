'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import PageContainer from '@/components/PageContainer';

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState({
    name: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: 'en',
  });
  const [loading, setLoading] = useState(false);

  const router = useRouter();
    createClient();
    const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);

  const completeOnboarding = async () => {
    setLoading(true);
    try {
      // In a real app, save profile data
      console.log('Profile data:', profile);

      // Redirect to first Tazkiyah flow
      router.push('/tazkiyah');
    } catch (error) {
      console.error('Error completing onboarding:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer
      title="Welcome to Sakinah"
      subtitle="Let's personalize your spiritual journey"
      maxWidth="md"
      padding="xl"
      className="flex items-center justify-center"
    >
      <div className="max-w-md w-full">

        {step === 1 && (
          <div className="card-islamic rounded-2xl p-8 shadow-lg text-center">
            <div className="text-6xl mb-6">🌙</div>
            <h1 className="text-2xl font-bold text-sage-900 mb-4">
              Welcome to Sakinah
            </h1>
            <p className="text-sage-600 mb-8 leading-relaxed">
              Your personal journey to spiritual purification and growth through Islamic principles.
              Find inner peace (sakinah) in your heart.
            </p>

            <div className="space-y-3 text-sm text-sage-600 mb-8">
              <div className="flex items-center">
                <span className="text-accent mr-2">✓</span>
                Privacy-first | All your data stays private
              </div>
              <div className="flex items-center">
                <span className="text-accent mr-2">✓</span>
                Shariah-compliant | Based on Quran & Sunnah
              </div>
              <div className="flex items-center">
                <span className="text-accent mr-2">✓</span>
                No social features | Between you and Allah
              </div>
            </div>

            <button
              onClick={nextStep}
              className="w-full bg-accent text-white py-3 px-6 rounded-xl font-medium hover:bg-accent/90 transition-colors"
            >
              Begin Journey
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="card-islamic rounded-2xl p-8 shadow-lg">
            <h2 className="text-xl font-bold text-sage-900 mb-6 text-center">
              Tell us about yourself
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-sage-900 mb-2">
                  Name (optional)
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
                  Preferred Language
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

            <div className="flex gap-4 mt-8">
              <button
                onClick={prevStep}
                className="flex-1 py-3 px-6 border border-sage-200 rounded-xl font-medium hover:bg-sage-100 transition-colors"
              >
                Back
              </button>
              <button
                onClick={nextStep}
                className="flex-1 bg-accent text-white py-3 px-6 rounded-xl font-medium hover:bg-accent/90 transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="card-islamic rounded-2xl p-8 shadow-lg text-center">
            <div className="text-5xl mb-6">🌱</div>
            <h2 className="text-xl font-bold text-sage-900 mb-4">
              Ready to begin your Tazkiyah journey?
            </h2>
            <p className="text-sage-600 mb-8 leading-relaxed">
              Tazkiyah means "purification" - the process of cleansing the soul and adorning it with beautiful character.
              Let's start with your first spiritual goal.
            </p>

            <div className="bg-accent/5 rounded-lg p-4 mb-8">
              <div className="arabic-text text-accent text-lg mb-2">
                وَنَفْسٍ وَمَا سَوَّاهَا ۝ فَأَلْهَمَهَا فُجُورَهَا وَتَقْوَاهَا ۝ قَدْ أَفْلَحَ مَن زَكَّاهَا
              </div>
              <p className="text-xs text-sage-600">
                "And [by] the soul and He who proportioned it. And inspired it [with discernment of] its wickedness and its righteousness. He has succeeded who purifies it" (Quran 91:7-9)
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={prevStep}
                className="flex-1 py-3 px-6 border border-sage-200 rounded-xl font-medium hover:bg-sage-100 transition-colors"
              >
                Back
              </button>
              <button
                onClick={completeOnboarding}
                disabled={loading}
                className="flex-1 bg-accent text-white py-3 px-6 rounded-xl font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
              >
                {loading ? 'Starting...' : 'Start Tazkiyah'}
              </button>
            </div>
          </div>
        )}

        {/* Progress indicator */}
        <div className="mt-6 flex justify-center space-x-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i <= step ? 'bg-accent' : 'bg-border'
              }`}
            />
          ))}
        </div>
      </div>
    </PageContainer>
  );
}