import { NextRequest, NextResponse } from 'next/server';

export default function middleware(request: NextRequest) {
  // Get locale from cookie or detect from headers
  const cookieLocale = request.cookies.get('locale')?.value;
  const acceptLanguage = request.headers.get('accept-language') || '';

  // Determine the locale
  let locale = 'en';
  if (cookieLocale && ['en', 'ar'].includes(cookieLocale)) {
    locale = cookieLocale;
  } else if (acceptLanguage.includes('ar')) {
    locale = 'ar';
  }

  // Create response
  const response = NextResponse.next();

  // Set locale cookie and headers
  response.cookies.set('locale', locale, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365 // 1 year
  });

  response.headers.set('x-locale', locale);

  return response;
}

export const config = {
  // Skip API routes and static files
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
};