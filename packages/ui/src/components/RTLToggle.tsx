"use client";

import React from 'react';
import { Languages } from 'lucide-react';
import { cn } from '../lib/cn';
import { useDirection } from '../lib/utils';

export interface RTLToggleProps {
  /** Custom className */
  className?: string;
  /** Show label text */
  showLabel?: boolean;
}

export function RTLToggle({ className, showLabel = true }: RTLToggleProps) {
  const direction = useDirection();

  const toggleDirection = () => {
    const newDirection = direction === 'ltr' ? 'rtl' : 'ltr';
    document.documentElement.dir = newDirection;
    document.documentElement.lang = newDirection === 'rtl' ? 'ar' : 'en';
  };

  return (
    <button
      onClick={toggleDirection}
      className={cn(
        'flex items-center gap-sm rounded-md border border-border',
        'bg-card-bg px-sm py-xs text-sm font-medium text-fg',
        'transition-all duration-fast hover:bg-bg-muted',
        'focus:outline-none focus:ring-2 focus:ring-accent/20',
        className
      )}
      title={`Switch to ${direction === 'ltr' ? 'RTL' : 'LTR'} layout`}
    >
      <Languages className="h-4 w-4" />
      {showLabel && (
        <span>{direction.toUpperCase()}</span>
      )}
    </button>
  );
}
