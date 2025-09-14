"use client";

import React from 'react';
import { RotateCcw, Plus, Minus } from 'lucide-react';
import { cn } from '../lib/cn';

export interface DuaCardProps {
  /** Arabic text of the du'a */
  arabic: string;
  /** English translation */
  translation: string;
  /** Transliteration for pronunciation */
  transliteration: string;
  /** Title of the du'a */
  title?: string;
  /** Custom className */
  className?: string;
  /** Show repeat counter */
  showCounter?: boolean;
  /** Initial counter value */
  initialCount?: number;
  /** Maximum counter value */
  maxCount?: number;
  /** Callback when counter changes */
  onCountChange?: (count: number) => void;
}

export function DuaCard({
  arabic,
  translation,
  transliteration,
  title,
  className,
  showCounter = false,
  initialCount = 0,
  maxCount = 100,
  onCountChange,
}: DuaCardProps) {
  const [count, setCount] = React.useState(initialCount);

  const handleIncrement = () => {
    if (count < maxCount) {
      const newCount = count + 1;
      setCount(newCount);
      onCountChange?.(newCount);
    }
  };

  const handleDecrement = () => {
    if (count > 0) {
      const newCount = count - 1;
      setCount(newCount);
      onCountChange?.(newCount);
    }
  };

  const handleReset = () => {
    setCount(0);
    onCountChange?.(0);
  };

  return (
    <div
      className={cn(
        'rounded-xl bg-card-bg p-lg shadow-soft',
        'transition-all duration-normal hover:shadow-card',
        className
      )}
    >
      {/* Title */}
      {title && (
        <h3 className="mb-md text-lg font-semibold text-fg">
          {title}
        </h3>
      )}

      {/* Arabic text */}
      <div
        className="mb-md text-lg font-medium leading-relaxed text-fg"
        lang="ar"
        dir="rtl"
      >
        {arabic}
      </div>

      {/* Transliteration */}
      <div className="mb-sm text-sm italic text-fg-muted leading-normal">
        <span className="font-medium">Pronunciation: </span>
        {transliteration}
      </div>

      {/* Translation */}
      <div className="mb-md text-md text-fg leading-normal">
        <span className="font-medium">Translation: </span>
        {translation}
      </div>

      {/* Counter */}
      {showCounter && (
        <div className="flex items-center justify-between pt-md border-t border-border-muted">
          <div className="flex items-center gap-sm">
            <button
              onClick={handleDecrement}
              disabled={count <= 0}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-md',
                'bg-bg-muted text-fg-muted transition-colors duration-fast',
                'hover:bg-accent-soft hover:text-accent focus:outline-none focus:ring-2 focus:ring-accent/20',
                'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-bg-muted'
              )}
              aria-label="Decrease count"
            >
              <Minus className="h-4 w-4" />
            </button>

            <span className="min-w-[3rem] text-center text-lg font-semibold text-fg">
              {count}
            </span>

            <button
              onClick={handleIncrement}
              disabled={count >= maxCount}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-md',
                'bg-accent-soft text-accent transition-colors duration-fast',
                'hover:bg-accent hover:text-bg focus:outline-none focus:ring-2 focus:ring-accent/20',
                'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-accent-soft'
              )}
              aria-label="Increase count"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {count > 0 && (
            <button
              onClick={handleReset}
              className={cn(
                'flex items-center gap-xs rounded-md px-sm py-xs',
                'text-sm text-fg-muted transition-colors duration-fast',
                'hover:text-fg focus:outline-none focus:ring-2 focus:ring-accent/20'
              )}
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          )}
        </div>
      )}
    </div>
  );
}
