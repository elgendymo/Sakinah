import { createClient } from './supabase-browser';

/**
 * Centralized authentication utility for getting auth tokens
 * Handles both Supabase session tokens and development mock tokens
 */
export class AuthUtils {
  private static supabaseClient: any = null;

  private static getSupabaseClient() {
    if (!this.supabaseClient) {
      this.supabaseClient = createClient();
    }
    return this.supabaseClient;
  }

  /**
   * Get authentication token - tries Supabase session first, falls back to mock token for development
   */
  static async getAuthToken(): Promise<string | null> {
    try {
      // Try to get Supabase session first
      const { data: { session } } = await this.getSupabaseClient().auth.getSession();

      if (session?.access_token) {
        return session.access_token;
      }

      // Fallback to mock token for development
      // In browser context, process.env.NODE_ENV may not be available, so check for development indicators
      const isDevelopment = typeof window !== 'undefined' && (
        window.location.hostname === 'localhost' ||
        window.location.hostname.startsWith('127.0.0.1') ||
        process.env.NODE_ENV === 'development'
      );

      if (isDevelopment || process.env.NEXT_PUBLIC_USE_SUPABASE !== 'true') {
        return 'mock-token-for-dev';
      }

      return null;
    } catch (error) {
      console.warn('Error getting auth token:', error);

      // Fallback to mock token for development even on error
      // In browser context, process.env.NODE_ENV may not be available, so check for development indicators
      const isDevelopment = typeof window !== 'undefined' && (
        window.location.hostname === 'localhost' ||
        window.location.hostname.startsWith('127.0.0.1') ||
        process.env.NODE_ENV === 'development'
      );

      if (isDevelopment || process.env.NEXT_PUBLIC_USE_SUPABASE !== 'true') {
        return 'mock-token-for-dev';
      }

      return null;
    }
  }

  /**
   * Get authentication token with guaranteed fallback
   * Always returns a token (mock for development if needed)
   */
  static async getAuthTokenWithFallback(): Promise<string> {
    const token = await this.getAuthToken();
    return token || 'mock-token-for-dev';
  }

  /**
   * Check if user is authenticated (has valid session or is in development mode)
   */
  static async isAuthenticated(): Promise<boolean> {
    const token = await this.getAuthToken();
    return token !== null;
  }

  /**
   * Get user information from Supabase session
   */
  static async getUserInfo() {
    try {
      const { data: { session } } = await this.getSupabaseClient().auth.getSession();
      return session?.user || null;
    } catch (error) {
      console.warn('Error getting user info:', error);
      return null;
    }
  }

  /**
   * Sign out user
   */
  static async signOut() {
    try {
      await this.getSupabaseClient().auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }
}

/**
 * Hook-style function for React components
 */
export const useAuthToken = () => {
  return AuthUtils.getAuthTokenWithFallback();
};

/**
 * Convenience function for API calls
 */
export const withAuth = async <T>(
  apiCall: (token: string) => Promise<T>
): Promise<T> => {
  const token = await AuthUtils.getAuthTokenWithFallback();
  return apiCall(token);
};