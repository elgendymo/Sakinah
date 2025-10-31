'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import PageContainer from '@/components/PageContainer';
import ProgressIndicator from '@/components/survey/ui/ProgressIndicator';
import { useSurveyLanguage } from '@/components/survey/hooks/useSurveyLanguage';
import type { SurveyResults, Disease } from '@sakinah/types';
import { buildApiUrl } from '@/lib/utils/apiUrl';

// Helper function to transform diseases into positive virtues
const getSpiritualVirtues = () => {
  return {
    envy: { name: 'Contentment', icon: '🌱', description: 'Growing in gratitude and appreciation' },
    arrogance: { name: 'Humility', icon: '🕊️', description: 'Cultivating modesty and humbleness' },
    selfDeception: { name: 'Self-Awareness', icon: '🪞', description: 'Developing honest self-reflection' },
    lust: { name: 'Purity', icon: '💎', description: 'Strengthening spiritual discipline' },
    anger: { name: 'Patience', icon: '🌸', description: 'Building forbearance and calm' },
    malice: { name: 'Compassion', icon: '💖', description: 'Growing in forgiveness and kindness' },
    backbiting: { name: 'Good Speech', icon: '🌺', description: 'Practicing mindful and positive words' },
    suspicion: { name: 'Trust', icon: '🤝', description: 'Building positive thinking and trust' },
    loveOfDunya: { name: 'Spiritual Focus', icon: '🌙', description: 'Growing focus on the Hereafter' },
    laziness: { name: 'Diligence', icon: '⚡', description: 'Developing consistency and action' },
    despair: { name: 'Hope', icon: '🌅', description: 'Strengthening faith and optimism' }
  };
};

// Helper function to get growth indicators
const getGrowthIndicator = (score: number) => {
  if (score <= 2) return {
    level: 'Strong',
    percentage: 85,
    color: 'emerald',
    message: 'Thriving',
    emoji: '✨',
    status: 'Flourishing'
  };
  if (score === 3) return {
    level: 'Growing',
    percentage: 65,
    color: 'blue',
    message: 'Developing',
    emoji: '🌱',
    status: 'Growing'
  };
  return {
    level: 'Emerging',
    percentage: 40,
    color: 'rose',
    message: 'Beginning',
    emoji: '🌅',
    status: 'Emerging'
  };
};

export default function ResultsPage() {
  const router = useRouter();
  const { language, t, translations } = useSurveyLanguage();

  const [results, setResults] = useState<SurveyResults | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'habits' | 'plan'>('overview');

  // Load results from API
  useEffect(() => {
    const loadResults = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(buildApiUrl('/v1/onboarding/results'), {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          setResults(data.data.results);
        } else {
          setError('Failed to load results. Please try again.');
        }
      } catch (error) {
        console.error('Error loading results:', error);
        setError('An error occurred while loading your results.');
      } finally {
        setIsLoading(false);
      }
    };

    void loadResults();
  }, []);

  // Get spiritual insights from localization
  const getSpiritualInsights = () => {
    return translations.virtues;
  };


  const handleExport = async (format: 'pdf' | 'json') => {
    if (!results) return;

    try {
      const response = await fetch(buildApiUrl(`/v1/onboarding/export/${format}/${results.id}`), {
        method: 'GET',
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `tazkiyah-results.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error(`Error exporting ${format}:`, error);
    }
  };

  const containerVariants = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1
      }
    }
  };

  const headerVariants = {
    initial: { opacity: 0, y: -20 },
    animate: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" }
    }
  };

  const cardVariants = {
    initial: { opacity: 0, y: 20 },
    animate: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" }
    }
  };

  if (isLoading) {
    return (
      <PageContainer maxWidth="lg" padding="lg" className="min-h-screen">
        <motion.div
          className="flex items-center justify-center min-h-[60vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="text-center">
            <motion.div
              className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            <p className="text-sage-600">
              {t('common.loading')}
            </p>
          </div>
        </motion.div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer maxWidth="lg" padding="lg" className="min-h-screen">
        <motion.div
          className="flex items-center justify-center min-h-[60vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="text-center bg-red-50 border border-red-200 rounded-lg p-6">
            <svg className="w-12 h-12 text-red-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <h3 className="text-lg font-semibold text-red-800 mb-2">
              {t('common.error')}
            </h3>
            <p className="text-red-700 mb-4">{error}</p>
            <button
              onClick={() => router.push('/onboarding/reflection')}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
            >
              {t('common.back')}
            </button>
          </div>
        </motion.div>
      </PageContainer>
    );
  }

  if (!results) {
    return null;
  }

  return (
    <PageContainer maxWidth="4xl" padding="lg" className="min-h-screen">
      <motion.div
        className="max-w-5xl mx-auto"
        variants={containerVariants}
        initial="initial"
        animate="animate"
      >
        {/* Progress Indicator */}
        <ProgressIndicator
          currentPhase={4}
          totalPhases={4}
          percentage={100}
        />

        {/* Page Header */}
        <motion.div
          className="text-center mb-12"
          variants={headerVariants}
        >
          <div className="mb-6">
            <motion.div
              className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full mb-4"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <span className="text-3xl">🌱</span>
            </motion.div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-4">
            {translations.results.title}
          </h1>
          <p className="text-slate-600 max-w-3xl mx-auto leading-relaxed text-lg">
            {translations.results.subtitle}
          </p>
          <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 max-w-2xl mx-auto">
            <p className={`text-blue-800 font-medium ${language === 'ar' ? 'arabic-body' : ''}`}>
              {t('results.overview.quotation')}
            </p>
          </div>

        </motion.div>

        {/* Gentle Tab Navigation */}
        <motion.div
          className="flex justify-center mb-12"
          variants={cardVariants}
        >
          <div className="bg-white rounded-2xl p-2 flex gap-2 shadow-lg shadow-slate-100">
            {[
              { id: 'overview', label: translations.results.tabs.overview, icon: '💫' },
              { id: 'habits', label: translations.results.tabs.habits, icon: '🌸' },
              { id: 'plan', label: translations.results.tabs.plan, icon: '🌿' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 shadow-md border border-emerald-100'
                    : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {/* Heart's Reflection Tab */}
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              {/* Inspirational Opening */}
              <div className="bg-gradient-to-br from-purple-50 via-blue-50 to-emerald-50 rounded-3xl p-8 border border-blue-100 relative overflow-hidden">
                {/* Subtle Background Elements */}
                <div className="absolute inset-0 opacity-5">
                  <div className="absolute top-6 left-6 text-4xl transform rotate-12">🌙</div>
                  <div className="absolute top-8 right-8 text-3xl transform -rotate-12">✨</div>
                  <div className="absolute bottom-8 left-8 text-5xl transform rotate-6">💫</div>
                  <div className="absolute bottom-6 right-6 text-2xl transform -rotate-6">🌿</div>
                </div>

                <div className="text-center relative z-10">
                  <motion.div
                    className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full mb-6 shadow-lg"
                    animate={{
                      scale: [1, 1.1, 1],
                      rotate: [0, 5, -5, 0],
                      boxShadow: [
                        "0 10px 25px -5px rgb(0 0 0 / 0.1)",
                        "0 20px 25px -5px rgb(0 0 0 / 0.2)",
                        "0 10px 25px -5px rgb(0 0 0 / 0.1)"
                      ]
                    }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <span className="text-3xl">💫</span>
                  </motion.div>
                  <h2 className={`text-2xl font-bold text-slate-800 mb-4 ${language === 'ar' ? 'arabic-heading' : ''}`}>
                    {t('results.overview.mirrorOfHeart')}
                  </h2>
                  <p className={`text-slate-600 leading-relaxed max-w-2xl mx-auto ${language === 'ar' ? 'arabic-body' : ''}`}>
                    {t('results.overview.soulJourneyDesc')}
                  </p>
                </div>
              </div>

              {/* Interactive Virtue Garden */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {Object.entries(results.diseaseScores).map(([disease, score], index) => {
                  const virtues = getSpiritualVirtues();
                  const insights = getSpiritualInsights();
                  const virtue = virtues[disease as Disease];
                  const insight = insights[disease as Disease];
                  const growth = getGrowthIndicator(score);

                  if (!virtue) return null;

                  const getVirtueColor = (score: number) => {
                    if (score <= 2) return { bg: 'from-emerald-400 to-green-500', glow: 'shadow-emerald-300/60' };
                    if (score === 3) return { bg: 'from-blue-400 to-cyan-500', glow: 'shadow-blue-300/60' };
                    return { bg: 'from-rose-400 to-pink-500', glow: 'shadow-rose-300/60' };
                  };

                  const colors = getVirtueColor(score);

                  return (
                    <motion.div
                      key={disease}
                      initial={{ opacity: 0, scale: 0.8, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{
                        delay: index * 0.15,
                        type: "spring",
                        stiffness: 150,
                        damping: 12
                      }}
                      whileHover={{
                        scale: 1.05,
                        y: -8,
                        transition: { duration: 0.2 }
                      }}
                      whileTap={{ scale: 0.95 }}
                      className="relative group cursor-pointer"
                    >
                      {/* Glowing Orb */}
                      <motion.div
                        className={`relative w-40 h-40 rounded-full bg-gradient-to-br ${colors.bg} p-2 shadow-2xl ${colors.glow} group-hover:shadow-3xl transition-all duration-500`}
                        animate={{
                          boxShadow: [
                            `0 15px 35px -10px ${score <= 2 ? 'rgba(16, 185, 129, 0.4)' : score === 3 ? 'rgba(59, 130, 246, 0.4)' : 'rgba(244, 63, 94, 0.4)'}`,
                            `0 25px 50px -10px ${score <= 2 ? 'rgba(16, 185, 129, 0.6)' : score === 3 ? 'rgba(59, 130, 246, 0.6)' : 'rgba(244, 63, 94, 0.6)'}`,
                            `0 15px 35px -10px ${score <= 2 ? 'rgba(16, 185, 129, 0.4)' : score === 3 ? 'rgba(59, 130, 246, 0.4)' : 'rgba(244, 63, 94, 0.4)'}`
                          ]
                        }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <div className="w-full h-full bg-white rounded-full flex flex-col items-center justify-center relative overflow-hidden">
                          {/* Animated Icon */}
                          <motion.div
                            className="text-4xl mb-2 z-10"
                            animate={{
                              rotate: [0, 10, -10, 0],
                              scale: [1, 1.2, 1]
                            }}
                            transition={{
                              duration: 4,
                              repeat: Infinity,
                              ease: "easeInOut",
                              delay: index * 0.5
                            }}
                          >
                            {virtue.icon}
                          </motion.div>

                          {/* Pulsing Background */}
                          <motion.div
                            className="absolute inset-0 rounded-full opacity-20"
                            style={{ background: `linear-gradient(45deg, ${score <= 2 ? '#10b981' : score === 3 ? '#3b82f6' : '#f43f5f'}, transparent)` }}
                            animate={{
                              scale: [0.8, 1.2, 0.8],
                              opacity: [0.1, 0.3, 0.1]
                            }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                          />

                          {/* Circular Progress */}
                          <div className="absolute inset-3">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                              <circle
                                cx="50" cy="50" r="45"
                                fill="none"
                                stroke="rgba(0,0,0,0.1)"
                                strokeWidth="4"
                              />
                              <motion.circle
                                cx="50" cy="50" r="45"
                                fill="none"
                                stroke={score <= 2 ? '#10b981' : score === 3 ? '#3b82f6' : '#f43f5f'}
                                strokeWidth="4"
                                strokeLinecap="round"
                                strokeDasharray={`${2 * Math.PI * 45}`}
                                initial={{ strokeDashoffset: 2 * Math.PI * 45 }}
                                animate={{ strokeDashoffset: 2 * Math.PI * 45 * (1 - growth.percentage / 100) }}
                                transition={{ delay: index * 0.15 + 0.8, duration: 2, ease: "easeOut" }}
                              />
                            </svg>
                          </div>

                          {/* Percentage Counter */}
                          <motion.div
                            className="absolute bottom-4 text-lg font-bold text-gray-700"
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.15 + 1.5, type: "spring", stiffness: 200 }}
                          >
                            {growth.percentage}%
                          </motion.div>
                        </div>
                      </motion.div>

                      {/* Floating Status */}
                      <motion.div
                        className="absolute -top-3 -right-3 bg-white rounded-full p-2 shadow-lg border-2 border-gray-100"
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: index * 0.15 + 0.5, type: "spring", stiffness: 200 }}
                        whileHover={{ scale: 1.2, rotate: 15 }}
                      >
                        <motion.span
                          className="text-xl"
                          animate={{ rotate: [0, 360] }}
                          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                        >
                          {growth.emoji}
                        </motion.span>
                      </motion.div>

                      {/* Virtue Label */}
                      <motion.div
                        className="mt-4 text-center"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.15 + 0.8 }}
                      >
                        <h3 className={`text-lg font-bold text-gray-800 ${language === 'ar' ? 'arabic-heading' : ''}`}>
                          {virtue.name}
                        </h3>
                        <motion.div
                          className={`inline-flex items-center gap-1 mt-2 px-3 py-1 rounded-full text-sm font-medium ${
                            score <= 2 ? 'bg-emerald-100 text-emerald-700' :
                            score === 3 ? 'bg-blue-100 text-blue-700' :
                            'bg-rose-100 text-rose-700'
                          }`}
                          whileHover={{ scale: 1.05 }}
                        >
                          <motion.span
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                          >
                            {growth.emoji}
                          </motion.span>
                          {growth.status}
                        </motion.div>
                      </motion.div>

                      {/* Interactive Tooltip with Spiritual Insight */}
                      <motion.div
                        className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-4 bg-black/90 text-white text-sm px-4 py-3 rounded-2xl opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-300 z-30 max-w-xs text-center"
                        initial={{ scale: 0.8, y: 10 }}
                        whileHover={{ scale: 1, y: 0 }}
                      >
                        <motion.div
                          animate={{ y: [0, -2, 0] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                          className="space-y-2"
                        >
                          <div>✨ {virtue.description}</div>
                          {insight && (
                            <div className={`text-xs opacity-90 border-t border-white/20 pt-2 ${language === 'ar' ? 'arabic-body' : ''}`}>
                              💫 {insight.insight}
                            </div>
                          )}
                        </motion.div>
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-8 border-transparent border-t-black/90"></div>
                      </motion.div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Spiritual Insights Section */}
              <motion.div
                className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-3xl p-8 border border-blue-100 relative overflow-hidden"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.0 }}
              >
                <div className="text-center mb-6">
                  <motion.div
                    className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full mb-4"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <span className="text-2xl">💫</span>
                  </motion.div>
                  <h3 className={`text-xl font-semibold text-blue-800 mb-2 ${language === 'ar' ? 'arabic-heading' : ''}`}>
                    {t('results.overview.spiritualInsights')}
                  </h3>
                  <p className={`text-blue-600 text-sm ${language === 'ar' ? 'arabic-body' : ''}`}>
                    {t('results.overview.gentleWisdom')}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(results.diseaseScores)
                    .sort(([,a], [,b]) => b - a) // Show areas needing most attention first
                    .slice(0, 6) // Show top 6 insights
                    .map(([disease, score], index) => {
                      const insights = getSpiritualInsights();
                      const insight = insights[disease as Disease];

                      if (!insight) return null;

                      return (
                        <motion.div
                          key={disease}
                          initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.8 + index * 0.1 }}
                          className="bg-white/70 rounded-2xl p-4 border border-blue-100 hover:shadow-md transition-all duration-300"
                        >
                          <div className={`flex items-start gap-3 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                            <div className="flex-shrink-0">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                score <= 2 ? 'bg-emerald-100 text-emerald-600' :
                                score === 3 ? 'bg-blue-100 text-blue-600' :
                                'bg-rose-100 text-rose-600'
                              }`}>
                                <span className="text-lg">💎</span>
                              </div>
                            </div>
                            <div className={`flex-1 ${language === 'ar' ? 'text-right' : ''}`}>
                              <h4 className={`font-medium text-blue-800 mb-1 text-sm ${language === 'ar' ? 'arabic-heading' : ''}`}>
                                {insight.name}
                              </h4>
                              <p className={`text-blue-600 text-xs leading-relaxed ${language === 'ar' ? 'arabic-body' : ''}`}>
                                {insight.insight}
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                </div>
              </motion.div>

              {/* Animated Stats Dashboard */}
              <motion.div
                className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 rounded-3xl p-8 border border-indigo-100 relative overflow-hidden"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2 }}
              >
                {/* Floating Particles */}
                <div className="absolute inset-0 overflow-hidden">
                  {[...Array(8)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-4 h-4 rounded-full"
                      style={{
                        background: `linear-gradient(45deg, ${['#10b981', '#3b82f6', '#f43f5f'][i % 3]}, transparent)`,
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`,
                      }}
                      animate={{
                        y: [0, -30, 0],
                        x: [0, 15, -15, 0],
                        opacity: [0.2, 0.8, 0.2],
                        scale: [0.5, 1.5, 0.5]
                      }}
                      transition={{
                        duration: 4 + Math.random() * 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: Math.random() * 3
                      }}
                    />
                  ))}
                </div>

                <div className="relative z-10 grid grid-cols-3 gap-8 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 1.5, type: "spring", stiffness: 200 }}
                  >
                    <motion.div
                      className="text-5xl font-bold text-emerald-600 mb-2"
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    >
                      {Object.values(results.diseaseScores).filter(score => score <= 2).length}
                    </motion.div>
                    <div className="flex items-center justify-center gap-2">
                      <motion.span
                        className="text-2xl"
                        animate={{ rotate: [0, 360] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                      >
                        ✨
                      </motion.span>
                      <span className="text-sm font-bold text-emerald-700 uppercase tracking-wide">
                        {t('results.overview.mastery')}
                      </span>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 1.7, type: "spring", stiffness: 200 }}
                  >
                    <motion.div
                      className="text-5xl font-bold text-blue-600 mb-2"
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                    >
                      {Object.values(results.diseaseScores).filter(score => score === 3).length}
                    </motion.div>
                    <div className="flex items-center justify-center gap-2">
                      <motion.span
                        className="text-2xl"
                        animate={{ y: [0, -5, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      >
                        🌱
                      </motion.span>
                      <span className="text-sm font-bold text-blue-700 uppercase tracking-wide">
                        {t('results.overview.growing')}
                      </span>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 1.9, type: "spring", stiffness: 200 }}
                  >
                    <motion.div
                      className="text-5xl font-bold text-rose-600 mb-2"
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                    >
                      {Object.values(results.diseaseScores).filter(score => score >= 4).length}
                    </motion.div>
                    <div className="flex items-center justify-center gap-2">
                      <motion.span
                        className="text-2xl"
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      >
                        🌅
                      </motion.span>
                      <span className="text-sm font-bold text-rose-700 uppercase tracking-wide">
                        {t('results.overview.emerging')}
                      </span>
                    </div>
                  </motion.div>
                </div>
              </motion.div>

              {/* Interactive Encouragement */}
              <motion.div
                className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-3xl p-8 border border-teal-100 relative overflow-hidden"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 2 }}
              >
                <div className="text-center relative z-10">
                  <motion.div
                    className="inline-block text-6xl mb-4"
                    animate={{
                      rotate: [0, 10, -10, 0],
                      scale: [1, 1.2, 1]
                    }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  >
                    🤲
                  </motion.div>
                  <motion.div
                    className="text-2xl font-bold text-teal-800 mb-4"
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    ✨ {t('results.overview.keepGrowing')} ✨
                  </motion.div>
                </div>

                {/* Animated Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                  <motion.div
                    className="absolute top-4 left-4 text-4xl"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                  >
                    🌟
                  </motion.div>
                  <motion.div
                    className="absolute top-4 right-4 text-3xl"
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  >
                    💫
                  </motion.div>
                  <motion.div
                    className="absolute bottom-4 left-4 text-3xl"
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    🌙
                  </motion.div>
                  <motion.div
                    className="absolute bottom-4 right-4 text-4xl"
                    animate={{ rotate: [0, 15, -15, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  >
                    🌸
                  </motion.div>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Gentle Practices Tab */}
          {activeTab === 'habits' && (
            <motion.div
              key="habits"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              {/* Practices Introduction */}
              <div className="bg-gradient-to-br from-pink-50 via-rose-50 to-orange-50 rounded-3xl p-8 border border-rose-100">
                <div className="text-center">
                  <motion.div
                    className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-rose-100 to-pink-100 rounded-full mb-4"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <span className="text-2xl">🌸</span>
                  </motion.div>
                  <h2 className={`text-2xl font-bold text-slate-800 mb-4 ${language === 'ar' ? 'arabic-heading' : ''}`}>
                    {t('results.habits.gentlePath')}
                  </h2>
                  <p className={`text-slate-600 leading-relaxed max-w-2xl mx-auto ${language === 'ar' ? 'arabic-body' : ''}`}>
                    {t('results.habits.practicesDesc')}
                  </p>
                </div>
              </div>

              {/* Habit Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {results.personalizedHabits.map((habit, index) => {
                  const difficultyColors = {
                    easy: { bg: 'from-green-50 to-emerald-50', border: 'border-green-200', text: 'text-green-800', badge: 'bg-green-100' },
                    moderate: { bg: 'from-blue-50 to-cyan-50', border: 'border-blue-200', text: 'text-blue-800', badge: 'bg-blue-100' },
                    hard: { bg: 'from-purple-50 to-indigo-50', border: 'border-purple-200', text: 'text-purple-800', badge: 'bg-purple-100' }
                  };
                  const colors = difficultyColors[habit.difficultyLevel as keyof typeof difficultyColors] || difficultyColors.moderate;

                  return (
                    <motion.div
                      key={habit.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`bg-gradient-to-br ${colors.bg} rounded-2xl p-6 border ${colors.border} hover:shadow-lg transition-all duration-300`}
                    >
                      <div className={`flex items-start justify-between mb-4 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                        <div className={language === 'ar' ? 'text-right' : ''}>
                          <h3 className={`text-lg font-semibold ${colors.text} mb-2 ${language === 'ar' ? 'arabic-heading' : ''}`}>
                            {habit.title}
                          </h3>
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${colors.badge} ${colors.text}`}>
                            {habit.difficultyLevel === 'easy' ? t('results.habits.gentleStart') : habit.difficultyLevel === 'moderate' ? t('results.habits.steadyGrowth') : t('results.habits.deeperJourney')}
                          </span>
                        </div>
                        <motion.span
                          className="text-2xl"
                          animate={{ rotate: [0, 10, -10, 0] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        >
                          🌿
                        </motion.span>
                      </div>

                      <p className={`${colors.text} mb-4 leading-relaxed ${language === 'ar' ? 'arabic-body text-right' : ''}`}>
                        {habit.description}
                      </p>

                      <div className={`space-y-2 ${language === 'ar' ? 'text-right' : ''}`}>
                        <div className={`flex items-center gap-2 text-sm ${colors.text} ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                          <span className="font-medium">⏰</span>
                          <span className={language === 'ar' ? 'arabic-body' : ''}>
                            {t('results.habits.howOften')} {habit.frequency}
                          </span>
                        </div>
                        <div className={`flex items-center gap-2 text-sm ${colors.text} ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                          <span className="font-medium">⏳</span>
                          <span className={language === 'ar' ? 'arabic-body' : ''}>
                            {t('results.habits.timeNeeded')} {habit.estimatedDuration}
                          </span>
                        </div>
                        <div className={`flex items-center gap-2 text-sm ${colors.text} ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                          <span className="font-medium">🎯</span>
                          <span className={language === 'ar' ? 'arabic-body' : ''}>
                            {t('results.habits.nurtures')} {habit.targetDisease}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Encouragement */}
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-3xl p-8 border border-amber-100">
                <div className="text-center">
                  <span className="text-3xl mb-4 block">✨</span>
                  <h3 className={`text-xl font-semibold text-amber-800 mb-3 ${language === 'ar' ? 'arabic-heading' : ''}`}>
                    {t('results.habits.startWhereYouAre')}
                  </h3>
                  <p className={`text-amber-700 leading-relaxed ${language === 'ar' ? 'arabic-body' : ''}`}>
                    {t('results.habits.startWhereDesc')}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Growth Journey Tab */}
          {activeTab === 'plan' && (
            <motion.div
              key="plan"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              {/* Journey Introduction */}
              <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-3xl p-8 border border-indigo-100">
                <div className="text-center">
                  <motion.div
                    className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full mb-4"
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <span className="text-2xl">🌿</span>
                  </motion.div>
                  <h2 className={`text-2xl font-bold text-slate-800 mb-4 ${language === 'ar' ? 'arabic-heading' : ''}`}>
                    {t('results.plan.tazkiyahJourney')}
                  </h2>
                  <p className={`text-slate-600 leading-relaxed max-w-2xl mx-auto mb-4 ${language === 'ar' ? 'arabic-body' : ''}`}>
                    {t('results.plan.journeyDesc')}
                  </p>
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 rounded-full border border-indigo-200">
                    <span className="text-sm font-medium text-indigo-800">🕰️</span>
                    <span className={`text-sm text-indigo-700 ${language === 'ar' ? 'arabic-body' : ''}`}>
                      {t('results.plan.estimatedJourney')} {results.tazkiyahPlan.expectedDuration}
                    </span>
                  </div>
                </div>
              </div>

              {/* Areas of Focus */}
              {results.tazkiyahPlan.criticalDiseases.length > 0 && (
                <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-2xl p-6 border border-teal-200">
                  <h3 className={`text-lg font-semibold text-teal-800 mb-4 flex items-center gap-2 ${language === 'ar' ? 'arabic-heading flex-row-reverse' : ''}`}>
                    <span>🎯</span>
                    {t('results.plan.specialAttention')}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {results.tazkiyahPlan.criticalDiseases.map((disease, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-white/80 rounded-xl p-3 border border-teal-100"
                      >
                        <span className={`text-sm text-teal-700 font-medium ${language === 'ar' ? 'arabic-body' : ''}`}>
                          {disease}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Journey Phases */}
              <div className="space-y-6">
                <h3 className={`text-xl font-semibold text-slate-800 text-center mb-6 ${language === 'ar' ? 'arabic-heading' : ''}`}>
                  {t('results.plan.growthPhases')}
                </h3>
                {results.tazkiyahPlan.phases.map((phase, index) => (
                  <motion.div
                    key={phase.phaseNumber}
                    initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.2 }}
                    className="bg-white rounded-2xl p-6 border-l-4 border-l-indigo-400 shadow-sm hover:shadow-md transition-all duration-300"
                  >
                    <div className={`flex items-start gap-4 mb-4 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center">
                          <span className="font-bold text-indigo-700">{phase.phaseNumber}</span>
                        </div>
                      </div>
                      <div className={`flex-1 ${language === 'ar' ? 'text-right' : ''}`}>
                        <h4 className={`text-lg font-semibold text-slate-800 mb-2 ${language === 'ar' ? 'arabic-heading' : ''}`}>
                          {phase.title}
                        </h4>
                        <p className={`text-slate-600 mb-3 ${language === 'ar' ? 'arabic-body' : ''}`}>
                          {phase.description}
                        </p>
                        <div className={`flex items-center gap-2 text-sm text-indigo-600 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                          <span>⏱️</span>
                          <span className={language === 'ar' ? 'arabic-body' : ''}>
                            {phase.duration}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Gentle Practices */}
                    <div className="mb-4">
                      <h5 className={`font-medium text-slate-700 mb-3 flex items-center gap-2 ${language === 'ar' ? 'arabic-heading flex-row-reverse' : ''}`}>
                        <span>🌸</span>
                        {t('results.plan.gentlePractices')}
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {phase.practices.map((practice, practiceIndex) => (
                          <div key={practiceIndex} className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-100">
                            <div className={`flex items-center gap-2 mb-2 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                              <span className={`font-medium text-indigo-800 ${language === 'ar' ? 'arabic-heading' : ''}`}>
                                {practice.name}
                              </span>
                              <span className="text-xs px-2 py-1 bg-indigo-200 text-indigo-700 rounded-full">
                                {practice.type}
                              </span>
                            </div>
                            <p className={`text-indigo-700 text-sm mb-2 ${language === 'ar' ? 'arabic-body text-right' : ''}`}>
                              {practice.description}
                            </p>
                            <p className={`text-indigo-600 text-xs ${language === 'ar' ? 'text-right arabic-body' : ''}`}>
                              💫 {practice.frequency}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Progress Milestones */}
                    <div>
                      <h5 className={`font-medium text-slate-700 mb-3 flex items-center gap-2 ${language === 'ar' ? 'arabic-heading flex-row-reverse' : ''}`}>
                        <span>✨</span>
                        {t('results.plan.growthMilestones')}
                      </h5>
                      <div className="space-y-2">
                        {phase.checkpoints.map((checkpoint, checkpointIndex) => (
                          <div key={checkpointIndex} className={`flex items-center gap-3 text-sm text-slate-600 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                            <span className="text-green-500">🌱</span>
                            <span className={language === 'ar' ? 'arabic-body text-right' : ''}>
                              {checkpoint}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Journey Milestones */}
              {results.tazkiyahPlan.milestones.length > 0 && (
                <div className="bg-gradient-to-r from-violet-50 to-purple-50 rounded-3xl p-8 border border-violet-100">
                  <h3 className={`text-xl font-semibold text-violet-800 mb-6 text-center flex items-center justify-center gap-2 ${language === 'ar' ? 'arabic-heading' : ''}`}>
                    <span>🏔️</span>
                    {t('results.plan.journeyMilestones')}
                  </h3>
                  <div className="space-y-4">
                    {results.tazkiyahPlan.milestones.map((milestone, index) => (
                      <motion.div
                        key={milestone.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`flex items-start gap-4 ${language === 'ar' ? 'flex-row-reverse' : ''}`}
                      >
                        <div className="flex-shrink-0">
                          <motion.div
                            className={`w-6 h-6 rounded-full border-2 ${
                              milestone.completed
                                ? 'bg-emerald-500 border-emerald-500'
                                : 'border-violet-300 bg-white'
                            }`}
                            animate={milestone.completed ? { scale: [1, 1.1, 1] } : {}}
                            transition={{ duration: 1, repeat: Infinity }}
                          />
                        </div>
                        <div className={`flex-1 ${language === 'ar' ? 'text-right' : ''}`}>
                          <h4 className={`font-medium text-violet-900 mb-1 ${language === 'ar' ? 'arabic-heading' : ''}`}>
                            {milestone.title}
                          </h4>
                          <p className={`text-violet-700 text-sm ${language === 'ar' ? 'arabic-body' : ''}`}>
                            {milestone.description}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Closing Inspiration */}
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-3xl p-8 border border-emerald-100">
                <div className="text-center">
                  <span className="text-4xl mb-4 block">🌙</span>
                  <h3 className={`text-xl font-semibold text-emerald-800 mb-3 ${language === 'ar' ? 'arabic-heading' : ''}`}>
                    {t('results.plan.trustProcess')}
                  </h3>
                  <p className={`text-emerald-700 leading-relaxed ${language === 'ar' ? 'arabic-body' : ''}`}>
                    {t('results.plan.trustProcessDesc')}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Gentle Actions */}
        <motion.div
          className="mt-12 space-y-6"
          variants={cardVariants}
        >
          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            <motion.button
              onClick={() => handleExport('pdf')}
              className="bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white px-8 py-4 rounded-2xl font-medium transition-all duration-300 flex items-center gap-3 shadow-lg hover:shadow-xl transform hover:scale-105"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="text-xl">📜</span>
{translations.results.actions.saveJourney}
            </motion.button>

            <motion.button
              onClick={() => handleExport('json')}
              className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white px-8 py-4 rounded-2xl font-medium transition-all duration-300 flex items-center gap-3 shadow-lg hover:shadow-xl transform hover:scale-105"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="text-xl">📊</span>
{translations.results.actions.exportData}
            </motion.button>

            <motion.button
              onClick={() => router.push('/dashboard')}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-8 py-4 rounded-2xl font-medium transition-all duration-300 flex items-center gap-3 shadow-lg hover:shadow-xl transform hover:scale-105"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="text-xl">🏠</span>
{translations.results.actions.beginPractice}
            </motion.button>
          </div>

          {/* Gentle Encouragement */}
          <div className="text-center max-w-2xl mx-auto">
            <p className={`text-slate-500 text-sm ${language === 'ar' ? 'arabic-body' : ''}`}>
              {t('results.completion.reflectOnInsights')}
            </p>
          </div>
        </motion.div>

        {/* Heartfelt Completion */}
        <motion.div
          className="mt-12 text-center p-8 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 rounded-3xl border border-amber-200 relative overflow-hidden"
          variants={cardVariants}
        >
          {/* Subtle Background Pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-4 left-4 text-6xl transform rotate-12">🌿</div>
            <div className="absolute top-8 right-8 text-4xl transform -rotate-12">✨</div>
            <div className="absolute bottom-6 left-8 text-5xl transform rotate-6">🌙</div>
            <div className="absolute bottom-4 right-6 text-3xl transform -rotate-6">🌸</div>
          </div>

          <div className="relative z-10">
            <motion.div
              className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-amber-100 to-orange-100 rounded-full mb-6"
              animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <span className="text-3xl">🤲</span>
            </motion.div>

            <h3 className={`text-2xl font-bold text-amber-900 mb-4 ${language === 'ar' ? 'arabic-heading' : ''}`}>
              {t('results.plan.beautifulBeginning')}
            </h3>

            <div className="max-w-3xl mx-auto space-y-4">
              <p className={`text-amber-800 text-lg leading-relaxed ${language === 'ar' ? 'arabic-body' : ''}`}>
                {t('results.plan.beginningDesc')}
              </p>

              <div className="bg-white/60 rounded-2xl p-6 border border-amber-100">
                <p className={`text-amber-900 font-semibold mb-2 ${language === 'ar' ? 'arabic-body' : ''}`}>
                  {t('results.overview.quotation').split(' - ')[0]}
                </p>
                <p className={`text-amber-700 text-sm ${language === 'ar' ? 'arabic-body' : ''}`}>
                  {t('results.plan.quotationRef')}
                </p>
              </div>

              <p className={`text-amber-700 ${language === 'ar' ? 'arabic-body' : ''}`}>
                {t('results.completion.blessing')}
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </PageContainer>
  );
}