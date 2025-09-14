"use client";

import React from 'react';
import { X } from 'lucide-react';
import { cn } from '../lib/cn';

export type ChipVariant = 'virtue' | 'struggle' | 'neutral';

export interface ChipProps {
  /** The text content of the chip */
  label: string;
  /** Visual variant */
  variant?: ChipVariant;
  /** Whether the chip is selected */
  selected?: boolean;
  /** Whether the chip can be removed */
  removable?: boolean;
  /** Custom className */
  className?: string;
  /** Click handler */
  onClick?: () => void;
  /** Remove handler */
  onRemove?: () => void;
}

const chipVariants = {
  virtue: {
    base: 'bg-success/10 text-success border-success/20',
    selected: 'bg-success text-bg border-success',
    hover: 'hover:bg-success/20',
  },
  struggle: {
    base: 'bg-warn/10 text-warn border-warn/20',
    selected: 'bg-warn text-bg border-warn',
    hover: 'hover:bg-warn/20',
  },
  neutral: {
    base: 'bg-bg-muted text-fg-muted border-border',
    selected: 'bg-accent text-bg border-accent',
    hover: 'hover:bg-accent-soft',
  },
};

export function Chip({
  label,
  variant = 'neutral',
  selected = false,
  removable = false,
  className,
  onClick,
  onRemove,
}: ChipProps) {
  const variantStyles = chipVariants[variant];

  return (
    <div
      className={cn(
        'inline-flex items-center gap-xs rounded-full border px-sm py-xs',
        'text-sm font-medium transition-all duration-fast',
        'focus-within:ring-2 focus-within:ring-accent/20',
        selected ? variantStyles.selected : [variantStyles.base, variantStyles.hover],
        onClick && 'cursor-pointer select-none',
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <span>{label}</span>

      {removable && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.();
          }}
          className={cn(
            'flex h-4 w-4 items-center justify-center rounded-full',
            'transition-colors duration-fast hover:bg-current/20',
            'focus:outline-none focus:ring-1 focus:ring-current/30'
          )}
          aria-label={`Remove ${label}`}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

// Convenience components
export function VirtueChip(props: Omit<ChipProps, 'variant'>) {
  return <Chip {...props} variant="virtue" />;
}

export function StruggleChip(props: Omit<ChipProps, 'variant'>) {
  return <Chip {...props} variant="struggle" />;
}

// Chip group component for managing multiple chips
export interface ChipGroupProps {
  /** Array of chip items */
  items: Array<{
    id: string;
    label: string;
    variant?: ChipVariant;
  }>;
  /** Currently selected chip IDs */
  selectedIds?: string[];
  /** Whether multiple chips can be selected */
  multiple?: boolean;
  /** Custom className */
  className?: string;
  /** Selection change handler */
  onSelectionChange?: (selectedIds: string[]) => void;
}

export function ChipGroup({
  items,
  selectedIds = [],
  multiple = true,
  className,
  onSelectionChange,
}: ChipGroupProps) {
  const handleChipClick = (clickedId: string) => {
    if (!onSelectionChange) return;

    let newSelection: string[];

    if (multiple) {
      // Toggle selection
      newSelection = selectedIds.includes(clickedId)
        ? selectedIds.filter(id => id !== clickedId)
        : [...selectedIds, clickedId];
    } else {
      // Single selection
      newSelection = selectedIds.includes(clickedId) ? [] : [clickedId];
    }

    onSelectionChange(newSelection);
  };

  return (
    <div className={cn('flex flex-wrap gap-sm', className)}>
      {items.map((item) => (
        <Chip
          key={item.id}
          label={item.label}
          variant={item.variant}
          selected={selectedIds.includes(item.id)}
          onClick={() => handleChipClick(item.id)}
        />
      ))}
    </div>
  );
}
