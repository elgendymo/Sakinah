/**
 * Authentication helper functions for development and production
 */

export function setMockAuthCookie() {
  if (typeof document !== 'undefined') {
    // Set mock authentication cookie for development
    document.cookie = 'mock-auth=dev-user; path=/; max-age=86400; SameSite=Lax';
    console.log('Mock auth cookie set for development mode');
  }
}

export function clearMockAuthCookie() {
  if (typeof document !== 'undefined') {
    // Clear mock authentication cookie
    document.cookie = 'mock-auth=; path=/; max-age=0';
    console.log('Mock auth cookie cleared');
  }
}

export function setAuthTokens(accessToken: string, refreshToken: string) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }

  if (typeof document !== 'undefined') {
    // Also set as httpOnly-style cookie for middleware
    document.cookie = `auth-token=${accessToken}; path=/; max-age=86400; SameSite=Lax`;
  }
}

export function clearAuthTokens() {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  if (typeof document !== 'undefined') {
    // Clear auth cookie
    document.cookie = 'auth-token=; path=/; max-age=0';
  }
}

export function isDevMode(): boolean {
  // Dev mode = NOT using real Supabase authentication
  // We use Supabase auth when explicitly enabled OR in production
  const forceSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Use real Supabase auth if forced OR in production
  const usingSupabaseAuth = forceSupabase || isProduction;
  
  // Dev mode is when NOT using Supabase auth
  return !usingSupabaseAuth;
}

export function getRedirectUrl(searchParams: URLSearchParams, defaultUrl: string = '/dashboard'): string {
  return searchParams.get('redirectTo') || defaultUrl;
}