import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  // Check if we're in development mode
  const isDevelopment = process.env.NODE_ENV === 'development' &&
                        process.env.NEXT_PUBLIC_USE_SUPABASE !== 'true';

  if (isDevelopment) {
    // Development mode - just redirect to dashboard
    console.log('Auth callback: Development mode, redirecting to dashboard');
    return NextResponse.redirect(new URL('/dashboard', requestUrl.origin));
  }

  // Production mode - handle Supabase auth code exchange
  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error('Auth callback error:', error);
        return NextResponse.redirect(new URL('/login?error=auth_error', requestUrl.origin));
      }
    } catch (error) {
      console.error('Auth callback exception:', error);
      return NextResponse.redirect(new URL('/login?error=auth_exception', requestUrl.origin));
    }
  } else {
    // No code provided in production mode
    return NextResponse.redirect(new URL('/login?error=no_code', requestUrl.origin));
  }

  // Redirect to dashboard after successful login
  return NextResponse.redirect(new URL('/dashboard', requestUrl.origin));
}