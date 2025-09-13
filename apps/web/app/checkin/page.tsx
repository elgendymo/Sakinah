'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { api } from '@/lib/api';

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

export default function CheckinPage() {
  const [intention, setIntention] = useState('');
  const [reflection, setReflection] = useState('');
  const [mood, setMood] = useState<number>(0);
  const [gratitude, setGratitude] = useState<string[]>(['', '', '']);
  const [improvements, setImprovements] = useState('');
  const [loading, setLoading] = useState(false);
  const [randomPrompt, setRandomPrompt] = useState('');
  const supabase = createClient();

  useEffect(() => {
    // Set a random reflection prompt
    const prompt = REFLECTION_PROMPTS[Math.floor(Math.random() * REFLECTION_PROMPTS.length)];
    setRandomPrompt(prompt);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const checkinData = {
        intention,
        reflection: `${reflection}\n\nGratitude:\n${gratitude.filter(g => g).map((g, i) => `${i + 1}. ${g}`).join('\n')}\n\nImprovements:\n${improvements}`,
        mood,
      };

      await api.createCheckin(checkinData, session.access_token);

      // Reset form
      setIntention('');
      setReflection('');
      setMood(0);
      setGratitude(['', '', '']);
      setImprovements('');

      alert('Muhasabah saved! May Allah accept your self-reflection.');
    } catch (error) {
      console.error('Error saving checkin:', error);
      alert('Failed to save. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const moodEmojis = ['😔', '😐', '😊', '😄', '✨'];
  const moodLabels = ['Struggling', 'Neutral', 'Content', 'Happy', 'Blessed'];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-900 mb-2">
            Daily Muhasabah
          </h1>
          <p className="text-gray-600">Self-accountability before Allah</p>
          <div className="arabic-text text-primary-700 mt-4 bg-white/50 p-4 rounded-lg">
            حاسبوا أنفسكم قبل أن تحاسبوا
          </div>
          <p className="text-sm text-gray-600 mt-2">
            "Hold yourselves accountable before you are held accountable"
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Morning Intention */}
          <div className="bg-white rounded-lg p-6 shadow-md">
            <h2 className="text-xl font-semibold text-primary-800 mb-4">
              🌅 Morning Intention
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  What is your spiritual intention for today?
                </label>
                <textarea
                  value={intention}
                  onChange={(e) => setIntention(e.target.value)}
                  placeholder="I intend to remember Allah more, be patient with my family, read Quran..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 resize-none"
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Evening Reflection */}
          <div className="bg-white rounded-lg p-6 shadow-md">
            <h2 className="text-xl font-semibold text-primary-800 mb-4">
              🌙 Evening Reflection
            </h2>

            {/* Mood Check */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                How are you feeling spiritually today?
              </label>
              <div className="flex justify-between items-center">
                {moodEmojis.map((emoji, index) => (
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
                    <div className="text-2xl">{emoji}</div>
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
            {loading ? 'Saving...' : 'Complete Muhasabah'}
          </button>
        </form>

        {/* Wisdom */}
        <div className="mt-8 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg p-6">
          <div className="arabic-text text-center mb-2">
            إِنَّ اللَّهَ لَا يُغَيِّرُ مَا بِقَوْمٍ حَتَّىٰ يُغَيِّرُوا مَا بِأَنفُسِهِمْ
          </div>
          <p className="text-center text-primary-100 text-sm">
            "Indeed, Allah will not change the condition of a people until they change what is in themselves" (Quran 13:11)
          </p>
        </div>
      </div>
    </div>
  );
}