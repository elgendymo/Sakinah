'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import PageContainer from '@/components/PageContainer';
import ProgressIndicator from '@/components/survey/ui/ProgressIndicator';
import { useSurveyLanguage } from '@/components/survey/hooks/useSurveyLanguage';
import type { SurveyResults, Disease } from '@sakinah/types';

// Helper function to transform diseases into positive virtues
const getSpiritualVirtues = (diseaseScores: Record<Disease, number>) => {
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
    message: 'Thriving'
  };
  if (score === 3) return {
    level: 'Growing',
    percentage: 65,
    color: 'blue',
    message: 'Developing'
  };
  return {
    level: 'Emerging',
    percentage: 40,
    color: 'rose',
    message: 'Beginning'
  };
};

export default function ResultsPage() {
  const router = useRouter();
  const { language, toggleLanguage, getLocalizedText } = useSurveyLanguage();

  const [results, setResults] = useState<SurveyResults | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'habits' | 'plan'>('overview');

  // Load results from API
  useEffect(() => {
    const loadResults = async () => {
      try {
        setIsLoading(true);
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api';
        const response = await fetch(`${apiUrl}/v1/onboarding/results`, {
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

    loadResults();
  }, []);

  // Get spiritual insights based on scores
  const getSpiritualInsights = (diseaseScores: Record<Disease, number>) => {
    const diseaseLabels: Record<Disease, { en: string; ar: string; insight: { en: string; ar: string } }> = {
      envy: {
        en: 'Contentment',
        ar: 'القناعة',
        insight: {
          en: 'Your heart seeks contentment and gratitude for Allah\'s blessings',
          ar: 'قلبك يسعى للقناعة والامتنان لنعم الله'
        }
      },
      arrogance: {
        en: 'Humility',
        ar: 'التواضع',
        insight: {
          en: 'Growing in humility brings you closer to Allah\'s mercy',
          ar: 'النمو في التواضع يقربك من رحمة الله'
        }
      },
      selfDeception: {
        en: 'Self-Awareness',
        ar: 'الوعي الذاتي',
        insight: {
          en: 'Honest self-reflection is a gift from Allah for growth',
          ar: 'التأمل الصادق في الذات هدية من الله للنمو'
        }
      },
      lust: {
        en: 'Purity',
        ar: 'الطهارة',
        insight: {
          en: 'Seeking purity of heart leads to spiritual clarity',
          ar: 'السعي لطهارة القلب يؤدي إلى الوضوح الروحي'
        }
      },
      anger: {
        en: 'Patience',
        ar: 'الصبر',
        insight: {
          en: 'Patience is a strength that brings inner peace',
          ar: 'الصبر قوة تجلب السكينة الداخلية'
        }
      },
      malice: {
        en: 'Forgiveness',
        ar: 'الصفح',
        insight: {
          en: 'Forgiveness frees your heart and brings Allah\'s blessings',
          ar: 'الصفح يحرر قلبك ويجلب بركات الله'
        }
      },
      backbiting: {
        en: 'Kind Speech',
        ar: 'الكلام الطيب',
        insight: {
          en: 'Kind words are charity that purifies the soul',
          ar: 'الكلمات الطيبة صدقة تطهر الروح'
        }
      },
      suspicion: {
        en: 'Good Thoughts',
        ar: 'حسن الظن',
        insight: {
          en: 'Thinking well of others reflects your pure heart',
          ar: 'حسن الظن بالآخرين يعكس طهارة قلبك'
        }
      },
      loveOfDunya: {
        en: 'Focus on Akhirah',
        ar: 'التركيز على الآخرة',
        insight: {
          en: 'Your heart yearns for the eternal beauty of the Hereafter',
          ar: 'قلبك يشتاق لجمال الآخرة الأبدي'
        }
      },
      laziness: {
        en: 'Motivation',
        ar: 'النشاط',
        insight: {
          en: 'Every small step towards Allah is beloved to Him',
          ar: 'كل خطوة صغيرة نحو الله محبوبة إليه'
        }
      },
      despair: {
        en: 'Hope',
        ar: 'الرجاء',
        insight: {
          en: 'Allah\'s mercy is infinite, and hope in Him never disappoints',
          ar: 'رحمة الله لا حدود لها، والرجاء فيه لا يخيب أبداً'
        }
      }
    };

    return diseaseLabels;
  };

  // Helper function to get growth level description
  const getGrowthLevel = (score: number) => {
    if (score <= 2) return {
      level: getLocalizedText('Flourishing', 'مزدهر'),
      color: 'emerald',
      description: getLocalizedText('This area is a strength for you', 'هذا المجال نقطة قوة لك')
    };
    if (score === 3) return {
      level: getLocalizedText('Growing', 'نامي'),
      color: 'amber',
      description: getLocalizedText('This area has beautiful potential for growth', 'هذا المجال له إمكانات جميلة للنمو')
    };
    return {
      level: getLocalizedText('Nurturing', 'يحتاج رعاية'),
      color: 'rose',
      description: getLocalizedText('This area deserves gentle attention and care', 'هذا المجال يستحق انتباهاً ورعاية لطيفة')
    };
  };

  const handleExport = async (format: 'pdf' | 'json') => {
    if (!results) return;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api';
      const response = await fetch(`${apiUrl}/v1/onboarding/export/${format}/${results.id}`, {
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
              {getLocalizedText('Generating your results...', 'جاري إنشاء نتائجك...')}
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
              {getLocalizedText('Error Loading Results', 'خطأ في تحميل النتائج')}
            </h3>
            <p className="text-red-700 mb-4">{error}</p>
            <button
              onClick={() => router.push('/onboarding/reflection')}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
            >
              {getLocalizedText('Go Back', 'العودة')}
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
            {getLocalizedText('Your Spiritual Journey Insights', 'رؤى رحلتك الروحية')}
          </h1>
          <p className="text-slate-600 max-w-3xl mx-auto leading-relaxed text-lg">
            {getLocalizedText(
              'Allah has guided you through this reflection. These insights are a gift to help you grow closer to Him.',
              'الله قد هداك خلال هذا التأمل. هذه الرؤى هدية لمساعدتك على الاقتراب منه.'
            )}
          </p>
          <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 max-w-2xl mx-auto">
            <p className={`text-blue-800 font-medium ${language === 'ar' ? 'arabic-body' : ''}`}>
              {getLocalizedText(
                '"And whoever relies upon Allah - then He is sufficient for him. Indeed, Allah will accomplish His purpose." - Quran 65:3',
                '"ومن يتوكل على الله فهو حسبه إن الله بالغ أمره" - القرآن 65:3'
              )}
            </p>
          </div>

          {/* Language Toggle */}
          <motion.button
            onClick={toggleLanguage}
            className="mt-4 text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-2 mx-auto"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
            </svg>
            {language === 'en' ? 'عربي' : 'English'}
          </motion.button>
        </motion.div>

        {/* Gentle Tab Navigation */}
        <motion.div
          className="flex justify-center mb-12"
          variants={cardVariants}
        >
          <div className="bg-white rounded-2xl p-2 flex gap-2 shadow-lg shadow-slate-100">
            {[
              { id: 'overview', label: getLocalizedText('Your Heart\'s Reflection', 'انعكاس قلبك'), icon: '💫' },
              { id: 'habits', label: getLocalizedText('Gentle Practices', 'ممارسات لطيفة'), icon: '🌸' },
              { id: 'plan', label: getLocalizedText('Growth Journey', 'رحلة النمو'), icon: '🌿' }
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
                    {getLocalizedText('The Mirror of Your Heart', 'مرآة قلبك')}
                  </h2>
                  <p className={`text-slate-600 leading-relaxed max-w-2xl mx-auto ${language === 'ar' ? 'arabic-body' : ''}`}>
                    {getLocalizedText(
                      'Every soul is on a unique journey towards Allah. These reflections show not weaknesses, but opportunities for beautiful growth and closeness to the Divine.',
                      'كل روح في رحلة فريدة نحو الله. هذه التأملات لا تظهر نقاط ضعف، بل فرصاً للنمو الجميل والقرب من الإلهي.'
                    )}
                  </p>
                </div>
              </div>

              {/* Interactive Virtue Garden */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {Object.entries(results.diseaseScores).map(([disease, score], index) => {
                  const virtues = getSpiritualVirtues(results.diseaseScores);
                  const virtue = virtues[disease as Disease];
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

                      {/* Interactive Tooltip */}
                      <motion.div
                        className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-4 bg-black/90 text-white text-sm px-4 py-3 rounded-2xl opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-300 whitespace-nowrap z-30 max-w-xs text-center"
                        initial={{ scale: 0.8, y: 10 }}
                        whileHover={{ scale: 1, y: 0 }}
                      >
                        <motion.div
                          animate={{ y: [0, -2, 0] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        >
                          ✨ {virtue.description}
                        </motion.div>
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-8 border-transparent border-t-black/90"></div>
                      </motion.div>
                    </motion.div>
                  );
                })}
              </div>

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
                        {getLocalizedText('Mastery', 'إتقان')}
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
                        {getLocalizedText('Growing', 'في نمو')}
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
                        {getLocalizedText('Emerging', 'في ظهور')}
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
                    ✨ {getLocalizedText('Keep Growing', 'استمر في النمو')} ✨
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
                    {getLocalizedText('Your Gentle Path Forward', 'طريقك اللطيف إلى الأمام')}
                  </h2>
                  <p className={`text-slate-600 leading-relaxed max-w-2xl mx-auto ${language === 'ar' ? 'arabic-body' : ''}`}>
                    {getLocalizedText(
                      'These practices are lovingly chosen for you. Start small, be consistent, and trust that Allah will bless every sincere effort.',
                      'هذه الممارسات اختيرت لك بمحبة. ابدأ بخطوات صغيرة، كن ثابتاً، وثق أن الله سيبارك كل جهد صادق.'
                    )}
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
                            {getLocalizedText(
                              habit.difficultyLevel === 'easy' ? 'Gentle Start' : habit.difficultyLevel === 'moderate' ? 'Steady Growth' : 'Deeper Journey',
                              habit.difficultyLevel === 'easy' ? 'بداية لطيفة' : habit.difficultyLevel === 'moderate' ? 'نمو مستقر' : 'رحلة أعمق'
                            )}
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
                            {getLocalizedText('How often:', 'كم مرة:')} {habit.frequency}
                          </span>
                        </div>
                        <div className={`flex items-center gap-2 text-sm ${colors.text} ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                          <span className="font-medium">⏳</span>
                          <span className={language === 'ar' ? 'arabic-body' : ''}>
                            {getLocalizedText('Time needed:', 'الوقت المطلوب:')} {habit.estimatedDuration}
                          </span>
                        </div>
                        <div className={`flex items-center gap-2 text-sm ${colors.text} ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                          <span className="font-medium">🎯</span>
                          <span className={language === 'ar' ? 'arabic-body' : ''}>
                            {getLocalizedText('Nurtures:', 'يرعى:')} {habit.targetDisease}
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
                    {getLocalizedText('Start Where You Are', 'ابدأ من حيث أنت')}
                  </h3>
                  <p className={`text-amber-700 leading-relaxed ${language === 'ar' ? 'arabic-body' : ''}`}>
                    {getLocalizedText(
                      'Choose one practice that resonates with your heart. Allah values consistency over perfection. Even the smallest sincere action, when done regularly, can transform your soul.',
                      'اختر ممارسة واحدة تتردد أصداؤها في قلبك. الله يقدر الثبات أكثر من الكمال. حتى أصغر عمل صادق، عند القيام به بانتظام، يمكن أن يحول روحك.'
                    )}
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
                    {getLocalizedText('Your Tazkiyah Journey', 'رحلة التزكية الخاصة بك')}
                  </h2>
                  <p className={`text-slate-600 leading-relaxed max-w-2xl mx-auto mb-4 ${language === 'ar' ? 'arabic-body' : ''}`}>
                    {getLocalizedText(
                      'This is your personalized roadmap to spiritual growth. Like a garden that flourishes with gentle care, your soul will bloom through patient, consistent nurturing.',
                      'هذه خارطة طريقك الشخصية للنمو الروحي. مثل الحديقة التي تزدهر بالرعاية اللطيفة، ستزهر روحك من خلال الرعاية الصبورة والمستمرة.'
                    )}
                  </p>
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 rounded-full border border-indigo-200">
                    <span className="text-sm font-medium text-indigo-800">🕰️</span>
                    <span className={`text-sm text-indigo-700 ${language === 'ar' ? 'arabic-body' : ''}`}>
                      {getLocalizedText('Estimated Journey:', 'الرحلة المقدرة:')} {results.tazkiyahPlan.expectedDuration}
                    </span>
                  </div>
                </div>
              </div>

              {/* Areas of Focus */}
              {results.tazkiyahPlan.criticalDiseases.length > 0 && (
                <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-2xl p-6 border border-teal-200">
                  <h3 className={`text-lg font-semibold text-teal-800 mb-4 flex items-center gap-2 ${language === 'ar' ? 'arabic-heading flex-row-reverse' : ''}`}>
                    <span>🎯</span>
                    {getLocalizedText('Areas Deserving Special Attention', 'المجالات التي تستحق اهتماماً خاصاً')}
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
                  {getLocalizedText('Your Growth Phases', 'مراحل نموك')}
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
                        {getLocalizedText('Gentle Practices for This Phase:', 'الممارسات اللطيفة لهذه المرحلة:')}
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
                        {getLocalizedText('Growth Milestones:', 'معالم النمو:')}
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
                    {getLocalizedText('Journey Milestones', 'معالم الرحلة')}
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
                    {getLocalizedText('Trust the Process', 'ثق في العملية')}
                  </h3>
                  <p className={`text-emerald-700 leading-relaxed ${language === 'ar' ? 'arabic-body' : ''}`}>
                    {getLocalizedText(
                      'Growth is not always linear, and that\'s perfectly natural. Some days will feel easier than others. What matters is your sincere intention and gentle persistence. Allah sees your efforts and will guide each step of your journey.',
                      'النمو ليس خطياً دائماً، وهذا طبيعي تماماً. ستبدو بعض الأيام أسهل من أخرى. المهم هو نيتك الصادقة والمثابرة اللطيفة. الله يرى جهودك وسيرشد كل خطوة في رحلتك.'
                    )}
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
              {getLocalizedText('Save My Journey', 'احفظ رحلتي')}
            </motion.button>

            <motion.button
              onClick={() => handleExport('json')}
              className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white px-8 py-4 rounded-2xl font-medium transition-all duration-300 flex items-center gap-3 shadow-lg hover:shadow-xl transform hover:scale-105"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="text-xl">📊</span>
              {getLocalizedText('Export Data', 'تصدير البيانات')}
            </motion.button>

            <motion.button
              onClick={() => router.push('/dashboard')}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-8 py-4 rounded-2xl font-medium transition-all duration-300 flex items-center gap-3 shadow-lg hover:shadow-xl transform hover:scale-105"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="text-xl">🏠</span>
              {getLocalizedText('Begin My Practice', 'ابدأ ممارستي')}
            </motion.button>
          </div>

          {/* Gentle Encouragement */}
          <div className="text-center max-w-2xl mx-auto">
            <p className={`text-slate-500 text-sm ${language === 'ar' ? 'arabic-body' : ''}`}>
              {getLocalizedText(
                'Take your time to reflect on these insights. When you\'re ready, your dashboard awaits to help you put these practices into your daily life.',
                'خذ وقتك للتأمل في هذه الرؤى. عندما تكون مستعداً، ستنتظرك لوحة التحكم لمساعدتك في تطبيق هذه الممارسات في حياتك اليومية.'
              )}
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
              {getLocalizedText('A Beautiful Beginning', 'بداية جميلة')}
            </h3>

            <div className="max-w-3xl mx-auto space-y-4">
              <p className={`text-amber-800 text-lg leading-relaxed ${language === 'ar' ? 'arabic-body' : ''}`}>
                {getLocalizedText(
                  'You have taken a profound step in understanding your heart. This is not an ending, but the gentle beginning of a lifelong journey towards Allah.',
                  'لقد اتخذت خطوة عميقة في فهم قلبك. هذه ليست نهاية، بل بداية لطيفة لرحلة تدوم مدى الحياة نحو الله.'
                )}
              </p>

              <div className="bg-white/60 rounded-2xl p-6 border border-amber-100">
                <p className={`text-amber-900 font-semibold mb-2 ${language === 'ar' ? 'arabic-body' : ''}`}>
                  {getLocalizedText(
                    '“And whoever relies upon Allah - then He is sufficient for him.”',
                    '“ومن يتوكل على الله فهو حسبه”'
                  )}
                </p>
                <p className={`text-amber-700 text-sm ${language === 'ar' ? 'arabic-body' : ''}`}>
                  {getLocalizedText('- Quran 65:3', '- القرآن 65:3')}
                </p>
              </div>

              <p className={`text-amber-700 ${language === 'ar' ? 'arabic-body' : ''}`}>
                {getLocalizedText(
                  'May Allah bless your efforts and guide every step of your journey. Remember, He loves those who strive to purify their hearts.',
                  'بارك الله في جهودك وهدى كل خطوة في رحلتك. تذكر أنه يحب الذين يسعون لتطهير قلوبهم.'
                )}
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </PageContainer>
  );
}