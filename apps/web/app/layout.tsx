import type { Metadata } from 'next';
import './globals.css';
import { RTLToggle } from '@sakinah/ui';
import { MotionProvider } from '@/components/motion-provider';
import Navigation from '@/components/Navigation';

export const metadata: Metadata = {
  title: 'Sakinah - Muslim Spiritual Growth Platform',
  description: 'Guide your soul toward inner purification and external righteousness',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning={true}>
      <body className="font-sans antialiased" suppressHydrationWarning={true}>
        <MotionProvider>
          <div className="min-h-screen relative">
            {/* Main Navigation with Logo */}
            <Navigation />

            {/* Development RTL toggle */}
            <div className="fixed top-4 right-4 z-50">
              <RTLToggle />
            </div>

            {children}
          </div>
        </MotionProvider>
      </body>
    </html>
  );
}