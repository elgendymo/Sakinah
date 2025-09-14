'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Languages } from 'lucide-react';
import LogoCSS from './LogoCSS';

interface NavigationProps {
  className?: string;
}

const Navigation: React.FC<NavigationProps> = ({ className = '' }) => {
  const pathname = usePathname();

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: '🏠' },
    { href: '/habits', label: 'Habits', icon: '🌱' },
    { href: '/journal', label: 'Journal', icon: '📝' },
    { href: '/content', label: 'Library', icon: '📚' },
    { href: '/tazkiyah', label: 'Tazkiyah', icon: '✨' },
    { href: '/profile', label: 'Profile', icon: '👤' },
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
                <span className="text-xs text-gold-600 -mt-1">Your sanctuary</span>
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

              {/* RTL Toggle Button */}
              <div className="flex items-center">
                <button
                  onClick={() => {
                    const newDirection = document.documentElement.dir === 'ltr' ? 'rtl' : 'ltr';
                    document.documentElement.dir = newDirection;
                    document.documentElement.lang = newDirection === 'rtl' ? 'ar' : 'en';
                  }}
                  className="rtl-toggle-btn w-10 h-10"
                  title="Toggle RTL/LTR layout"
                >
                  <Languages className="h-4 w-4" />
                </button>
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
              <span className="text-xs text-gold-600 -mt-0.5">Your sanctuary</span>
            </div>
          </Link>

          {/* RTL Toggle Button */}
          <button
            onClick={() => {
              const newDirection = document.documentElement.dir === 'ltr' ? 'rtl' : 'ltr';
              document.documentElement.dir = newDirection;
              document.documentElement.lang = newDirection === 'rtl' ? 'ar' : 'en';
            }}
            className="rtl-toggle-btn w-9 h-9"
            title="Toggle RTL/LTR layout"
          >
            <Languages className="h-3.5 w-3.5" />
          </button>
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
