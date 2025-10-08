'use client';

import { motion } from 'framer-motion';

interface ProgressIndicatorProps {
  currentPhase: number;
  totalPhases: number;
  percentage: number;
  className?: string;
}

export default function ProgressIndicator({
  currentPhase,
  totalPhases,
  percentage,
  className = ''
}: ProgressIndicatorProps) {
  const progressVariants = {
    initial: { width: "0%" },
    animate: {
      width: `${percentage}%`,
      transition: { duration: 1, delay: 0.5, ease: "easeOut" }
    }
  };

  const labelVariants = {
    initial: { opacity: 0, y: -10 },
    animate: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" }
    }
  };

  return (
    <motion.div
      className={`mb-8 ${className}`}
      initial="initial"
      animate="animate"
      variants={{
        animate: {
          transition: {
            staggerChildren: 0.1
          }
        }
      }}
    >
      {/* Progress Labels */}
      <motion.div
        className="flex items-center justify-between mb-4"
        variants={labelVariants}
      >
        <span className="text-sm font-medium text-sage-600">
          Step {currentPhase} of {totalPhases}
        </span>
        <span className="text-sm font-medium text-sage-600">
          {Math.round(percentage)}%
        </span>
      </motion.div>

      {/* Progress Bar */}
      <div className="w-full bg-sage-100 rounded-full h-2 overflow-hidden">
        <motion.div
          className="h-2 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full"
          variants={progressVariants}
        />
      </div>

      {/* Phase Indicators */}
      <motion.div
        className="flex justify-between mt-3"
        variants={labelVariants}
      >
        {Array.from({ length: totalPhases }, (_, index) => {
          const phaseNumber = index + 1;
          const isCompleted = phaseNumber < currentPhase;
          const isCurrent = phaseNumber === currentPhase;

          return (
            <div
              key={phaseNumber}
              className={`flex flex-col items-center text-xs ${
                isCompleted
                  ? 'text-emerald-600'
                  : isCurrent
                  ? 'text-emerald-700 font-medium'
                  : 'text-sage-400'
              }`}
            >
              <div
                className={`w-3 h-3 rounded-full mb-1 ${
                  isCompleted
                    ? 'bg-emerald-600'
                    : isCurrent
                    ? 'bg-emerald-500'
                    : 'bg-sage-300'
                }`}
              />
              <span className="hidden sm:block">
                {phaseNumber === 1 && 'Welcome'}
                {phaseNumber === 2 && 'Phase 1'}
                {phaseNumber === 3 && 'Phase 2'}
                {phaseNumber === 4 && 'Results'}
              </span>
            </div>
          );
        })}
      </motion.div>
    </motion.div>
  );
}