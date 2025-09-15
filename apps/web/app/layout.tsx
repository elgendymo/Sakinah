import type { Metadata } from 'next';
import './globals.css';
import { MotionProvider } from '@/components/motion-provider';
import Navigation from '@/components/Navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getLocale } from 'next-intl/server';
import { LanguageProvider } from '@/lib/i18n-context';

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
          <title></title>
      </head>
      <body
        className={`font-sans antialiased ${isRTL ? 'rtl arabic-body' : 'ltr'}`}
        suppressHydrationWarning={true}
      >
        <NextIntlClientProvider messages={messages} locale={locale}>
          <LanguageProvider>
            <MotionProvider>
              <div className="min-h-screen relative">
                {/* Main Navigation with Logo and integrated language switcher */}
                <Navigation />

                {children}
              </div>
            </MotionProvider>
          </LanguageProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}