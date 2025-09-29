'use client';

import { useEffect, useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import PageContainer from '@/components/PageContainer';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { useSuccessToast } from '@/components/SuccessToast';
import { useJournalViewModel } from '../../viewmodels/JournalViewModel';
import { AuthUtils } from '@/lib/auth-utils';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Visibility as VisibilityIcon,
  Save as SaveIcon,
  Search as SearchIcon,
  AccessTime as TimeIcon,
  Label as TagIcon,
  Assessment as StatsIcon,
  AutoStories as BookIcon,
  FavoriteBorder as HeartIcon,
  Flag as FlagIcon,
  Create as WriteIcon,
  Close as CloseIcon
} from '@mui/icons-material';

export default function JournalView() {
  const t = useTranslations('journal');
  const [draftSaveStatus, setDraftSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const { showToast, ToastComponent } = useSuccessToast();

  // Edit and view state management
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editTags, setEditTags] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [viewingEntry, setViewingEntry] = useState<string | null>(null);
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());

  // ViewModel state and actions
  const {
    entries,
    isLoadingEntries,
    isSaving,
    error,
    successMessage,
    searchQuery,
    selectedTags,
    pagination,
    currentPage,
    itemsPerPage,
    sortOrder,
    newEntry,
    newTags,
    showPrompts,
    loadEntries,
    createEntry,
    updateEntry,
    deleteEntry,
    setSearchQuery,
    setSelectedTags,
    addSelectedTag,
    removeSelectedTag,
    setCurrentPage,
    setItemsPerPage,
    setSortOrder,
    setNewEntry,
    setNewTags,
    setShowPrompts,
    insertPrompt,
    clearError,
  } = useJournalViewModel();

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

  // Auto-save and restore draft functionality
  const saveDraft = useCallback(() => {
    if (newEntry.trim() || newTags.trim()) {
      setDraftSaveStatus('saving');
      const draft = {
        content: newEntry,
        tags: newTags,
        timestamp: Date.now()
      };
      localStorage.setItem('journal_draft', JSON.stringify(draft));
      setTimeout(() => {
        setDraftSaveStatus('saved');
        setTimeout(() => setDraftSaveStatus('idle'), 2000);
      }, 300);
    } else {
      localStorage.removeItem('journal_draft');
      setDraftSaveStatus('idle');
    }
  }, [newEntry, newTags]);

  const restoreDraft = useCallback(() => {
    try {
      const savedDraft = localStorage.getItem('journal_draft');
      if (savedDraft) {
        const draft = JSON.parse(savedDraft);
        // Only restore if draft is less than 24 hours old
        const ageInHours = (Date.now() - draft.timestamp) / (1000 * 60 * 60);
        if (ageInHours < 24 && (draft.content || draft.tags)) {
          setNewEntry(draft.content || '');
          setNewTags(draft.tags || '');
          return true;
        } else {
          localStorage.removeItem('journal_draft');
        }
      }
    } catch (error) {
      console.error('Error restoring draft:', error);
      localStorage.removeItem('journal_draft');
    }
    return false;
  }, [setNewEntry, setNewTags]);

  const clearDraft = useCallback(() => {
    localStorage.removeItem('journal_draft');
    setDraftSaveStatus('idle');
  }, []);

  // Load entries and restore draft on mount
  useEffect(() => {
    console.log('[JournalView] Component mounted, initializing...');
    loadEntriesWithAuth();
    restoreDraft();
  }, []);

  // Auto-save draft as user types (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      saveDraft();
    }, 2000); // Auto-save after 2 seconds of inactivity
    return () => clearTimeout(timeoutId);
  }, [newEntry, newTags, saveDraft]);

  // Show success toast when there's a success message
  useEffect(() => {
    if (successMessage && successMessage.length > 0) {
      showToast(successMessage, '🎉');
      // Let the ViewModel handle clearing the message automatically after 3 seconds
    }
  }, [successMessage]); // Only depend on successMessage to prevent infinite loop

  // Search and filter with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadEntriesWithAuth();
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, selectedTags, currentPage, itemsPerPage, sortOrder]);

  // Edit functionality handlers
  const handleEditEntry = useCallback((entry: any) => {
    setEditingEntry(entry.id);
    setEditContent(entry.content);
    setEditTags(entry.tags ? entry.tags.join(', ') : '');
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editingEntry || isUpdating) return;

    setIsUpdating(true);
    const token = await AuthUtils.getAuthTokenWithFallback();
    const tags = editTags
      .split(',')
      .map(tag => tag.trim().toLowerCase())
      .filter(tag => tag);

    try {
      const success = await updateEntry(editingEntry, {
        content: editContent,
        tags: tags.length > 0 ? tags : undefined
      }, token);

      if (success) {
        setEditingEntry(null);
        setEditContent('');
        setEditTags('');
      }
    } finally {
      setIsUpdating(false);
    }
  }, [editingEntry, editContent, editTags, updateEntry, isUpdating]);

  const handleCancelEdit = useCallback(() => {
    setEditingEntry(null);
    setEditContent('');
    setEditTags('');
  }, []);

  // View functionality handlers
  const handleViewEntry = useCallback((entryId: string) => {
    setViewingEntry(entryId);
  }, []);

  const handleCloseView = useCallback(() => {
    setViewingEntry(null);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Close modal with Escape key
      if (e.key === 'Escape') {
        if (viewingEntry) {
          handleCloseView();
        } else if (editingEntry) {
          handleCancelEdit();
        }
      }

      // Ctrl/Cmd + Enter to save entry
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (editingEntry) {
          handleSaveEdit();
        } else if (newEntry.trim()) {
          handleSubmit(e as any);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [viewingEntry, editingEntry, newEntry, handleSaveEdit, handleCancelEdit, handleCloseView]);

  const loadEntriesWithAuth = async () => {
    console.log('[JournalView] loadEntriesWithAuth called');
    const token = await AuthUtils.getAuthTokenWithFallback();
    console.log('[JournalView] Got token:', token ? 'exists' : 'null');

    loadEntries(token, {
      search: searchQuery || undefined,
      tags: selectedTags.length > 0 ? selectedTags : undefined,
      page: currentPage,
      limit: itemsPerPage,
      sortBy: 'createdAt',  // Always sort by date
      sortOrder
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const token = await AuthUtils.getAuthTokenWithFallback();

    const success = await createEntry(token);
    if (success) {
      // Clear the draft after successful submission
      clearDraft();
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm(t('confirmDelete'))) return;

    const token = await AuthUtils.getAuthTokenWithFallback();

    await deleteEntry(entryId, token);
  };


  // Expand/collapse functionality
  const toggleExpanded = (entryId: string) => {
    const newExpanded = new Set(expandedEntries);
    if (newExpanded.has(entryId)) {
      newExpanded.delete(entryId);
    } else {
      newExpanded.add(entryId);
    }
    setExpandedEntries(newExpanded);
  };

  // Helper function to truncate content
  const truncateContent = (content: string, maxLength: number = 150) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60);

    // Show relative time for recent entries
    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }) + ' today';
    } else if (diffInHours < 48) {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }) + ' yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
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
          onRetry={() => loadEntriesWithAuth()}
          className="mb-6"
        />
      )}

      {/* Success Toast - handled by ToastComponent */}
      {ToastComponent}

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full px-4 py-3 pr-10 text-black border border-sage-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            <div className="text-sage-400">
              <SearchIcon sx={{ fontSize: 16 }} />
            </div>
          </div>
        </div>

        {/* Tag Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-sage-700">Tags:</span>
          {selectedTags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-emerald-100 text-emerald-700 rounded-full border border-emerald-200/50"
            >
              {tag}
              <button
                onClick={() => removeSelectedTag(tag)}
                className="text-emerald-600 hover:text-emerald-800"
              >
                ×
              </button>
            </span>
          ))}
          {selectedTags.length > 0 && (
            <button
              onClick={() => setSelectedTags([])}
              className="text-xs text-sage-500 hover:text-sage-700"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Sort and Display Options */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Order Toggle */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-sage-600">Order:</span>
            <button
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              className={`group flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
                sortOrder === 'desc'
                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  : 'bg-sage-50 text-sage-700 hover:bg-sage-100'
              }`}
              title={sortOrder === 'desc' ? 'Showing newest first' : 'Showing oldest first'}
            >
              {sortOrder === 'desc' ? (
                <>
                  <TimeIcon sx={{ fontSize: 18 }} />
                  <span className="text-sm font-medium">Newest</span>
                </>
              ) : (
                <>
                  <TimeIcon sx={{ fontSize: 18, transform: 'rotate(180deg)' }} />
                  <span className="text-sm font-medium">Oldest</span>
                </>
              )}
            </button>
          </div>

          {/* Items Per Page */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-sage-600">Show:</span>
            <div className="flex gap-1 bg-sage-50 p-1 rounded-lg">
              {[10, 20, 50].map((num) => (
                <button
                  key={num}
                  onClick={() => setItemsPerPage(num)}
                  className={`px-3 py-1 text-sm rounded-md transition-all ${
                    itemsPerPage === num
                      ? 'bg-white text-emerald-700 font-medium shadow-sm'
                      : 'text-sage-600 hover:text-sage-800'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* New Entry Form */}
      <div className="card-islamic rounded-xl p-6 shadow-lg mb-8">
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-sage-700">
                {t('whatsOnYourHeart')}
              </label>
              <div className="flex items-center gap-3">
                {/* Draft save status indicator */}
                {draftSaveStatus !== 'idle' && (
                  <div className="flex items-center gap-1 text-xs text-sage-500">
                    {draftSaveStatus === 'saving' && (
                      <>
                        <div className="w-3 h-3 border border-sage-400 border-t-transparent rounded-full animate-spin"></div>
                        <span>Saving draft...</span>
                      </>
                    )}
                    {draftSaveStatus === 'saved' && (
                      <>
                        <div className="text-emerald-600">✓</div>
                        <span className="text-emerald-600">Draft saved</span>
                      </>
                    )}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setShowPrompts(!showPrompts)}
                  className="text-sm text-emerald-600 hover:text-emerald-700 transition-colors"
                >
                  {showPrompts ? t('hidePrompts') : t('showPrompts')}
                </button>
              </div>
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
              className="w-full px-4 py-3 text-black border border-sage-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none transition-colors"
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
              className="w-full px-4 py-2 text-black border border-sage-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={isSaving || !newEntry.trim()}
            className={`
              relative px-6 py-3 rounded-lg font-medium transition-all duration-200
              ${!newEntry.trim()
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : isSaving
                  ? 'bg-emerald-600 text-white cursor-wait'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg hover:shadow-xl active:scale-95'
              }
            `}
          >
            {isSaving && (
              <span className="absolute inset-0 flex items-center justify-center">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span className="text-sm">Saving...</span>
                </div>
              </span>
            )}
            <span className={`flex items-center gap-2 ${isSaving ? 'opacity-0' : ''}`}>
              <SaveIcon sx={{ fontSize: 16 }} />
              {!newEntry.trim() ? 'Write something first' : 'Save Reflection'}
            </span>
          </button>
        </form>
      </div>

      {/* Entries List */}
      <div className={`space-y-6 ${isLoadingEntries ? 'opacity-50' : ''} transition-opacity duration-200`}>
        {isLoadingEntries ? (
          <div className="text-center py-16">
            <div className="relative mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 border-4 border-emerald-100 border-t-emerald-500 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <BookIcon sx={{ fontSize: 32, color: '#059669' }} className="animate-pulse" />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sage-700 font-medium animate-pulse">Loading your spiritual reflections...</p>
              <p className="text-sm text-sage-500">Gathering your thoughts and insights</p>
            </div>
            <div className="mt-4 flex justify-center">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
              </div>
            </div>
          </div>
        ) : entries.length > 0 ? (
          entries.map((entry) => (
            <div key={entry.id} className="card-islamic rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-200 group">
              {editingEntry === entry.id ? (
                // Edit Mode
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-sage-800 flex items-center gap-2">
                      <EditIcon sx={{ fontSize: 16, color: '#059669' }} />
                      Editing Entry
                    </h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCancelEdit}
                        className="px-3 py-1 text-sm text-sage-600 hover:text-sage-800 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveEdit}
                        disabled={isUpdating}
                        className={`px-4 py-2 text-white text-sm rounded-lg transition-colors flex items-center gap-1 ${
                          isUpdating
                            ? 'bg-emerald-500 cursor-wait opacity-75'
                            : 'bg-emerald-600 hover:bg-emerald-700'
                        }`}
                      >
                        {isUpdating ? (
                          <>
                            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <SaveIcon sx={{ fontSize: 12 }} />
                            <span>Save</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-sage-700 mb-2">Content</label>
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full px-4 py-3 border border-sage-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none transition-colors"
                      rows={6}
                      placeholder="Edit your journal entry..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-sage-700 mb-2">Tags</label>
                    <input
                      type="text"
                      value={editTags}
                      onChange={(e) => setEditTags(e.target.value)}
                      className="w-full px-4 py-2 border border-sage-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                      placeholder="gratitude, reflection, prayer (separate with commas)"
                    />
                  </div>
                </div>
              ) : (
                // View Mode
                <>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-sm text-sage-500">
                        <TimeIcon sx={{ fontSize: 16, color: '#059669' }} />
                        <span>{formatDate(entry.createdAt)}</span>
                      </div>
                      {entry.tags && entry.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {entry.tags.map((tag, index) => (
                            <button
                              key={index}
                              onClick={() => selectedTags.includes(tag) ? removeSelectedTag(tag) : addSelectedTag(tag)}
                              className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                                selectedTags.includes(tag)
                                  ? 'bg-emerald-200 text-emerald-800 border-emerald-300'
                                  : 'bg-emerald-100 text-emerald-700 border-emerald-200/50 hover:bg-emerald-150'
                              }`}
                            >
                              {tag}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Action Menu */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <button
                        onClick={() => toggleExpanded(entry.id)}
                        className="p-2 text-sage-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title={expandedEntries.has(entry.id) ? "Show less" : "Expand preview"}
                      >
                        {expandedEntries.has(entry.id) ?
                          <ExpandLessIcon sx={{ fontSize: 16 }} /> :
                          <ExpandMoreIcon sx={{ fontSize: 16 }} />
                        }
                      </button>
                      <button
                        onClick={() => handleViewEntry(entry.id)}
                        className="p-2 text-sage-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        title="View in modal"
                      >
                        <VisibilityIcon sx={{ fontSize: 16 }} />
                      </button>
                      <button
                        onClick={() => handleEditEntry(entry)}
                        className="p-2 text-sage-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit entry"
                      >
                        <EditIcon sx={{ fontSize: 16 }} />
                      </button>
                      <button
                        onClick={() => handleDeleteEntry(entry.id)}
                        className="p-2 text-sage-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete entry"
                      >
                        <DeleteIcon sx={{ fontSize: 16 }} />
                      </button>
                    </div>
                  </div>

                  <div className="prose prose-primary max-w-none">
                    {expandedEntries.has(entry.id) ? (
                      // Full content view
                      <div className="space-y-3">
                        {entry.content.split('\n').map((paragraph, index) => (
                          <p key={index} className="mb-3 last:mb-0 text-sage-700 leading-relaxed">
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    ) : (
                      // Truncated content view
                      <div>
                        <p className="text-sage-700 leading-relaxed">
                          {truncateContent(entry.content)}
                        </p>
                        {entry.content.length > 150 && (
                          <div className="mt-2 flex items-center gap-3">
                            <button
                              onClick={() => toggleExpanded(entry.id)}
                              className="text-sm text-emerald-600 hover:text-emerald-700 font-medium transition-colors flex items-center gap-1"
                            >
                              <BookIcon sx={{ fontSize: 16 }} />
                              Expand here
                            </button>
                            <span className="text-sage-300">or</span>
                            <button
                              onClick={() => handleViewEntry(entry.id)}
                              className="text-sm text-purple-600 hover:text-purple-700 font-medium transition-colors flex items-center gap-1"
                            >
                              <VisibilityIcon sx={{ fontSize: 16 }} />
                              View in modal
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Quick stats bar */}
                  <div className="mt-4 pt-4 border-t border-sage-100 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <div className="flex items-center gap-4 text-xs text-sage-500">
                      <span className="flex items-center gap-1">
                        <StatsIcon sx={{ fontSize: 12 }} />
                        {entry.content.split(' ').length} words
                      </span>
                      <span className="flex items-center gap-1">
                        <TagIcon sx={{ fontSize: 12 }} />
                        {entry.tags?.length || 0} tags
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <div className="mb-6">
              <WriteIcon sx={{ fontSize: 64, color: '#9ca3af' }} className="mx-auto" />
            </div>
            {searchQuery ? (
              <>
                <p className="text-sage-600 mb-4">{t('noEntriesFound')}</p>
                <p className="text-sm text-sage-500">{t('tryDifferentSearch')}</p>
              </>
            ) : (
              <div className="max-w-md mx-auto">
                <h3 className="text-xl font-semibold text-sage-700 mb-4">Begin Your Spiritual Journey</h3>
                <p className="text-sage-600 mb-6">{t('noEntriesYet')}</p>

                {/* Islamic inspiration */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6">
                  <div className="text-emerald-800 text-sm leading-relaxed italic">
                    "And whoever relies upon Allah - then He is sufficient for him. Indeed, Allah will accomplish His purpose."
                  </div>
                  <div className="text-emerald-600 text-xs mt-2">— Quran 65:3</div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="text-left p-3 bg-white/50 rounded-lg border border-sage-100">
                    <div className="font-medium text-sage-700 mb-1 flex items-center gap-2">
                      <BookIcon sx={{ fontSize: 16 }} />
                      Reflect on your day
                    </div>
                    <div className="text-sage-500">What lessons did Allah teach you?</div>
                  </div>
                  <div className="text-left p-3 bg-white/50 rounded-lg border border-sage-100">
                    <div className="font-medium text-sage-700 mb-1 flex items-center gap-2">
                      <HeartIcon sx={{ fontSize: 16 }} />
                      Express gratitude
                    </div>
                    <div className="text-sage-500">Count your blessings, big and small</div>
                  </div>
                  <div className="text-left p-3 bg-white/50 rounded-lg border border-sage-100">
                    <div className="font-medium text-sage-700 mb-1 flex items-center gap-2">
                      <BookIcon sx={{ fontSize: 16 }} />
                      Record insights
                    </div>
                    <div className="text-sage-500">Capture moments of spiritual growth</div>
                  </div>
                  <div className="text-left p-3 bg-white/50 rounded-lg border border-sage-100">
                    <div className="font-medium text-sage-700 mb-1 flex items-center gap-2">
                      <FlagIcon sx={{ fontSize: 16 }} />
                      Set intentions
                    </div>
                    <div className="text-sage-500">Plan acts of worship and kindness</div>
                  </div>
                </div>

                <p className="text-sm text-sage-500 mt-6">{t('startWriting')}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {pagination && pagination.totalPages > 1 && (
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Page info */}
          <div className="text-sm text-sage-600">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} entries
          </div>

          {/* Pagination buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={!pagination.hasPrevPage}
              className="px-3 py-2 text-sm border border-sage-200 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-sage-50 transition-colors"
            >
              First
            </button>
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={!pagination.hasPrevPage}
              className="px-3 py-2 text-sm border border-sage-200 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-sage-50 transition-colors"
            >
              Previous
            </button>

            {/* Page numbers */}
            <div className="flex items-center gap-1">
              {(() => {
                const pages = [];
                const startPage = Math.max(1, currentPage - 2);
                const endPage = Math.min(pagination.totalPages, currentPage + 2);

                for (let i = startPage; i <= endPage; i++) {
                  pages.push(
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i)}
                      className={`px-3 py-2 text-sm border rounded-md transition-colors ${
                        i === currentPage
                          ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                          : 'border-sage-200 hover:bg-sage-50'
                      }`}
                    >
                      {i}
                    </button>
                  );
                }
                return pages;
              })()}
            </div>

            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={!pagination.hasNextPage}
              className="px-3 py-2 text-sm border border-sage-200 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-sage-50 transition-colors"
            >
              Next
            </button>
            <button
              onClick={() => setCurrentPage(pagination.totalPages)}
              disabled={!pagination.hasNextPage}
              className="px-3 py-2 text-sm border border-sage-200 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-sage-50 transition-colors"
            >
              Last
            </button>
          </div>
        </div>
      )}

      {/* Full Entry Modal */}
      {viewingEntry && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
          onClick={handleCloseView}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden islamic-pattern animate-in slide-in-from-bottom-4 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const entry = entries.find(e => e.id === viewingEntry);
              if (!entry) return null;

              return (
                <>
                  {/* Modal Header */}
                  <div className="flex items-center justify-between p-6 border-b border-sage-200 bg-gradient-to-r from-emerald-50 to-emerald-100">
                    <div className="flex items-center gap-4">
                      <div className="text-2xl">
                        <BookIcon sx={{ fontSize: 32, color: '#059669' }} />
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold text-sage-800">Journal Entry</h2>
                        <p className="text-sm text-sage-600 flex items-center gap-2">
                          <TimeIcon sx={{ fontSize: 16, color: '#059669' }} />
                          {formatDate(entry.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          handleCloseView();
                          handleEditEntry(entry);
                        }}
                        className="p-2 text-sage-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit entry"
                      >
                        <EditIcon sx={{ fontSize: 16 }} />
                      </button>
                      <button
                        onClick={handleCloseView}
                        className="p-2 text-sage-400 hover:text-sage-600 hover:bg-sage-50 rounded-lg transition-colors"
                        title="Close (Esc)"
                      >
                        <CloseIcon sx={{ fontSize: 16 }} />
                      </button>
                    </div>
                  </div>

                  {/* Modal Content */}
                  <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                    {/* Tags */}
                    {entry.tags && entry.tags.length > 0 && (
                      <div className="mb-6">
                        <div className="flex flex-wrap gap-2">
                          {entry.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="px-3 py-1 text-sm bg-emerald-100 text-emerald-700 rounded-full border border-emerald-200/50"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Entry Content */}
                    <div className="prose prose-primary prose-lg max-w-none">
                      <div className="space-y-4">
                        {entry.content.split('\n').map((paragraph, index) => (
                          paragraph.trim() ? (
                            <p key={index} className="text-sage-700 leading-relaxed text-lg">
                              {paragraph}
                            </p>
                          ) : (
                            <div key={index} className="h-4" />
                          )
                        ))}
                      </div>
                    </div>

                    {/* Entry Statistics */}
                    <div className="mt-8 pt-6 border-t border-sage-100">
                      <div className="flex items-center gap-6 text-sm text-sage-500">
                        <span className="flex items-center gap-2">
                          <StatsIcon sx={{ fontSize: 16 }} />
                          <span className="font-medium">{entry.content.split(' ').length}</span> words
                        </span>
                        <span className="flex items-center gap-2">
                          <TagIcon sx={{ fontSize: 16 }} />
                          <span className="font-medium">{entry.tags?.length || 0}</span> tags
                        </span>
                      </div>
                    </div>

                    {/* Islamic Inspiration for Reflection */}
                    <div className="mt-8 bg-gradient-to-r from-emerald-50 to-emerald-100 border border-emerald-200 rounded-xl p-4">
                      <div className="text-center">
                        <div className="text-emerald-800 text-sm leading-relaxed italic mb-2">
                          "And it is He who created the heavens and earth in truth. And the day He says, 'Be,' and it is, His word is the truth."
                        </div>
                        <div className="text-emerald-600 text-xs">— Quran 6:73</div>
                      </div>
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="p-6 border-t border-sage-200 bg-sage-50">
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-sage-500">
                        Created {formatDate(entry.createdAt)}
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => {
                            handleCloseView();
                            handleEditEntry(entry);
                          }}
                          className="px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2"
                        >
                          <span>✏️</span>
                          Edit Entry
                        </button>
                        <button
                          onClick={handleCloseView}
                          className="px-4 py-2 bg-sage-200 text-sage-700 text-sm rounded-lg hover:bg-sage-300 transition-colors"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

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