import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

// Mock the API module
vi.mock('../../../lib/api', () => ({
  api: {
    getJournalEntries: vi.fn(),
    createJournalEntry: vi.fn(),
    updateJournalEntry: vi.fn(),
    deleteJournalEntry: vi.fn(),
  }
}));

import { useJournalViewModel } from '../../../viewmodels/JournalViewModel';
import { api } from '../../../lib/api';

describe('JournalViewModel', () => {
  let mockApi: {
    getJournalEntries: Mock;
    createJournalEntry: Mock;
    updateJournalEntry: Mock;
    deleteJournalEntry: Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockApi = {
      getJournalEntries: api.getJournalEntries as Mock,
      createJournalEntry: api.createJournalEntry as Mock,
      updateJournalEntry: api.updateJournalEntry as Mock,
      deleteJournalEntry: api.deleteJournalEntry as Mock,
    };
  });

  const createMockEntry = (overrides = {}) => ({
    id: 'test-id',
    content: 'Test journal content',
    tags: ['spirituality', 'reflection'],
    createdAt: '2023-01-01T00:00:00Z',
    ...overrides
  });

  const createMockPagination = (overrides = {}) => ({
    page: 1,
    limit: 20,
    total: 2,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
    ...overrides
  });

  const createMockResponse = (entries = [], pagination = createMockPagination()) => ({
    entries,
    pagination
  });

  describe('Initial State', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useJournalViewModel());

      expect(result.current.entries).toEqual([]);
      expect(result.current.isLoadingEntries).toBe(false);
      expect(result.current.isSaving).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.successMessage).toBe('');
      expect(result.current.searchQuery).toBe('');
      expect(result.current.selectedTags).toEqual([]);
      expect(result.current.pagination).toBeNull();
      expect(result.current.currentPage).toBe(1);
      expect(result.current.itemsPerPage).toBe(20);
      expect(result.current.sortBy).toBe('createdAt');
      expect(result.current.sortOrder).toBe('desc');
      expect(result.current.newEntry).toBe('');
      expect(result.current.newTags).toBe('');
      expect(result.current.showPrompts).toBe(false);
    });
  });

  describe('loadEntries', () => {
    it('should load entries successfully with default parameters', async () => {
      const mockEntries = [
        createMockEntry({ id: '1', content: 'Entry 1' }),
        createMockEntry({ id: '2', content: 'Entry 2' })
      ];
      const mockResponse = createMockResponse(mockEntries);

      mockApi.getJournalEntries.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useJournalViewModel());

      await act(async () => {
        await result.current.loadEntries('test-token');
      });

      await waitFor(() => {
        expect(result.current.isLoadingEntries).toBe(false);
      });

      expect(mockApi.getJournalEntries).toHaveBeenCalledWith('test-token', {
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });

      expect(result.current.entries).toEqual(mockEntries);
      expect(result.current.pagination).toEqual(mockResponse.pagination);
      expect(result.current.error).toBeNull();
    });

    it('should load entries with search parameters', async () => {
      const mockEntries = [createMockEntry({ content: 'Prayer reflection' })];
      const mockResponse = createMockResponse(mockEntries);

      mockApi.getJournalEntries.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useJournalViewModel());

      await act(async () => {
        await result.current.loadEntries('test-token', {
          search: 'prayer',
          tags: ['spirituality', 'reflection'],
          page: 2,
          limit: 10,
          sortBy: 'content',
          sortOrder: 'asc'
        });
      });

      expect(mockApi.getJournalEntries).toHaveBeenCalledWith('test-token', {
        page: 2,
        limit: 10,
        sortBy: 'content',
        sortOrder: 'asc',
        search: 'prayer',
        tags: 'spirituality,reflection'
      });

      expect(result.current.currentPage).toBe(2);
      expect(result.current.itemsPerPage).toBe(10);
      expect(result.current.sortBy).toBe('content');
      expect(result.current.sortOrder).toBe('asc');
    });

    it('should set loading state during API call', async () => {
      let resolvePromise: (value: any) => void;
      const mockPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockApi.getJournalEntries.mockReturnValue(mockPromise);

      const { result } = renderHook(() => useJournalViewModel());

      act(() => {
        result.current.loadEntries('test-token');
      });

      expect(result.current.isLoadingEntries).toBe(true);

      act(() => {
        resolvePromise!(createMockResponse());
      });

      await waitFor(() => {
        expect(result.current.isLoadingEntries).toBe(false);
      });
    });

    it('should handle API errors', async () => {
      const mockError = new Error('Network error');
      mockApi.getJournalEntries.mockRejectedValue(mockError);

      const { result } = renderHook(() => useJournalViewModel());

      await act(async () => {
        await result.current.loadEntries('test-token');
      });

      await waitFor(() => {
        expect(result.current.error).toBe(mockError);
        expect(result.current.isLoadingEntries).toBe(false);
      });
    });

    it('should handle empty tags array', async () => {
      const mockResponse = createMockResponse();
      mockApi.getJournalEntries.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useJournalViewModel());

      await act(async () => {
        await result.current.loadEntries('test-token', {
          tags: []
        });
      });

      expect(mockApi.getJournalEntries).toHaveBeenCalledWith('test-token', {
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });
    });
  });

  describe('createEntry', () => {
    it('should create entry successfully', async () => {
      const mockEntry = createMockEntry({ content: 'New entry' });
      mockApi.createJournalEntry.mockResolvedValue({ entry: mockEntry });
      mockApi.getJournalEntries.mockResolvedValue(createMockResponse([mockEntry]));

      const { result } = renderHook(() => useJournalViewModel());

      // Set form data
      act(() => {
        result.current.setNewEntry('New entry content');
        result.current.setNewTags('tag1, tag2, tag3');
      });

      let createResult: boolean;
      await act(async () => {
        createResult = await result.current.createEntry('test-token');
      });

      expect(createResult!).toBe(true);
      expect(mockApi.createJournalEntry).toHaveBeenCalledWith(
        {
          content: 'New entry content',
          tags: ['tag1', 'tag2', 'tag3']
        },
        'test-token'
      );

      await waitFor(() => {
        expect(result.current.newEntry).toBe('');
        expect(result.current.newTags).toBe('');
        expect(result.current.successMessage).toBe('Entry saved successfully');
        expect(result.current.isSaving).toBe(false);
      });
    });

    it('should not create entry with empty content', async () => {
      const { result } = renderHook(() => useJournalViewModel());

      act(() => {
        result.current.setNewEntry('   ');
      });

      let createResult: boolean;
      await act(async () => {
        createResult = await result.current.createEntry('test-token');
      });

      expect(createResult!).toBe(false);
      expect(mockApi.createJournalEntry).not.toHaveBeenCalled();
    });

    it('should handle tag processing correctly', async () => {
      mockApi.createJournalEntry.mockResolvedValue({ entry: createMockEntry() });
      mockApi.getJournalEntries.mockResolvedValue(createMockResponse());

      const { result } = renderHook(() => useJournalViewModel());

      act(() => {
        result.current.setNewEntry('Test content');
        result.current.setNewTags('  Tag1 , tag2,  , TAG3 ,  ');
      });

      await act(async () => {
        await result.current.createEntry('test-token');
      });

      expect(mockApi.createJournalEntry).toHaveBeenCalledWith(
        {
          content: 'Test content',
          tags: ['tag1', 'tag2', 'tag3']
        },
        'test-token'
      );
    });

    it('should handle empty tags', async () => {
      mockApi.createJournalEntry.mockResolvedValue({ entry: createMockEntry() });
      mockApi.getJournalEntries.mockResolvedValue(createMockResponse());

      const { result } = renderHook(() => useJournalViewModel());

      act(() => {
        result.current.setNewEntry('Test content');
        result.current.setNewTags('');
      });

      await act(async () => {
        await result.current.createEntry('test-token');
      });

      expect(mockApi.createJournalEntry).toHaveBeenCalledWith(
        {
          content: 'Test content',
          tags: undefined
        },
        'test-token'
      );
    });

    it('should reload entries with current filters after creation', async () => {
      mockApi.createJournalEntry.mockResolvedValue({ entry: createMockEntry() });
      mockApi.getJournalEntries.mockResolvedValue(createMockResponse());

      const { result } = renderHook(() => useJournalViewModel());

      // Set some filters
      act(() => {
        result.current.setSearchQuery('test search');
        result.current.setSelectedTags(['tag1', 'tag2']);
        result.current.setCurrentPage(2);
        result.current.setItemsPerPage(10);
        result.current.setSortBy('content');
        result.current.setSortOrder('asc');
        result.current.setNewEntry('Test content');
      });

      await act(async () => {
        await result.current.createEntry('test-token');
      });

      // Should call loadEntries twice: once for creation reload
      expect(mockApi.getJournalEntries).toHaveBeenCalledWith('test-token', {
        search: 'test search',
        tags: 'tag1,tag2',
        page: 2,
        limit: 10,
        sortBy: 'content',
        sortOrder: 'asc'
      });
    });

    it('should handle creation errors', async () => {
      const mockError = new Error('Creation failed');
      mockApi.createJournalEntry.mockRejectedValue(mockError);

      const { result } = renderHook(() => useJournalViewModel());

      act(() => {
        result.current.setNewEntry('Test content');
      });

      let createResult: boolean;
      await act(async () => {
        createResult = await result.current.createEntry('test-token');
      });

      expect(createResult!).toBe(false);

      await waitFor(() => {
        expect(result.current.error).toBe(mockError);
        expect(result.current.isSaving).toBe(false);
      });
    });
  });

  describe('updateEntry', () => {
    it('should update entry successfully', async () => {
      mockApi.updateJournalEntry.mockResolvedValue({ entry: createMockEntry() });
      mockApi.getJournalEntries.mockResolvedValue(createMockResponse());

      const { result } = renderHook(() => useJournalViewModel());

      let updateResult: boolean;
      await act(async () => {
        updateResult = await result.current.updateEntry(
          'test-id',
          { content: 'Updated content', tags: ['updated', 'tags'] },
          'test-token'
        );
      });

      expect(updateResult!).toBe(true);
      expect(mockApi.updateJournalEntry).toHaveBeenCalledWith(
        'test-id',
        { content: 'Updated content', tags: ['updated', 'tags'] },
        'test-token'
      );
    });

    it('should reload entries with current filters after update', async () => {
      mockApi.updateJournalEntry.mockResolvedValue({ entry: createMockEntry() });
      mockApi.getJournalEntries.mockResolvedValue(createMockResponse());

      const { result } = renderHook(() => useJournalViewModel());

      // Set filters
      act(() => {
        result.current.setSearchQuery('test');
        result.current.setSelectedTags(['tag1']);
        result.current.setCurrentPage(3);
      });

      await act(async () => {
        await result.current.updateEntry('test-id', { content: 'Updated' }, 'test-token');
      });

      expect(mockApi.getJournalEntries).toHaveBeenCalledWith('test-token', {
        search: 'test',
        tags: 'tag1',
        page: 3,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });
    });

    it('should handle update errors', async () => {
      const mockError = new Error('Update failed');
      mockApi.updateJournalEntry.mockRejectedValue(mockError);

      const { result } = renderHook(() => useJournalViewModel());

      let updateResult: boolean;
      await act(async () => {
        updateResult = await result.current.updateEntry('test-id', {}, 'test-token');
      });

      expect(updateResult!).toBe(false);
      expect(result.current.error).toBe(mockError);
    });
  });

  describe('deleteEntry', () => {
    it('should delete entry successfully', async () => {
      mockApi.deleteJournalEntry.mockResolvedValue({});
      mockApi.getJournalEntries.mockResolvedValue(createMockResponse());

      const { result } = renderHook(() => useJournalViewModel());

      await act(async () => {
        await result.current.deleteEntry('test-id', 'test-token');
      });

      expect(mockApi.deleteJournalEntry).toHaveBeenCalledWith('test-id', 'test-token');
    });

    it('should reload entries after deletion', async () => {
      mockApi.deleteJournalEntry.mockResolvedValue({});
      mockApi.getJournalEntries.mockResolvedValue(createMockResponse());

      const { result } = renderHook(() => useJournalViewModel());

      await act(async () => {
        await result.current.deleteEntry('test-id', 'test-token');
      });

      expect(mockApi.getJournalEntries).toHaveBeenCalled();
    });

    it('should handle deletion errors', async () => {
      const mockError = new Error('Delete failed');
      mockApi.deleteJournalEntry.mockRejectedValue(mockError);

      const { result } = renderHook(() => useJournalViewModel());

      await act(async () => {
        await result.current.deleteEntry('test-id', 'test-token');
      });

      expect(result.current.error).toBe(mockError);
    });
  });

  describe('State Management Actions', () => {
    it('should update search query', () => {
      const { result } = renderHook(() => useJournalViewModel());

      act(() => {
        result.current.setSearchQuery('new search');
      });

      expect(result.current.searchQuery).toBe('new search');
    });

    it('should update selected tags', () => {
      const { result } = renderHook(() => useJournalViewModel());

      act(() => {
        result.current.setSelectedTags(['tag1', 'tag2']);
      });

      expect(result.current.selectedTags).toEqual(['tag1', 'tag2']);
    });

    it('should add selected tag if not already present', () => {
      const { result } = renderHook(() => useJournalViewModel());

      act(() => {
        result.current.setSelectedTags(['tag1']);
        result.current.addSelectedTag('tag2');
      });

      expect(result.current.selectedTags).toEqual(['tag1', 'tag2']);
    });

    it('should not add duplicate tags', () => {
      const { result } = renderHook(() => useJournalViewModel());

      act(() => {
        result.current.setSelectedTags(['tag1']);
        result.current.addSelectedTag('tag1');
      });

      expect(result.current.selectedTags).toEqual(['tag1']);
    });

    it('should remove selected tag', () => {
      const { result } = renderHook(() => useJournalViewModel());

      act(() => {
        result.current.setSelectedTags(['tag1', 'tag2', 'tag3']);
        result.current.removeSelectedTag('tag2');
      });

      expect(result.current.selectedTags).toEqual(['tag1', 'tag3']);
    });

    it('should update current page', () => {
      const { result } = renderHook(() => useJournalViewModel());

      act(() => {
        result.current.setCurrentPage(3);
      });

      expect(result.current.currentPage).toBe(3);
    });

    it('should update items per page and reset to first page', () => {
      const { result } = renderHook(() => useJournalViewModel());

      act(() => {
        result.current.setCurrentPage(5);
        result.current.setItemsPerPage(50);
      });

      expect(result.current.itemsPerPage).toBe(50);
      expect(result.current.currentPage).toBe(1); // Should reset to first page
    });

    it('should update sort by', () => {
      const { result } = renderHook(() => useJournalViewModel());

      act(() => {
        result.current.setSortBy('content');
      });

      expect(result.current.sortBy).toBe('content');
    });

    it('should update sort order', () => {
      const { result } = renderHook(() => useJournalViewModel());

      act(() => {
        result.current.setSortOrder('asc');
      });

      expect(result.current.sortOrder).toBe('asc');
    });

    it('should update new entry content', () => {
      const { result } = renderHook(() => useJournalViewModel());

      act(() => {
        result.current.setNewEntry('New journal content');
      });

      expect(result.current.newEntry).toBe('New journal content');
    });

    it('should update new tags', () => {
      const { result } = renderHook(() => useJournalViewModel());

      act(() => {
        result.current.setNewTags('tag1, tag2');
      });

      expect(result.current.newTags).toBe('tag1, tag2');
    });

    it('should toggle show prompts', () => {
      const { result } = renderHook(() => useJournalViewModel());

      act(() => {
        result.current.setShowPrompts(true);
      });

      expect(result.current.showPrompts).toBe(true);

      act(() => {
        result.current.setShowPrompts(false);
      });

      expect(result.current.showPrompts).toBe(false);
    });

    it('should insert prompt and update new entry', () => {
      const { result } = renderHook(() => useJournalViewModel());

      act(() => {
        result.current.setNewEntry('Existing content');
        result.current.setShowPrompts(true);
        result.current.insertPrompt('What am I grateful for today?');
      });

      expect(result.current.newEntry).toBe('Existing content\n\nWhat am I grateful for today?\n\n');
      expect(result.current.showPrompts).toBe(false);
    });

    it('should insert prompt into empty entry', () => {
      const { result } = renderHook(() => useJournalViewModel());

      act(() => {
        result.current.insertPrompt('What am I grateful for today?');
      });

      expect(result.current.newEntry).toBe('What am I grateful for today?\n\n');
    });

    it('should clear error', () => {
      const { result } = renderHook(() => useJournalViewModel());

      // Set an error first
      act(() => {
        result.current.loadEntries('invalid-token').catch(() => {});
      });

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });

    it('should clear success message', () => {
      const { result } = renderHook(() => useJournalViewModel());

      // Create entry to set success message
      mockApi.createJournalEntry.mockResolvedValue({ entry: createMockEntry() });
      mockApi.getJournalEntries.mockResolvedValue(createMockResponse());

      act(() => {
        result.current.setNewEntry('Test');
      });

      act(async () => {
        await result.current.createEntry('test-token');
      });

      act(() => {
        result.current.clearSuccessMessage();
      });

      expect(result.current.successMessage).toBe('');
    });

    it('should reset to initial state', () => {
      const { result } = renderHook(() => useJournalViewModel());

      // Change some state
      act(() => {
        result.current.setSearchQuery('test');
        result.current.setSelectedTags(['tag1']);
        result.current.setNewEntry('content');
        result.current.setCurrentPage(3);
        result.current.reset();
      });

      expect(result.current.searchQuery).toBe('');
      expect(result.current.selectedTags).toEqual([]);
      expect(result.current.newEntry).toBe('');
      expect(result.current.currentPage).toBe(1);
      expect(result.current.entries).toEqual([]);
      expect(result.current.pagination).toBeNull();
    });
  });

  describe('Complex State Interactions', () => {
    it('should maintain filter state during entry operations', async () => {
      mockApi.createJournalEntry.mockResolvedValue({ entry: createMockEntry() });
      mockApi.getJournalEntries.mockResolvedValue(createMockResponse());

      const { result } = renderHook(() => useJournalViewModel());

      // Set complex filter state
      act(() => {
        result.current.setSearchQuery('prayer');
        result.current.setSelectedTags(['spirituality', 'morning']);
        result.current.setCurrentPage(2);
        result.current.setItemsPerPage(10);
        result.current.setSortBy('content');
        result.current.setSortOrder('asc');
        result.current.setNewEntry('New reflection');
      });

      await act(async () => {
        await result.current.createEntry('test-token');
      });

      // Filters should be maintained
      expect(result.current.searchQuery).toBe('prayer');
      expect(result.current.selectedTags).toEqual(['spirituality', 'morning']);
      expect(result.current.currentPage).toBe(2);
      expect(result.current.itemsPerPage).toBe(10);
      expect(result.current.sortBy).toBe('content');
      expect(result.current.sortOrder).toBe('asc');

      // Form should be reset
      expect(result.current.newEntry).toBe('');
    });

    it('should handle concurrent operations correctly', async () => {
      mockApi.getJournalEntries.mockResolvedValue(createMockResponse());
      mockApi.createJournalEntry.mockResolvedValue({ entry: createMockEntry() });

      const { result } = renderHook(() => useJournalViewModel());

      act(() => {
        result.current.setNewEntry('Test content');
      });

      // Start multiple operations
      const promises = [
        act(async () => {
          await result.current.loadEntries('test-token');
        }),
        act(async () => {
          await result.current.createEntry('test-token');
        })
      ];

      await Promise.all(promises);

      // Should complete without errors
      expect(result.current.error).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should clear error when starting new operations', async () => {
      const mockError = new Error('Previous error');
      mockApi.getJournalEntries.mockRejectedValueOnce(mockError);
      mockApi.getJournalEntries.mockResolvedValue(createMockResponse());

      const { result } = renderHook(() => useJournalViewModel());

      // First call fails
      await act(async () => {
        await result.current.loadEntries('test-token');
      });

      expect(result.current.error).toBe(mockError);

      // Second call should clear error
      await act(async () => {
        await result.current.loadEntries('test-token');
      });

      expect(result.current.error).toBeNull();
    });

    it('should preserve form data on API errors', async () => {
      const mockError = new Error('Creation failed');
      mockApi.createJournalEntry.mockRejectedValue(mockError);

      const { result } = renderHook(() => useJournalViewModel());

      act(() => {
        result.current.setNewEntry('Important content');
        result.current.setNewTags('important, tags');
      });

      await act(async () => {
        await result.current.createEntry('test-token');
      });

      // Form data should be preserved on error
      expect(result.current.newEntry).toBe('Important content');
      expect(result.current.newTags).toBe('important, tags');
      expect(result.current.error).toBe(mockError);
    });
  });
});