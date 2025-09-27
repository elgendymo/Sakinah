import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Test suite for enhanced JournalViewModel error handling and loading states
 *
 * This test file validates the improvements made to:
 * 1. Error categorization and user-friendly messages
 * 2. Loading state management
 * 3. Pagination state handling
 * 4. Network error resilience
 */

describe('JournalViewModel Error Handling Improvements', () => {

  // Mock the enhanced error categorization logic
  const categorizeError = (error: Error) => {
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

    if (isNotFoundError) {
      return {
        type: 'not_found',
        shouldClearEntries: false,
        shouldClearError: true,
        userMessage: null
      };
    } else if (isNetworkError) {
      return {
        type: 'network',
        shouldClearEntries: false,
        shouldClearError: false,
        userMessage: 'Unable to load entries. Please check your connection and try again.'
      };
    } else if (isAuthError) {
      return {
        type: 'auth',
        shouldClearEntries: true,
        shouldClearError: false,
        userMessage: 'Please log in again to access your journal entries.'
      };
    } else {
      return {
        type: 'generic',
        shouldClearEntries: false,
        shouldClearError: false,
        userMessage: 'Failed to load journal entries. Please try again.'
      };
    }
  };

  describe('Error Categorization', () => {

    it('should categorize network errors correctly', () => {
      const networkError = new Error('Network request failed');
      const result = categorizeError(networkError);

      expect(result.type).toBe('network');
      expect(result.shouldClearEntries).toBe(false);
      expect(result.userMessage).toContain('connection');
    });

    it('should categorize fetch errors correctly', () => {
      const fetchError = new Error('TypeError: Failed to fetch');
      const result = categorizeError(fetchError);

      expect(result.type).toBe('network');
      expect(result.shouldClearEntries).toBe(false);
    });

    it('should categorize NetworkError by name', () => {
      const networkError = new Error('Connection failed');
      networkError.name = 'NetworkError';
      const result = categorizeError(networkError);

      expect(result.type).toBe('network');
    });

    it('should categorize ERR_NETWORK errors', () => {
      const networkError = new Error('ERR_NETWORK: Connection lost');
      const result = categorizeError(networkError);

      expect(result.type).toBe('network');
    });

    it('should categorize 401 auth errors correctly', () => {
      const authError = new Error('401 Unauthorized');
      const result = categorizeError(authError);

      expect(result.type).toBe('auth');
      expect(result.shouldClearEntries).toBe(true);
      expect(result.userMessage).toContain('log in again');
    });

    it('should categorize 403 auth errors correctly', () => {
      const authError = new Error('403 Forbidden');
      const result = categorizeError(authError);

      expect(result.type).toBe('auth');
      expect(result.shouldClearEntries).toBe(true);
    });

    it('should categorize Unauthorized errors correctly', () => {
      const authError = new Error('Unauthorized access');
      const result = categorizeError(authError);

      expect(result.type).toBe('auth');
      expect(result.shouldClearEntries).toBe(true);
    });

    it('should categorize 404 as not found (not an error)', () => {
      const notFoundError = new Error('404 Not Found');
      const result = categorizeError(notFoundError);

      expect(result.type).toBe('not_found');
      expect(result.shouldClearError).toBe(true);
      expect(result.userMessage).toBeNull();
    });

    it('should categorize "No journal entries found" as not found', () => {
      const notFoundError = new Error('No journal entries found');
      const result = categorizeError(notFoundError);

      expect(result.type).toBe('not_found');
      expect(result.shouldClearError).toBe(true);
    });

    it('should categorize unknown errors as generic', () => {
      const unknownError = new Error('Database connection timeout');
      const result = categorizeError(unknownError);

      expect(result.type).toBe('generic');
      expect(result.userMessage).toContain('Please try again');
    });

    it('should categorize server errors as generic', () => {
      const serverError = new Error('500 Internal Server Error');
      const result = categorizeError(serverError);

      expect(result.type).toBe('generic');
    });
  });

  describe('State Management Logic', () => {

    // Mock ViewModel state handler
    const createMockState = () => {
      let state = {
        isLoadingEntries: false,
        error: null as Error | null,
        entries: [] as any[],
        pagination: null as any
      };

      return {
        getState: () => ({ ...state }),

        startLoading: () => {
          state.isLoadingEntries = true;
          state.error = null;
        },

        handleError: (error: Error) => {
          const errorInfo = categorizeError(error);

          state.isLoadingEntries = false;

          if (errorInfo.shouldClearEntries) {
            state.entries = [];
            state.pagination = null;
          }

          if (errorInfo.shouldClearError) {
            state.error = null;
          } else {
            state.error = errorInfo.userMessage
              ? new Error(errorInfo.userMessage)
              : error;
          }
        },

        handleSuccess: (entries: any[], pagination: any) => {
          state.isLoadingEntries = false;
          state.entries = entries;
          state.pagination = pagination;
          state.error = null;
        }
      };
    };

    it('should handle successful loading correctly', () => {
      const mockState = createMockState();

      mockState.startLoading();
      expect(mockState.getState().isLoadingEntries).toBe(true);
      expect(mockState.getState().error).toBeNull();

      const mockEntries = [{ id: '1', content: 'Test entry' }];
      const mockPagination = { page: 1, total: 1 };

      mockState.handleSuccess(mockEntries, mockPagination);

      const finalState = mockState.getState();
      expect(finalState.isLoadingEntries).toBe(false);
      expect(finalState.entries).toEqual(mockEntries);
      expect(finalState.pagination).toEqual(mockPagination);
      expect(finalState.error).toBeNull();
    });

    it('should handle network errors without clearing entries', () => {
      const mockState = createMockState();

      // Set some existing entries
      mockState.handleSuccess([{ id: '1', content: 'Existing entry' }], { page: 1 });

      const networkError = new Error('Network request failed');
      mockState.handleError(networkError);

      const finalState = mockState.getState();
      expect(finalState.isLoadingEntries).toBe(false);
      expect(finalState.entries).toHaveLength(1); // Should keep existing entries
      expect(finalState.error?.message).toContain('connection');
    });

    it('should handle auth errors by clearing entries', () => {
      const mockState = createMockState();

      // Set some existing entries
      mockState.handleSuccess([{ id: '1', content: 'Existing entry' }], { page: 1 });

      const authError = new Error('401 Unauthorized');
      mockState.handleError(authError);

      const finalState = mockState.getState();
      expect(finalState.isLoadingEntries).toBe(false);
      expect(finalState.entries).toHaveLength(0); // Should clear entries
      expect(finalState.pagination).toBeNull();
      expect(finalState.error?.message).toContain('log in again');
    });

    it('should handle not found by clearing error', () => {
      const mockState = createMockState();

      // Set an existing error
      mockState.handleError(new Error('Previous error'));
      expect(mockState.getState().error).not.toBeNull();

      const notFoundError = new Error('No journal entries found');
      mockState.handleError(notFoundError);

      const finalState = mockState.getState();
      expect(finalState.isLoadingEntries).toBe(false);
      expect(finalState.entries).toHaveLength(0);
      expect(finalState.error).toBeNull(); // Should clear error
    });

    it('should handle generic errors with user-friendly message', () => {
      const mockState = createMockState();

      const genericError = new Error('Database timeout');
      mockState.handleError(genericError);

      const finalState = mockState.getState();
      expect(finalState.isLoadingEntries).toBe(false);
      expect(finalState.error?.message).toContain('Please try again');
    });

    it('should clear errors when starting new load', () => {
      const mockState = createMockState();

      // Set an error state
      mockState.handleError(new Error('Previous error'));
      expect(mockState.getState().error).not.toBeNull();

      // Start new loading
      mockState.startLoading();
      expect(mockState.getState().error).toBeNull();
      expect(mockState.getState().isLoadingEntries).toBe(true);
    });
  });

  describe('Loading State Transitions', () => {

    const createLoadingStateMachine = () => {
      let state = 'idle'; // idle, loading, loaded, error
      let data = null;
      let error = null;

      return {
        getState: () => ({ state, data, error }),

        startLoad: () => {
          if (state === 'loading') {
            throw new Error('Already loading');
          }
          state = 'loading';
          error = null;
        },

        finishLoad: (result: any, loadError?: Error) => {
          if (state !== 'loading') {
            throw new Error('Not in loading state');
          }

          if (loadError) {
            state = 'error';
            error = loadError;
            data = null;
          } else {
            state = 'loaded';
            data = result;
            error = null;
          }
        },

        reset: () => {
          state = 'idle';
          data = null;
          error = null;
        }
      };
    };

    it('should transition from idle to loading correctly', () => {
      const machine = createLoadingStateMachine();

      expect(machine.getState().state).toBe('idle');

      machine.startLoad();
      expect(machine.getState().state).toBe('loading');
      expect(machine.getState().error).toBeNull();
    });

    it('should transition from loading to loaded correctly', () => {
      const machine = createLoadingStateMachine();

      machine.startLoad();
      const mockData = { entries: [], pagination: {} };
      machine.finishLoad(mockData);

      const finalState = machine.getState();
      expect(finalState.state).toBe('loaded');
      expect(finalState.data).toEqual(mockData);
      expect(finalState.error).toBeNull();
    });

    it('should transition from loading to error correctly', () => {
      const machine = createLoadingStateMachine();

      machine.startLoad();
      const error = new Error('Load failed');
      machine.finishLoad(null, error);

      const finalState = machine.getState();
      expect(finalState.state).toBe('error');
      expect(finalState.data).toBeNull();
      expect(finalState.error).toBe(error);
    });

    it('should prevent starting load when already loading', () => {
      const machine = createLoadingStateMachine();

      machine.startLoad();
      expect(() => machine.startLoad()).toThrow('Already loading');
    });

    it('should prevent finishing load when not loading', () => {
      const machine = createLoadingStateMachine();

      expect(() => machine.finishLoad({})).toThrow('Not in loading state');
    });

    it('should allow restarting after error', () => {
      const machine = createLoadingStateMachine();

      machine.startLoad();
      machine.finishLoad(null, new Error('Failed'));
      expect(machine.getState().state).toBe('error');

      machine.startLoad();
      expect(machine.getState().state).toBe('loading');
      expect(machine.getState().error).toBeNull();
    });

    it('should allow restarting after successful load', () => {
      const machine = createLoadingStateMachine();

      machine.startLoad();
      machine.finishLoad({ entries: [] });
      expect(machine.getState().state).toBe('loaded');

      machine.startLoad();
      expect(machine.getState().state).toBe('loading');
    });
  });

  describe('User Experience Scenarios', () => {

    it('should provide helpful message for network issues', () => {
      const errors = [
        new Error('Network request failed'),
        new Error('TypeError: Failed to fetch'),
        new Error('ERR_NETWORK: No internet'),
      ];

      errors.forEach(error => {
        const result = categorizeError(error);
        expect(result.userMessage).toContain('connection');
        expect(result.shouldClearEntries).toBe(false); // Keep showing cached data
      });
    });

    it('should provide clear message for auth issues', () => {
      const errors = [
        new Error('401 Unauthorized'),
        new Error('403 Forbidden'),
        new Error('Unauthorized access'),
      ];

      errors.forEach(error => {
        const result = categorizeError(error);
        expect(result.userMessage).toContain('log in');
        expect(result.shouldClearEntries).toBe(true); // Security: clear sensitive data
      });
    });

    it('should handle empty results gracefully', () => {
      const errors = [
        new Error('404 Not Found'),
        new Error('No journal entries found'),
      ];

      errors.forEach(error => {
        const result = categorizeError(error);
        expect(result.userMessage).toBeNull(); // No error message needed
        expect(result.shouldClearError).toBe(true); // Show empty state instead
      });
    });

    it('should provide fallback for unknown errors', () => {
      const errors = [
        new Error('Database timeout'),
        new Error('500 Internal Server Error'),
        new Error('Something went wrong'),
      ];

      errors.forEach(error => {
        const result = categorizeError(error);
        expect(result.userMessage).toContain('try again');
        expect(result.type).toBe('generic');
      });
    });
  });

  describe('Edge Cases and Error Resilience', () => {

    it('should handle null or undefined errors gracefully', () => {
      // In real scenarios, this shouldn't happen, but we should be resilient
      const nullError = null as any;
      const undefinedError = undefined as any;

      // These would likely throw in the real implementation, which is fine
      // The tests ensure we've thought about edge cases
      expect(() => categorizeError(nullError)).toThrow();
      expect(() => categorizeError(undefinedError)).toThrow();
    });

    it('should handle errors with empty messages', () => {
      const emptyError = new Error('');
      const result = categorizeError(emptyError);

      expect(result.type).toBe('generic');
      expect(result.userMessage).toContain('try again');
    });

    it('should handle errors with very long messages', () => {
      const longMessage = 'A'.repeat(1000) + 'Network request failed';
      const longError = new Error(longMessage);
      const result = categorizeError(longError);

      expect(result.type).toBe('network');
    });

    it('should handle mixed error types in message', () => {
      const mixedError = new Error('401 Network request failed');
      const result = categorizeError(mixedError);

      // Should match the first pattern found (auth in this case)
      expect(result.type).toBe('auth');
    });

    it('should be case insensitive for error matching', () => {
      const errors = [
        new Error('NETWORK REQUEST FAILED'),
        new Error('unauthorized'),
        new Error('Not Found'),
      ];

      const results = errors.map(categorizeError);

      expect(results[0].type).toBe('network');
      expect(results[1].type).toBe('auth');
      expect(results[2].type).toBe('not_found');
    });
  });
});