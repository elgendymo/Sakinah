"use client";

import React from 'react';
import { ArrowRight, CheckCircle2, Circle } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../lib/cn';

export interface PlanItem {
  id: string;
  text: string;
  completed?: boolean;
  type: 'habit' | 'dua' | 'ayah';
}

export interface PlanCardProps {
  /** Plan title */
  title: string;
  /** Plan description */
  description?: string;
  /** Array of plan items (2-3 micro-habits, one du'a, one ayah) */
  items: PlanItem[];
  /** CTA button text */
  ctaText?: string;
  /** Custom className */
  className?: string;
  /** Click handler for CTA */
  onStartPlan?: () => void;
  /** Handler for item completion toggle */
  onToggleItem?: (itemId: string, completed: boolean) => void;
}

const itemTypeStyles = {
  habit: 'text-accent',
  dua: 'text-success',
  ayah: 'text-date',
};

const itemTypeLabels = {
  habit: 'Habit',
  dua: 'Du\'a',
  ayah: 'Ayah',
};

export function PlanCard({
  title,
  description,
  items,
  ctaText = "Start Today",
  className,
  onStartPlan,
  onToggleItem,
}: PlanCardProps) {
  const completedCount = items.filter(item => item.completed).length;
  const progress = items.length > 0 ? (completedCount / items.length) * 100 : 0;

  const handleToggleItem = (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (item && onToggleItem) {
      onToggleItem(itemId, !item.completed);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-xl bg-card-bg p-lg shadow-soft',
        'transition-all duration-normal hover:shadow-card',
        className
      )}
    >
      {/* Header */}
      <div className="mb-lg">
        <h3 className="mb-sm text-xl font-semibold text-fg">
          {title}
        </h3>

        {description && (
          <p className="text-md text-fg-muted leading-normal">
            {description}
          </p>
        )}

        {/* Progress bar */}
        {items.length > 0 && (
          <div className="mt-md">
            <div className="flex items-center justify-between mb-xs">
              <span className="text-sm text-fg-muted">Progress</span>
              <span className="text-sm font-medium text-fg">
                {completedCount}/{items.length}
              </span>
            </div>
            <div className="h-2 bg-bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-accent rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Plan items */}
      <div className="space-y-sm mb-lg">
        {items.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={cn(
              'flex items-start gap-sm p-sm rounded-lg',
              'transition-colors duration-fast hover:bg-bg-muted',
              item.completed && 'opacity-70'
            )}
          >
            <button
              onClick={() => handleToggleItem(item.id)}
              className={cn(
                'flex-shrink-0 mt-xs transition-colors duration-fast',
                'focus:outline-none focus:ring-2 focus:ring-accent/20 rounded-sm'
              )}
              aria-label={`Toggle ${item.text}`}
            >
              {item.completed ? (
                <CheckCircle2 className="h-5 w-5 text-success" />
              ) : (
                <Circle className="h-5 w-5 text-fg-muted hover:text-accent" />
              )}
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-sm mb-xs">
                <span className={cn(
                  'text-xs font-medium px-xs py-0.5 rounded',
                  'bg-current/10',
                  itemTypeStyles[item.type]
                )}>
                  {itemTypeLabels[item.type]}
                </span>
              </div>

              <p className={cn(
                'text-sm leading-relaxed',
                item.completed
                  ? 'text-fg-muted line-through'
                  : 'text-fg',
                item.type === 'ayah' && 'font-serif'
              )}>
                {item.text}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* CTA Button */}
      {onStartPlan && (
        <motion.button
          onClick={onStartPlan}
          whileTap={{ scale: 0.98 }}
          className={cn(
            'w-full flex items-center justify-center gap-sm',
            'rounded-lg bg-emerald-600 px-lg py-md',
            'text-md font-semibold text-white',
            'transition-all duration-fast hover:bg-emerald-700',
            'focus:outline-none focus:ring-2 focus:ring-emerald-500/20',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {ctaText}
          <ArrowRight className="h-4 w-4" />
        </motion.button>
      )}
    </motion.div>
  );
}
