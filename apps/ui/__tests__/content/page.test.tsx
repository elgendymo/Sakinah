import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import ContentPage from '@/app/content/page';
import * as apiService from '@/lib/services/api';
import { ErrorService } from '@/lib/services/ErrorService';

// Mock the API service
vi.mock('@/lib/services/api', () => ({
  api: {
    getContent: vi.fn()
  }
}));

// Mock the ErrorService
vi.mock('@/lib/services/ErrorService', () => ({
  ErrorService: {
    getErrorMessage: vi.fn((error) => 'Failed to load content')
  }
}));

// Mock translations
const mockMessages = {
  content: {
    title: 'Content Library',
    subtitle: 'Browse Quranic verses, Hadith, duas, and spiritual guidance',
    searchPlaceholder: 'Search content, translations, or sources...',
    contentType: 'Content Type',
    popularTopics: 'Popular Topics',
    clearTags: 'Clear tags',
    itemsFound: 'items found',
    bookmarked: 'bookmarked',
    noContentFound: 'No content found matching your filters',
    clearAllFilters: 'Clear all filters',
    footerNote: 'Content is curated from authentic Islamic sources',
    loadingContent: 'Loading content...',
    retry: 'Try Again',
    loadMore: 'Load More',
    loadingMore: 'Loading...',
    of: 'of',
    all: 'All',
    types: {
      ayah: 'Quranic Verses',
      hadith: 'Hadith',
      dua: 'Duas',
      note: 'Spiritual Notes'
    },
    tags: {
      patience: 'patience',
      gratitude: 'gratitude',
      tawakkul: 'tawakkul',
      dhikr: 'dhikr',
      prayer: 'prayer',
      forgiveness: 'forgiveness',
      charity: 'charity',
      knowledge: 'knowledge',
      taqwa: 'taqwa',
      hope: 'hope'
    }
  }
};

// Mock data
const mockContentResponse = {
  data: [
    {
      id: '1',
      type: 'ayah' as const,
      title: 'Patience in Hardship',
      text: 'وَبَشِّرِ الصَّابِرِينَ',
      arabic_text: 'وَبَشِّرِ الصَّابِرِينَ',
      translation: 'And give good tidings to the patient',
      ref: 'Al-Baqarah 2:155',
      tags: ['patience', 'hardship', 'tawakkul'],
      createdAt: '2024-01-01T00:00:00Z',
    },
    {
      id: '2',
      type: 'hadith' as const,
      title: 'The Best of People',
      text: 'خَيْرُ النَّاسِ أَنْفَعُهُمْ لِلنَّاسِ',
      translation: 'The best of people are those who benefit others',
      ref: 'Reported by Al-Tabarani',
      tags: ['charity', 'service', 'character'],
      createdAt: '2024-01-01T00:00:00Z',
    },
    {
      id: '3',
      type: 'dua' as const,
      title: 'Morning Dhikr',
      text: 'اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ',
      arabic_text: 'اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ',
      translation: 'O Allah, help me to remember You, thank You, and worship You in the best manner',
      ref: 'Abu Dawud',
      tags: ['dhikr', 'gratitude', 'worship'],
      createdAt: '2024-01-01T00:00:00Z',
    }
  ],
  pagination: {
    limit: 20,
    offset: 0,
    total: 3
  }
};

const renderWithIntl = (component: React.ReactElement) => {
  return render(
    <NextIntlClientProvider messages={mockMessages} locale="en">
      {component}
    </NextIntlClientProvider>
  );
};

describe('Content Library Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (apiService.api.getContent as any).mockResolvedValue(mockContentResponse);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Initial Loading', () => {
    it('should display loading state initially', async () => {
      // Make API call slow to test loading state
      (apiService.api.getContent as any).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockContentResponse), 100))
      );

      renderWithIntl(<ContentPage />);

      expect(screen.getByText('Loading content...')).toBeInTheDocument();
    });

    it('should load and display content successfully', async () => {
      renderWithIntl(<ContentPage />);

      await waitFor(() => {
        expect(screen.getByText('Content Library')).toBeInTheDocument();
        expect(screen.getByText('Browse Quranic verses, Hadith, duas, and spiritual guidance')).toBeInTheDocument();
      });

      // Verify content cards are displayed
      expect(screen.getByText('Patience in Hardship')).toBeInTheDocument();
      expect(screen.getByText('The Best of People')).toBeInTheDocument();
      expect(screen.getByText('Morning Dhikr')).toBeInTheDocument();

      // Verify Arabic text is displayed
      expect(screen.getByText('وَبَشِّرِ الصَّابِرِينَ')).toBeInTheDocument();
    });

    it('should call API with default parameters', async () => {
      renderWithIntl(<ContentPage />);

      await waitFor(() => {
        expect(apiService.api.getContent).toHaveBeenCalledWith({
          limit: 20,
          offset: 0
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error state when API call fails', async () => {
      const mockError = new Error('Network error');
      (apiService.api.getContent as any).mockRejectedValue(mockError);
      (ErrorService.getErrorMessage as any).mockReturnValue('Failed to load content');

      renderWithIntl(<ContentPage />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load content')).toBeInTheDocument();
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });
    });

    it('should retry loading content when retry button is clicked', async () => {
      const mockError = new Error('Network error');
      (apiService.api.getContent as any)
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce(mockContentResponse);

      renderWithIntl(<ContentPage />);

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Try Again'));

      await waitFor(() => {
        expect(screen.getByText('Patience in Hardship')).toBeInTheDocument();
      });

      expect(apiService.api.getContent).toHaveBeenCalledTimes(2);
    });
  });

  describe('Content Type Filtering', () => {
    it('should filter content by type when type button is clicked', async () => {
      renderWithIntl(<ContentPage />);

      await waitFor(() => {
        expect(screen.getByText('Patience in Hardship')).toBeInTheDocument();
      });

      // Click on Hadith type filter
      fireEvent.click(screen.getByText('Hadith'));

      await waitFor(() => {
        expect(apiService.api.getContent).toHaveBeenCalledWith({
          limit: 20,
          offset: 0,
          type: 'hadith'
        });
      });
    });

    it('should show counts for each content type', async () => {
      renderWithIntl(<ContentPage />);

      await waitFor(() => {
        expect(screen.getByText('All (3)')).toBeInTheDocument();
        expect(screen.getByText(/Quranic Verses.*\(1\)/)).toBeInTheDocument();
        expect(screen.getByText(/Hadith.*\(1\)/)).toBeInTheDocument();
        expect(screen.getByText(/Duas.*\(1\)/)).toBeInTheDocument();
      });
    });
  });

  describe('Tag Filtering', () => {
    it('should filter content by tags when tag button is clicked', async () => {
      renderWithIntl(<ContentPage />);

      await waitFor(() => {
        expect(screen.getByText('Patience in Hardship')).toBeInTheDocument();
      });

      // Click on patience tag
      fireEvent.click(screen.getByText('#patience'));

      await waitFor(() => {
        expect(apiService.api.getContent).toHaveBeenCalledWith({
          limit: 20,
          offset: 0,
          tags: 'patience'
        });
      });
    });

    it('should allow multiple tag selection', async () => {
      renderWithIntl(<ContentPage />);

      await waitFor(() => {
        expect(screen.getByText('Patience in Hardship')).toBeInTheDocument();
      });

      // Click on patience and gratitude tags
      fireEvent.click(screen.getByText('#patience'));
      fireEvent.click(screen.getByText('#gratitude'));

      await waitFor(() => {
        expect(apiService.api.getContent).toHaveBeenCalledWith({
          limit: 20,
          offset: 0,
          tags: 'patience,gratitude'
        });
      });
    });

    it('should clear all tags when clear tags button is clicked', async () => {
      renderWithIntl(<ContentPage />);

      await waitFor(() => {
        expect(screen.getByText('Patience in Hardship')).toBeInTheDocument();
      });

      // Select a tag first
      fireEvent.click(screen.getByText('#patience'));

      await waitFor(() => {
        expect(screen.getByText('Clear tags')).toBeInTheDocument();
      });

      // Clear tags
      fireEvent.click(screen.getByText('Clear tags'));

      await waitFor(() => {
        expect(apiService.api.getContent).toHaveBeenCalledWith({
          limit: 20,
          offset: 0
        });
      });
    });
  });

  describe('Search Functionality', () => {
    it('should filter content locally based on search query', async () => {
      renderWithIntl(<ContentPage />);

      await waitFor(() => {
        expect(screen.getByText('Patience in Hardship')).toBeInTheDocument();
        expect(screen.getByText('The Best of People')).toBeInTheDocument();
        expect(screen.getByText('Morning Dhikr')).toBeInTheDocument();
      });

      // Search for "patience"
      const searchInput = screen.getByPlaceholderText('Search content, translations, or sources...');
      fireEvent.change(searchInput, { target: { value: 'patience' } });

      // Only content with "patience" should be visible
      expect(screen.getByText('Patience in Hardship')).toBeInTheDocument();
      expect(screen.queryByText('The Best of People')).not.toBeInTheDocument();
      expect(screen.queryByText('Morning Dhikr')).not.toBeInTheDocument();
    });

    it('should search in translation text', async () => {
      renderWithIntl(<ContentPage />);

      await waitFor(() => {
        expect(screen.getByText('Patience in Hardship')).toBeInTheDocument();
      });

      // Search for "benefit"
      const searchInput = screen.getByPlaceholderText('Search content, translations, or sources...');
      fireEvent.change(searchInput, { target: { value: 'benefit' } });

      // Only hadith about benefiting others should be visible
      expect(screen.queryByText('Patience in Hardship')).not.toBeInTheDocument();
      expect(screen.getByText('The Best of People')).toBeInTheDocument();
      expect(screen.queryByText('Morning Dhikr')).not.toBeInTheDocument();
    });

    it('should search in tags', async () => {
      renderWithIntl(<ContentPage />);

      await waitFor(() => {
        expect(screen.getByText('Patience in Hardship')).toBeInTheDocument();
      });

      // Search for "dhikr"
      const searchInput = screen.getByPlaceholderText('Search content, translations, or sources...');
      fireEvent.change(searchInput, { target: { value: 'dhikr' } });

      // Only dua with dhikr tag should be visible
      expect(screen.queryByText('Patience in Hardship')).not.toBeInTheDocument();
      expect(screen.queryByText('The Best of People')).not.toBeInTheDocument();
      expect(screen.getByText('Morning Dhikr')).toBeInTheDocument();
    });
  });

  describe('Pagination', () => {
    it('should show load more button when there is more content', async () => {
      const mockResponseWithMore = {
        ...mockContentResponse,
        data: Array(20).fill(null).map((_, i) => ({
          ...mockContentResponse.data[0],
          id: `item-${i}`,
          title: `Content Item ${i}`
        })),
        pagination: { limit: 20, offset: 0, total: 50 }
      };

      (apiService.api.getContent as any).mockResolvedValue(mockResponseWithMore);

      renderWithIntl(<ContentPage />);

      await waitFor(() => {
        expect(screen.getByText('Load More')).toBeInTheDocument();
      });
    });

    it('should load more content when load more button is clicked', async () => {
      const firstResponse = {
        data: [mockContentResponse.data[0]],
        pagination: { limit: 1, offset: 0, total: 3 }
      };

      const secondResponse = {
        data: [mockContentResponse.data[1]],
        pagination: { limit: 1, offset: 1, total: 3 }
      };

      (apiService.api.getContent as any)
        .mockResolvedValueOnce(firstResponse)
        .mockResolvedValueOnce(secondResponse);

      renderWithIntl(<ContentPage />);

      await waitFor(() => {
        expect(screen.getByText('Patience in Hardship')).toBeInTheDocument();
        expect(screen.getByText('Load More')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Load More'));

      await waitFor(() => {
        expect(screen.getByText('The Best of People')).toBeInTheDocument();
      });

      expect(apiService.api.getContent).toHaveBeenCalledTimes(2);
      expect(apiService.api.getContent).toHaveBeenNthCalledWith(2, {
        limit: 20,
        offset: 20
      });
    });

    it('should not show load more button when searching', async () => {
      renderWithIntl(<ContentPage />);

      await waitFor(() => {
        expect(screen.getByText('Patience in Hardship')).toBeInTheDocument();
      });

      // Search for something
      const searchInput = screen.getByPlaceholderText('Search content, translations, or sources...');
      fireEvent.change(searchInput, { target: { value: 'patience' } });

      // Load more should not be visible during search
      expect(screen.queryByText('Load More')).not.toBeInTheDocument();
    });
  });

  describe('Bookmarking', () => {
    it('should toggle bookmark when bookmark button is clicked', async () => {
      renderWithIntl(<ContentPage />);

      await waitFor(() => {
        expect(screen.getByText('Patience in Hardship')).toBeInTheDocument();
      });

      const bookmarkButtons = screen.getAllByTestId('bookmark-button');
      const firstBookmarkButton = bookmarkButtons[0];

      // Initially not bookmarked
      expect(firstBookmarkButton).toHaveTextContent('☆');

      // Click to bookmark
      fireEvent.click(firstBookmarkButton);
      expect(firstBookmarkButton).toHaveTextContent('⭐');

      // Click again to remove bookmark
      fireEvent.click(firstBookmarkButton);
      expect(firstBookmarkButton).toHaveTextContent('☆');
    });

    it('should show bookmark count when items are bookmarked', async () => {
      renderWithIntl(<ContentPage />);

      await waitFor(() => {
        expect(screen.getByText('Patience in Hardship')).toBeInTheDocument();
      });

      const bookmarkButtons = screen.getAllByTestId('bookmark-button');
      fireEvent.click(bookmarkButtons[0]);

      expect(screen.getByText('⭐ 1 bookmarked')).toBeInTheDocument();
    });
  });

  describe('Clear All Filters', () => {
    it('should show clear all filters button when filters are applied', async () => {
      renderWithIntl(<ContentPage />);

      await waitFor(() => {
        expect(screen.getByText('Patience in Hardship')).toBeInTheDocument();
      });

      // Apply filters
      fireEvent.click(screen.getByText('Hadith'));
      fireEvent.click(screen.getByText('#patience'));

      expect(screen.getByText('Clear all filters')).toBeInTheDocument();
    });

    it('should clear all filters when clear all filters button is clicked', async () => {
      renderWithIntl(<ContentPage />);

      await waitFor(() => {
        expect(screen.getByText('Patience in Hardship')).toBeInTheDocument();
      });

      // Apply filters
      fireEvent.click(screen.getByText('Hadith'));
      fireEvent.click(screen.getByText('#patience'));

      // Clear all filters
      fireEvent.click(screen.getByText('Clear all filters'));

      await waitFor(() => {
        expect(apiService.api.getContent).toHaveBeenCalledWith({
          limit: 20,
          offset: 0
        });
      });
    });
  });

  describe('Empty State', () => {
    it('should show no content found message when no content matches filters', async () => {
      renderWithIntl(<ContentPage />);

      await waitFor(() => {
        expect(screen.getByText('Patience in Hardship')).toBeInTheDocument();
      });

      // Search for something that doesn't exist
      const searchInput = screen.getByPlaceholderText('Search content, translations, or sources...');
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

      expect(screen.getByText('No content found matching your filters')).toBeInTheDocument();
      expect(screen.getByText('🔍')).toBeInTheDocument();
    });
  });

  describe('Content Display', () => {
    it('should display content cards with all required information', async () => {
      renderWithIntl(<ContentPage />);

      await waitFor(() => {
        expect(screen.getByText('Patience in Hardship')).toBeInTheDocument();
      });

      // Check for content elements
      expect(screen.getByText('📖')).toBeInTheDocument(); // Ayah icon
      expect(screen.getByText('Quranic Verses')).toBeInTheDocument();
      expect(screen.getByText('وَبَشِّرِ الصَّابِرِينَ')).toBeInTheDocument(); // Arabic text
      expect(screen.getByText('And give good tidings to the patient')).toBeInTheDocument(); // Translation
      expect(screen.getByText('— Al-Baqarah 2:155')).toBeInTheDocument(); // Reference
      expect(screen.getByText('#patience')).toBeInTheDocument(); // Tags
    });

    it('should show correct icons for different content types', async () => {
      renderWithIntl(<ContentPage />);

      await waitFor(() => {
        expect(screen.getByText('Patience in Hardship')).toBeInTheDocument();
      });

      // Check type icons
      expect(screen.getByText('📖')).toBeInTheDocument(); // Ayah
      expect(screen.getByText('💬')).toBeInTheDocument(); // Hadith
      expect(screen.getByText('🤲')).toBeInTheDocument(); // Dua
    });
  });

  describe('Results Counter', () => {
    it('should show correct count of items found', async () => {
      renderWithIntl(<ContentPage />);

      await waitFor(() => {
        expect(screen.getByText('3 items found')).toBeInTheDocument();
      });
    });

    it('should show total count when available', async () => {
      const mockResponseWithTotal = {
        ...mockContentResponse,
        pagination: { limit: 20, offset: 0, total: 100 }
      };

      (apiService.api.getContent as any).mockResolvedValue(mockResponseWithTotal);

      renderWithIntl(<ContentPage />);

      await waitFor(() => {
        expect(screen.getByText('(of 100)')).toBeInTheDocument();
      });
    });
  });
});