'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { SurveyLanguage } from '../types';
import enTranslations from '../../../lib/localization/en.json';
import arTranslations from '../../../lib/localization/ar.json';

interface UseSurveyLanguageReturn {
  language: SurveyLanguage;
  setLanguage: (lang: SurveyLanguage) => void;
  isRTL: boolean;
  toggleLanguage: () => void;
  getLocalizedText: (enText: string, arText: string) => string;
  t: (key: string, variables?: Record<string, string | number>) => string;
  translations: any;
}

export function useSurveyLanguage(initialLanguage: SurveyLanguage = 'en'): UseSurveyLanguageReturn {
  // Initialize state with localStorage value immediately, no useEffect needed
  const [language, setLanguage] = useState<SurveyLanguage>(() => {
    if (typeof window !== 'undefined') {
      const savedLanguage = localStorage.getItem('sakinah_survey_language') as SurveyLanguage;
      if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'ar')) {
        return savedLanguage;
      }
    }
    return initialLanguage;
  });

  // Update document attributes when language changes
  useEffect(() => {
    // Set document direction
    const html = document.documentElement;
    html.setAttribute('lang', language);
    html.setAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');

    // Apply global RTL class if needed
    if (language === 'ar') {
      document.body.classList.add('rtl');
    } else {
      document.body.classList.remove('rtl');
    }
  }, [language]);

  const handleSetLanguage = useCallback((lang: SurveyLanguage) => {
    setLanguage(lang);
    localStorage.setItem('sakinah_survey_language', lang);

    // Update document attributes immediately
    const html = document.documentElement;
    html.setAttribute('lang', lang);
    html.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');

    // Update body class
    if (lang === 'ar') {
      document.body.classList.add('rtl');
    } else {
      document.body.classList.remove('rtl');
    }
  }, []);

  const toggleLanguage = useCallback(() => {
    const newLanguage = language === 'en' ? 'ar' : 'en';
    handleSetLanguage(newLanguage);
  }, [language, handleSetLanguage]);

  const getLocalizedText = useCallback((enText: string, arText: string): string => {
    return language === 'ar' ? arText : enText;
  }, [language]);

  // Translation function using JSON files
  const t = useCallback((key: string): string => {
    const translations = language === 'ar' ? arTranslations : enTranslations;
    const keys = key.split('.');
    let result: any = translations;

    for (const k of keys) {
      if (result && typeof result === 'object' && k in result) {
        result = result[k];
      } else {
        return key; // Return key as fallback if not found
      }
    }

    return typeof result === 'string' ? result : key;
  }, [language]);

  const isRTL = useMemo(() => language === 'ar', [language]);

  // Translations object using JSON files
  const translations = useMemo(() => {
    return language === 'ar' ? arTranslations : enTranslations;
  }, [language]);

  return {
    language,
    setLanguage: handleSetLanguage,
    isRTL,
    toggleLanguage,
    getLocalizedText,
    t,
    translations
  };
}