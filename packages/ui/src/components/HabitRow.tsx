"use client";

import React from 'react';
import { CheckCircle2, Circle, Flame } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/cn';

export interface HabitRowProps {
  /** Habit name */
  name: string;
  /** Current streak count */
  streak: number;
  /** Whether habit is completed today */
  completed: boolean;
  /** Habit description */
  description?: string;
  /** Custom className */
  className?: string;
  /** Toggle completion handler */
  onToggle?: (completed: boolean) => void;
  /** Show confetti on completion */
  showConfetti?: boolean;
}

// Subtle confetti component
const Confetti = () => (
  <motion.div
    initial={{ opacity: 0, scale: 0 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0 }}
    className="absolute inset-0 pointer-events-none"
  >
    {[...Array(6)].map((_, i) => (
      <motion.div
        key={i}
        initial={{
          opacity: 0,
          scale: 0,
          x: 0,
          y: 0,
        }}
        animate={{
          opacity: [0, 1, 0],
          scale: [0, 1, 0.8],
          x: [0, (Math.random() - 0.5) * 40],
          y: [0, (Math.random() - 0.5) * 40],
        }}
        transition={{
          duration: 0.8,
          delay: i * 0.1,
          ease: 'easeOut'
        }}
        className="absolute top-1/2 left-6 w-2 h-2 bg-success rounded-full"
        style={{
          rotate: `${Math.random() * 360}deg`,
        }}
      />
    ))}
  </motion.div>
);

export function HabitRow({
  name,
  streak,
  completed,
  description,
  className,
  onToggle,
  showConfetti = true,
}: HabitRowProps) {
  const [isAnimating, setIsAnimating] = React.useState(false);
  const [showConfettiEffect, setShowConfettiEffect] = React.useState(false);

  const handleToggle = () => {
    if (!onToggle) return;

    const newCompleted = !completed;
    setIsAnimating(true);

    // Show confetti for completion (not for undoing)
    if (newCompleted && showConfetti) {
      setShowConfettiEffect(true);
      setTimeout(() => setShowConfettiEffect(false), 1000);
    }

    onToggle(newCompleted);

    setTimeout(() => setIsAnimating(false), 300);
  };

  return (
    <motion.div
      layout
      className={cn(
        'relative flex items-center gap-md p-lg rounded-lg',
        'transition-all duration-fast hover:bg-bg-muted',
        completed && 'bg-success/5',
        className
      )}
    >
      {/* Completion toggle */}
      <button
        onClick={handleToggle}
        className={cn(
          'relative flex-shrink-0 transition-all duration-fast',
          'focus:outline-none focus:ring-2 focus:ring-accent/20 rounded-sm'
        )}
        aria-label={`Mark ${name} as ${completed ? 'incomplete' : 'complete'}`}
      >
        <motion.div
          animate={isAnimating ? { scale: [1, 1.2, 1] } : {}}
          transition={{ duration: 0.2 }}
        >
          {completed ? (
            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
          ) : (
            <Circle className="h-6 w-6 text-slate-400 hover:text-emerald-600" />
          )}
        </motion.div>

        {/* Confetti effect */}
        <AnimatePresence>
          {showConfettiEffect && <Confetti />}
        </AnimatePresence>
      </button>

      {/* Habit content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-sm">
          <h4 className={cn(
            'font-medium text-fg transition-colors duration-fast',
            completed && 'text-fg-muted'
          )}>
            {name}
          </h4>

          {/* Streak indicator */}
          {streak > 0 && (
            <div className={cn(
              'flex items-center gap-xs px-sm py-xs rounded-full',
              'bg-emerald-100 text-emerald-700 text-sm font-medium'
            )}>
              <Flame className="h-3 w-3" />
              <span>{streak}</span>
            </div>
          )}
        </div>

        {description && (
          <p className="mt-xs text-sm text-fg-muted leading-normal">
            {description}
          </p>
        )}
      </div>

      {/* Completion indicator */}
      {completed && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex-shrink-0 text-sm font-medium text-emerald-600"
        >
          ✓ Done
        </motion.div>
      )}
    </motion.div>
  );
}

// HabitList component for managing multiple habits
export interface HabitListProps {
  /** Array of habits */
  habits: Array<{
    id: string;
    name: string;
    description?: string;
    streak: number;
    completed: boolean;
  }>;
  /** Custom className */
  className?: string;
  /** Habit toggle handler */
  onToggleHabit?: (habitId: string, completed: boolean) => void;
}

export function HabitList({
  habits,
  className,
  onToggleHabit,
}: HabitListProps) {
  const completedCount = habits.filter(h => h.completed).length;
  const totalCount = habits.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className={cn('space-y-sm', className)}>
      {/* Progress header */}
      {totalCount > 0 && (
        <div className="mb-lg">
          <div className="flex items-center justify-between mb-sm">
            <h3 className="text-lg font-semibold text-fg">Today's Habits</h3>
            <span className="text-sm font-medium text-fg">
              {completedCount}/{totalCount}
            </span>
          </div>

          <div className="h-2 bg-bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-emerald-600 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>
        </div>
      )}

      {/* Habit rows */}
      <div className="space-y-sm">
        {habits.map((habit) => (
          <HabitRow
            key={habit.id}
            name={habit.name}
            description={habit.description}
            streak={habit.streak}
            completed={habit.completed}
            onToggle={(completed) => onToggleHabit?.(habit.id, completed)}
          />
        ))}
      </div>

      {/* Completion message */}
      {completedCount === totalCount && totalCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            'mt-lg p-md rounded-lg bg-emerald-50 border border-emerald-200',
            'text-center text-emerald-700 font-medium'
          )}
        >
          🎉 All habits completed! Excellent work!
        </motion.div>
      )}
    </div>
  );
}
