'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import {
  Email,
  AutoAwesome,
  Build,
  Warning,
  CheckCircle,
  PersonAdd
} from '@mui/icons-material';
import Link from 'next/link';

function SignupForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isDevelopment, setIsDevelopment] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    const isDev = process.env.NODE_ENV === 'development' &&
                  process.env.NEXT_PUBLIC_USE_SUPABASE !== 'true';
    setIsDevelopment(isDev);

    if (isDev) {
      setEmail('dev@sakinah.app');
    }

    const error = searchParams.get('error');
    if (error) {
      const errorMessages = {
        auth_error: 'Authentication failed. Please try again.',
        auth_exception: 'An authentication error occurred. Please try again.',
        no_code: 'Invalid authentication link. Please request a new one.',
      };
      setMessage(errorMessages[error as keyof typeof errorMessages] || 'An error occurred during authentication.');
    }
  }, [searchParams]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (isDevelopment) {
        setMessage('Development mode: Creating account...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        router.push('/onboarding');
        return;
      }

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            isNewUser: true
          }
        },
      });

      if (error) throw error;

      setMessage('Check your email for the signup link! Click it to complete your registration.');
    } catch (error: any) {
      setMessage(error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center islamic-gradient islamic-pattern">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-emerald-200/20 rounded-full blur-2xl"></div>
        <div className="absolute bottom-1/3 right-1/4 w-40 h-40 bg-gold-200/20 rounded-full blur-2xl"></div>
        <div className="absolute top-1/2 right-1/3 w-24 h-24 bg-sage-200/20 rounded-full blur-xl"></div>
      </div>

      <div className="relative w-full max-w-md mx-auto px-4">
        <div className="relative overflow-hidden">
          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-200/50 via-gold-200/50 to-emerald-200/50 rounded-2xl blur-sm"></div>

          <div className="relative bg-white/95 backdrop-blur-sm rounded-2xl border border-emerald-100/50 shadow-2xl overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-gold-400 to-emerald-400"></div>

            <div className="p-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <PersonAdd sx={{ color: 'white', fontSize: 32 }} />
                </div>

                <h1 className="text-2xl font-bold text-sage-800 mb-2">
                  Join Sakinah
                </h1>
                <p className="text-sage-600 text-sm leading-relaxed">
                  Begin your spiritual journey today
                </p>
              </div>

              <form onSubmit={handleSignup} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-sage-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full px-4 py-3 bg-white border border-sage-200 rounded-xl focus:ring-2 focus:ring-emerald-300/50 focus:border-emerald-300 transition-all duration-200 text-sage-800 placeholder-sage-400"
                      placeholder="Enter your email"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <Email sx={{ color: '#6b7280', fontSize: 20 }} />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 px-6 rounded-xl font-medium transition-all duration-200 shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                      <span>{isDevelopment ? 'Creating account...' : 'Sending...'}</span>
                    </>
                  ) : (
                    <>
                      <span>{isDevelopment ? 'Create Account (Dev Mode)' : 'Create Account'}</span>
                      <AutoAwesome sx={{ fontSize: 18 }} />
                    </>
                  )}
                </button>
              </form>

              {isDevelopment && (
                <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200/50">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Build sx={{ color: '#2563eb', fontSize: 20 }} />
                    <span className="font-medium text-blue-800">Development Mode</span>
                  </div>
                  <p className="text-sm text-blue-700 text-center leading-relaxed">
                    Click the button above to create account with mock authentication
                  </p>
                </div>
              )}

              {message && (
                <div className={`mt-6 p-4 rounded-xl text-center ${
                  message.includes('error') || message.includes('failed') || message.includes('Invalid')
                    ? 'bg-gradient-to-r from-red-50 to-rose-50 border border-red-200/50 text-red-700'
                    : 'bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200/50 text-emerald-700'
                }`}>
                  <div className="flex items-center justify-center gap-2 mb-1">
                    {message.includes('error') || message.includes('failed') || message.includes('Invalid') ? (
                      <Warning sx={{ fontSize: 20 }} />
                    ) : (
                      <CheckCircle sx={{ fontSize: 20 }} />
                    )}
                    <span className="font-medium">{message.includes('error') || message.includes('failed') || message.includes('Invalid') ? 'Error' : 'Success'}</span>
                  </div>
                  <p className="text-sm leading-relaxed">{message}</p>
                </div>
              )}

              <div className="mt-8 pt-6 border-t border-sage-100 text-center">
                <p className="text-sm text-sage-600 mb-3">
                  Already have an account?{' '}
                  <Link
                    href="/login"
                    className="text-emerald-600 hover:text-emerald-700 font-medium underline decoration-emerald-300 underline-offset-2"
                  >
                    Sign in
                  </Link>
                </p>
                {!isDevelopment ? (
                  <div className="space-y-2">
                    <p className="text-xs text-sage-500">
                      No password needed | Secure passwordless authentication
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-sage-500">
                    Development mode active | Real authentication disabled for testing
                  </p>
                )}
              </div>

              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-300/30 to-transparent"></div>
            </div>
          </div>
        </div>

        <div className="text-center mt-6">
          <p className="text-sm text-sage-600/80 italic">
            "And it is in the remembrance of Allah that hearts find rest."
          </p>
          <p className="text-xs text-sage-500 mt-1">— Quran 13:28</p>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center islamic-gradient islamic-pattern">
        <div className="relative w-full max-w-md mx-auto px-4">
          <div className="relative overflow-hidden">
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-200/50 via-gold-200/50 to-emerald-200/50 rounded-2xl blur-sm"></div>
            <div className="relative bg-white/95 backdrop-blur-sm rounded-2xl border border-emerald-100/50 shadow-2xl overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-gold-400 to-emerald-400"></div>
              <div className="p-8">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <PersonAdd sx={{ color: 'white', fontSize: 32 }} />
                  </div>
                  <h1 className="text-2xl font-bold text-sage-800 mb-2">Loading...</h1>
                </div>
                <div className="animate-pulse space-y-6">
                  <div className="h-12 bg-sage-200 rounded-xl"></div>
                  <div className="h-12 bg-emerald-200 rounded-xl"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    }>
      <SignupForm />
    </Suspense>
  );
}