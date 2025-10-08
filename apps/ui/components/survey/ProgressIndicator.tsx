'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface ProgressIndicatorProps {
  currentPhase: number;
  totalPhases: number;
  percentage: number;
  className?: string;
  showPercentage?: boolean;
  showStepText?: boolean;
  variant?: 'default' | 'minimal' | 'detailed';
}

export default function ProgressIndicator({
  currentPhase,
  totalPhases,
  percentage,
  className = '',
  showPercentage = true,
  showStepText = true,
  variant = 'default'
}: ProgressIndicatorProps) {
  const fadeInUp = {
    initial: { opacity: 0, y: 10 },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: "easeOut"
      }
    }
  };

  const progressAnimation = {
    initial: { width: "0%" },
    animate: {
      width: `${percentage}%`,
      transition: {
        duration: 1,
        delay: 0.3,
        ease: "easeOut"
      }
    }
  };

  const pulseAnimation = {
    animate: {
      scale: [1, 1.05, 1],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  const renderDefault = () => (
    <motion.div
      className={`mb-6 ${className}`}
      initial="initial"
      animate="animate"
      variants={fadeInUp}
    >
      {/* Step Information */}
      {showStepText && (
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-sage-600">
            Step {currentPhase} of {totalPhases}
          </span>
          {showPercentage && (
            <span className="text-sm font-medium text-sage-600">
              {percentage}%
            </span>
          )}
        </div>
      )}

      {/* Progress Bar Container */}
      <div className="relative">
        <div className="w-full bg-sage-100 rounded-full h-3 overflow-hidden shadow-inner">
          {/* Background gradient for depth */}
          <div className="absolute inset-0 bg-gradient-to-r from-sage-100 to-sage-200 rounded-full" />

          {/* Active progress bar */}
          <motion.div
            className="relative h-3 rounded-full overflow-hidden"
            variants={progressAnimation}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-500 rounded-full" />

            {/* Animated shine effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-400/30 to-transparent rounded-full"
              animate={{
                x: ['-100%', '100%'],
                transition: {
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }
              }}
            />
          </motion.div>
        </div>

        {/* Progress indicator dot */}
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-emerald-600 rounded-full border-2 border-white shadow-lg"
          style={{ left: `calc(${percentage}% - 8px)` }}
          variants={pulseAnimation}
          animate={percentage > 0 ? "animate" : "initial"}
        />
      </div>
    </motion.div>
  );

  const renderMinimal = () => (
    <motion.div
      className={`mb-4 ${className}`}
      initial="initial"
      animate="animate"
      variants={fadeInUp}
    >
      <div className="w-full bg-sage-100/50 rounded-full h-1 overflow-hidden">
        <motion.div
          className="h-1 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full"
          variants={progressAnimation}
        />
      </div>
      {showPercentage && (
        <div className="text-center mt-2">
          <span className="text-xs text-sage-500">{percentage}%</span>
        </div>
      )}
    </motion.div>
  );

  const renderDetailed = () => (
    <motion.div
      className={`mb-8 ${className}`}
      initial="initial"
      animate="animate"
      variants={fadeInUp}
    >
      {/* Phase Steps */}
      <div className="flex justify-between items-center mb-4">
        {Array.from({ length: totalPhases }, (_, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentPhase;
          const isCurrent = stepNumber === currentPhase;
          // const isUpcoming = stepNumber > currentPhase;

          return (
            <div key={stepNumber} className="flex flex-col items-center flex-1">
              {/* Step Circle */}
              <motion.div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium mb-2
                  ${isCompleted
                    ? 'bg-emerald-600 text-white shadow-md'
                    : isCurrent
                    ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-600 shadow-md'
                    : 'bg-sage-100 text-sage-400'
                  }
                `}
                animate={isCurrent ? pulseAnimation.animate : {}}
              >
                {isCompleted ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  stepNumber
                )}
              </motion.div>

              {/* Step Line */}
              {index < totalPhases - 1 && (
                <div className="absolute top-4 left-1/2 w-full h-0.5 -translate-y-1/2">
                  <div className="w-full bg-sage-200 h-full" />
                  {isCompleted && (
                    <motion.div
                      className="absolute inset-0 bg-emerald-600 h-full"
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-sage-100 rounded-full h-2 overflow-hidden">
        <motion.div
          className="h-2 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full"
          variants={progressAnimation}
        />
      </div>

      {/* Progress Text */}
      {showStepText && (
        <div className="text-center mt-3">
          <span className="text-sm text-sage-600">
            Progress: {percentage}% complete
          </span>
        </div>
      )}
    </motion.div>
  );

  switch (variant) {
    case 'minimal':
      return renderMinimal();
    case 'detailed':
      return renderDetailed();
    default:
      return renderDefault();
  }
}