'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Email,
  AutoAwesome,
  Build,
  Warning,
  CheckCircle,
  PersonAdd
} from '@mui/icons-material';
import Link from 'next/link';
import { setMockAuthCookie, isDevMode } from '@/lib/auth-helpers';

function SignupForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | ''>('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isDevelopment, setIsDevelopment] = useState(false);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    const isDev = isDevMode();
    setIsDevelopment(isDev);

    if (isDev) {
      setEmail('dev@sakinah.app');
      setFirstName('Dev User');
      setGender('male');
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

    // Trigger form animation after mount
    setTimeout(() => setIsFormVisible(true), 100);
  }, [searchParams]);

  const handleSignup = async (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault();
    setLoading(true);
    setMessage('');

    // Validation
    if (!firstName.trim()) {
      setMessage('Please enter your first name');
      setLoading(false);
      return;
    }

    if (!email.trim()) {
      setMessage('Please enter your email');
      setLoading(false);
      return;
    }

    if (!password || password.length < 8) {
      setMessage('Password must be at least 8 characters long');
      setLoading(false);
      return;
    }

    if (!gender) {
      setMessage('Please select your gender');
      setLoading(false);
      return;
    }

    try {
      if (isDevelopment) {
        setMessage('Development mode: Creating account...');

        // Set mock authentication cookie for middleware
        setMockAuthCookie();

        await new Promise(resolve => setTimeout(resolve, 500));

        console.log('Development signup: redirecting to /onboarding/welcome');
        window.location.href = '/onboarding/welcome';
        return;
      }

      // Call the new signup API endpoint
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          firstName,
          gender
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Signup failed');
      }

      // Success - redirect to onboarding
      setMessage('Account created successfully! Redirecting...');
      setTimeout(() => {
        window.location.href = '/onboarding/welcome';
      }, 500);

    } catch (error: any) {
      setMessage(error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center islamic-gradient islamic-pattern">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-emerald-200/20 rounded-full blur-2xl animate-float"></div>
        <div className="absolute bottom-1/3 right-1/4 w-40 h-40 bg-gold-200/20 rounded-full blur-2xl animate-float-delayed"></div>
        <div className="absolute top-1/2 right-1/3 w-24 h-24 bg-sage-200/20 rounded-full blur-xl animate-float-slow"></div>
      </div>

      <div className={`relative w-full max-w-md mx-auto px-4 transition-all duration-1000 transform ${
        isFormVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
      }`}>
        <div className="relative overflow-hidden">
          {/* Animated glow effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-200/50 via-gold-200/50 to-emerald-200/50 rounded-2xl blur-sm animate-pulse-slow"></div>

          <div className="relative bg-white/95 backdrop-blur-sm rounded-2xl border border-emerald-100/50 shadow-2xl overflow-hidden">
            {/* Animated top accent bar */}
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-gold-400 to-emerald-400 transition-all duration-1000 origin-left ${
              isFormVisible ? 'scale-x-100' : 'scale-x-0'
            }`}></div>

            <div className="p-8">
              {/* Header with staggered animation */}
              <div className="text-center mb-8">
                <div className={`w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg transition-all duration-700 transform ${
                  isFormVisible ? 'scale-100 rotate-0' : 'scale-0 -rotate-180'
                }`}>
                  <PersonAdd sx={{ color: 'white', fontSize: 32 }} />
                </div>

                <h1 className={`text-2xl font-bold text-sage-800 mb-2 transition-all duration-700 delay-100 transform ${
                  isFormVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}>
                  Join Sakinah
                </h1>
                <p className={`text-sage-600 text-sm leading-relaxed transition-all duration-700 delay-200 transform ${
                  isFormVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}>
                  Begin your spiritual journey today
                </p>
              </div>

              {/* Form with staggered animation */}
              <form onSubmit={handleSignup} className="space-y-5">
                {/* First Name Field */}
                <div className={`transition-all duration-700 delay-300 transform ${
                  isFormVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}>
                  <label htmlFor="firstName" className="block text-sm font-medium text-sage-700 mb-2">
                    First Name
                  </label>
                  <div className="relative">
                    <input
                      id="firstName"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      className="w-full px-4 py-3 bg-white border border-sage-200 rounded-xl focus:ring-2 focus:ring-emerald-300/50 focus:border-emerald-300 transition-all duration-200 text-sage-800 placeholder-sage-400 focus:scale-[1.02]"
                      placeholder="Enter your first name"
                    />
                  </div>
                </div>

                {/* Gender Field */}
                <div className={`transition-all duration-700 delay-350 transform ${
                  isFormVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}>
                  <label htmlFor="gender" className="block text-sm font-medium text-sage-700 mb-2">
                    Gender
                  </label>
                  <select
                    id="gender"
                    value={gender}
                    onChange={(e) => setGender(e.target.value as 'male' | 'female')}
                    required
                    className="w-full px-4 py-3 bg-white border border-sage-200 rounded-xl focus:ring-2 focus:ring-emerald-300/50 focus:border-emerald-300 transition-all duration-200 text-sage-800 focus:scale-[1.02]"
                  >
                    <option value="">Select your gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>

                {/* Email Field */}
                <div className={`transition-all duration-700 delay-400 transform ${
                  isFormVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}>
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
                      className="w-full px-4 py-3 bg-white border border-sage-200 rounded-xl focus:ring-2 focus:ring-emerald-300/50 focus:border-emerald-300 transition-all duration-200 text-sage-800 placeholder-sage-400 focus:scale-[1.02]"
                      placeholder="Enter your email"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <Email sx={{ color: '#6b7280', fontSize: 20 }} />
                    </div>
                  </div>
                </div>

                {/* Password Field */}
                <div className={`transition-all duration-700 delay-450 transform ${
                  isFormVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}>
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
                      minLength={8}
                      className="w-full px-4 py-3 bg-white border border-sage-200 rounded-xl focus:ring-2 focus:ring-emerald-300/50 focus:border-emerald-300 transition-all duration-200 text-sage-800 placeholder-sage-400 focus:scale-[1.02]"
                      placeholder="Enter your password (min 8 characters)"
                    />
                  </div>
                </div>

                <div className={`transition-all duration-700 delay-500 transform ${
                  isFormVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 px-6 rounded-xl font-medium transition-all duration-200 shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                        <span>Loading...</span>
                      </>
                    ) : (
                      <>
                        <span>{isDevelopment ? 'Create Account (Dev Mode)' : 'Create Account'}</span>
                        <AutoAwesome sx={{ fontSize: 18 }} />
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Development Mode Notice */}
              {isDevelopment && (
                <div className={`mt-6 p-4 rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200/50 transition-all duration-700 delay-500 transform ${
                  isFormVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}>
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Build sx={{ color: '#2563eb', fontSize: 20 }} className="animate-spin-slow" />
                    <span className="font-medium text-blue-800">Development Mode</span>
                  </div>
                  <p className="text-sm text-blue-700 text-center leading-relaxed">
                    Click the button above to create account with mock authentication
                  </p>
                </div>
              )}

              {/* Message Display */}
              {message && (
                <div className={`mt-6 p-4 rounded-xl text-center transition-all duration-500 transform animate-bounce-in ${
                  message.includes('error') || message.includes('failed') || message.includes('Invalid')
                    ? 'bg-gradient-to-r from-red-50 to-rose-50 border border-red-200/50 text-red-700'
                    : 'bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200/50 text-emerald-700'
                }`}>
                  <div className="flex items-center justify-center gap-2 mb-1">
                    {message.includes('error') || message.includes('failed') || message.includes('Invalid') ? (
                      <Warning sx={{ fontSize: 20 }} />
                    ) : (
                      <CheckCircle sx={{ fontSize: 20 }} className="animate-pulse" />
                    )}
                    <span className="font-medium">{message.includes('error') || message.includes('failed') || message.includes('Invalid') ? 'Error' : 'Success'}</span>
                  </div>
                  <p className="text-sm leading-relaxed">{message}</p>
                </div>
              )}

              {/* Footer Information */}
              <div className={`mt-8 pt-6 border-t border-sage-100 text-center transition-all duration-700 delay-600 transform ${
                isFormVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}>
                <p className="text-sm text-sage-600 mb-3">
                  Already have an account?{' '}
                  <Link
                    href="/auth/login"
                    className="text-emerald-600 hover:text-emerald-700 font-medium underline decoration-emerald-300 underline-offset-2 transition-colors hover:scale-105 inline-block"
                  >
                    Sign in
                  </Link>
                </p>
                {!isDevelopment ? (
                  <div className="space-y-2">
                    <p className="text-xs text-sage-500">
                      Secure email and password authentication | Privacy-focused platform
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-sage-500">
                    Development mode active | Real authentication disabled for testing
                  </p>
                )}
              </div>

              {/* Animated bottom line */}
              <div className={`absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-300/30 to-transparent transition-all duration-1000 origin-center ${
                isFormVisible ? 'scale-x-100' : 'scale-x-0'
              }`}></div>
            </div>
          </div>
        </div>

        {/* Animated Quranic quote */}
        <div className={`text-center mt-6 transition-all duration-700 delay-700 transform ${
          isFormVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          <p className="text-sm text-sage-600/80 italic animate-pulse-slow">
            "And it is in the remembrance of Allah that hearts find rest."
          </p>
          <p className="text-xs text-sage-500 mt-1">— Quran 13:28</p>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }

        @keyframes bounce-in {
          0% { transform: scale(0.8); opacity: 0; }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); opacity: 1; }
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center islamic-gradient islamic-pattern">
        <div className="relative w-full max-w-md mx-auto px-4">
          <div className="relative overflow-hidden">
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-200/50 via-gold-200/50 to-emerald-200/50 rounded-2xl blur-sm animate-pulse"></div>
            <div className="relative bg-white/95 backdrop-blur-sm rounded-2xl border border-emerald-100/50 shadow-2xl overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-gold-400 to-emerald-400"></div>
              <div className="p-8">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg animate-spin-slow">
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

        <style jsx>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    }>
      <SignupForm />
    </Suspense>
  );
}