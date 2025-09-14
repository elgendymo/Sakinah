"use client";

import React from 'react';
import { Heart, Edit2, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../lib/cn';

export interface IntentionCardProps {
  /** Default intention text */
  defaultIntention?: string;
  /** Custom className */
  className?: string;
  /** Callback when intention is set */
  onIntentionSet?: (intention: string) => void;
  /** Show reminder state */
  showReminder?: boolean;
  /** Reminder time (for display) */
  reminderTime?: string;
}

export function IntentionCard({
  defaultIntention = "Today, I intend to worship Allah with sincerity and mindfulness.",
  className,
  onIntentionSet,
  showReminder = false,
  reminderTime = "Fajr",
}: IntentionCardProps) {
  const [intention, setIntention] = React.useState(defaultIntention);
  const [isEditing, setIsEditing] = React.useState(false);
  const [isSet, setIsSet] = React.useState(false);
  const [tempIntention, setTempIntention] = React.useState(intention);

  const handleEdit = () => {
    setTempIntention(intention);
    setIsEditing(true);
  };

  const handleSave = () => {
    setIntention(tempIntention);
    setIsEditing(false);
    setIsSet(true);
    onIntentionSet?.(tempIntention);
  };

  const handleCancel = () => {
    setTempIntention(intention);
    setIsEditing(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-xl bg-card-bg p-lg shadow-soft',
        'transition-all duration-normal hover:shadow-card',
        isSet ? 'bg-success/5' : '',
        className
      )}
    >
      {/* Header */}
      <div className="mb-md flex items-center justify-between">
        <div className="flex items-center gap-sm">
          <Heart className={cn(
            'h-5 w-5',
            isSet ? 'text-success' : 'text-accent'
          )} />
          <h3 className="text-lg font-semibold text-fg">
            Daily Intention (Niyyah)
          </h3>
        </div>

        {!isEditing && (
          <button
            onClick={handleEdit}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-md',
              'text-fg-muted transition-colors duration-fast',
              'hover:bg-bg-muted hover:text-fg focus:outline-none focus:ring-2 focus:ring-accent/20'
            )}
            aria-label="Edit intention"
          >
            <Edit2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Intention content */}
      {isEditing ? (
        <div className="space-y-md">
          <textarea
            value={tempIntention}
            onChange={(e) => setTempIntention(e.target.value)}
            onKeyDown={handleKeyPress}
            className={cn(
              'w-full min-h-[100px] rounded-lg border border-border bg-bg p-md',
              'text-md text-fg placeholder-fg-muted resize-none',
              'focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent'
            )}
            placeholder="Write your intention for today..."
            autoFocus
          />

          <div className="flex items-center gap-sm">
            <button
              onClick={handleSave}
              disabled={!tempIntention.trim()}
              className={cn(
                'flex items-center gap-xs rounded-md bg-accent px-md py-sm',
                'text-sm font-medium text-bg transition-colors duration-fast',
                'hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-accent/20',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              <Check className="h-4 w-4" />
              Set Intention
            </button>

            <button
              onClick={handleCancel}
              className={cn(
                'rounded-md px-md py-sm text-sm font-medium text-fg-muted',
                'transition-colors duration-fast hover:text-fg',
                'focus:outline-none focus:ring-2 focus:ring-accent/20'
              )}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-md">
          <p className="text-md leading-relaxed text-fg">
            {intention}
          </p>

          {isSet && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-xs text-sm text-success"
            >
              <Check className="h-4 w-4" />
              Intention set for today
            </motion.div>
          )}
        </div>
      )}

      {/* Reminder info */}
      {showReminder && !isEditing && (
        <div className="mt-md pt-md border-t border-border-muted">
          <p className="text-sm text-fg-muted">
            💡 Set your daily intention after {reminderTime} prayer
          </p>
        </div>
      )}
    </motion.div>
  );
}
