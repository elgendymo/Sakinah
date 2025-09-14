import React from 'react';
import { cn } from '../lib/cn';

export interface SectionHeaderProps {
  /** Main title text */
  title: string;
  /** Optional subtitle */
  subtitle?: string;
  /** Custom className */
  className?: string;
  /** Show geometric divider */
  showDivider?: boolean;
  /** Header level for accessibility */
  level?: 1 | 2 | 3 | 4 | 5 | 6;
}

// Geometric pattern component - subtle Islamic-inspired divider
const GeometricDivider = ({ className }: { className?: string }) => (
  <div className={cn('flex items-center justify-center', className)}>
    <svg
      width="120"
      height="8"
      viewBox="0 0 120 8"
      className="text-border opacity-60"
      fill="currentColor"
    >
      {/* Repeating geometric pattern - inspired by Islamic art */}
      <pattern id="islamic-pattern" x="0" y="0" width="24" height="8" patternUnits="userSpaceOnUse">
        <polygon points="12,1 16,4 12,7 8,4" className="fill-current" />
      </pattern>
      <rect width="120" height="8" fill="url(#islamic-pattern)" />
    </svg>
  </div>
);

export function SectionHeader({
  title,
  subtitle,
  className,
  showDivider = true,
  level = 2,
}: SectionHeaderProps) {
  const HeadingComponent = `h${level}` as keyof JSX.IntrinsicElements;

  const headingStyles = {
    1: 'text-3xl font-bold',
    2: 'text-2xl font-semibold',
    3: 'text-xl font-semibold',
    4: 'text-lg font-semibold',
    5: 'text-md font-medium',
    6: 'text-sm font-medium',
  };

  return (
    <div className={cn('text-center space-y-md', className)}>
      {/* Divider above (optional) */}
      {showDivider && (
        <GeometricDivider className="mb-lg" />
      )}

      {/* Main title */}
      <HeadingComponent className={cn(
        headingStyles[level],
        'text-fg leading-tight'
      )}>
        {title}
      </HeadingComponent>

      {/* Subtitle */}
      {subtitle && (
        <p className="text-md text-fg-muted leading-normal max-w-2xl mx-auto">
          {subtitle}
        </p>
      )}

      {/* Divider below (optional) */}
      {showDivider && (
        <GeometricDivider className="mt-lg" />
      )}
    </div>
  );
}
