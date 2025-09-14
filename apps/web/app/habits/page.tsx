'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import PageContainer from '@/components/PageContainer';

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

      // For consistent testing and development, always show sample habits data
      const sampleHabits: Habit[] = [
        {
          id: '1',
          title: 'Morning Dhikr',
          streakCount: 7,
          lastCompletedOn: undefined,
          plan: { target: 'Patience (Sabr)', kind: 'tahliyah' }
        },
        {
          id: '2',
          title: 'Read 1 page Quran',
          streakCount: 3,
          lastCompletedOn: undefined,
          plan: { target: 'Knowledge (Ilm)', kind: 'tahliyah' }
        },
        {
          id: '3',
          title: 'Evening Du\'a',
          streakCount: 12,
          lastCompletedOn: undefined,
          plan: { target: 'Gratitude (Shukr)', kind: 'tahliyah' }
        },
      ];
      setHabits(sampleHabits);
      setCompletedToday(new Set());
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
      await loadHabits();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-emerald-600">Loading habits...</div>
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
    <PageContainer
      title="Today's Habits"
      subtitle={today}
      maxWidth="lg"
      padding="lg"
    >

        {habits.length > 0 ? (
          <div className="space-y-4">
            {habits.map((habit) => (
              <div
                key={habit.id}
                data-testid="habit-card"
                className={`habit-card card-islamic rounded-xl p-6 shadow-lg transition-all hover:shadow-emerald-200/50 ${
                  completedToday.has(habit.id) ? 'ring-2 ring-emerald-500/30 bg-emerald-50 border-emerald-200' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-sage-900 mb-1">
                      {habit.title}
                    </h3>
                    <div className="flex items-center text-sm text-sage-600 space-x-4">
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
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                      completedToday.has(habit.id)
                        ? 'bg-emerald-600 text-white shadow-lg'
                        : 'bg-sage-100 text-sage-500 hover:bg-emerald-100 hover:text-emerald-600'
                    }`}
                  >
                    {completedToday.has(habit.id) ? '✓' : '○'}
                  </button>
                </div>

                {completedToday.has(habit.id) && (
                  <div className="mt-4 text-sm text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-200/50">
                    ✨ Barakallahu feeki! May Allah reward you for your consistency.
                  </div>
                )}
              </div>
            ))}

            {/* Progress Summary */}
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl p-6 mt-8 shadow-lg" data-testid="progress-summary">
              <h2 className="text-xl font-semibold mb-2">Today's Progress</h2>
              <div className="text-white/80">
                {completedToday.size} of {habits.length} habits completed
              </div>
              <div className="w-full bg-white/20 rounded-full h-3 mt-3">
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
            <p className="text-sage-600 mb-4">No habits yet</p>
            <a href="/tazkiyah" className="btn-primary">
              Create Your First Plan
            </a>
          </div>
        )}
    </PageContainer>
  );
}