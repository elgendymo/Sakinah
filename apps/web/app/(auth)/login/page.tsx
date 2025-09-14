'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import PageContainer from '@/components/PageContainer';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;

      setMessage('Check your email for the login link!');
    } catch (error: any) {
      setMessage(error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer
      title="Welcome Back"
      subtitle="Continue your spiritual journey with Allah's guidance"
      maxWidth="md"
      padding="xl"
      className="flex items-center justify-center"
    >
      <div className="card-islamic p-8 rounded-xl shadow-lg max-w-md w-full">
        <h1 className="text-3xl font-bold text-primary-900 mb-6 text-center">
          Welcome to Sakinah
        </h1>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="your@email.com"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary py-3 disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send Magic Link'}
          </button>
        </form>

        {message && (
          <div className={`mt-4 p-3 rounded-lg text-center ${
            message.includes('error') ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
          }`}>
            {message}
          </div>
        )}

        <p className="mt-6 text-sm text-gray-600 text-center">
          We'll send you a secure link to sign in. No password needed.
        </p>
      </div>
    </PageContainer>
  );
}