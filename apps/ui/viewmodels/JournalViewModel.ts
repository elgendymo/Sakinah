import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { api } from '@/lib/api';

interface JournalEntry {
  id: string;
  content: string;
  tags?: string[];
  createdAt: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface JournalState {
  // State
  entries: JournalEntry[];
  isLoading: boolean;
  isLoadingEntries: boolean;
  isSaving: boolean;
  error: Error | null;
  successMessage: string;
  searchQuery: string;
  selectedTags: string[];

  // Pagination state
  pagination: PaginationInfo | null;
  currentPage: number;
  itemsPerPage: number;
  sortBy: 'createdAt' | 'content';
  sortOrder: 'asc' | 'desc';

  // Form state
  newEntry: string;
  newTags: string;
  showPrompts: boolean;

  // Actions
  loadEntries: (token: string, params?: {
    search?: string;
    tags?: string[];
    page?: number;
    limit?: number;
    sortBy?: 'createdAt' | 'content';
    sortOrder?: 'asc' | 'desc';
  }) => Promise<void>;
  createEntry: (token: string) => Promise<boolean>;
  updateEntry: (entryId: string, data: { content?: string; tags?: string[] }, token: string) => Promise<boolean>;
  deleteEntry: (entryId: string, token: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setSelectedTags: (tags: string[]) => void;
  addSelectedTag: (tag: string) => void;
  removeSelectedTag: (tag: string) => void;
  setCurrentPage: (page: number) => void;
  setItemsPerPage: (limit: number) => void;
  setSortBy: (sortBy: 'createdAt' | 'content') => void;
  setSortOrder: (sortOrder: 'asc' | 'desc') => void;
  setNewEntry: (content: string) => void;
  setNewTags: (tags: string) => void;
  setShowPrompts: (show: boolean) => void;
  insertPrompt: (prompt: string) => void;
  clearError: () => void;
  clearSuccessMessage: () => void;
  reset: () => void;
}

const initialState = {
  entries: [],
  isLoading: false,
  isLoadingEntries: false,
  isSaving: false,
  error: null,
  successMessage: '',
  searchQuery: '',
  selectedTags: [],
  pagination: null,
  currentPage: 1,
  itemsPerPage: 20,
  sortBy: 'createdAt' as const,
  sortOrder: 'desc' as const,
  newEntry: '',
  newTags: '',
  showPrompts: false,
};

export const useJournalViewModel = create<JournalState>()(
  immer((set, get) => ({
    ...initialState,

    loadEntries: async (token: string, params?: {
      search?: string;
      tags?: string[];
      page?: number;
      limit?: number;
      sortBy?: 'createdAt' | 'content';
      sortOrder?: 'asc' | 'desc';
    }) => {
      console.log('[JournalViewModel] loadEntries called with:', { token, params });
      set((state) => {
        state.isLoadingEntries = true;
        state.error = null;
      });

      try {
        const {
          search,
          tags,
          page = get().currentPage,
          limit = get().itemsPerPage,
          sortBy = get().sortBy,
          sortOrder = get().sortOrder
        } = params || {};

        const apiParams: any = {
          page,
          limit,
          sortBy,
          sortOrder
        };

        if (search) {
          apiParams.search = search;
        }

        if (tags && tags.length > 0) {
          apiParams.tags = tags.join(',');
        }

        const response = await api.getJournalEntries(token, apiParams) as {
          entries: JournalEntry[];
          pagination: PaginationInfo;
        };

        console.log('[JournalViewModel] Loaded entries:', response);
        console.log('[JournalViewModel] Response type:', typeof response);
        console.log('[JournalViewModel] Response entries:', response.entries);
        console.log('[JournalViewModel] Entries length:', response.entries ? response.entries.length : 'NO ENTRIES PROPERTY');

        set((state) => {
          state.entries = response.entries || [];
          state.pagination = response.pagination || null;
          state.currentPage = page;
          state.itemsPerPage = limit;
          state.sortBy = sortBy;
          state.sortOrder = sortOrder;
          state.isLoadingEntries = false;
          state.error = null; // Clear any previous errors on successful load
        });
      } catch (error) {
        console.error('[JournalViewModel] Error loading entries:', error);

        // Categorize errors for better user experience
        const isNetworkError = error instanceof Error &&
          (error.message.includes('Network request failed') ||
           error.message.includes('TypeError: Failed to fetch') ||
           error.message.includes('ERR_NETWORK') ||
           error.name === 'NetworkError');

        const isAuthError = error instanceof Error &&
          (error.message.includes('401') ||
           error.message.includes('403') ||
           error.message.includes('Unauthorized'));

        const isNotFoundError = error instanceof Error &&
          (error.message.includes('404') ||
           error.message.includes('No journal entries found'));

        set((state) => {
          state.isLoadingEntries = false;

          if (isNotFoundError) {
            // Not an error, just no entries found
            state.entries = [];
            state.pagination = null;
            state.error = null;
          } else if (isNetworkError) {
            // Network issues - show helpful message but don't clear existing entries
            state.error = new Error('Unable to load entries. Please check your connection and try again.');
          } else if (isAuthError) {
            // Auth issues - clear entries and show auth error
            state.entries = [];
            state.pagination = null;
            state.error = new Error('Please log in again to access your journal entries.');
          } else {
            // Other errors - show generic message but log details
            state.error = new Error('Failed to load journal entries. Please try again.');
          }
        });
      }
    },

    createEntry: async (token: string) => {
      const { newEntry, newTags } = get();

      if (!newEntry.trim()) {
        return false;
      }

      set((state) => {
        state.isSaving = true;
        state.error = null;
        state.successMessage = '';
      });

      try {
        const tags = newTags
          .split(',')
          .map(tag => tag.trim().toLowerCase())
          .filter(tag => tag);

        await api.createJournalEntry(
          { content: newEntry, tags: tags.length > 0 ? tags : undefined },
          token
        );

        // Reload entries with current filters
        const { searchQuery, selectedTags, currentPage, itemsPerPage, sortBy, sortOrder } = get();
        await get().loadEntries(token, {
          search: searchQuery || undefined,
          tags: selectedTags.length > 0 ? selectedTags : undefined,
          page: currentPage,
          limit: itemsPerPage,
          sortBy,
          sortOrder
        });

        set((state) => {
          state.newEntry = '';
          state.newTags = '';
          state.isSaving = false;
          state.successMessage = '🎉 Alhamdulillah! Your spiritual reflection has been saved successfully. May Allah accept your sincere intentions and grant you wisdom from this journey.';
        });

        // Auto-clear success message after 6 seconds (longer for spiritual message)
        setTimeout(() => {
          set((state) => {
            state.successMessage = '';
          });
        }, 6000);

        return true;
      } catch (error) {
        set((state) => {
          state.error = error as Error;
          state.isSaving = false;
        });
        return false;
      }
    },

    updateEntry: async (entryId: string, data: { content?: string; tags?: string[] }, token: string) => {
      set((state) => {
        state.error = null;
        state.successMessage = '';
      });

      try {
        await api.updateJournalEntry(entryId, data, token);
        // Reload entries with current filters
        const { searchQuery, selectedTags, currentPage, itemsPerPage, sortBy, sortOrder } = get();
        await get().loadEntries(token, {
          search: searchQuery || undefined,
          tags: selectedTags.length > 0 ? selectedTags : undefined,
          page: currentPage,
          limit: itemsPerPage,
          sortBy,
          sortOrder
        });

        set((state) => {
          state.successMessage = '📝 Your journal entry has been updated successfully!';
        });

        // Auto-clear success message after 3 seconds
        setTimeout(() => {
          set((state) => {
            state.successMessage = '';
          });
        }, 3000);

        return true;
      } catch (error) {
        set((state) => {
          state.error = error as Error;
        });
        return false;
      }
    },

    deleteEntry: async (entryId: string, token: string) => {
      set((state) => {
        state.error = null;
        state.successMessage = '';
      });

      try {
        await api.deleteJournalEntry(entryId, token);
        // Reload entries with current filters
        const { searchQuery, selectedTags, currentPage, itemsPerPage, sortBy, sortOrder } = get();
        await get().loadEntries(token, {
          search: searchQuery || undefined,
          tags: selectedTags.length > 0 ? selectedTags : undefined,
          page: currentPage,
          limit: itemsPerPage,
          sortBy,
          sortOrder
        });

        set((state) => {
          state.successMessage = '🗑️ Journal entry has been deleted successfully.';
        });

        // Auto-clear success message after 3 seconds
        setTimeout(() => {
          set((state) => {
            state.successMessage = '';
          });
        }, 3000);
      } catch (error) {
        set((state) => {
          state.error = error as Error;
        });
      }
    },

    setSearchQuery: (query: string) => {
      set((state) => {
        state.searchQuery = query;
      });
    },

    setSelectedTags: (tags: string[]) => {
      set((state) => {
        state.selectedTags = tags;
      });
    },

    addSelectedTag: (tag: string) => {
      set((state) => {
        if (!state.selectedTags.includes(tag)) {
          state.selectedTags.push(tag);
        }
      });
    },

    removeSelectedTag: (tag: string) => {
      set((state) => {
        state.selectedTags = state.selectedTags.filter(t => t !== tag);
      });
    },

    setCurrentPage: (page: number) => {
      set((state) => {
        state.currentPage = page;
      });
    },

    setItemsPerPage: (limit: number) => {
      set((state) => {
        state.itemsPerPage = limit;
        state.currentPage = 1; // Reset to first page when changing items per page
      });
    },

    setSortBy: (sortBy: 'createdAt' | 'content') => {
      set((state) => {
        state.sortBy = sortBy;
      });
    },

    setSortOrder: (sortOrder: 'asc' | 'desc') => {
      set((state) => {
        state.sortOrder = sortOrder;
      });
    },

    setNewEntry: (content: string) => {
      set((state) => {
        state.newEntry = content;
      });
    },

    setNewTags: (tags: string) => {
      set((state) => {
        state.newTags = tags;
      });
    },

    setShowPrompts: (show: boolean) => {
      set((state) => {
        state.showPrompts = show;
      });
    },

    insertPrompt: (prompt: string) => {
      set((state) => {
        const prev = state.newEntry;
        state.newEntry = prev + (prev ? '\n\n' : '') + prompt + '\n\n';
        state.showPrompts = false;
      });
    },

    clearError: () => {
      set((state) => {
        state.error = null;
      });
    },

    clearSuccessMessage: () => {
      set((state) => {
        state.successMessage = '';
      });
    },

    reset: () => {
      set(() => initialState);
    },
  }))
);