'use client';

import { useState, useEffect } from 'react';
import type { SurveyLanguage } from '../types';

interface UseSurveyLanguageReturn {
  language: SurveyLanguage;
  setLanguage: (lang: SurveyLanguage) => void;
  isRTL: boolean;
  toggleLanguage: () => void;
  getLocalizedText: (enText: string, arText: string) => string;
}

export function useSurveyLanguage(initialLanguage: SurveyLanguage = 'en'): UseSurveyLanguageReturn {
  const [language, setLanguage] = useState<SurveyLanguage>(initialLanguage);

  useEffect(() => {
    // Check if there's a saved language preference
    const savedLanguage = localStorage.getItem('sakinah_survey_language') as SurveyLanguage;
    if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'ar')) {
      setLanguage(savedLanguage);
    }

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

  const handleSetLanguage = (lang: SurveyLanguage) => {
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
  };

  const toggleLanguage = () => {
    const newLanguage = language === 'en' ? 'ar' : 'en';
    handleSetLanguage(newLanguage);
  };

  const getLocalizedText = (enText: string, arText: string): string => {
    return language === 'ar' ? arText : enText;
  };

  const isRTL = language === 'ar';

  return {
    language,
    setLanguage: handleSetLanguage,
    isRTL,
    toggleLanguage,
    getLocalizedText
  };
}