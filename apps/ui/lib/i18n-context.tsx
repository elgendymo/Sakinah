'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useLocale } from 'next-intl';

type Locale = 'en' | 'ar';

interface LanguageContextType {
  locale: Locale;
  isRTL: boolean;
  switchLanguage: (locale: Locale) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const currentLocale = useLocale() as Locale;
  const [locale, setLocale] = useState<Locale>(currentLocale);
  const isRTL = locale === 'ar';

  const switchLanguage = async (newLocale: Locale) => {
    setLocale(newLocale);

    // Update document attributes
    document.documentElement.dir = newLocale === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = newLocale;

    // Set cookie for persistence
    document.cookie = `locale=${newLocale}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;

    // Add/remove RTL class to body
    if (newLocale === 'ar') {
      document.body.classList.add('rtl', 'arabic-body');
      document.body.classList.remove('ltr');
    } else {
      document.body.classList.add('ltr');
      document.body.classList.remove('rtl', 'arabic-body');
    }

    // Reload page to apply new locale
    window.location.reload();
  };

  // Simple translation function - in a real app this would use next-intl
  const t = (key: string) => {
    // This is a placeholder - the actual translation will be handled by next-intl
    return key;
  };

  useEffect(() => {
    // Set initial classes based on locale
    if (locale === 'ar') {
      document.body.classList.add('rtl', 'arabic-body');
      document.body.classList.remove('ltr');
    } else {
      document.body.classList.add('ltr');
      document.body.classList.remove('rtl', 'arabic-body');
    }
  }, [locale]);

  const contextValue: LanguageContextType = {
    locale,
    isRTL,
    switchLanguage,
    t,
  };

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

export function useDirection() {
  const { isRTL } = useLanguage();
  return isRTL ? 'rtl' : 'ltr';
}

export function useIsRTL() {
  const { isRTL } = useLanguage();
  return isRTL;
}