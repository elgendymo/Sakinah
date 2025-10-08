'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface AnimatedProgressIndicatorProps {
  currentPhase: number;
  totalPhases: number;
  percentage: number;
  labels?: string[];
  showMilestones?: boolean;
  className?: string;
}

export default function AnimatedProgressIndicator({
  currentPhase,
  totalPhases,
  percentage,
  labels = ['Welcome', 'Inner Assessment', 'Behavioral Assessment', 'Reflection', 'Results'],
  showMilestones = true,
  className = ''
}: AnimatedProgressIndicatorProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    setIsAnimating(true);
    const timer = setTimeout(() => setIsAnimating(false), 1000);
    return () => clearTimeout(timer);
  }, [currentPhase]);

  const progressVariants = {
    initial: { width: '0%' },
    animate: {
      width: `${percentage}%`,
      transition: {
        duration: 0.8,
        ease: [0.4, 0, 0.2, 1]
      }
    }
  };

  const milestoneVariants = {
    inactive: {
      scale: 1,
      backgroundColor: 'rgb(var(--sage-200))',
      borderColor: 'rgb(var(--sage-300))'
    },
    active: {
      scale: 1.2,
      backgroundColor: 'rgb(var(--emerald-500))',
      borderColor: 'rgb(var(--emerald-600))',
      transition: {
        type: 'spring',
        stiffness: 500,
        damping: 30
      }
    },
    complete: {
      scale: 1,
      backgroundColor: 'rgb(var(--emerald-600))',
      borderColor: 'rgb(var(--emerald-700))'
    }
  };

  const pulseVariants = {
    initial: { scale: 1, opacity: 0 },
    animate: {
      scale: [1, 2, 2],
      opacity: [0, 0.5, 0],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: 'easeOut'
      }
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Phase Labels and Percentage */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-sage-700">
            {labels[currentPhase - 1] || `Step ${currentPhase}`}
          </span>
          {isAnimating && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-xs text-emerald-600 font-medium"
            >
              ✨ Progress Updated
            </motion.span>
          )}
        </div>
        <motion.span
          key={percentage}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-sm font-bold text-emerald-600"
        >
          {percentage}%
        </motion.span>
      </div>

      {/* Main Progress Bar */}
      <div className="relative">
        {/* Background Track */}
        <div className="w-full h-3 bg-gradient-to-r from-sage-100 to-sage-200 rounded-full overflow-hidden shadow-inner">
          {/* Animated Fill */}
          <motion.div
            className="h-full relative overflow-hidden"
            variants={progressVariants}
            initial="initial"
            animate="animate"
          >
            {/* Gradient Bar */}
            <div className="h-full bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-500 rounded-full">
              {/* Shimmer Effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                animate={{
                  x: ['-100%', '200%']
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'linear',
                  delay: 1
                }}
              />
            </div>

            {/* Pulse at the end */}
            <motion.div
              className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-emerald-400 rounded-full"
              animate={{
                scale: [1, 1.3, 1],
                opacity: [1, 0.7, 1]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
            />
          </motion.div>
        </div>

        {/* Milestone Dots */}
        {showMilestones && (
          <div className="absolute inset-0 flex items-center justify-between px-2">
            {Array.from({ length: totalPhases }, (_, i) => {
              const phaseNum = i + 1;
              const isActive = phaseNum === currentPhase;
              const isComplete = phaseNum < currentPhase;
              const state = isComplete ? 'complete' : isActive ? 'active' : 'inactive';

              return (
                <div key={i} className="relative">
                  {/* Pulse Animation for Active */}
                  {isActive && (
                    <motion.div
                      className="absolute inset-0 w-6 h-6 bg-emerald-500 rounded-full"
                      variants={pulseVariants}
                      initial="initial"
                      animate="animate"
                    />
                  )}

                  {/* Milestone Dot */}
                  <motion.div
                    className="relative w-6 h-6 rounded-full border-2 flex items-center justify-center"
                    variants={milestoneVariants}
                    initial={state}
                    animate={state}
                    whileHover={{ scale: 1.1 }}
                    style={{
                      backgroundColor: isComplete ? 'rgb(16 185 129)' : isActive ? 'rgb(16 185 129)' : 'rgb(229 232 229)',
                      borderColor: isComplete ? 'rgb(5 150 105)' : isActive ? 'rgb(5 150 105)' : 'rgb(203 209 203)'
                    }}
                  >
                    {isComplete && (
                      <motion.svg
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        className="w-3 h-3 text-white"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </motion.svg>
                    )}
                    {isActive && (
                      <motion.div
                        animate={{
                          scale: [1, 1.5, 1]
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity
                        }}
                        className="w-2 h-2 bg-white rounded-full"
                      />
                    )}
                  </motion.div>

                  {/* Phase Label */}
                  {(isActive || isComplete) && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`absolute top-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-medium ${
                        isActive ? 'text-emerald-700' : 'text-sage-600'
                      }`}
                    >
                      {labels[i]?.split(' ')[0]}
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Step Counter */}
      <motion.div
        className="flex items-center justify-center mt-6 gap-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <span className="text-xs text-sage-500">Step</span>
        <div className="flex items-center gap-1">
          {Array.from({ length: totalPhases }, (_, i) => (
            <motion.div
              key={i}
              className={`w-8 h-1 rounded-full transition-colors ${
                i < currentPhase
                  ? 'bg-emerald-500'
                  : i === currentPhase - 1
                  ? 'bg-emerald-400'
                  : 'bg-sage-200'
              }`}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: i * 0.1 }}
            />
          ))}
        </div>
        <span className="text-xs text-sage-500">
          {currentPhase} of {totalPhases}
        </span>
      </motion.div>
    </div>
  );
}