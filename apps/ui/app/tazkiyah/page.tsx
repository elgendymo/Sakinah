'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { api as serviceApi } from '@/lib/services/api';
import PageContainer from '@/components/PageContainer';
import { ErrorDisplay, useErrorHandler } from '@/components/ErrorDisplay';


export default function TazkiyahPage() {
  const t = useTranslations('tazkiyah');

  const [mode, setMode] = useState<'takhliyah' | 'tahliyah'>('takhliyah');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestedPlan, setSuggestedPlan] = useState<any>(null);
  const [retryCount, setRetryCount] = useState(0);
  const router = useRouter();
  const { error, handleError, clearError } = useErrorHandler();

  const COMMON_STRUGGLES = {
    takhliyah: [
      t('commonStruggles.envy'),
      t('commonStruggles.anger'),
      t('commonStruggles.pride'),
      t('commonStruggles.lust'),
      t('commonStruggles.greed'),
      t('commonStruggles.laziness'),
      t('commonStruggles.attachment'),
      t('commonStruggles.backbiting'),
    ],
    tahliyah: [
      t('commonVirtues.patience'),
      t('commonVirtues.gratitude'),
      t('commonVirtues.tawakkul'),
      t('commonVirtues.sincerity'),
      t('commonVirtues.humility'),
      t('commonVirtues.forgiveness'),
      t('commonVirtues.generosity'),
      t('commonVirtues.courage'),
    ],
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearError(); // Clear any previous errors

    const MAX_RETRIES = 2;
    let attempt = 0;

    const attemptSuggestion = async (): Promise<void> => {
      try {
        attempt++;

        if (attempt > 1) {
          // Add delay for retries
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }

        // Use service API with enhanced context
        const response = await serviceApi.suggestPlan(mode, input, {
          struggles: mode === 'takhliyah' ? [input] : [],
          goals: mode === 'tahliyah' ? [input] : [],
          preferences: {
            difficultyLevel: 'moderate',
            timeCommitment: 'medium',
            focusAreas: [input]
          }
        });

        setSuggestedPlan((response as any).plan);
        setRetryCount(0); // Reset retry count on success
      } catch (error: any) {
        console.error(`Error generating plan (attempt ${attempt}):`, error);

        // Check if we should retry
        const isRetryableError = (
          error?.code === 'NETWORK_ERROR' ||
          !navigator.onLine ||
          error?.response?.status >= 500 ||
          error?.response?.status === 429
        );

        if (isRetryableError && attempt < MAX_RETRIES) {
          setRetryCount(attempt);
          return attemptSuggestion(); // Retry
        }

        // Enhanced error handling for different failure types
        let errorMessage = 'Failed to generate plan suggestion';
        let errorContext = 'Tazkiyah Plan Generation';

        if (error?.response?.status === 429) {
          errorMessage = 'Too many requests. Please try again in a few minutes.';
          errorContext = 'Rate Limit Exceeded';
        } else if (error?.response?.status === 401) {
          errorMessage = 'Authentication expired. Please log in again.';
          errorContext = 'Authentication Error';
          // Redirect to login after a delay
          setTimeout(() => router.push('/login'), 2000);
        } else if (error?.response?.status === 400) {
          errorMessage = 'Invalid input provided. Please check your selection and try again.';
          errorContext = 'Validation Error';
        } else if (error?.response?.status >= 500) {
          errorMessage = 'Server is temporarily unavailable. Please try again later.';
          errorContext = 'Server Error';
        } else if (error?.code === 'NETWORK_ERROR' || !navigator.onLine) {
          errorMessage = 'Network connection failed. Please check your internet connection.';
          errorContext = 'Connection Error';
        } else if (error?.response?.data?.error?.message) {
          errorMessage = error.response.data.error.message;
        }

        handleError(new Error(errorMessage), errorContext);
        throw error; // Re-throw to exit the retry loop
      }
    };

    try {
      await attemptSuggestion();
    } catch (error) {
      // Error already handled in attemptSuggestion
    } finally {
      setLoading(false);
    }
  };

  const acceptPlan = async () => {
    if (!suggestedPlan) return;

    setLoading(true);
    clearError();

    try {
      // Create the plan using service API
      const planData = {
        kind: suggestedPlan.kind,
        target: suggestedPlan.target,
        microHabits: suggestedPlan.microHabits.map((habit: any) => ({
          title: habit.title,
          schedule: habit.schedule,
          target: habit.target || 1
        })),
        duaIds: suggestedPlan.duaIds || [],
        contentIds: suggestedPlan.contentIds || []
      };

      await serviceApi.createPlan(planData);

      // Plan is created and automatically active in v2
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Error creating plan:', error);

      // Enhanced error handling for plan creation failures
      let errorMessage = 'Failed to create your spiritual plan';
      let errorContext = 'Plan Creation';

      if (error?.response?.status === 429) {
        errorMessage = 'Too many requests. Please wait before creating another plan.';
        errorContext = 'Rate Limit Exceeded';
      } else if (error?.response?.status === 401) {
        errorMessage = 'Authentication expired. Please log in again.';
        errorContext = 'Authentication Error';
        setTimeout(() => router.push('/login'), 2000);
      } else if (error?.response?.status === 400) {
        errorMessage = 'Invalid plan data. Please try generating a new plan.';
        errorContext = 'Validation Error';
      } else if (error?.response?.status >= 500) {
        errorMessage = 'Server error while creating plan. Please try again.';
        errorContext = 'Server Error';
      } else if (error?.code === 'NETWORK_ERROR' || !navigator.onLine) {
        errorMessage = 'Network connection failed. Please check your internet connection.';
        errorContext = 'Connection Error';
      } else if (error?.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      }

      handleError(new Error(errorMessage), errorContext);
      setLoading(false);
    }
  };

  return (
    <PageContainer
      title={t('title')}
      subtitle={t('subtitle')}
      maxWidth="lg"
      padding="lg"
    >
      {/* Error Display */}
      {error && (
        <ErrorDisplay
          error={error}
          onDismiss={clearError}
          className="mb-6"
        />
      )}

        {!suggestedPlan ? (
          <div className="card-islamic rounded-xl p-8 shadow-lg">
            {/* Mode Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                {t('chooseYourPath')}
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
                  <div className="font-semibold text-sage-900">{t('takhliyah')}</div>
                  <div className="text-sm text-gray-600 mt-1">{t('takhliyahDescription')}</div>
                </button>
                <button
                  onClick={() => setMode('tahliyah')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    mode === 'tahliyah'
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold text-sage-900">{t('tahliyah')}</div>
                  <div className="text-sm text-gray-600 mt-1">{t('tahliyahDescription')}</div>
                </button>
              </div>
            </div>

            {/* Input Form */}
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  {mode === 'takhliyah'
                    ? t('whatStruggle')
                    : t('whatVirtue')}
                </label>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={mode === 'takhliyah' ? t('takhliyahPlaceholder') : t('tahliyahPlaceholder')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>

              {/* Quick Select */}
              <div className="mb-6">
                <div className="text-sm text-gray-600 mb-2">{t('orChooseFrom')} {mode === 'takhliyah' ? t('struggles') : t('virtues')}:</div>
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
                {loading
                  ? retryCount > 0
                    ? `${t('creatingPlan')} (Retry ${retryCount})`
                    : t('creatingPlan')
                  : t('getPersonalizedPlan')
                }
              </button>
            </form>
          </div>
        ) : (
          <div className="card-islamic rounded-xl p-8 shadow-lg">
            <h2 className="text-2xl font-semibold text-sage-900 mb-6">
              {t('yourPersonalizedPlan')}
            </h2>

            <div className="mb-6">
              <div className="text-sm text-primary-600 mb-2">
                {suggestedPlan.kind === 'takhliyah' ? t('purifyingFrom') : t('building')}
              </div>
              <div className="text-lg font-medium">{suggestedPlan.target}</div>
            </div>

            <div className="mb-6">
              <h3 className="font-semibold text-gray-800 mb-3">{t('dailyMicroHabits')}</h3>
              <div className="space-y-3">
                {suggestedPlan.microHabits?.map((habit: any, index: number) => (
                  <div key={index} className="flex items-start">
                    <span className="text-primary-600 mr-2">-</span>
                    <div>
                      <div className="font-medium">{habit.title}</div>
                      <div className="text-sm text-gray-600">
                        {habit.schedule} - {t('target')} {habit.target} {t('times')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={acceptPlan}
                disabled={loading}
                className="flex-1 btn-primary py-3 disabled:opacity-50"
              >
                {loading ? t('creatingPlan') : t('acceptAndStart')}
              </button>
              <button
                onClick={() => setSuggestedPlan(null)}
                disabled={loading}
                className="flex-1 btn-secondary py-3 disabled:opacity-50"
              >
                {t('tryDifferentInput')}
              </button>
            </div>
          </div>
        )}
    </PageContainer>
  );
}