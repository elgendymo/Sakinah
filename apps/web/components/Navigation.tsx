'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import LogoCSS from './LogoCSS';
import LanguageSwitcher from './LanguageSwitcher';

interface NavigationProps {
  className?: string;
}

const Navigation: React.FC<NavigationProps> = ({ className = '' }) => {
  const pathname = usePathname();
  const t = useTranslations('navigation');

  const navItems = [
    { href: '/dashboard', label: t('dashboard'), icon: '🏠' },
    { href: '/habits', label: t('habits'), icon: '🌱' },
    { href: '/journal', label: t('journal'), icon: '📝' },
    { href: '/content', label: t('library'), icon: '📚' },
    { href: '/tazkiyah', label: t('tazkiyah'), icon: '✨' },
    { href: '/profile', label: t('profile'), icon: '👤' },
  ];

  return (
    <>
      {/* Desktop Navigation Header */}
      <nav className={`hidden md:block bg-white/95 backdrop-blur-sm shadow-sm border-b border-emerald-100/50 ${className}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Brand */}
            <Link href="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
              <LogoCSS size="small" animated={true} />
              <div className="flex flex-col">
                <span className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-700 bg-clip-text text-transparent">Sakinah</span>
                <span className="text-xs text-gold-600 -mt-1">{t('subtitle') || 'Your sanctuary'}</span>
              </div>
            </Link>

            <div className="flex items-center space-x-8">
              {/* Desktop Navigation */}
              <div className="flex space-x-8">
                {navItems.map((item) => {
                  const isActive = pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-emerald-50 to-emerald-100/50 text-emerald-700 border border-emerald-200/50 shadow-sm'
                          : 'text-sage-600 hover:text-emerald-600 hover:bg-emerald-50/50'
                      }`}
                    >
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>

              {/* Language Switcher */}
              <div className="flex items-center">
                <LanguageSwitcher variant="text" />
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Header - Simple with Logo and RTL Toggle */}
      <header className="md:hidden bg-white/95 backdrop-blur-sm shadow-sm border-b border-emerald-100/50 relative z-40">
        <div className="px-4 h-14 flex justify-between items-center">
          {/* Logo and Brand */}
          <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
            <LogoCSS size="small" animated={true} />
            <div className="flex flex-col">
              <span className="text-lg font-bold bg-gradient-to-r from-emerald-600 to-emerald-700 bg-clip-text text-transparent">Sakinah</span>
              <span className="text-xs text-gold-600 -mt-0.5">{t('subtitle') || 'Your sanctuary'}</span>
            </div>
          </Link>

          {/* Language Switcher */}
          <LanguageSwitcher variant="text" className="text-xs" />
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden mobile-bottom-nav">
        <div className="px-2 py-2">
          <div className="flex justify-around items-center">
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`mobile-nav-item ${isActive ? 'active' : 'inactive'}`}
                >
                  <span className="mobile-nav-icon hover:scale-110">{item.icon}</span>
                  <span className={`mobile-nav-label ${isActive ? 'font-semibold' : ''}`}>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Mobile content spacer to prevent bottom nav overlap */}
      <div className="md:hidden mobile-content-spacer"></div>
    </>
  );
};

export default Navigation;
