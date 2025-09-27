'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import PageContainer from '@/components/PageContainer';
import { api } from '@/lib/services/api';
import { toUserMessage } from '@/lib/ui/errorUtils';
import {
  MenuBook as AyahIcon,
  Chat as HadithIcon,
  FavoriteBorder as DuaIcon,
  Create as NoteIcon,
  StarBorder as StarOutlineIcon,
  Star as StarFilledIcon,
  Search as SearchIcon,
  Warning as WarningIcon
} from '@mui/icons-material';

interface ContentSnippet {
  id: string;
  type: 'ayah' | 'hadith' | 'dua' | 'note';
  title?: string;
  text: string;
  arabic_text?: string;
  translation?: string;
  ref: string;
  tags: string[];
  createdAt: string;
}

interface ContentResponse {
  data: ContentSnippet[];
  pagination: {
    limit: number;
    offset: number;
    total?: number;
  };
}

interface ContentFilters {
  tags?: string;
  type?: 'ayah' | 'hadith' | 'dua' | 'note';
  limit: number;
  offset: number;
}


export default function ContentLibraryPage() {
  const t = useTranslations('content');

  const [content, setContent] = useState<ContentSnippet[]>([]);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookmarked, setBookmarked] = useState<Set<string>>(new Set());
  const [pagination, setPagination] = useState({
    limit: 20,
    offset: 0,
    total: 0,
    hasMore: true
  });
  const [loadingMore, setLoadingMore] = useState(false);

  const CONTENT_TYPES = {
    ayah: { label: t('types.ayah'), icon: <AyahIcon sx={{ fontSize: 16 }} />, color: 'text-green-600' },
    hadith: { label: t('types.hadith'), icon: <HadithIcon sx={{ fontSize: 16 }} />, color: 'text-blue-600' },
    dua: { label: t('types.dua'), icon: <DuaIcon sx={{ fontSize: 16 }} />, color: 'text-purple-600' },
    note: { label: t('types.note'), icon: <NoteIcon sx={{ fontSize: 16 }} />, color: 'text-orange-600' },
  };

  const POPULAR_TAGS = [
    'patience', 'gratitude', 'tawakkul', 'dhikr', 'prayer',
    'forgiveness', 'charity', 'knowledge', 'taqwa', 'hope'
  ];

  useEffect(() => {
    loadContent(true); // Reset on initial load
  }, []);

  useEffect(() => {
    loadContent(true); // Reset when filters change
  }, [selectedType, selectedTags, searchQuery]);

  const loadContent = async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setError(null);
        setPagination(prev => ({ ...prev, offset: 0, hasMore: true }));
      } else {
        setLoadingMore(true);
      }

      // Build filter parameters
      const filters: ContentFilters = {
        limit: pagination.limit,
        offset: reset ? 0 : pagination.offset
      };

      if (selectedType !== 'all') {
        filters.type = selectedType as 'ayah' | 'hadith' | 'dua' | 'note';
      }

      if (selectedTags.length > 0) {
        filters.tags = selectedTags.join(',');
      }

      // Use the v2 API endpoint with proper error handling
      const response = await api.getContent(filters) as ContentResponse;

      if (reset) {
        setContent(response.data);
      } else {
        setContent(prev => [...prev, ...response.data]);
      }

      setPagination(prev => ({
        ...prev,
        offset: reset ? response.pagination.limit : prev.offset + response.pagination.limit,
        total: response.pagination.total || 0,
        hasMore: response.data.length >= response.pagination.limit
      }));

    } catch (err) {
      const errorMessage = toUserMessage(err);
      setError(errorMessage);
      console.error('Error loading content:', err);

      if (reset) {
        setContent([]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMoreContent = async () => {
    if (!pagination.hasMore || loadingMore) return;
    await loadContent(false);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // Search will trigger loadContent through useEffect
  };

  const filteredContent = content.filter(item => {
    // Client-side search within loaded content
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return (
        (item.title?.toLowerCase().includes(query)) ||
        (item.text?.toLowerCase().includes(query)) ||
        (item.translation?.toLowerCase().includes(query)) ||
        (item.ref?.toLowerCase().includes(query)) ||
        item.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }
    return true;
  });

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const clearAllFilters = () => {
    setSelectedType('all');
    setSelectedTags([]);
    setSearchQuery('');
  };

  const toggleBookmark = (contentId: string) => {
    setBookmarked(prev => {
      const newBookmarked = new Set(prev);
      if (newBookmarked.has(contentId)) {
        newBookmarked.delete(contentId);
      } else {
        newBookmarked.add(contentId);
      }
      return newBookmarked;
    });
  };

  const ContentCard = ({ item }: { item: ContentSnippet }) => {
    const typeInfo = CONTENT_TYPES[item.type];

    return (
      <div className="card-islamic rounded-xl p-6 shadow-lg hover:shadow-lg transition-all" data-testid="content-card">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center space-x-2">
            <span className="text-xl">{typeInfo.icon}</span>
            <span className={`text-sm font-medium ${typeInfo.color}`}>
              {typeInfo.label}
            </span>
          </div>

          <button
            onClick={() => toggleBookmark(item.id)}
            className={`text-xl transition-colors ${
              bookmarked.has(item.id) ? 'text-gold-500' : 'text-sage-500 hover:text-gold-500'
            }`}
            data-testid="bookmark-button"
          >
            {bookmarked.has(item.id) ? <StarFilledIcon sx={{ fontSize: 16, color: '#f59e0b' }} /> : <StarOutlineIcon sx={{ fontSize: 16 }} />}
          </button>
        </div>

        <h3 className="font-semibold text-sage-900 mb-3">
          {item.title || `${typeInfo.label} Content`}
        </h3>

        {item.arabic_text && (
          <div className="arabic-text text-lg text-emerald-700 mb-4 leading-relaxed">
            {item.arabic_text}
          </div>
        )}

        <p className="text-sage-600 leading-relaxed mb-4" data-testid="translation">
          {item.translation || item.text}
        </p>

        <div className="text-sm text-sage-600 mb-4 font-medium" data-testid="source">
          — {item.ref}
        </div>

        <div className="flex flex-wrap gap-2">
          {item.tags.map(tag => (
            <span
              key={tag}
              className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full border border-emerald-200/50"
            >
              #{tag}
            </span>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-accent">{t('loadingContent')}</div>
      </div>
    );
  }

  if (error) {
    return (
      <PageContainer title={t('title')} subtitle={t('subtitle')}>
        <div className="text-center py-12">
          <div className="mb-4">
            <WarningIcon sx={{ fontSize: 64, color: '#dc2626' }} className="mx-auto" />
          </div>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => loadContent(true)}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
          >
            {t('retry')}
          </button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title={t('title')}
      subtitle={t('subtitle')}
      maxWidth="6xl"
      padding="lg"
    >

        {/* Filters */}
        <div className="card-islamic rounded-xl p-6 mb-8 shadow-lg">
          {/* Search */}
          <div className="mb-6">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="w-full px-4 py-3 border border-sage-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
            />
          </div>

          {/* Content Type Filter */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-sage-700 mb-3">{t('contentType')}</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedType('all')}
                className={`px-4 py-2 rounded-lg transition-all font-medium ${
                  selectedType === 'all'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-sage-100 text-sage-700 hover:bg-emerald-50 hover:text-emerald-700'
                }`}
              >
                {t('all')} ({content.length})
              </button>
              {Object.entries(CONTENT_TYPES).map(([type, info]) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                    selectedType === type
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-sage-100 text-sage-700 hover:bg-emerald-50 hover:text-emerald-700'
                  }`}
                >
                  <span>{info.icon}</span>
                  <span>{info.label}</span>
                  <span className="text-sm opacity-75">
                    ({content.filter(c => c.type === type).length})
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Tags Filter */}
          <div>
            <h3 className="text-sm font-medium text-sage-700 mb-3">{t('popularTopics')}</h3>
            <div className="flex flex-wrap gap-2">
              {POPULAR_TAGS.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    selectedTags.includes(tag)
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border border-emerald-200/50'
                  }`}
                >
                  #{t(`tags.${tag}`)}
                </button>
              ))}
            </div>
            {selectedTags.length > 0 && (
              <button
                onClick={() => setSelectedTags([])}
                className="mt-3 text-sm text-sage-500 hover:text-sage-700 transition-colors"
              >
                {t('clearTags')}
              </button>
            )}
          </div>

          {/* Clear All Filters */}
          {(selectedType !== 'all' || selectedTags.length > 0 || searchQuery.trim()) && (
            <div className="mt-4 pt-4 border-t border-sage-200">
              <button
                onClick={clearAllFilters}
                className="text-sm text-emerald-600 hover:text-emerald-700 transition-colors"
              >
                {t('clearAllFilters')}
              </button>
            </div>
          )}
        </div>

        {/* Results */}
        <div className="mb-6 flex justify-between items-center">
          <div className="text-fg-muted">
            {filteredContent.length} {t('itemsFound')}
            {pagination.total > 0 && (
              <span className="text-sm text-sage-500 ml-2">
                ({t('of')} {pagination.total})
              </span>
            )}
          </div>

          {bookmarked.size > 0 && (
            <div className="text-sm text-fg-muted">
              <StarFilledIcon sx={{ fontSize: 14, color: '#f59e0b' }} /> {bookmarked.size} {t('bookmarked')}
            </div>
          )}
        </div>

        {/* Content Grid */}
        {filteredContent.length > 0 ? (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredContent.map(item => (
                <ContentCard key={item.id} item={item} />
              ))}
            </div>

            {/* Load More Button */}
            {pagination.hasMore && !searchQuery.trim() && (
              <div className="text-center mt-8">
                <button
                  onClick={loadMoreContent}
                  disabled={loadingMore}
                  className="bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingMore ? t('loadingMore') : t('loadMore')}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <div className="mb-4">
              <SearchIcon sx={{ fontSize: 64, color: '#9ca3af' }} className="mx-auto" />
            </div>
            <p className="text-sage-600 mb-4">{t('noContentFound')}</p>
            <button
              onClick={clearAllFilters}
              className="text-emerald-600 hover:underline transition-colors"
            >
              {t('clearAllFilters')}
            </button>
          </div>
        )}

        {/* Footer note */}
        <div className="text-center text-sm text-fg-muted mt-12 pt-8 border-t border-border-muted">
          <p>{t('footerNote')}</p>
        </div>
    </PageContainer>
  );
}