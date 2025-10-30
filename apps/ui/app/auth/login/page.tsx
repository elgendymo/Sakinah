'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  AccountBalance,
  Email,
  AutoAwesome,
  Warning,
  CheckCircle,
  ArrowBack
} from '@mui/icons-material';
import AnimatedButton from '@/components/ui/AnimatedButton';
import { setAuthTokens, getRedirectUrl } from '@/lib/auth-helpers';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check for error messages from auth callback
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

  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    setMessage('');

    // Validation
    if (!email.trim()) {
      setMessage('Please enter your email');
      setLoading(false);
      return;
    }

    if (!password) {
      setMessage('Please enter your password');
      setLoading(false);
      return;
    }

    try {
      // Call the login API endpoint
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Login failed');
      }

      // Success - store tokens and redirect
      if (result.data.accessToken) {
        setAuthTokens(result.data.accessToken, result.data.refreshToken);
      }

      setMessage('Login successful! Redirecting...');

      const redirectTo = getRedirectUrl(searchParams, '/dashboard');
      console.log('Login successful: redirecting to', redirectTo);

      setTimeout(() => {
        window.location.href = redirectTo;
      }, 500);

    } catch (error: any) {
      setMessage(error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center islamic-gradient islamic-pattern">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-emerald-200/20 rounded-full blur-2xl"></div>
        <div className="absolute bottom-1/3 right-1/4 w-40 h-40 bg-gold-200/20 rounded-full blur-2xl"></div>
        <div className="absolute top-1/2 right-1/3 w-24 h-24 bg-sage-200/20 rounded-full blur-xl"></div>
      </div>

      <div className="relative w-full max-w-md mx-auto px-4">
        {/* Login Card */}
        <div className="relative overflow-hidden">
          {/* Card glow effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-200/50 via-gold-200/50 to-emerald-200/50 rounded-2xl blur-sm"></div>

          <div className="relative bg-white/95 backdrop-blur-sm rounded-2xl border border-emerald-100/50 shadow-2xl overflow-hidden">
            {/* Top accent bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-gold-400 to-emerald-400"></div>

            <div className="p-8">
              {/* Back Button */}
              <div className="mb-6">
                <Link href="/">
                  <AnimatedButton
                    variant="outline"
                    size="sm"
                    icon={<ArrowBack sx={{ fontSize: 16 }} />}
                    iconPosition="left"
                    className="border-sage-300 text-sage-600 hover:bg-sage-50"
                  >
                    Back to Home
                  </AnimatedButton>
                </Link>
              </div>

              {/* Header */}
              <div className="text-center mb-8">
                {/* Logo placeholder */}
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <AccountBalance sx={{ color: 'white', fontSize: 32 }} />
                </div>

                <h1 className="text-2xl font-bold text-sage-800 mb-2">
                  Welcome to Sakinah
                </h1>
                <p className="text-sage-600 text-sm leading-relaxed">
                  Your sanctuary for spiritual growth
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleLogin} className="space-y-6">
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

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-sage-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full px-4 py-3 bg-white border border-sage-200 rounded-xl focus:ring-2 focus:ring-emerald-300/50 focus:border-emerald-300 transition-all duration-200 text-sage-800 placeholder-sage-400"
                      placeholder="Enter your password"
                    />
                  </div>
                </div>

                <AnimatedButton
                  disabled={loading}
                  loading={loading}
                  variant="primary"
                  size="lg"
                  className="w-full"
                  icon={<AutoAwesome sx={{ fontSize: 18 }} />}
                  onClick={() => {
                    handleLogin();
                  }}
                >
                  Sign In
                </AnimatedButton>
              </form>

              {/* Message Display */}
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

              {/* Footer Information */}
              <div className="mt-8 pt-6 border-t border-sage-100 text-center">
                <p className="text-sm text-sage-600 mb-3">
                  Don't have an account?{' '}
                  <Link
                    href="/signup"
                    className="text-emerald-600 hover:text-emerald-700 font-medium underline decoration-emerald-300 underline-offset-2"
                  >
                    Sign up
                  </Link>
                </p>
                <div className="space-y-2">
                  <p className="text-xs text-sage-500">
                    Secure email and password authentication | Privacy-focused platform
                  </p>
                </div>
              </div>

              {/* Decorative bottom element */}
              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-300/30 to-transparent"></div>
            </div>
          </div>
        </div>

        {/* Bottom tagline */}
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

export default function LoginPage() {
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
                    <AccountBalance sx={{ color: 'white', fontSize: 32 }} />
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
      <LoginForm />
    </Suspense>
  );
}