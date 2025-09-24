'use client';

import React, { useState } from 'react';
import { useLocale } from 'next-intl';
import { Languages, Globe } from 'lucide-react';

interface LanguageSwitcherProps {
  variant?: 'icon' | 'text' | 'dropdown';
  className?: string;
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  variant = 'icon',
  className = ''
}) => {
  const currentLocale = useLocale();
  const [isOpen, setIsOpen] = useState(false);

  const languages = [
    { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
    { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' }
  ];

  const currentLanguage = languages.find(lang => lang.code === currentLocale) || languages[0];

  const switchLanguage = (localeCode: string) => {
    const newDirection = localeCode === 'ar' ? 'rtl' : 'ltr';

    // Update document attributes immediately
    document.documentElement.dir = newDirection;
    document.documentElement.lang = localeCode;

    // Set cookie for persistence
    document.cookie = `locale=${localeCode}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;

    // Add appropriate body classes
    if (localeCode === 'ar') {
      document.body.classList.add('rtl', 'arabic-body');
      document.body.classList.remove('ltr');
    } else {
      document.body.classList.add('ltr');
      document.body.classList.remove('rtl', 'arabic-body');
    }

    // Close dropdown
    setIsOpen(false);

    // Reload to apply new locale
    window.location.reload();
  };

  if (variant === 'icon') {
    return (
      <button
        onClick={() => switchLanguage(currentLocale === 'ar' ? 'en' : 'ar')}
        className={`rtl-toggle-btn w-10 h-10 ${className}`}
        title={currentLocale === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
        aria-label="Toggle language"
      >
        <Languages className="h-4 w-4" />
      </button>
    );
  }

  if (variant === 'text') {
    return (
      <button
        onClick={() => switchLanguage(currentLocale === 'ar' ? 'en' : 'ar')}
        className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all hover:bg-emerald-50 text-emerald-700 ${className}`}
      >
        <span className="text-lg">{currentLanguage.flag}</span>
        <span>{currentLanguage.nativeName}</span>
      </button>
    );
  }

  if (variant === 'dropdown') {
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all hover:bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-pointer z-30 relative"
          type="button"
        >
          <Globe className="h-4 w-4" />
          <span className="text-lg">{currentLanguage.flag}</span>
          <span className="hidden sm:block">{currentLanguage.nativeName}</span>
          <svg
            className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={(e) => {
                e.preventDefault();
                setIsOpen(false);
              }}
            />

            {/* Dropdown */}
            <div className="absolute top-full mt-2 right-0 bg-white rounded-lg shadow-xl border border-emerald-100 z-50 min-w-[200px]">
              {languages.map((language) => (
                <button
                  key={language.code}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    switchLanguage(language.code);
                  }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 text-sm hover:bg-emerald-50 transition-colors first:rounded-t-lg last:rounded-b-lg cursor-pointer ${
                    currentLocale === language.code
                      ? 'bg-emerald-50 text-emerald-700 font-medium'
                      : 'text-gray-700'
                  }`}
                  type="button"
                >
                  <span className="text-lg">{language.flag}</span>
                  <div className="flex-1 text-left">
                    <div className="font-medium">{language.nativeName}</div>
                    <div className="text-xs text-gray-500">{language.name}</div>
                  </div>
                  {currentLocale === language.code && (
                    <svg className="h-4 w-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  return null;
};

export default LanguageSwitcher;