'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowBack, ArrowForward } from '@mui/icons-material';
import AnimatedButton from '@/components/ui/AnimatedButton';

interface NavigationButtonsProps {
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  showBack?: boolean;
  backLabel?: string;
  loading?: boolean;
  language?: 'en' | 'ar';
  className?: string;
  variant?: 'default' | 'floating' | 'minimal';
  nextIcon?: React.ReactNode;
  progress?: number; // 0-100 for progress-aware styling
}

export default function NavigationButtons({
  onBack,
  onNext,
  nextLabel,
  nextDisabled = false,
  showBack = true,
  backLabel,
  loading = false,
  language = 'en',
  className = '',
  variant = 'default',
  nextIcon,
  progress = 0
}: NavigationButtonsProps) {
  const isRTL = language === 'ar';

  // Default labels based on language
  const defaultNextLabel = language === 'ar' ? 'التالي' : 'Continue';
  const defaultBackLabel = language === 'ar' ? 'السابق' : 'Back';

  const finalNextLabel = nextLabel || defaultNextLabel;
  const finalBackLabel = backLabel || defaultBackLabel;

  const containerVariants = {
    initial: { opacity: 0, y: 20 },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        staggerChildren: 0.1
      }
    }
  };

  const buttonVariants = {
    initial: { opacity: 0, scale: 0.9 },
    animate: {
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 20
      }
    }
  };

  const progressBarVariants = {
    initial: { width: "0%" },
    animate: {
      width: `${progress}%`,
      transition: {
        duration: 0.8,
        ease: "easeOut"
      }
    }
  };

  const getNextIcon = () => {
    if (nextIcon) return nextIcon;

    if (loading) return null;

    return isRTL ? (
      <ArrowBack sx={{ fontSize: 20 }} />
    ) : (
      <ArrowForward sx={{ fontSize: 20 }} />
    );
  };

  const getBackIcon = () => {
    return isRTL ? (
      <ArrowForward sx={{ fontSize: 20 }} />
    ) : (
      <ArrowBack sx={{ fontSize: 20 }} />
    );
  };

  // Add click handlers with haptic feedback for mobile
  const handleNextClick = () => {
    if (navigator.vibrate) {
      navigator.vibrate(50); // Light haptic feedback
    }
    onNext();
  };

  const handleBackClick = () => {
    if (navigator.vibrate) {
      navigator.vibrate(30); // Lighter feedback for back
    }
    if (onBack) onBack();
  };

  const renderDefault = () => (
    <motion.div
      className={`
        flex items-center justify-between gap-4 mt-8
        ${isRTL ? 'flex-row-reverse' : ''}
        ${className}
      `}
      variants={containerVariants}
      initial="initial"
      animate="animate"
    >
      {/* Back Button */}
      {showBack && onBack ? (
        <motion.div variants={buttonVariants}>
          <AnimatedButton
            onClick={handleBackClick}
            variant="outline"
            size="lg"
            className="min-w-[120px]"
            icon={getBackIcon()}
            iconPosition={isRTL ? "right" : "left"}
          >
            {finalBackLabel}
          </AnimatedButton>
        </motion.div>
      ) : (
        <div /> // Spacer for alignment
      )}

      {/* Progress Indicator (optional) */}
      {progress > 0 && (
        <motion.div
          className="flex-1 mx-6 h-1 bg-sage-200 rounded-full overflow-hidden"
          variants={buttonVariants}
        >
          <motion.div
            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full"
            variants={progressBarVariants}
          />
        </motion.div>
      )}

      {/* Next Button */}
      <motion.div variants={buttonVariants}>
        <AnimatedButton
          onClick={handleNextClick}
          variant="primary"
          size="lg"
          disabled={nextDisabled}
          loading={loading}
          className="min-w-[120px] shadow-lg hover:shadow-xl"
          icon={getNextIcon()}
          iconPosition={isRTL ? "left" : "right"}
        >
          {finalNextLabel}
        </AnimatedButton>
      </motion.div>
    </motion.div>
  );

  const renderFloating = () => (
    <motion.div
      className={`
        fixed bottom-6 left-6 right-6 z-40
        flex items-center justify-between gap-4
        bg-white/95 backdrop-blur-sm rounded-2xl p-4 shadow-xl border border-emerald-100/50
        safe-area-bottom
        ${isRTL ? 'flex-row-reverse' : ''}
        ${className}
      `}
      variants={containerVariants}
      initial="initial"
      animate="animate"
    >
      {/* Back Button */}
      {showBack && onBack ? (
        <motion.div variants={buttonVariants}>
          <AnimatedButton
            onClick={handleBackClick}
            variant="outline"
            size="md"
            icon={getBackIcon()}
            iconPosition={isRTL ? "right" : "left"}
          >
            {finalBackLabel}
          </AnimatedButton>
        </motion.div>
      ) : (
        <div /> // Spacer
      )}

      {/* Progress Ring (compact) */}
      {progress > 0 && (
        <motion.div
          className="relative w-10 h-10"
          variants={buttonVariants}
        >
          <svg className="w-10 h-10 transform -rotate-90" viewBox="0 0 36 36">
            <path
              className="stroke-sage-200"
              fill="none"
              strokeWidth="3"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <motion.path
              className="stroke-emerald-600"
              fill="none"
              strokeWidth="3"
              strokeDasharray={`${progress}, 100`}
              strokeLinecap="round"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              initial={{ strokeDasharray: "0, 100" }}
              animate={{ strokeDasharray: `${progress}, 100` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-bold text-emerald-600">{Math.round(progress)}%</span>
          </div>
        </motion.div>
      )}

      {/* Next Button */}
      <motion.div variants={buttonVariants}>
        <AnimatedButton
          onClick={handleNextClick}
          variant="primary"
          size="md"
          disabled={nextDisabled}
          loading={loading}
          icon={getNextIcon()}
          iconPosition={isRTL ? "left" : "right"}
        >
          {finalNextLabel}
        </AnimatedButton>
      </motion.div>
    </motion.div>
  );

  const renderMinimal = () => (
    <motion.div
      className={`
        flex items-center gap-3 mt-6
        ${isRTL ? 'flex-row-reverse justify-start' : 'justify-end'}
        ${className}
      `}
      variants={containerVariants}
      initial="initial"
      animate="animate"
    >
      {/* Back Button */}
      {showBack && onBack && (
        <motion.button
          type="button"
          onClick={handleBackClick}
          className={`
            flex items-center gap-2 px-4 py-2 text-sage-600 hover:text-emerald-600
            transition-colors duration-200 font-medium
            ${isRTL ? 'flex-row-reverse' : ''}
          `}
          variants={buttonVariants}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {getBackIcon()}
          {finalBackLabel}
        </motion.button>
      )}

      {/* Next Button */}
      <motion.div variants={buttonVariants}>
        <AnimatedButton
          onClick={handleNextClick}
          variant="primary"
          size="md"
          disabled={nextDisabled}
          loading={loading}
          icon={getNextIcon()}
          iconPosition={isRTL ? "left" : "right"}
        >
          {finalNextLabel}
        </AnimatedButton>
      </motion.div>
    </motion.div>
  );


  // Click handlers with haptic feedback are defined above

  switch (variant) {
    case 'floating':
      return renderFloating();
    case 'minimal':
      return renderMinimal();
    default:
      return renderDefault();
  }
}