'use client';

import React from 'react';
import { motion } from 'framer-motion';
import type { LikertScore } from '@sakinah/types';

interface LikertScaleProps {
  value: LikertScore | null;
  onChange: (value: LikertScore) => void;
  labels?: { [key: number]: string };
  disabled?: boolean;
  className?: string;
  variant?: 'default' | 'compact' | 'detailed';
  language?: 'en' | 'ar';
  showLabels?: boolean;
  showNumbers?: boolean;
}

const defaultLabels = {
  en: {
    1: 'Never',
    2: 'Rarely',
    3: 'Sometimes',
    4: 'Often',
    5: 'Always'
  },
  ar: {
    1: 'أبداً',
    2: 'نادراً',
    3: 'أحياناً',
    4: 'غالباً',
    5: 'دائماً'
  }
};

export default function LikertScale({
  value,
  onChange,
  labels,
  disabled = false,
  className = '',
  variant = 'default',
  language = 'en',
  showLabels = true,
  showNumbers = true
}: LikertScaleProps) {
  const currentLabels = labels || defaultLabels[language];
  const isRTL = language === 'ar';

  const scaleItems = [1, 2, 3, 4, 5] as const;

  const containerVariants = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    initial: { opacity: 0, scale: 0.8, y: 20 },
    animate: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 20
      }
    }
  };

  const selectedVariants = {
    initial: { scale: 1 },
    selected: {
      scale: [1, 1.1, 1],
      transition: {
        duration: 0.3,
        ease: "easeOut"
      }
    }
  };

  const getItemColor = (itemValue: LikertScore) => {
    if (value === itemValue) {
      // Selected state - gradient based on severity
      if (itemValue <= 2) return 'from-emerald-500 to-emerald-600 text-white shadow-lg';
      if (itemValue === 3) return 'from-gold-500 to-gold-600 text-white shadow-lg';
      return 'from-rose-500 to-rose-600 text-white shadow-lg';
    }

    if (disabled) return 'bg-sage-100 text-sage-400 cursor-not-allowed';

    // Unselected state - subtle color hints
    if (itemValue <= 2) return 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200';
    if (itemValue === 3) return 'bg-gold-50 text-gold-700 hover:bg-gold-100 border-gold-200';
    return 'bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200';
  };

  const renderDefault = () => (
    <motion.div
      className={`${className} ${isRTL ? 'rtl' : ''}`}
      initial="initial"
      animate="animate"
      variants={containerVariants}
    >
      {/* Scale Labels */}
      {showLabels && (
        <div className={`flex justify-between items-center mb-4 text-sm text-sage-600 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <span className={`${isRTL ? 'arabic-text text-sm' : ''}`}>
            {currentLabels[1]}
          </span>
          <span className={`${isRTL ? 'arabic-text text-sm' : ''}`}>
            {currentLabels[5]}
          </span>
        </div>
      )}

      {/* Scale Items */}
      <div className={`flex justify-between items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
        {scaleItems.map((itemValue) => (
          <motion.button
            key={itemValue}
            type="button"
            variants={itemVariants}
            whileHover={!disabled ? { scale: 1.05, y: -2 } : {}}
            whileTap={!disabled ? { scale: 0.95 } : {}}
            onClick={() => !disabled && onChange(itemValue)}
            disabled={disabled}
            className={`
              relative flex flex-col items-center justify-center
              w-16 h-16 rounded-xl border-2 transition-all duration-200
              focus:outline-none focus:ring-4 focus:ring-emerald-300/50
              ${getItemColor(itemValue)}
              ${disabled ? '' : 'hover:shadow-md active:shadow-sm cursor-pointer'}
            `}
            aria-label={`Rate ${itemValue} - ${currentLabels[itemValue]}`}
          >
            {/* Selection indicator */}
            {value === itemValue && (
              <motion.div
                className="absolute -inset-1 rounded-xl bg-gradient-to-r from-emerald-400/30 to-emerald-600/30 blur-sm"
                variants={selectedVariants}
                initial="initial"
                animate="selected"
              />
            )}

            {/* Number */}
            {showNumbers && (
              <span className="text-lg font-bold relative z-10">
                {itemValue}
              </span>
            )}

            {/* Quick label */}
            <span className={`text-xs font-medium mt-1 relative z-10 ${isRTL ? 'arabic-text' : ''}`}>
              {currentLabels[itemValue]}
            </span>

            {/* Ripple effect on selection */}
            {value === itemValue && (
              <motion.div
                className="absolute inset-0 rounded-xl bg-white/20"
                initial={{ scale: 0, opacity: 0.6 }}
                animate={{ scale: 1.5, opacity: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            )}
          </motion.button>
        ))}
      </div>

      {/* Selected Value Display */}
      {value && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mt-4 text-center p-3 rounded-lg bg-emerald-50 border border-emerald-200 ${isRTL ? 'rtl' : ''}`}
        >
          <span className={`text-sm font-medium text-emerald-800 ${isRTL ? 'arabic-text' : ''}`}>
            {language === 'ar' ? 'تم اختيار' : 'Selected'}: {currentLabels[value]}
          </span>
        </motion.div>
      )}
    </motion.div>
  );

  const renderCompact = () => (
    <motion.div
      className={`flex items-center gap-3 ${className} ${isRTL ? 'rtl flex-row-reverse' : ''}`}
      initial="initial"
      animate="animate"
      variants={containerVariants}
    >
      {scaleItems.map((itemValue) => (
        <motion.button
          key={itemValue}
          type="button"
          variants={itemVariants}
          whileHover={!disabled ? { scale: 1.1 } : {}}
          whileTap={!disabled ? { scale: 0.9 } : {}}
          onClick={() => !disabled && onChange(itemValue)}
          disabled={disabled}
          className={`
            w-10 h-10 rounded-full border-2 flex items-center justify-center
            font-medium text-sm transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-emerald-300
            ${getItemColor(itemValue)}
            ${disabled ? '' : 'hover:shadow-md cursor-pointer'}
          `}
        >
          {itemValue}
        </motion.button>
      ))}
    </motion.div>
  );

  const renderDetailed = () => (
    <motion.div
      className={`space-y-3 ${className} ${isRTL ? 'rtl' : ''}`}
      initial="initial"
      animate="animate"
      variants={containerVariants}
    >
      {scaleItems.map((itemValue) => (
        <motion.button
          key={itemValue}
          type="button"
          variants={itemVariants}
          whileHover={!disabled ? { scale: 1.02, x: isRTL ? -4 : 4 } : {}}
          onClick={() => !disabled && onChange(itemValue)}
          disabled={disabled}
          className={`
            w-full p-4 rounded-xl border-2 transition-all duration-200
            flex items-center justify-between
            focus:outline-none focus:ring-4 focus:ring-emerald-300/50
            ${getItemColor(itemValue)}
            ${disabled ? '' : 'hover:shadow-md cursor-pointer'}
            ${isRTL ? 'flex-row-reverse' : ''}
          `}
        >
          <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <span className="text-lg font-bold">{itemValue}</span>
            <span className={`font-medium ${isRTL ? 'arabic-text' : ''}`}>
              {currentLabels[itemValue]}
            </span>
          </div>

          {/* Selection indicator */}
          {value === itemValue && (
            <motion.div
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              className="text-xl"
            >
              ✓
            </motion.div>
          )}
        </motion.button>
      ))}
    </motion.div>
  );

  switch (variant) {
    case 'compact':
      return renderCompact();
    case 'detailed':
      return renderDetailed();
    default:
      return renderDefault();
  }
}