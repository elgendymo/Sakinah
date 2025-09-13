'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { api } from '@/lib/api';

const COMMON_STRUGGLES = {
  takhliyah: [
    'Envy (Hasad)',
    'Anger',
    'Pride (Kibr)',
    'Lust (Shahwah)',
    'Greed',
    'Laziness',
    'Attachment to Dunya',
    'Backbiting',
  ],
  tahliyah: [
    'Patience (Sabr)',
    'Gratitude (Shukr)',
    'Trust in Allah (Tawakkul)',
    'Sincerity (Ikhlas)',
    'Humility (Tawadu)',
    'Forgiveness',
    'Generosity',
    'Courage',
  ],
};

export default function TazkiyahPage() {
  const [mode, setMode] = useState<'takhliyah' | 'tahliyah'>('takhliyah');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestedPlan, setSuggestedPlan] = useState<any>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        router.push('/login');
        return;
      }

      const response = await api.suggestPlan(mode, input, session.access_token) as any;
      setSuggestedPlan(response.plan);
    } catch (error) {
      console.error('Error getting suggestion:', error);
      alert('Failed to get suggestion. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const acceptPlan = () => {
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <h1 className="text-3xl font-bold text-primary-900 mb-8 text-center">
          Begin Your Tazkiyah Journey
        </h1>

        {!suggestedPlan ? (
          <div className="bg-white rounded-lg p-8 shadow-md">
            {/* Mode Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Choose Your Path
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setMode('takhliyah')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    mode === 'takhliyah'
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold text-primary-800">Takhliyah</div>
                  <div className="text-sm text-gray-600 mt-1">Remove spiritual diseases</div>
                </button>
                <button
                  onClick={() => setMode('tahliyah')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    mode === 'tahliyah'
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold text-primary-800">Taḥliyah</div>
                  <div className="text-sm text-gray-600 mt-1">Build beautiful virtues</div>
                </button>
              </div>
            </div>

            {/* Input Form */}
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  {mode === 'takhliyah'
                    ? 'What struggle would you like to overcome?'
                    : 'What virtue would you like to develop?'}
                </label>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={mode === 'takhliyah' ? 'e.g., anger, envy, pride...' : 'e.g., patience, gratitude, tawakkul...'}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>

              {/* Quick Select */}
              <div className="mb-6">
                <div className="text-sm text-gray-600 mb-2">Or choose from common {mode === 'takhliyah' ? 'struggles' : 'virtues'}:</div>
                <div className="flex flex-wrap gap-2">
                  {COMMON_STRUGGLES[mode].map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setInput(item)}
                      className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !input}
                className="w-full btn-primary py-3 disabled:opacity-50"
              >
                {loading ? 'Creating Plan...' : 'Get Personalized Plan'}
              </button>
            </form>
          </div>
        ) : (
          <div className="bg-white rounded-lg p-8 shadow-md">
            <h2 className="text-2xl font-semibold text-primary-800 mb-6">
              Your Personalized Plan
            </h2>

            <div className="mb-6">
              <div className="text-sm text-primary-600 mb-2">
                {suggestedPlan.kind === 'takhliyah' ? 'Purifying from:' : 'Building:'}
              </div>
              <div className="text-lg font-medium">{suggestedPlan.target}</div>
            </div>

            <div className="mb-6">
              <h3 className="font-semibold text-gray-800 mb-3">Daily Micro-Habits:</h3>
              <div className="space-y-3">
                {suggestedPlan.microHabits?.map((habit: any, index: number) => (
                  <div key={index} className="flex items-start">
                    <span className="text-primary-600 mr-2">•</span>
                    <div>
                      <div className="font-medium">{habit.title}</div>
                      <div className="text-sm text-gray-600">
                        {habit.schedule} - Target: {habit.target} time(s)
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={acceptPlan}
                className="flex-1 btn-primary py-3"
              >
                Accept & Start Journey
              </button>
              <button
                onClick={() => setSuggestedPlan(null)}
                className="flex-1 btn-secondary py-3"
              >
                Try Different Input
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}