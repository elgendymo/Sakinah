import { ReactNode } from 'react';

interface PageContainerProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '6xl' | 'full';
  padding?: 'sm' | 'md' | 'lg' | 'xl';
  center?: boolean;
  className?: string;
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  '2xl': 'max-w-6xl',
  '4xl': 'max-w-7xl',
  '6xl': 'max-w-screen-2xl',
  full: 'max-w-none',
};

const paddingClasses = {
  sm: 'px-4 py-6',
  md: 'px-4 sm:px-6 py-8',
  lg: 'px-4 sm:px-6 lg:px-8 py-8 lg:py-12',
  xl: 'px-4 sm:px-6 lg:px-8 py-12 lg:py-16',
};

export default function PageContainer({
  children,
  title,
  subtitle,
  maxWidth = 'xl',
  padding = 'lg',
  center = true,
  className = '',
}: PageContainerProps) {
  return (
    <div className="min-h-screen islamic-gradient islamic-pattern">
      <div className={`
        container mx-auto
        ${maxWidthClasses[maxWidth]}
        ${paddingClasses[padding]}
        ${center ? 'text-center' : ''}
        ${className}
      `}>
        {/* Page Header */}
        {(title || subtitle) && (
          <div className={`mb-8 sm:mb-12 ${center ? 'text-center' : ''}`}>
            {title && (
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-sage-900 mb-2 sm:mb-3">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="text-base sm:text-lg text-sage-600 max-w-2xl mx-auto leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
        )}

        {/* Page Content */}
        <div className={center ? 'text-left' : ''}>
          {children}
        </div>
      </div>

      {/* Decorative Bottom Pattern */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500/20 via-gold-500/20 to-emerald-500/20"></div>
    </div>
  );
}