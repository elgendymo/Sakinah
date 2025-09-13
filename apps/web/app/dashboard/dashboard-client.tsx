'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';
import { api } from '@/lib/api';

interface DashboardClientProps {
  userId: string;
}

export default function DashboardClient({}: DashboardClientProps) {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayIntention, setTodayIntention] = useState('');
  const supabase = createClient();

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        const response = await api.getActivePlans(session.access_token) as any;
        setPlans(response.plans || []);
      }
    } catch (error) {
      console.error('Error loading plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckin = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        await api.createCheckin(
          { intention: todayIntention },
          session.access_token
        );
        setTodayIntention('');
        alert('Check-in saved!');
      }
    } catch (error) {
      console.error('Error saving check-in:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-primary-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-primary-900 mb-8">
          Assalamu Alaikum
        </h1>

        {/* Daily Check-in */}
        <div className="bg-white rounded-lg p-6 shadow-md mb-8">
          <h2 className="text-xl font-semibold text-primary-800 mb-4">
            Morning Intention
          </h2>
          <div className="flex gap-4">
            <input
              type="text"
              value={todayIntention}
              onChange={(e) => setTodayIntention(e.target.value)}
              placeholder="What is your spiritual focus today?"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
            <button
              onClick={handleCheckin}
              className="btn-primary"
            >
              Set Intention
            </button>
          </div>
        </div>

        {/* Active Plans */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {plans.length > 0 ? (
            plans.map((plan) => (
              <div key={plan.id} className="bg-white rounded-lg p-6 shadow-md">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-primary-800">
                    {plan.kind === 'takhliyah' ? 'Purifying from' : 'Building'}: {plan.target}
                  </h3>
                  <span className="text-sm text-primary-600 bg-primary-100 px-2 py-1 rounded">
                    {plan.kind}
                  </span>
                </div>
                <div className="space-y-2">
                  {plan.microHabits?.map((habit: any, index: number) => (
                    <div key={index} className="text-sm text-gray-600">
                      • {habit.title}
                    </div>
                  ))}
                </div>
                <Link
                  href={`/habits?planId=${plan.id}`}
                  className="btn-secondary inline-block mt-4"
                >
                  Track Habits
                </Link>
              </div>
            ))
          ) : (
            <div className="col-span-2 text-center py-12">
              <p className="text-gray-600 mb-4">No active plans yet</p>
              <Link href="/tazkiyah" className="btn-primary">
                Start Your Journey
              </Link>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/tazkiyah" className="text-center p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <div className="text-2xl mb-2">🌱</div>
            <div className="text-sm text-gray-700">New Plan</div>
          </Link>
          <Link href="/habits" className="text-center p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <div className="text-2xl mb-2">✅</div>
            <div className="text-sm text-gray-700">Habits</div>
          </Link>
          <Link href="/checkin" className="text-center p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <div className="text-2xl mb-2">📝</div>
            <div className="text-sm text-gray-700">Muhasabah</div>
          </Link>
          <Link href="/journal" className="text-center p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <div className="text-2xl mb-2">📖</div>
            <div className="text-sm text-gray-700">Journal</div>
          </Link>
        </div>
      </div>
    </div>
  );
}