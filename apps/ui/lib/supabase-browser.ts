import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';

  // In development, use mock client unless Supabase is explicitly enabled
  const isDevelopment = process.env.NODE_ENV === 'development';
  if (isDevelopment && !useSupabase) {
    console.info('Using mock auth client for local development');
    // Return a mock client that simulates logged-in user for development
    return {
      auth: {
        getSession: () => Promise.resolve({
          data: {
            session: {
              access_token: 'mock-token-for-dev',
              user: { id: 'test-user-123', email: 'dev@sakinah.app' }
            }
          },
          error: null
        }),
        getUser: () => Promise.resolve({
          data: {
            user: { id: 'test-user-123', email: 'dev@sakinah.app' }
          },
          error: null
        }),
        signInWithOtp: () => Promise.resolve({ data: {}, error: null }),
        signOut: () => Promise.resolve({ error: null }),
        onAuthStateChange: () => ({ data: { subscription: null }, unsubscribe: () => {} }),
      },
    } as any;
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase environment variables not found, using fallback mock client');
    // Return a minimal mock client
    return {
      auth: {
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
        signInWithOtp: () => Promise.resolve({ data: {}, error: null }),
        signOut: () => Promise.resolve({ error: null }),
        onAuthStateChange: () => ({ data: { subscription: null }, unsubscribe: () => {} }),
      },
    } as any;
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}