'use client';

import { ReactNode, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AnimatedProgressIndicator from './AnimatedProgressIndicator';

interface MobileOptimizedSurveyProps {
  children: ReactNode;
  currentPhase: number;
  totalPhases: number;
  percentage: number;
  title?: string;
  subtitle?: string;
  className?: string;
  showBackButton?: boolean;
  onBack?: () => void;
}

export default function MobileOptimizedSurvey({
  children,
  currentPhase,
  totalPhases,
  percentage,
  title,
  subtitle,
  className = '',
  showBackButton = true,
  onBack
}: MobileOptimizedSurveyProps) {
  const [isPortrait, setIsPortrait] = useState(true);
  const [screenHeight, setScreenHeight] = useState(0);

  useEffect(() => {
    const handleResize = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
      setScreenHeight(window.innerHeight);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  const containerVariants = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: {
        duration: 0.3,
        staggerChildren: 0.1
      }
    }
  };

  const headerVariants = {
    initial: { y: -20, opacity: 0 },
    animate: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.4, ease: 'easeOut' }
    }
  };

  const contentVariants = {
    initial: { y: 20, opacity: 0 },
    animate: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.4, ease: 'easeOut' }
    }
  };

  return (
    <div
      className={`min-h-screen bg-gradient-to-br from-emerald-50 via-white to-sage-50 ${className}`}
      style={{
        minHeight: screenHeight > 0 ? `${screenHeight}px` : '100vh'
      }}
    >
      {/* Status Bar Safe Area */}
      <div className="safe-area-top" />

      <motion.div
        className="flex flex-col h-full"
        variants={containerVariants}
        initial="initial"
        animate="animate"
      >
        {/* Header Section */}
        <motion.header
          variants={headerVariants}
          className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-emerald-100/50 shadow-sm"
        >
          <div className="px-4 py-3 safe-area-top">
            {/* Navigation Bar */}
            <div className="flex items-center justify-between mb-3">
              {showBackButton && onBack && (
                <motion.button
                  onClick={onBack}
                  className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors islamic-focus"
                  whileTap={{ scale: 0.95 }}
                  aria-label="Go back"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </motion.button>
              )}

              {/* Title Section */}
              <div className="flex-1 text-center px-4">
                {title && (
                  <h1 className="text-lg font-bold text-sage-900 truncate">
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p className="text-sm text-sage-600 truncate">
                    {subtitle}
                  </p>
                )}
              </div>

              {/* Phase Indicator */}
              <div className="flex items-center gap-2 text-sm text-sage-600">
                <span className="font-medium">{currentPhase}</span>
                <span className="text-sage-400">/</span>
                <span>{totalPhases}</span>
              </div>
            </div>

            {/* Progress Indicator */}
            <AnimatedProgressIndicator
              currentPhase={currentPhase}
              totalPhases={totalPhases}
              percentage={percentage}
              showMilestones={false} // Hide on mobile for cleaner look
            />
          </div>
        </motion.header>

        {/* Main Content */}
        <motion.main
          variants={contentVariants}
          className="flex-1 overflow-y-auto"
        >
          <div className="container mx-auto px-4 py-6 max-w-lg">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPhase}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Bottom spacing for mobile navigation */}
          <div className="mobile-content-spacer" />
        </motion.main>
      </motion.div>

      {/* Bottom Safe Area */}
      <div className="safe-area-bottom" />
    </div>
  );
}

// Mobile-optimized question card wrapper
export function MobileQuestionCard({
  children,
  className = ''
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={`mb-6 ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <div className="card-islamic rounded-xl p-4 sm:p-6 shadow-md hover:shadow-lg transition-shadow">
        {children}
      </div>
    </motion.div>
  );
}

// Mobile-optimized likert scale
export function MobileLikertScale({
  value,
  onChange,
  disabled = false,
  labels = ['Never', 'Rarely', 'Sometimes', 'Often', 'Always']
}: {
  value: number | null;
  onChange: (value: number) => void;
  disabled?: boolean;
  labels?: string[];
}) {
  return (
    <div className="space-y-3">
      {/* Visual Scale */}
      <div className="flex justify-between gap-2">
        {[1, 2, 3, 4, 5].map((score) => (
          <motion.button
            key={score}
            type="button"
            onClick={() => onChange(score)}
            disabled={disabled}
            className={`
              flex-1 aspect-square rounded-full border-2 transition-all duration-200
              flex items-center justify-center text-sm font-bold
              ${value === score
                ? 'border-emerald-500 bg-emerald-500 text-white shadow-lg'
                : 'border-sage-300 bg-white text-sage-600 hover:border-emerald-400 hover:bg-emerald-50'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}
              max-w-[60px] islamic-focus
            `}
            whileTap={!disabled ? { scale: 0.95 } : {}}
            whileHover={!disabled ? { scale: 1.05 } : {}}
            aria-label={`Rate ${score} - ${labels[score - 1]}`}
          >
            {score}
          </motion.button>
        ))}
      </div>

      {/* Labels */}
      <div className="flex justify-between text-xs text-sage-600 px-1">
        <span className="text-left">{labels[0]}</span>
        <span className="text-center hidden sm:inline">{labels[2]}</span>
        <span className="text-right">{labels[4]}</span>
      </div>

      {/* Selected Label */}
      <AnimatePresence>
        {value && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-center text-sm font-medium text-emerald-700 bg-emerald-50 rounded-lg py-2"
          >
            {labels[value - 1]}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Mobile-optimized navigation buttons
export function MobileNavigationButtons({
  onBack,
  onNext,
  nextLabel = 'Continue',
  nextDisabled = false,
  showBack = true,
  nextLoading = false
}: {
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  showBack?: boolean;
  nextLoading?: boolean;
}) {
  return (
    <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm border-t border-emerald-100/50 p-4 safe-area-bottom">
      <div className="flex gap-3">
        {showBack && onBack && (
          <motion.button
            type="button"
            onClick={onBack}
            className="flex-1 py-3 px-4 border-2 border-sage-300 text-sage-700 rounded-lg font-medium hover:bg-sage-50 transition-colors islamic-focus"
            whileTap={{ scale: 0.98 }}
          >
            Back
          </motion.button>
        )}

        <motion.button
          type="button"
          onClick={onNext}
          disabled={nextDisabled || nextLoading}
          className={`
            flex-1 py-3 px-4 rounded-lg font-medium transition-all
            flex items-center justify-center gap-2
            ${nextDisabled || nextLoading
              ? 'bg-sage-200 text-sage-500 cursor-not-allowed'
              : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md hover:shadow-lg islamic-focus'
            }
          `}
          whileTap={!nextDisabled && !nextLoading ? { scale: 0.98 } : {}}
        >
          {nextLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Processing...</span>
            </>
          ) : (
            <>
              <span>{nextLabel}</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </>
          )}
        </motion.button>
      </div>
    </div>
  );
}