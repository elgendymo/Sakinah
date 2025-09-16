'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useTranslations } from 'next-intl';
// import { api } from '@/lib/api'; // For future use
import PageContainer from '@/components/PageContainer';
import { ErrorDisplay, useErrorHandler } from '@/components/ErrorDisplay';

interface JournalEntry {
  id: string;
  content: string;
  tags?: string[];
  createdAt: string;
}

export default function JournalPage() {
  const t = useTranslations('journal');

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [newEntry, setNewEntry] = useState('');
  const [newTags, setNewTags] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPrompts, setShowPrompts] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const { error, handleError, clearError } = useErrorHandler();
  const supabase = createClient();

  const JOURNAL_PROMPTS = [
    t('prompts.1'),
    t('prompts.2'),
    t('prompts.3'),
    t('prompts.4'),
    t('prompts.5'),
    t('prompts.6'),
    t('prompts.7'),
    t('prompts.8'),
  ];

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    try {
      clearError();
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
      handleError(error, 'Loading Journal Entries');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntry.trim()) return;

    setLoading(true);
    clearError();
    setSuccessMessage('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        handleError(new Error('Please sign in to save your journal entry'), 'Authentication');
        return;
      }

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

      setSuccessMessage(t('successMessage'));
    } catch (error) {
      handleError(error, 'Saving Journal Entry');
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
      title={t('title')}
      subtitle={t('subtitle')}
      maxWidth="xl"
      padding="lg"
    >
      {/* Error Display */}
      {error && (
        <ErrorDisplay
          error={error}
          onDismiss={clearError}
          onRetry={() => loadEntries()}
          className="mb-6"
        />
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="text-emerald-600 text-lg">📝</div>
            <div>
              <p className="text-emerald-800 leading-relaxed">{successMessage}</p>
              <button
                onClick={() => setSuccessMessage('')}
                className="mt-2 text-xs text-emerald-600 hover:text-emerald-700"
              >
                {t('dismiss')}
              </button>
            </div>
          </div>
        </div>
      )}

        {/* New Entry Form */}
        <div className="card-islamic rounded-xl p-6 shadow-lg mb-8">
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-sage-700">
                  {t('whatsOnYourHeart')}
                </label>
                <button
                  type="button"
                  onClick={() => setShowPrompts(!showPrompts)}
                  className="text-sm text-emerald-600 hover:text-emerald-700 transition-colors"
                >
                  {showPrompts ? t('hidePrompts') : t('showPrompts')}
                </button>
              </div>

              {showPrompts && (
                <div className="mb-4 p-4 bg-emerald-50 rounded-lg border border-emerald-200/50">
                  <div className="text-sm text-sage-600 mb-2">{t('clickToUsePrompt')}</div>
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
                placeholder={t('writePlaceholder')}
                className="w-full px-4 py-3 border border-sage-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none transition-colors"
                rows={6}
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-sage-700 mb-2">
                {t('tagsLabel')}
              </label>
              <input
                type="text"
                value={newTags}
                onChange={(e) => setNewTags(e.target.value)}
                placeholder={t('tagsPlaceholder')}
                className="w-full px-4 py-2 border border-sage-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !newEntry.trim()}
              className="btn-primary disabled:opacity-50"
            >
              {loading ? t('saving') : t('saveEntry')}
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
              <p className="text-sage-600 mb-4">{t('noEntriesYet')}</p>
              <p className="text-sm text-sage-500">
                {t('startWriting')}
              </p>
            </div>
          )}
        </div>

        {/* Reminder */}
        <div className="mt-12 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl p-6 shadow-lg islamic-pattern">
          <div className="text-center">
            <div className="arabic-text mb-2">
              {t('reminderVerse')}
            </div>
            <p className="text-white/90 text-sm">
              "{t('reminderTranslation')}" ({t('reminderSource')})
            </p>
          </div>
        </div>
    </PageContainer>
  );
}