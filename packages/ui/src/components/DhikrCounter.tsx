"use client";

import React from 'react';
import { RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../lib/cn';

export interface DhikrCounterProps {
  /** Title for the dhikr */
  title?: string;
  /** Target count (e.g., 33, 99, 100) */
  targetCount?: number;
  /** Custom className */
  className?: string;
  /** Callback when target is reached */
  onTargetReached?: () => void;
  /** Callback when count changes */
  onCountChange?: (count: number) => void;
  /** Enable haptic feedback (for future mobile implementation) */
  enableHaptics?: boolean;
}

export function DhikrCounter({
  title = 'Dhikr',
  targetCount = 33,
  className,
  onTargetReached,
  onCountChange,
  enableHaptics = false,
}: DhikrCounterProps) {
  const [count, setCount] = React.useState(0);
  const [isComplete, setIsComplete] = React.useState(false);

  const handleIncrement = () => {
    const newCount = count + 1;
    setCount(newCount);
    onCountChange?.(newCount);

    // Check if target reached
    if (newCount === targetCount && !isComplete) {
      setIsComplete(true);
      onTargetReached?.();

      // Future: Trigger haptic feedback
      if (enableHaptics && 'vibrate' in navigator) {
        navigator.vibrate([100, 50, 100]);
      }
    } else if (newCount < targetCount) {
      setIsComplete(false);
    }
  };

  const handleReset = () => {
    setCount(0);
    setIsComplete(false);
    onCountChange?.(0);
  };

  const progress = Math.min((count / targetCount) * 100, 100);

  return (
    <div
      className={cn(
        'flex flex-col items-center rounded-2xl bg-card-bg p-xl shadow-soft',
        'transition-all duration-normal hover:shadow-card',
        className
      )}
    >
      {/* Title */}
      <h3 className="mb-6 text-xl font-semibold text-sage-900">
        {title}
      </h3>

      {/* Progress circle */}
      <div className="relative mb-8">
        <svg
          className="h-36 w-36 -rotate-90 transform"
          viewBox="0 0 100 100"
        >
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="3"
          />
          {/* Progress circle */}
          <motion.circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke="#10b981"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 42}`}
            initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
            animate={{
              strokeDashoffset: 2 * Math.PI * 42 - (progress / 100) * 2 * Math.PI * 42
            }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        </svg>

        {/* Count display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.div
            key={count}
            initial={{ scale: 1 }}
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={cn(
              'text-3xl font-bold mb-1',
              isComplete ? 'text-emerald-600' : 'text-sage-900'
            )}
          >
            {count}
          </motion.div>
          <div className="text-sm text-sage-600 font-medium">
            of {targetCount}
          </div>
        </div>
      </div>

      {/* Counter button */}
      <motion.button
        onClick={handleIncrement}
        whileTap={{ scale: 0.95 }}
        className={cn(
          'mb-6 h-14 w-14 rounded-full border-2 transition-all duration-fast shadow-sm',
          isComplete
            ? 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700'
            : 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700',
          'focus:outline-none focus:ring-2 focus:ring-emerald-500/20'
        )}
        aria-label={`Increment ${title} count`}
      >
        <div className="text-sm font-semibold">
          {isComplete ? '✓' : '+1'}
        </div>
      </motion.button>

      {/* Reset button */}
      {count > 0 && (
        <button
          onClick={handleReset}
          className={cn(
            'flex items-center gap-2 rounded-lg px-4 py-2',
            'text-sm text-sage-600 transition-colors duration-fast bg-sage-100',
            'hover:text-sage-700 hover:bg-sage-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20'
          )}
        >
          <RotateCcw className="h-4 w-4" />
          Reset
        </button>
      )}

      {/* Completion message */}
      {isComplete && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 text-sm font-medium text-emerald-600 bg-emerald-50 px-4 py-2 rounded-lg"
        >
          Alhamdulillah! Target reached
        </motion.div>
      )}
    </div>
  );
}
