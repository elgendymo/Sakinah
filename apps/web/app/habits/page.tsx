'use client';

import { useState, useEffect } from 'react';
// import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { api } from '@/lib/api';

interface Habit {
  id: string;
  title: string;
  streakCount: number;
  lastCompletedOn?: string;
  plan: {
    target: string;
    kind: 'takhliyah' | 'tahliyah';
  };
}

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completedToday, setCompletedToday] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  // const searchParams = useSearchParams();
  // const planId = searchParams?.get('planId'); // Future use for filtering
  const supabase = createClient();

  useEffect(() => {
    loadHabits();
  }, []);

  const loadHabits = async () => {
    try {
      setLoading(true);
      // In a real app, we'd have an API endpoint for habits
      // For now, we'll simulate with plans data
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        const response = await api.getActivePlans(session.access_token) as any;

        // Transform plans into habits
        const allHabits: Habit[] = [];
        response.plans?.forEach((plan: any) => {
          plan.microHabits?.forEach((microHabit: any, index: number) => {
            allHabits.push({
              id: `${plan.id}-${index}`,
              title: microHabit.title,
              streakCount: Math.floor(Math.random() * 10), // Mock data
              lastCompletedOn: undefined,
              plan: {
                target: plan.target,
                kind: plan.kind,
              },
            });
          });
        });

        setHabits(allHabits);

        // Check which habits are completed today (mock)
        const completed = new Set<string>();
        setCompletedToday(completed);
      }
    } catch (error) {
      console.error('Error loading habits:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleHabit = async (habitId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const isCompleted = completedToday.has(habitId);

      // Update local state immediately for better UX
      const newCompleted = new Set(completedToday);
      if (isCompleted) {
        newCompleted.delete(habitId);
      } else {
        newCompleted.add(habitId);
      }
      setCompletedToday(newCompleted);

      // Update habits streaks
      setHabits(prev => prev.map(habit => {
        if (habit.id === habitId) {
          return {
            ...habit,
            streakCount: isCompleted ? Math.max(0, habit.streakCount - 1) : habit.streakCount + 1,
            lastCompletedOn: isCompleted ? undefined : new Date().toISOString().split('T')[0],
          };
        }
        return habit;
      }));

      // In a real app, call the API
      // await api.toggleHabit(habitId, !isCompleted, session.access_token);
    } catch (error) {
      console.error('Error toggling habit:', error);
      // Revert optimistic update on error
      loadHabits();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-primary-600">Loading habits...</div>
      </div>
    );
  }

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-900 mb-2">
            Today's Habits
          </h1>
          <p className="text-gray-600">{today}</p>
        </div>

        {habits.length > 0 ? (
          <div className="space-y-4">
            {habits.map((habit) => (
              <div
                key={habit.id}
                className={`bg-white rounded-lg p-6 shadow-md transition-all ${
                  completedToday.has(habit.id) ? 'ring-2 ring-primary-200 bg-primary-50' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900 mb-1">
                      {habit.title}
                    </h3>
                    <div className="flex items-center text-sm text-gray-600 space-x-4">
                      <span>
                        {habit.plan.kind === 'takhliyah' ? '🌿' : '🌸'} {habit.plan.target}
                      </span>
                      <span className="flex items-center">
                        🔥 {habit.streakCount} day streak
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => toggleHabit(habit.id)}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                      completedToday.has(habit.id)
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-200 text-gray-400 hover:bg-gray-300'
                    }`}
                  >
                    {completedToday.has(habit.id) ? '✓' : '○'}
                  </button>
                </div>

                {completedToday.has(habit.id) && (
                  <div className="mt-4 text-sm text-primary-700 bg-primary-100 px-3 py-2 rounded">
                    ✨ Barakallahu feeki! May Allah reward you for your consistency.
                  </div>
                )}
              </div>
            ))}

            {/* Progress Summary */}
            <div className="bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg p-6 mt-8">
              <h2 className="text-xl font-semibold mb-2">Today's Progress</h2>
              <div className="text-primary-100">
                {completedToday.size} of {habits.length} habits completed
              </div>
              <div className="w-full bg-primary-400 rounded-full h-3 mt-3">
                <div
                  className="bg-white h-3 rounded-full transition-all duration-300"
                  style={{ width: `${(completedToday.size / habits.length) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🌱</div>
            <p className="text-gray-600 mb-4">No habits yet</p>
            <a href="/tazkiyah" className="btn-primary">
              Create Your First Plan
            </a>
          </div>
        )}
      </div>
    </div>
  );
}