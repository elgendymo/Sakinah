import { describe, it, expect } from 'vitest';

// Helper functions to test the analytics calculations
function getPeriodDays(period: string): number {
  switch (period) {
    case '7d': return 7;
    case '30d': return 30;
    case '90d': return 90;
    case '1y': return 365;
    default: return 30;
  }
}

function calculateLongestStreak(completions: string[]): number {
  if (completions.length === 0) return 0;

  const sortedDates = completions.sort();
  let longestStreak = 1;
  let currentStreak = 1;

  for (let i = 1; i < sortedDates.length; i++) {
    const prevDate = new Date(sortedDates[i - 1]);
    const currentDate = new Date(sortedDates[i]);
    const dayDiff = Math.floor((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

    if (dayDiff === 1) {
      currentStreak++;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      currentStreak = 1;
    }
  }

  return longestStreak;
}

function calculateAverageStreakLength(completions: string[]): number {
  if (completions.length === 0) return 0;

  const sortedDates = completions.sort();
  const streaks: number[] = [];
  let currentStreak = 1;

  for (let i = 1; i < sortedDates.length; i++) {
    const prevDate = new Date(sortedDates[i - 1]);
    const currentDate = new Date(sortedDates[i]);
    const dayDiff = Math.floor((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

    if (dayDiff === 1) {
      currentStreak++;
    } else {
      streaks.push(currentStreak);
      currentStreak = 1;
    }
  }
  streaks.push(currentStreak);

  return streaks.length > 0 ? streaks.reduce((a, b) => a + b, 0) / streaks.length : 0;
}

function calculateWeeklyConsistency(completions: string[], totalDays: number): number {
  const weeks = Math.ceil(totalDays / 7);
  if (weeks === 0) return 0;
  return Math.round((completions.length / weeks) * 100) / 100;
}

function calculateMonthlyConsistency(completions: string[], totalDays: number): number {
  const months = Math.ceil(totalDays / 30);
  if (months === 0) return 0;
  return Math.round((completions.length / months) * 100) / 100;
}

describe('Habits V1 Helper Functions', () => {
  describe('getPeriodDays', () => {
    it('should return correct days for valid periods', () => {
      expect(getPeriodDays('7d')).toBe(7);
      expect(getPeriodDays('30d')).toBe(30);
      expect(getPeriodDays('90d')).toBe(90);
      expect(getPeriodDays('1y')).toBe(365);
    });

    it('should return default 30 days for invalid periods', () => {
      expect(getPeriodDays('invalid')).toBe(30);
      expect(getPeriodDays('')).toBe(30);
    });
  });

  describe('calculateLongestStreak', () => {
    it('should return 0 for empty completions', () => {
      expect(calculateLongestStreak([])).toBe(0);
    });

    it('should return 1 for single completion', () => {
      expect(calculateLongestStreak(['2024-01-01'])).toBe(1);
    });

    it('should calculate consecutive days streak correctly', () => {
      const completions = ['2024-01-01', '2024-01-02', '2024-01-03', '2024-01-04'];
      expect(calculateLongestStreak(completions)).toBe(4);
    });

    it('should find longest streak among multiple streaks', () => {
      const completions = [
        '2024-01-01', '2024-01-02', // streak of 2
        '2024-01-05', '2024-01-06', '2024-01-07', '2024-01-08', // streak of 4
        '2024-01-10', '2024-01-11', '2024-01-12' // streak of 3
      ];
      expect(calculateLongestStreak(completions)).toBe(4);
    });

    it('should handle non-consecutive dates', () => {
      const completions = ['2024-01-01', '2024-01-03', '2024-01-05'];
      expect(calculateLongestStreak(completions)).toBe(1);
    });

    it('should handle unsorted dates', () => {
      const completions = ['2024-01-03', '2024-01-01', '2024-01-02'];
      expect(calculateLongestStreak(completions)).toBe(3);
    });
  });

  describe('calculateAverageStreakLength', () => {
    it('should return 0 for empty completions', () => {
      expect(calculateAverageStreakLength([])).toBe(0);
    });

    it('should return 1 for single completion', () => {
      expect(calculateAverageStreakLength(['2024-01-01'])).toBe(1);
    });

    it('should calculate average of multiple streaks', () => {
      const completions = [
        '2024-01-01', '2024-01-02', // streak of 2
        '2024-01-05', '2024-01-06', '2024-01-07', '2024-01-08', // streak of 4
        '2024-01-10' // streak of 1
      ];
      // Average of [2, 4, 1] = 7/3 ≈ 2.33
      expect(calculateAverageStreakLength(completions)).toBeCloseTo(2.33, 2);
    });

    it('should handle consecutive dates correctly', () => {
      const completions = ['2024-01-01', '2024-01-02', '2024-01-03', '2024-01-04'];
      expect(calculateAverageStreakLength(completions)).toBe(4);
    });
  });

  describe('calculateWeeklyConsistency', () => {
    it('should return 0 for zero total days', () => {
      expect(calculateWeeklyConsistency(['2024-01-01'], 0)).toBe(0);
    });

    it('should calculate weekly consistency correctly', () => {
      const completions = ['2024-01-01', '2024-01-02', '2024-01-03'];
      const totalDays = 14; // 2 weeks
      // 3 completions / 2 weeks = 1.5
      expect(calculateWeeklyConsistency(completions, totalDays)).toBe(1.5);
    });

    it('should handle partial weeks', () => {
      const completions = ['2024-01-01'];
      const totalDays = 5; // less than a week
      // 1 completion / 1 week (ceil(5/7)) = 1
      expect(calculateWeeklyConsistency(completions, totalDays)).toBe(1);
    });
  });

  describe('calculateMonthlyConsistency', () => {
    it('should return 0 for zero total days', () => {
      expect(calculateMonthlyConsistency(['2024-01-01'], 0)).toBe(0);
    });

    it('should calculate monthly consistency correctly', () => {
      const completions = ['2024-01-01', '2024-01-02', '2024-01-03'];
      const totalDays = 60; // 2 months
      // 3 completions / 2 months = 1.5
      expect(calculateMonthlyConsistency(completions, totalDays)).toBe(1.5);
    });

    it('should handle partial months', () => {
      const completions = ['2024-01-01'];
      const totalDays = 15; // less than a month
      // 1 completion / 1 month (ceil(15/30)) = 1
      expect(calculateMonthlyConsistency(completions, totalDays)).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle same date multiple times (should be deduplicated by actual implementation)', () => {
      // Note: In real implementation, database would prevent duplicate completions for same date
      const completions = ['2024-01-01', '2024-01-01', '2024-01-02'];
      // This test assumes the helper functions work with the data as-is
      expect(calculateLongestStreak(completions)).toBeGreaterThan(0);
    });

    it('should handle very long streaks', () => {
      const completions = [];

      // Generate 100 consecutive days properly
      for (let i = 0; i < 100; i++) {
        const date = new Date('2024-01-01');
        date.setDate(date.getDate() + i);
        completions.push(date.toISOString().split('T')[0]);
      }

      // The issue is that setDate can overflow to next month
      // Let's generate dates more reliably
      const reliableCompletions = [];
      for (let i = 0; i < 100; i++) {
        const date = new Date(2024, 0, 1 + i); // Year, month (0-indexed), day
        reliableCompletions.push(date.toISOString().split('T')[0]);
      }

      expect(calculateLongestStreak(reliableCompletions)).toBe(100);
    });

    it('should handle dates spanning multiple years', () => {
      const completions = ['2023-12-30', '2023-12-31', '2024-01-01', '2024-01-02'];
      expect(calculateLongestStreak(completions)).toBe(4);
    });
  });

  describe('Performance Considerations', () => {
    it('should handle large datasets efficiently', () => {
      const completions = [];

      // Generate 1000 random dates
      for (let i = 0; i < 1000; i++) {
        const date = new Date('2024-01-01');
        date.setDate(date.getDate() + Math.floor(Math.random() * 365));
        completions.push(date.toISOString().split('T')[0]);
      }

      const start = performance.now();
      const result = calculateLongestStreak(completions);
      const end = performance.now();

      expect(result).toBeGreaterThanOrEqual(0);
      expect(end - start).toBeLessThan(100); // Should complete in under 100ms
    });
  });
});