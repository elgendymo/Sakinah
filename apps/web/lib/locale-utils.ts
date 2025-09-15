/**
 * Utility functions for locale and RTL management
 */

export type SupportedLocale = 'en' | 'ar';

/**
 * Check if a locale is RTL
 */
export function isRTL(locale: string): boolean {
  return locale === 'ar';
}

/**
 * Get the direction string for a locale
 */
export function getDirection(locale: string): 'rtl' | 'ltr' {
  return isRTL(locale) ? 'rtl' : 'ltr';
}

/**
 * Get appropriate font class for a locale
 */
export function getFontClass(locale: string): string {
  return isRTL(locale) ? 'arabic-body' : '';
}

/**
 * Get appropriate text alignment class for a locale
 */
export function getTextAlignClass(locale: string): string {
  return isRTL(locale) ? 'text-right' : 'text-left';
}

/**
 * Format number with proper locale formatting
 */
export function formatNumber(number: number, locale: string): string {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-US').format(number);
}

/**
 * Format date with proper locale formatting
 */
export function formatDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

/**
 * Get Islamic calendar date for Arabic locale
 */
export function getIslamicDate(date: Date, locale: string): string {
  if (locale === 'ar') {
    try {
      return new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(date);
    } catch {
      // Fallback to regular date if Islamic calendar is not supported
      return formatDate(date, locale);
    }
  }
  return formatDate(date, locale);
}

/**
 * Helper to conditionally apply RTL classes
 */
export function rtlClass(condition: boolean, rtlClass: string, ltrClass: string = ''): string {
  return condition ? rtlClass : ltrClass;
}

/**
 * CSS utility for spacing that respects RTL
 */
export function spacingClass(locale: string, spacing: string): string {
  const isArabic = isRTL(locale);

  // Convert margin/padding classes to RTL-aware versions
  if (spacing.includes('ml-')) {
    return isArabic ? spacing.replace('ml-', 'mr-') : spacing;
  }
  if (spacing.includes('mr-')) {
    return isArabic ? spacing.replace('mr-', 'ml-') : spacing;
  }
  if (spacing.includes('pl-')) {
    return isArabic ? spacing.replace('pl-', 'pr-') : spacing;
  }
  if (spacing.includes('pr-')) {
    return isArabic ? spacing.replace('pr-', 'pl-') : spacing;
  }

  return spacing;
}