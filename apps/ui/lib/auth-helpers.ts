/**
 * Authentication helper functions
 */

export function setAuthTokens(accessToken: string, refreshToken: string) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }

  if (typeof document !== 'undefined') {
    // Set auth token as cookie for middleware
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

export function getRedirectUrl(searchParams: URLSearchParams, defaultUrl: string = '/dashboard'): string {
  return searchParams.get('redirectTo') || defaultUrl;
}