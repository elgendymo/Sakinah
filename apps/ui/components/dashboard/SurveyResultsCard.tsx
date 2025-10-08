'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  Psychology as PsychologyIcon,
  Insights as InsightsIcon,
  TrendingUp as GrowthIcon,
  AutoAwesome as SparkleIcon,
  CheckCircle as CheckIcon,
  NavigateNext as NextIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { AuthUtils } from '@/lib/auth-utils';
import { apiService } from '@/lib/services/api';

interface SurveyResults {
  id: string;
  diseaseScores: Record<string, number>;
  categorizedDiseases: {
    critical: string[];
    moderate: string[];
    strengths: string[];
  };
  personalizedHabits: Array<{
    id: string;
    title: string;
    targetDisease: string;
    frequency: string;
  }>;
  tazkiyahPlan: {
    criticalDiseases: string[];
    expectedDuration: string;
    phases: Array<{
      title: string;
      description: string;
    }>;
  };
  generatedAt: string;
}

interface SurveyResultsCardProps {
  userId: string;
  onHabitsIntegration?: () => void;
}

export default function SurveyResultsCard({ userId, onHabitsIntegration }: SurveyResultsCardProps) {
  const t = useTranslations('dashboard');
  const tSurvey = useTranslations('survey');

  const [surveyResults, setSurveyResults] = useState<SurveyResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [integrating, setIntegrating] = useState(false);
  const [habitsIntegrated, setHabitsIntegrated] = useState(false);

  useEffect(() => {
    loadSurveyResults();
  }, [userId]);

  const loadSurveyResults = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await AuthUtils.getAuthTokenWithFallback();
      const response = await apiService.get('v1/onboarding/results', {
        authToken: token,
        cacheTTL: 300000 // 5 minutes cache
      });

      const responseData = response.data as any;
      if (responseData?.data?.results) {
        setSurveyResults(responseData.data.results);

        // Check if habits have already been integrated
        const integratedHabits = responseData.data.results.personalizedHabits?.some(
          (habit: any) => habit.integrated === true
        );
        setHabitsIntegrated(integratedHabits || false);
      }
    } catch (error) {
      console.error('Error loading survey results:', error);
      // If survey not completed, don't show error
      if ((error as any)?.statusCode === 404) {
        setSurveyResults(null);
      } else {
        setError('Failed to load survey results');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleIntegrateHabits = async () => {
    try {
      setIntegrating(true);
      setError(null);

      const token = await AuthUtils.getAuthTokenWithFallback();
      const response = await apiService.post('v1/onboarding/integrate-habits', {}, {
        authToken: token
      });

      const responseData = response.data as any;
      if (responseData?.data?.integration?.completed) {
        setHabitsIntegrated(true);
        if (onHabitsIntegration) {
          onHabitsIntegration();
        }
      }
    } catch (error) {
      console.error('Error integrating habits:', error);
      setError('Failed to integrate habits');
    } finally {
      setIntegrating(false);
    }
  };

  if (loading) {
    return (
      <div className="relative overflow-hidden">
        <div className="absolute -inset-1 bg-gradient-to-r from-emerald-200/30 to-gold-200/30 rounded-2xl blur-sm"></div>
        <div className="relative bg-white/95 backdrop-blur-sm rounded-2xl border border-emerald-100/50 shadow-lg p-6">
          <div className="animate-pulse">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-emerald-200 rounded-lg"></div>
              <div className="h-4 bg-emerald-200 rounded w-32"></div>
            </div>
            <div className="space-y-3">
              <div className="h-3 bg-emerald-100 rounded w-full"></div>
              <div className="h-3 bg-emerald-100 rounded w-3/4"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative overflow-hidden">
        <div className="absolute -inset-1 bg-gradient-to-r from-red-200/30 to-red-100/30 rounded-2xl blur-sm"></div>
        <div className="relative bg-white/95 backdrop-blur-sm rounded-2xl border border-red-100/50 shadow-lg p-6">
          <div className="text-center">
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <RefreshIcon sx={{ fontSize: 16, color: '#dc2626' }} />
            </div>
            <p className="text-sm text-red-600 mb-3">{error}</p>
            <button
              onClick={loadSurveyResults}
              className="text-xs text-red-600 hover:text-red-800 underline"
            >
              {t('retry')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!surveyResults) {
    return (
      <div className="relative overflow-hidden">
        <div className="absolute -inset-1 bg-gradient-to-r from-purple-200/30 to-indigo-200/30 rounded-2xl blur-sm"></div>
        <div className="relative bg-white/95 backdrop-blur-sm rounded-2xl border border-purple-100/50 shadow-lg p-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <PsychologyIcon sx={{ fontSize: 20, color: 'white' }} />
            </div>
            <h3 className="text-lg font-semibold text-sage-800 mb-2">{tSurvey('tazkiyahDiscovery')}</h3>
            <p className="text-sm text-sage-600 leading-relaxed mb-4">
              {tSurvey('completeOnboardingDescription')}
            </p>
            <Link
              href="/onboarding/welcome"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white py-2.5 px-4 rounded-lg font-medium text-sm transition-all duration-200"
            >
              {tSurvey('startSurvey')}
              <NextIcon sx={{ fontSize: 14 }} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const criticalCount = surveyResults.categorizedDiseases.critical.length;
  const moderateCount = surveyResults.categorizedDiseases.moderate.length;
  const strengthsCount = surveyResults.categorizedDiseases.strengths.length;

  return (
    <div className="relative overflow-hidden">
      <div className="absolute -inset-1 bg-gradient-to-r from-emerald-200/30 to-gold-200/30 rounded-2xl blur-sm"></div>
      <div className="relative bg-white/95 backdrop-blur-sm rounded-2xl border border-emerald-100/50 shadow-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-lg flex items-center justify-center">
            <InsightsIcon sx={{ fontSize: 16, color: 'white' }} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-sage-800">{tSurvey('spiritualInsights')}</h3>
            <p className="text-xs text-sage-600">
              {tSurvey('completedOn')}: {new Date(surveyResults.generatedAt).toLocaleDateString()}
            </p>
          </div>
          <Link
            href="/onboarding/results"
            className="text-xs text-emerald-600 hover:text-emerald-800 font-medium flex items-center gap-1"
          >
            {t('viewDetails')}
            <NextIcon sx={{ fontSize: 12 }} />
          </Link>
        </div>

        <div className="space-y-4">
          {/* Spiritual Health Overview */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-red-50 rounded-lg border border-red-100">
              <div className="text-lg font-bold text-red-700">{criticalCount}</div>
              <div className="text-xs text-red-600">{tSurvey('criticalAreas')}</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg border border-yellow-100">
              <div className="text-lg font-bold text-yellow-700">{moderateCount}</div>
              <div className="text-xs text-yellow-600">{tSurvey('moderateAreas')}</div>
            </div>
            <div className="text-center p-3 bg-emerald-50 rounded-lg border border-emerald-100">
              <div className="text-lg font-bold text-emerald-700">{strengthsCount}</div>
              <div className="text-xs text-emerald-600">{tSurvey('strengths')}</div>
            </div>
          </div>

          {/* Personalized Habits Summary */}
          <div className="bg-emerald-50/50 rounded-lg p-4 border border-emerald-100">
            <div className="flex items-center gap-2 mb-2">
              <GrowthIcon sx={{ fontSize: 16, color: '#059669' }} />
              <span className="text-sm font-medium text-emerald-800">
                {surveyResults.personalizedHabits.length} {tSurvey('personalizedHabits')}
              </span>
            </div>
            <div className="text-xs text-emerald-700 space-y-1">
              {surveyResults.personalizedHabits.slice(0, 3).map((habit, index) => (
                <div key={habit.id} className="flex items-center gap-2">
                  <span className="w-1 h-1 bg-emerald-400 rounded-full"></span>
                  <span>{habit.title}</span>
                </div>
              ))}
              {surveyResults.personalizedHabits.length > 3 && (
                <div className="text-emerald-600 font-medium">
                  +{surveyResults.personalizedHabits.length - 3} {tSurvey('moreHabits')}
                </div>
              )}
            </div>
          </div>

          {/* Tazkiyah Plan Overview */}
          <div className="bg-gold-50/50 rounded-lg p-4 border border-gold-100">
            <div className="flex items-center gap-2 mb-2">
              <SparkleIcon sx={{ fontSize: 16, color: '#f59e0b' }} />
              <span className="text-sm font-medium text-gold-800">{tSurvey('tazkiyahPlan')}</span>
            </div>
            <div className="text-xs text-gold-700">
              <div className="mb-1">
                {tSurvey('focusAreas')}: {surveyResults.tazkiyahPlan.criticalDiseases.join(', ')}
              </div>
              <div>
                {tSurvey('duration')}: {surveyResults.tazkiyahPlan.expectedDuration}
              </div>
            </div>
          </div>

          {/* Integration Actions */}
          <div className="pt-3 border-t border-sage-100">
            {!habitsIntegrated ? (
              <button
                onClick={handleIntegrateHabits}
                disabled={integrating}
                className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2.5 px-4 rounded-lg font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2"
              >
                {integrating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    {tSurvey('integratingHabits')}
                  </>
                ) : (
                  <>
                    <GrowthIcon sx={{ fontSize: 14 }} />
                    {tSurvey('addToHabitTracker')}
                  </>
                )}
              </button>
            ) : (
              <div className="flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-50 text-emerald-700 rounded-lg">
                <CheckIcon sx={{ fontSize: 14 }} />
                <span className="text-sm font-medium">{tSurvey('habitsIntegrated')}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}