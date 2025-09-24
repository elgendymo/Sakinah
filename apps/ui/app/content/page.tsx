'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import PageContainer from '@/components/PageContainer';

interface ContentSnippet {
  id: string;
  type: 'ayah' | 'hadith' | 'dua' | 'note';
  title?: string;
  text: string; // The main content text
  arabic_text?: string;
  translation?: string;
  ref: string; // The reference/source
  tags: string[];
  createdAt: string;
}


export default function ContentLibraryPage() {
  const t = useTranslations('content');

  const [content, setContent] = useState<ContentSnippet[]>([]);
  const [filteredContent, setFilteredContent] = useState<ContentSnippet[]>([]);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [bookmarked, setBookmarked] = useState<Set<string>>(new Set());

  const CONTENT_TYPES = {
    ayah: { label: t('types.ayah'), icon: '📖', color: 'text-green-600' },
    hadith: { label: t('types.hadith'), icon: '💬', color: 'text-blue-600' },
    dua: { label: t('types.dua'), icon: '🤲', color: 'text-purple-600' },
    note: { label: t('types.note'), icon: '📝', color: 'text-orange-600' },
  };

  const POPULAR_TAGS = [
    'patience', 'gratitude', 'tawakkul', 'dhikr', 'prayer',
    'forgiveness', 'charity', 'knowledge', 'taqwa', 'hope'
  ];

  useEffect(() => {
    loadContent();
  }, []);

  useEffect(() => {
    filterContent();
  }, [content, selectedType, selectedTags, searchQuery]);

  const loadContent = async () => {
    try {
      setLoading(true);

      // For development, use mock data instead of API call that returns HTML error
      const mockContent: ContentSnippet[] = [
        {
          id: '1',
          type: 'ayah',
          title: 'Patience in Hardship',
          text: 'وَبَشِّرِ الصَّابِرِينَ',
          arabic_text: 'وَبَشِّرِ الصَّابِرِينَ',
          translation: 'And give good tidings to the patient',
          ref: 'Al-Baqarah 2:155',
          tags: ['patience', 'hardship', 'tawakkul'],
          createdAt: new Date().toISOString(),
        },
        {
          id: '2',
          type: 'hadith',
          title: 'The Best of People',
          text: 'خَيْرُ النَّاسِ أَنْفَعُهُمْ لِلنَّاسِ',
          translation: 'The best of people are those who benefit others',
          ref: 'Reported by Al-Tabarani',
          tags: ['charity', 'service', 'character'],
          createdAt: new Date().toISOString(),
        },
        {
          id: '3',
          type: 'dua',
          title: 'Morning Dhikr',
          text: 'اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ',
          arabic_text: 'اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ',
          translation: 'O Allah, help me to remember You, thank You, and worship You in the best manner',
          ref: 'Abu Dawud',
          tags: ['dhikr', 'gratitude', 'worship'],
          createdAt: new Date().toISOString(),
        },
      ];
      setContent(mockContent);
    } catch (error) {
      console.error('Error loading content:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterContent = () => {
    let filtered = [...content];

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(item => item.type === selectedType);
    }

    // Filter by tags
    if (selectedTags.length > 0) {
      filtered = filtered.filter(item =>
        selectedTags.some(tag => item.tags.includes(tag))
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        (item.title?.toLowerCase().includes(query)) ||
        (item.text?.toLowerCase().includes(query)) ||
        (item.translation?.toLowerCase().includes(query)) ||
        (item.ref?.toLowerCase().includes(query)) ||
        item.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    setFilteredContent(filtered);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
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
            {bookmarked.has(item.id) ? '⭐' : '☆'}
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
              onChange={(e) => setSearchQuery(e.target.value)}
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
        </div>

        {/* Results */}
        <div className="mb-6 flex justify-between items-center">
          <div className="text-fg-muted">
            {filteredContent.length} {t('itemsFound')}
          </div>

          {bookmarked.size > 0 && (
            <div className="text-sm text-fg-muted">
              ⭐ {bookmarked.size} {t('bookmarked')}
            </div>
          )}
        </div>

        {/* Content Grid */}
        {filteredContent.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredContent.map(item => (
              <ContentCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-sage-600 mb-4">{t('noContentFound')}</p>
            <button
              onClick={() => {
                setSelectedType('all');
                setSelectedTags([]);
                setSearchQuery('');
              }}
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