import React from 'react';
import { Clock, Sun, Sunrise, Sunset, Moon } from 'lucide-react';
import { cn } from '../lib/cn';

export interface PrayerTime {
  name: 'Fajr' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha';
  time: string;
  passed: boolean;
}

export interface PrayerTimePillProps {
  /** Array of prayer times */
  prayerTimes: PrayerTime[];
  /** Custom className */
  className?: string;
  /** Show icons for prayers */
  showIcons?: boolean;
  /** Compact layout */
  compact?: boolean;
}

const prayerIcons = {
  Fajr: Sunrise,
  Dhuhr: Sun,
  Asr: Sun,
  Maghrib: Sunset,
  Isha: Moon,
};

export function PrayerTimePill({
  prayerTimes,
  className,
  showIcons = true,
  compact = false,
}: PrayerTimePillProps) {
  const nextPrayer = prayerTimes.find(prayer => !prayer.passed);
  const currentPrayerIndex = nextPrayer
    ? prayerTimes.findIndex(p => p.name === nextPrayer.name)
    : prayerTimes.length;

  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card-bg shadow-soft',
        compact ? 'p-md' : 'p-lg',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-sm mb-md">
        <Clock className="h-4 w-4 text-accent" />
        <h3 className={cn(
          'font-semibold text-fg',
          compact ? 'text-sm' : 'text-md'
        )}>
          Prayer Times
        </h3>
      </div>

      {/* Prayer times grid */}
      <div className={cn(
        'grid gap-sm',
        compact ? 'grid-cols-5' : 'grid-cols-1 sm:grid-cols-5'
      )}>
        {prayerTimes.map((prayer, index) => {
          const Icon = showIcons ? prayerIcons[prayer.name] : null;
          const isNext = index === currentPrayerIndex;

          return (
            <div
              key={prayer.name}
              className={cn(
                'flex items-center gap-xs rounded-lg transition-all duration-fast',
                compact ? 'flex-col p-xs' : 'p-sm',
                isNext && 'bg-accent/10 border border-accent/20',
                prayer.passed && 'opacity-60'
              )}
            >
              {Icon && (
                <Icon className={cn(
                  'flex-shrink-0',
                  compact ? 'h-3 w-3' : 'h-4 w-4',
                  isNext ? 'text-accent' : 'text-fg-muted'
                )} />
              )}

              <div className={cn(
                'text-center',
                compact && 'space-y-xs'
              )}>
                <div className={cn(
                  'font-medium',
                  compact ? 'text-xs' : 'text-sm',
                  isNext ? 'text-accent' : 'text-fg'
                )}>
                  {prayer.name}
                </div>

                <div className={cn(
                  'font-mono',
                  compact ? 'text-xs' : 'text-sm',
                  isNext ? 'text-accent' : 'text-fg-muted'
                )}>
                  {prayer.time}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Next prayer indicator */}
      {nextPrayer && !compact && (
        <div className="mt-md pt-md border-t border-border-muted">
          <p className="text-sm text-fg-muted text-center">
            Next prayer: <span className="font-medium text-accent">{nextPrayer.name}</span> at {nextPrayer.time}
          </p>
        </div>
      )}
    </div>
  );
}
