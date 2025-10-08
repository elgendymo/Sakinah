'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import PageContainer from '@/components/PageContainer';
import AnimatedButton from '@/components/ui/AnimatedButton';

export default function WelcomePage() {
  const [isStarting, setIsStarting] = useState(false);
  const router = useRouter();

  const handleStartSurvey = async () => {
    setIsStarting(true);

    // Brief delay for UX feedback
    await new Promise(resolve => setTimeout(resolve, 500));

    // Navigate to phase 1 of the survey
    router.push('/onboarding/phase1');
  };

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  };

  const staggerChildren = {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const scaleIn = {
    initial: { scale: 0, opacity: 0 },
    animate: {
      scale: 1,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 260,
        damping: 20,
        delay: 0.2
      }
    }
  };

  return (
    <PageContainer
      maxWidth="md"
      padding="xl"
      className="flex items-center justify-center min-h-screen"
    >
      <motion.div
        className="max-w-lg w-full"
        initial="initial"
        animate="animate"
        variants={staggerChildren}
      >
        {/* Progress Indicator */}
        <motion.div
          className="mb-8"
          variants={fadeInUp}
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-sage-600">Step 1 of 4</span>
            <span className="text-sm font-medium text-sage-600">25%</span>
          </div>
          <div className="w-full bg-sage-100 rounded-full h-2 overflow-hidden">
            <motion.div
              className="h-2 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: "25%" }}
              transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
            />
          </div>
        </motion.div>

        {/* Main Welcome Card */}
        <motion.div
          className="card-islamic rounded-2xl p-8 shadow-lg text-center"
          variants={fadeInUp}
        >
          {/* Islamic Symbol */}
          <motion.div
            className="text-6xl mb-6"
            variants={scaleIn}
          >
            <div className="inline-block relative">
              <span className="text-emerald-600">🌙</span>
              <motion.div
                className="absolute -inset-2 rounded-full bg-emerald-100/30"
                initial={{ scale: 0, rotate: 0 }}
                animate={{ scale: 1, rotate: 360 }}
                transition={{
                  duration: 2,
                  delay: 0.8,
                  ease: "easeOut"
                }}
              />
            </div>
          </motion.div>

          {/* Title and Subtitle */}
          <motion.h1
            className="text-2xl sm:text-3xl font-bold text-sage-900 mb-4"
            variants={fadeInUp}
          >
            Tazkiyah Discovery Survey
          </motion.h1>

          <motion.div
            className="arabic-text text-emerald-700 text-lg mb-4"
            variants={fadeInUp}
          >
            استبيان قراءة النفس
          </motion.div>

          <motion.p
            className="text-sage-600 mb-8 leading-relaxed"
            variants={fadeInUp}
          >
            Embark on a journey of spiritual self-discovery. This assessment will help us understand your spiritual state and create personalized Tazkiyah plans and habit recommendations tailored to your spiritual growth.
          </motion.p>

          {/* Survey Purpose Highlights */}
          <motion.div
            className="space-y-3 text-sm text-sage-600 mb-8"
            variants={staggerChildren}
          >
            <motion.div
              className="flex items-center justify-center"
              variants={fadeInUp}
            >
              <span className="text-emerald-600 mr-3 text-lg">✨</span>
              <span>Personalized Tazkiyah spiritual development plan</span>
            </motion.div>
            <motion.div
              className="flex items-center justify-center"
              variants={fadeInUp}
            >
              <span className="text-gold-600 mr-3 text-lg">📋</span>
              <span>Custom habit recommendations for spiritual growth</span>
            </motion.div>
            <motion.div
              className="flex items-center justify-center"
              variants={fadeInUp}
            >
              <span className="text-navy-600 mr-3 text-lg">🔒</span>
              <span>Completely private and confidential assessment</span>
            </motion.div>
          </motion.div>

          {/* Islamic Quote */}
          <motion.div
            className="bg-emerald-50 border border-emerald-100 rounded-lg p-4 mb-8"
            variants={fadeInUp}
          >
            <div className="quran-text text-emerald-800 mb-2">
              قَدْ أَفْلَحَ مَن زَكَّاهَا
            </div>
            <p className="text-xs text-emerald-700 font-medium">
              "He has succeeded who purifies it [the soul]" - Quran 91:9
            </p>
          </motion.div>

          {/* Survey Information */}
          <motion.div
            className="bg-sage-50 border border-sage-100 rounded-lg p-4 mb-8 text-left"
            variants={fadeInUp}
          >
            <h3 className="font-semibold text-sage-900 mb-3 text-center">What to Expect</h3>
            <div className="space-y-2 text-sm text-sage-700">
              <div className="flex items-start">
                <span className="text-emerald-600 mr-2 mt-0.5">•</span>
                <span><strong>11 questions</strong> about spiritual conditions and behaviors</span>
              </div>
              <div className="flex items-start">
                <span className="text-emerald-600 mr-2 mt-0.5">•</span>
                <span><strong>2 reflection</strong> questions for deeper insight</span>
              </div>
              <div className="flex items-start">
                <span className="text-emerald-600 mr-2 mt-0.5">•</span>
                <span><strong>5-10 minutes</strong> to complete thoughtfully</span>
              </div>
              <div className="flex items-start">
                <span className="text-emerald-600 mr-2 mt-0.5">•</span>
                <span><strong>Automatic saving</strong> - resume anytime</span>
              </div>
            </div>
          </motion.div>

          {/* Start Button */}
          <motion.div variants={fadeInUp}>
            <AnimatedButton
              onClick={handleStartSurvey}
              disabled={isStarting}
              loading={isStarting}
              variant="primary"
              size="lg"
              className="w-full shadow-lg hover:shadow-xl"
              icon={
                !isStarting && (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )
              }
            >
              {isStarting ? 'Preparing Survey...' : 'Begin Assessment'}
            </AnimatedButton>
          </motion.div>
        </motion.div>

        {/* Additional Encouragement */}
        <motion.div
          className="mt-6 text-center text-sm text-sage-500"
          variants={fadeInUp}
        >
          <p>Take your time and answer honestly for the best recommendations</p>
        </motion.div>
      </motion.div>
    </PageContainer>
  );
}