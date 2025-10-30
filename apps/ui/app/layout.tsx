import type { Metadata } from 'next';
import './globals.css';
import { MotionProvider } from '@/components/motion-provider';
import Navigation from '@/components/Navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getLocale } from 'next-intl/server';
import { LanguageProvider } from '@/lib/i18n-context';
import { ErrorBoundaryProvider } from '@/components/ErrorBoundaryProvider';
import { PWARegistration } from '@/components/PWARegistration';

export const metadata: Metadata = {
  title: 'Sakinah - Muslim Spiritual Growth Platform',
  description: 'Guide your soul toward inner purification and external righteousness',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();
  const isRTL = locale === 'ar';

  return (
    <html
      lang={locale}
      dir={isRTL ? 'rtl' : 'ltr'}
      suppressHydrationWarning={true}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        {/* PWA Meta Tags */}
        <meta name="application-name" content="Sakinah" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Sakinah" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-config" content="/icons/browserconfig.xml" />
        <meta name="msapplication-TileColor" content="#059669" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="theme-color" content="#059669" />

        {/* PWA Icons */}
        <link rel="apple-touch-icon" href="/icons/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/icon-16x16.png" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="mask-icon" href="/icons/safari-pinned-tab.svg" color="#059669" />
        <link rel="shortcut icon" href="/favicon.ico" />

        {/* PWA Splash Screens for iOS */}
        <link rel="apple-touch-startup-image" href="/icons/apple-splash-2048-2732.jpg" sizes="2048x2732" />
        <link rel="apple-touch-startup-image" href="/icons/apple-splash-1668-2224.jpg" sizes="1668x2224" />
        <link rel="apple-touch-startup-image" href="/icons/apple-splash-1536-2048.jpg" sizes="1536x2048" />
        <link rel="apple-touch-startup-image" href="/icons/apple-splash-1125-2436.jpg" sizes="1125x2436" />
        <link rel="apple-touch-startup-image" href="/icons/apple-splash-1242-2208.jpg" sizes="1242x2208" />
        <link rel="apple-touch-startup-image" href="/icons/apple-splash-750-1334.jpg" sizes="750x1334" />
        <link rel="apple-touch-startup-image" href="/icons/apple-splash-828-1792.jpg" sizes="828x1792" />
      </head>
      <body
        className={`font-sans antialiased ${isRTL ? 'rtl arabic-body' : 'ltr'}`}
        suppressHydrationWarning={true}
      >
        <NextIntlClientProvider messages={messages} locale={locale}>
          <LanguageProvider>
            <ErrorBoundaryProvider>
              <MotionProvider>
                <PWARegistration />
                <div className="min-h-screen relative">
                  {/* Main Navigation with Logo and integrated language switcher */}
                  <Navigation />

                  {children}
                </div>
              </MotionProvider>
            </ErrorBoundaryProvider>
          </LanguageProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}