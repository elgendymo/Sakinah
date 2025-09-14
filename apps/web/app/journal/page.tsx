'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
// import { api } from '@/lib/api'; // For future use
import PageContainer from '@/components/PageContainer';

interface JournalEntry {
  id: string;
  content: string;
  tags?: string[];
  createdAt: string;
}

const JOURNAL_PROMPTS = [
  'What duas touched my heart today?',
  'How did I see Allah\'s mercy in my life today?',
  'What spiritual lesson did I learn?',
  'How can I apply this ayah to my life?',
  'What made me feel closest to Allah?',
  'What sins do I need to repent from?',
  'How did I help someone today?',
  'What blessing did I take for granted?',
];

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [newEntry, setNewEntry] = useState('');
  const [newTags, setNewTags] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPrompts, setShowPrompts] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        // In a real app, we'd call the journal API
        // For now, we'll use mock data
        const mockEntries: JournalEntry[] = [
          {
            id: '1',
            content: 'Today I reflected on Surah Al-Fatiha and realized how complete this dua is. It contains everything we need - guidance, mercy, and protection from misguidance.',
            tags: ['quran', 'reflection', 'fatiha'],
            createdAt: new Date(Date.now() - 86400000).toISOString(),
          },
          {
            id: '2',
            content: 'Struggled with anger today when someone cut me off in traffic. I remembered the hadith about restraining anger and made istighfar. Allah is teaching me patience.',
            tags: ['anger', 'patience', 'istighfar'],
            createdAt: new Date(Date.now() - 172800000).toISOString(),
          },
        ];
        setEntries(mockEntries);
      }
    } catch (error) {
      console.error('Error loading entries:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntry.trim()) return;

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const tags = newTags
        .split(',')
        .map(tag => tag.trim().toLowerCase())
        .filter(tag => tag);

      // In a real app, we'd call:
      // await api.createJournalEntry({ content: newEntry, tags: tags.length > 0 ? tags : undefined }, session.access_token);

      // For now, add to local state
      const newEntryObj: JournalEntry = {
        id: Date.now().toString(),
        content: newEntry,
        tags: tags.length > 0 ? tags : undefined,
        createdAt: new Date().toISOString(),
      };

      setEntries(prev => [newEntryObj, ...prev]);

      // Reset form
      setNewEntry('');
      setNewTags('');
    } catch (error) {
      console.error('Error saving entry:', error);
      alert('Failed to save entry. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const insertPrompt = (prompt: string) => {
    setNewEntry(prev => prev + (prev ? '\n\n' : '') + prompt + '\n\n');
    setShowPrompts(false);
  };

  return (
    <PageContainer
      title="Spiritual Journal"
      subtitle="A private space for your thoughts and reflections"
      maxWidth="xl"
      padding="lg"
    >

        {/* New Entry Form */}
        <div className="card-islamic rounded-xl p-6 shadow-lg mb-8">
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-sage-700">
                  What's on your heart today?
                </label>
                <button
                  type="button"
                  onClick={() => setShowPrompts(!showPrompts)}
                  className="text-sm text-emerald-600 hover:text-emerald-700 transition-colors"
                >
                  {showPrompts ? 'Hide' : 'Show'} prompts
                </button>
              </div>

              {showPrompts && (
                <div className="mb-4 p-4 bg-emerald-50 rounded-lg border border-emerald-200/50">
                  <div className="text-sm text-sage-600 mb-2">Click to use a prompt:</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {JOURNAL_PROMPTS.map((prompt, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => insertPrompt(prompt)}
                        className="text-left p-2 text-sm text-emerald-700 hover:bg-emerald-100 rounded transition-colors"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <textarea
                value={newEntry}
                onChange={(e) => setNewEntry(e.target.value)}
                placeholder="Write your thoughts, reflections, duas, or spiritual insights..."
                className="w-full px-4 py-3 border border-sage-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none transition-colors"
                rows={6}
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-sage-700 mb-2">
                Tags (optional)
              </label>
              <input
                type="text"
                value={newTags}
                onChange={(e) => setNewTags(e.target.value)}
                placeholder="dua, gratitude, struggle, lesson (separate with commas)"
                className="w-full px-4 py-2 border border-sage-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !newEntry.trim()}
              className="btn-primary disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Entry'}
            </button>
          </form>
        </div>

        {/* Entries List */}
        <div className="space-y-6">
          {entries.length > 0 ? (
            entries.map((entry) => (
              <div key={entry.id} className="card-islamic rounded-xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm text-sage-500">
                    {formatDate(entry.createdAt)}
                  </div>
                  {entry.tags && entry.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {entry.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 text-xs bg-emerald-100 text-emerald-700 rounded-full border border-emerald-200/50"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="prose prose-primary max-w-none">
                  {entry.content.split('\n').map((paragraph, index) => (
                    <p key={index} className="mb-3 last:mb-0">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📝</div>
              <p className="text-sage-600 mb-4">No journal entries yet</p>
              <p className="text-sm text-sage-500">
                Start writing to capture your spiritual journey
              </p>
            </div>
          )}
        </div>

        {/* Reminder */}
        <div className="mt-12 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl p-6 shadow-lg islamic-pattern">
          <div className="text-center">
            <div className="arabic-text mb-2">
              وَذَكِّرْ فَإِنَّ الذِّكْرَىٰ تَنفَعُ الْمُؤْمِنِينَ
            </div>
            <p className="text-white/90 text-sm">
              "And remind, for indeed, the reminder benefits the believers" (Quran 51:55)
            </p>
          </div>
        </div>
    </PageContainer>
  );
}