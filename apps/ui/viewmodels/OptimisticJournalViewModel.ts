import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { api } from '@/lib/api';

interface JournalEntry {
  id: string;
  content: string;
  tags?: string[];
  createdAt: string;
  isOptimistic?: boolean; // Flag for optimistic entries
  isFailing?: boolean; // Flag for entries that failed to save
}

interface OptimisticJournalState {
  // State
  entries: JournalEntry[];
  isLoading: boolean;
  isLoadingEntries: boolean;
  isSaving: boolean;
  error: Error | null;
  successMessage: string;
  searchQuery: string;

  // Form state
  newEntry: string;
  newTags: string;
  showPrompts: boolean;

  // Optimistic state
  pendingOperations: number;
  failedOperations: Map<string, { entry: JournalEntry; error: Error }>;

  // Actions
  loadEntries: (token: string, search?: string) => Promise<void>;
  createEntry: (token: string) => Promise<boolean>;
  deleteEntry: (entryId: string, token: string) => Promise<void>;
  retryFailedEntry: (entryId: string, token: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
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
  newEntry: '',
  newTags: '',
  showPrompts: false,
  pendingOperations: 0,
  failedOperations: new Map(),
};

export const useOptimisticJournalViewModel = create<OptimisticJournalState>()(
  immer((set, get) => ({
    ...initialState,

    loadEntries: async (token: string, search?: string) => {
      set((state) => {
        state.isLoadingEntries = true;
        state.error = null;
      });

      try {
        const params = search ? { search } : undefined;
        const response = await api.getJournalEntries(token, params) as { entries: JournalEntry[] };
        set((state) => {
          // Merge server data with optimistic entries
          const serverEntries = response.entries || [];
          const optimisticEntries = state.entries.filter(entry => entry.isOptimistic && !entry.isFailing);

          // Remove any optimistic entries that are now confirmed on server
          const confirmedIds = new Set(serverEntries.map(entry => entry.id));
          const validOptimisticEntries = optimisticEntries.filter(entry => !confirmedIds.has(entry.id));

          state.entries = [...validOptimisticEntries, ...serverEntries]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          state.isLoadingEntries = false;
        });
      } catch (error) {
        set((state) => {
          state.error = error as Error;
          state.isLoadingEntries = false;
        });
      }
    },

    createEntry: async (token: string) => {
      const { newEntry, newTags } = get();

      if (!newEntry.trim()) {
        return false;
      }

      const tags = newTags
        .split(',')
        .map(tag => tag.trim().toLowerCase())
        .filter(tag => tag);

      // Generate optimistic entry
      const optimisticEntry: JournalEntry = {
        id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        content: newEntry,
        tags: tags.length > 0 ? tags : undefined,
        createdAt: new Date().toISOString(),
        isOptimistic: true
      };

      // Apply optimistic update immediately
      set((state) => {
        state.entries = [optimisticEntry, ...state.entries];
        state.newEntry = '';
        state.newTags = '';
        state.isSaving = true;
        state.pendingOperations += 1;
        state.error = null;
        state.successMessage = '';
      });

      try {
        // Make API call
        const response = await api.createJournalEntry(
          { content: newEntry, tags: tags.length > 0 ? tags : undefined },
          token
        ) as { entry: JournalEntry };

        // Success - update the optimistic entry with real data
        set((state) => {
          const entryIndex = state.entries.findIndex(entry => entry.id === optimisticEntry.id);
          if (entryIndex !== -1) {
            // Replace optimistic entry with real entry
            state.entries[entryIndex] = {
              ...response.entry,
              isOptimistic: false
            };
          }
          state.pendingOperations = Math.max(0, state.pendingOperations - 1);
          state.isSaving = state.pendingOperations > 0;
          state.successMessage = 'Entry saved successfully';
        });

        return true;

      } catch (error) {
        // Failure - mark entry as failed
        set((state) => {
          const entryIndex = state.entries.findIndex(entry => entry.id === optimisticEntry.id);
          if (entryIndex !== -1) {
            state.entries[entryIndex] = {
              ...optimisticEntry,
              isFailing: true
            };
          }

          state.failedOperations.set(optimisticEntry.id, {
            entry: optimisticEntry,
            error: error as Error
          });

          state.pendingOperations = Math.max(0, state.pendingOperations - 1);
          state.isSaving = state.pendingOperations > 0;
          state.error = error as Error;
        });

        return false;
      }
    },

    deleteEntry: async (entryId: string, token: string) => {
      // Find the entry to delete
      const entryToDelete = get().entries.find(entry => entry.id === entryId);
      if (!entryToDelete) return;

      // Apply optimistic update immediately
      set((state) => {
        state.entries = state.entries.filter(entry => entry.id !== entryId);
        state.error = null;
        state.pendingOperations += 1;
      });

      try {
        await api.deleteJournalEntry(entryId, token);

        // Success
        set((state) => {
          state.pendingOperations = Math.max(0, state.pendingOperations - 1);
          // Remove from failed operations if it was there
          state.failedOperations.delete(entryId);
        });

      } catch (error) {
        // Failure - restore the entry
        set((state) => {
          state.entries = [entryToDelete, ...state.entries]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          state.pendingOperations = Math.max(0, state.pendingOperations - 1);
          state.error = error as Error;
        });
      }
    },

    retryFailedEntry: async (entryId: string, token: string) => {
      const failedOperation = get().failedOperations.get(entryId);
      if (!failedOperation) return;

      const { entry } = failedOperation;

      // Update UI to show retry in progress
      set((state) => {
        const entryIndex = state.entries.findIndex(e => e.id === entryId);
        if (entryIndex !== -1) {
          state.entries[entryIndex] = {
            ...entry,
            isFailing: false,
            isOptimistic: true
          };
        }
        state.pendingOperations += 1;
        state.isSaving = true;
        state.error = null;
        state.failedOperations.delete(entryId);
      });

      try {
        const response = await api.createJournalEntry(
          { content: entry.content, tags: entry.tags },
          token
        ) as { entry: JournalEntry };

        // Success - replace with real entry
        set((state) => {
          const entryIndex = state.entries.findIndex(e => e.id === entryId);
          if (entryIndex !== -1) {
            state.entries[entryIndex] = {
              ...response.entry,
              isOptimistic: false
            };
          }
          state.pendingOperations = Math.max(0, state.pendingOperations - 1);
          state.isSaving = state.pendingOperations > 0;
          state.successMessage = 'Entry saved successfully';
        });

      } catch (error) {
        // Failed again
        set((state) => {
          const entryIndex = state.entries.findIndex(e => e.id === entryId);
          if (entryIndex !== -1) {
            state.entries[entryIndex] = {
              ...entry,
              isFailing: true
            };
          }
          state.failedOperations.set(entryId, { entry, error: error as Error });
          state.pendingOperations = Math.max(0, state.pendingOperations - 1);
          state.isSaving = state.pendingOperations > 0;
          state.error = error as Error;
        });
      }
    },

    setSearchQuery: (query: string) => {
      set((state) => {
        state.searchQuery = query;
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
      set(() => ({
        ...initialState,
        failedOperations: new Map()
      }));
    },
  }))
);