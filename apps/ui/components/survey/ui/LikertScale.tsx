'use client';

import { motion } from 'framer-motion';
import type { LikertScore } from '@sakinah/types';

interface LikertScaleProps {
  value: LikertScore | null;
  onChange: (value: LikertScore) => void;
  disabled?: boolean;
  className?: string;
}

const likertLabels = {
  1: { en: 'Never', ar: 'أبداً' },
  2: { en: 'Rarely', ar: 'نادراً' },
  3: { en: 'Sometimes', ar: 'أحياناً' },
  4: { en: 'Often', ar: 'غالباً' },
  5: { en: 'Always', ar: 'دائماً' }
};

export default function LikertScale({
  value,
  onChange,
  disabled = false,
  className = ''
}: LikertScaleProps) {
  const containerVariants = {
    initial: { opacity: 0, scale: 0.9 },
    animate: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.3,
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    initial: { opacity: 0, scale: 0.8 },
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

  const buttonVariants = {
    initial: { scale: 1 },
    hover: {
      scale: 1.1,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 10
      }
    },
    tap: {
      scale: 0.95,
      transition: { duration: 0.1 }
    }
  };

  return (
    <motion.div
      className={`space-y-4 ${className}`}
      variants={containerVariants}
      initial="initial"
      animate="animate"
    >
      {/* Scale Options */}
      <motion.div
        className="grid grid-cols-5 gap-2 sm:gap-3"
        variants={containerVariants}
      >
        {([1, 2, 3, 4, 5] as LikertScore[]).map((score) => {
          const isSelected = value === score;
          const label = likertLabels[score];

          return (
            <motion.div
              key={score}
              variants={itemVariants}
              className="flex flex-col items-center"
            >
              <motion.button
                type="button"
                variants={buttonVariants}
                whileHover={!disabled ? "hover" : "initial"}
                whileTap={!disabled ? "tap" : "initial"}
                onClick={() => !disabled && onChange(score)}
                disabled={disabled}
                data-testid={`likert-score-${score}`}
                className={`
                  w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 font-bold text-lg
                  transition-all duration-200 focus:outline-none focus:ring-4
                  ${
                    isSelected
                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg scale-110 focus:ring-emerald-300'
                      : 'bg-white border-sage-300 text-sage-700 hover:border-emerald-400 hover:bg-emerald-50 focus:ring-emerald-200'
                  }
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                {score}
              </motion.button>

              {/* Label */}
              <div className="mt-2 text-center">
                <div className={`text-xs font-medium ${
                  isSelected ? 'text-emerald-700' : 'text-sage-600'
                }`}>
                  {label.en}
                </div>
                <div className={`text-xs arabic-text ${
                  isSelected ? 'text-emerald-600' : 'text-sage-500'
                }`}>
                  {label.ar}
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Visual Scale Indicator */}
      <motion.div
        className="flex items-center justify-between text-xs text-sage-500 px-2"
        variants={itemVariants}
      >
        <span className="flex flex-col items-center">
          <div className="text-emerald-600">😌</div>
          <div>Low</div>
        </span>
        <div className="flex-1 mx-4 h-px bg-gradient-to-r from-emerald-200 via-gold-200 to-red-200"></div>
        <span className="flex flex-col items-center">
          <div className="text-red-600">😰</div>
          <div>High</div>
        </span>
      </motion.div>
    </motion.div>
  );
}