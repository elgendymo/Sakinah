'use client';

import { useState, useEffect } from 'react';
import { AuthUtils } from '@/lib/auth-utils';
import { api } from '@/lib/api';
import PageContainer from '@/components/PageContainer';
import { ErrorDisplay, useErrorHandler } from '@/components/ErrorDisplay';
import {
  LocalFireDepartment,
  CheckCircle,
  Celebration,
  AutoAwesome,
  WbSunny,
  NightlightRound,
  SentimentDissatisfied,
  SentimentNeutral,
  SentimentSatisfied,
  SentimentVerySatisfied
} from '@mui/icons-material';

const REFLECTION_PROMPTS = [
  'What am I most grateful for today?',
  'How did I serve Allah today?',
  'What good deed can I do tomorrow?',
  'Did I fulfill my obligations with ihsan?',
  'How can I improve my relationship with Allah?',
  'What lesson did Allah teach me today?',
  'Did I remember Allah frequently?',
  'How was my character with family and friends?',
];

interface StreakInfo {
  current: number;
  longest: number;
  lastCheckinDate?: string;
  totalCheckins?: number;
}


export default function CheckinPage() {
  const [intention, setIntention] = useState('');
  const [reflection, setReflection] = useState('');
  const [mood, setMood] = useState<number>(0);
  const [gratitude, setGratitude] = useState<string[]>(['', '', '']);
  const [improvements, setImprovements] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingToday, setLoadingToday] = useState(true);
  const [randomPrompt, setRandomPrompt] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [streakInfo, setStreakInfo] = useState<StreakInfo | null>(null);
  const [hasCheckedInToday, setHasCheckedInToday] = useState(false);
  const [isUpdate, setIsUpdate] = useState(false);
  const { error, handleError, clearError } = useErrorHandler();

  useEffect(() => {
    // Set a random reflection prompt
    const prompt = REFLECTION_PROMPTS[Math.floor(Math.random() * REFLECTION_PROMPTS.length)];
    setRandomPrompt(prompt);

    // Load today's checkin and streak info
    loadTodayCheckin();
  }, []);

  const loadTodayCheckin = async () => {
    setLoadingToday(true);
    try {
      const token = await AuthUtils.getAuthTokenWithFallback();
      // Get today's checkin
      const todayResponse = await api.getTodayCheckin(token) as any;

        if (todayResponse.hasCheckedIn && todayResponse.data) {
          setHasCheckedInToday(true);
          setIsUpdate(true);

          // Parse the reflection to extract gratitude and improvements
          const checkinData = todayResponse.data;
          if (checkinData.reflection) {
            const parts = checkinData.reflection.split('\n\n');
            let mainReflection = '';
            const extractedGratitude: string[] = ['', '', ''];
            let extractedImprovements = '';

            for (const part of parts) {
              if (part.startsWith('Gratitude:')) {
                const gratitudeLines = part.replace('Gratitude:\n', '').split('\n');
                gratitudeLines.forEach((line: string, index: number) => {
                  if (index < 3) {
                    extractedGratitude[index] = line.replace(/^\d+\.\s*/, '');
                  }
                });
              } else if (part.startsWith('Improvements:')) {
                extractedImprovements = part.replace('Improvements:\n', '');
              } else {
                mainReflection = part;
              }
            }

            setReflection(mainReflection);
            setGratitude(extractedGratitude);
            setImprovements(extractedImprovements);
          }

          if (checkinData.mood !== undefined) setMood(checkinData.mood);
          if (checkinData.intention) setIntention(checkinData.intention);
        }

        // Set streak info
        if (todayResponse.streak) {
          setStreakInfo(todayResponse.streak);
        }

        // Get detailed streak info
        const streakResponse = await api.getCheckinStreak(token) as any;
        if (streakResponse) {
          setStreakInfo(streakResponse);
        }
    } catch (error) {
      console.error('Error loading today\'s checkin:', error);
    } finally {
      setLoadingToday(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearError();
    setSuccessMessage('');

    try {
      const token = await AuthUtils.getAuthTokenWithFallback();

      const checkinData = {
        intention,
        reflection,
        gratitude: gratitude.filter(g => g.trim()),
        improvements,
        mood,
      };

      const response = await api.createCheckin(checkinData, token);

      // Update streak info from response
      if ((response as any).streak) {
        setStreakInfo((response as any).streak);
      }

      // Update the isUpdate flag
      if ((response as any).isUpdate !== undefined) {
        setIsUpdate((response as any).isUpdate);
        setHasCheckedInToday(true);
      }

      // Reset form
      setIntention('');
      setReflection('');
      setMood(0);
      setGratitude(['', '', '']);
      setImprovements('');

      const message = (response as any).isUpdate
        ? 'Alhamdulillah! Your muhasabah has been updated. May Allah accept your continued self-reflection.'
        : 'Barakallahu feeki! Your muhasabah has been saved. May Allah accept your self-reflection and grant you spiritual growth.';
      setSuccessMessage(message);
    } catch (error) {
      handleError(error, 'Saving Muhasabah');
    } finally {
      setLoading(false);
    }
  };

  const moodIcons = [SentimentDissatisfied, SentimentNeutral, SentimentSatisfied, SentimentVerySatisfied, AutoAwesome];
  const moodLabels = ['Struggling', 'Neutral', 'Content', 'Happy', 'Blessed'];

  return (
    <PageContainer
      title="Daily Muhasabah"
      subtitle="Reflect on your day and set intentions with Allah's guidance"
      maxWidth="lg"
      padding="lg"
    >
      {/* Error Display */}
      {error && (
        <ErrorDisplay
          error={error}
          onDismiss={clearError}
          onRetry={() => window.location.reload()}
          className="mb-6"
        />
      )}

      {/* Streak Display */}
      {streakInfo && (
        <div className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 p-6 rounded-xl border border-amber-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <LocalFireDepartment sx={{ color: '#92400e', fontSize: 24 }} />
                <h3 className="text-lg font-semibold text-amber-900">Your Muhasabah Journey</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-amber-600">Current Streak</p>
                  <p className="text-2xl font-bold text-amber-900">{streakInfo.current} days</p>
                </div>
                <div>
                  <p className="text-sm text-amber-600">Longest Streak</p>
                  <p className="text-2xl font-bold text-amber-900">{streakInfo.longest} days</p>
                </div>
                {streakInfo.totalCheckins !== undefined && (
                  <div>
                    <p className="text-sm text-amber-600">Total Check-ins</p>
                    <p className="text-2xl font-bold text-amber-900">{streakInfo.totalCheckins}</p>
                  </div>
                )}
                {hasCheckedInToday && (
                  <div>
                    <p className="text-sm text-amber-600">Today's Status</p>
                    <div className="flex items-center gap-1">
                      <CheckCircle sx={{ color: '#16a34a', fontSize: 20 }} />
                      <p className="text-lg font-semibold text-green-600">Completed</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          {streakInfo.current > 0 && streakInfo.current % 7 === 0 && (
            <div className="mt-4 p-3 bg-amber-100 rounded-lg">
              <div className="flex items-center gap-2">
                <Celebration sx={{ color: '#92400e', fontSize: 20 }} />
                <p className="text-amber-800 text-sm font-medium">Masha'Allah! {streakInfo.current} days of consistent muhasabah!</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AutoAwesome sx={{ color: '#059669', fontSize: 24 }} />
            <div>
              <p className="text-emerald-800 leading-relaxed">{successMessage}</p>
              <button
                onClick={() => setSuccessMessage('')}
                className="mt-2 text-xs text-emerald-600 hover:text-emerald-700"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
        <div className="text-center mb-8">
          <div className="arabic-text text-emerald-700 mt-4 card-islamic p-4 rounded-lg shadow-sm">
            حاسبوا أنفسكم قبل أن تحاسبوا
          </div>
          <p className="text-sm text-sage-600 mt-2">
            "Hold yourselves accountable before you are held accountable"
          </p>
        </div>

        {loadingToday ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
              <p className="mt-4 text-sage-600">Loading your muhasabah...</p>
            </div>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Morning Intention */}
          <div className="card-islamic rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-2 mb-4">
              <WbSunny sx={{ color: '#166534', fontSize: 24 }} />
              <h2 className="text-xl font-semibold text-sage-900">Morning Intention</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-sage-700 mb-2">
                  What is your spiritual intention for today?
                </label>
                <textarea
                  value={intention}
                  onChange={(e) => setIntention(e.target.value)}
                  placeholder="I intend to remember Allah more, be patient with my family, read Quran..."
                  className="w-full px-4 py-3 border border-sage-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none transition-colors"
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Evening Reflection */}
          <div className="card-islamic rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-2 mb-4">
              <NightlightRound sx={{ color: '#166534', fontSize: 24 }} />
              <h2 className="text-xl font-semibold text-sage-900">Evening Reflection</h2>
            </div>

            {/* Mood Check */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                How are you feeling spiritually today?
              </label>
              <div className="flex justify-between items-center">
                {moodIcons.map((IconComponent, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setMood(index - 2)}
                    className={`p-3 rounded-full transition-all ${
                      mood === index - 2
                        ? 'bg-primary-100 ring-2 ring-primary-400'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    <IconComponent sx={{ fontSize: 32, color: mood === index - 2 ? '#166534' : '#6b7280' }} />
                    <div className="text-xs text-gray-600">{moodLabels[index]}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Reflection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reflect on your day: {randomPrompt}
              </label>
              <textarea
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 resize-none"
                rows={4}
                placeholder="Be honest with yourself..."
              />
            </div>

            {/* Gratitude */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Three things you're grateful for today:
              </label>
              {gratitude.map((item, index) => (
                <input
                  key={index}
                  type="text"
                  value={item}
                  onChange={(e) => {
                    const newGratitude = [...gratitude];
                    newGratitude[index] = e.target.value;
                    setGratitude(newGratitude);
                  }}
                  placeholder={`Blessing ${index + 1}...`}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 mb-2"
                />
              ))}
            </div>

            {/* Improvements */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                What will you improve tomorrow, insha'Allah?
              </label>
              <textarea
                value={improvements}
                onChange={(e) => setImprovements(e.target.value)}
                placeholder="I will try to pray with more khushu, control my temper better..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 resize-none"
                rows={3}
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary py-4 text-lg disabled:opacity-50"
          >
            {loading ? 'Saving...' : (isUpdate ? 'Update Muhasabah' : 'Complete Muhasabah')}
          </button>
        </form>
        )}

        {/* Wisdom */}
        <div className="mt-8 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg p-6">
          <div className="arabic-text text-center mb-2">
            إِنَّ اللَّهَ لَا يُغَيِّرُ مَا بِقَوْمٍ حَتَّىٰ يُغَيِّرُوا مَا بِأَنفُسِهِمْ
          </div>
          <p className="text-center text-primary-100 text-sm">
            "Indeed, Allah will not change the condition of a people until they change what is in themselves" (Quran 13:11)
          </p>
        </div>
    </PageContainer>
  );
}