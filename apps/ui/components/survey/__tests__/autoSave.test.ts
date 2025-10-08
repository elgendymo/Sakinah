import { renderHook, act, waitFor } from '@testing-library/react';
import { useSurveyState } from '../hooks/useSurveyState';
import type { LikertScore } from '@sakinah/types';

// Mock timers
jest.useFakeTimers();

// Mock fetch
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock as any;

describe('Auto-save Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true })
    } as Response);
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('localStorage Auto-save', () => {
    it('should automatically save to localStorage when response is updated', () => {
      const { result } = renderHook(() => useSurveyState());

      act(() => {
        result.current.updateResponse('envy', 3 as LikertScore, 'Test note');
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'sakinah_survey_state',
        expect.stringMatching(/"envy".*"score":3.*"note":"Test note"/)
      );
    });

    it('should automatically save to localStorage when reflection is updated', () => {
      const { result } = renderHook(() => useSurveyState());

      act(() => {
        result.current.updateReflection('strongestStruggle', 'My biggest challenge');
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'sakinah_survey_state',
        expect.stringMatching(/"strongestStruggle":"My biggest challenge"/)
      );
    });

    it('should automatically save to localStorage when phase changes', () => {
      const { result } = renderHook(() => useSurveyState());

      act(() => {
        result.current.setCurrentPhase(2);
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'sakinah_survey_state',
        expect.stringMatching(/"currentPhase":2/)
      );
    });

    it('should handle localStorage save errors without crashing', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      const { result } = renderHook(() => useSurveyState());

      act(() => {
        result.current.updateResponse('envy', 3 as LikertScore);
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to save survey state to localStorage:',
        expect.any(Error)
      );

      consoleWarnSpy.mockRestore();
    });

    it('should update lastUpdated timestamp on every auto-save', () => {
      const { result } = renderHook(() => useSurveyState());
      const initialTimestamp = result.current.state.lastUpdated;

      // Wait a bit to ensure different timestamp
      jest.advanceTimersByTime(10);

      act(() => {
        result.current.updateResponse('envy', 3 as LikertScore);
      });

      expect(result.current.state.lastUpdated.getTime()).toBeGreaterThan(
        initialTimestamp.getTime()
      );
    });
  });

  describe('Auto-save State Persistence Across Sessions', () => {
    it('should restore auto-saved state on hook initialization', () => {
      const savedState = {
        currentPhase: 2,
        responses: {
          envy: {
            score: 4,
            note: 'Auto-saved note',
            answeredAt: '2024-01-01T10:00:00.000Z'
          },
          arrogance: {
            score: 2,
            note: '',
            answeredAt: '2024-01-01T10:01:00.000Z'
          }
        },
        reflectionAnswers: {
          strongestStruggle: 'Auto-saved struggle',
          dailyHabit: 'Auto-saved habit'
        },
        startedAt: '2024-01-01T09:00:00.000Z',
        lastUpdated: '2024-01-01T10:01:00.000Z'
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedState));

      const { result } = renderHook(() => useSurveyState());

      expect(result.current.state.currentPhase).toBe(2);
      expect(result.current.state.responses.envy.score).toBe(4);
      expect(result.current.state.responses.envy.note).toBe('Auto-saved note');
      expect(result.current.state.responses.arrogance.score).toBe(2);
      expect(result.current.state.reflectionAnswers.strongestStruggle).toBe('Auto-saved struggle');
      expect(result.current.state.reflectionAnswers.dailyHabit).toBe('Auto-saved habit');
    });

    it('should preserve response timestamps when restoring from localStorage', () => {
      const answerTime = '2024-01-01T10:00:00.000Z';
      const savedState = {
        currentPhase: 1,
        responses: {
          envy: {
            score: 4,
            note: 'Test',
            answeredAt: answerTime
          }
        },
        reflectionAnswers: { strongestStruggle: '', dailyHabit: '' },
        startedAt: '2024-01-01T09:00:00.000Z',
        lastUpdated: '2024-01-01T10:00:00.000Z'
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedState));

      const { result } = renderHook(() => useSurveyState());

      expect(result.current.state.responses.envy.answeredAt).toEqual(new Date(answerTime));
    });

    it('should handle partial state restoration gracefully', () => {
      const incompleteState = {
        currentPhase: 2,
        responses: {
          envy: { score: 4, note: 'Test' } // Missing answeredAt
        },
        // Missing reflectionAnswers
        startedAt: '2024-01-01T09:00:00.000Z',
        lastUpdated: '2024-01-01T10:00:00.000Z'
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(incompleteState));

      const { result } = renderHook(() => useSurveyState());

      // Should still work with default values for missing fields
      expect(result.current.state.currentPhase).toBe(2);
      expect(result.current.state.responses.envy.score).toBe(4);
    });
  });

  describe('Auto-save Data Integrity', () => {
    it('should maintain data consistency during rapid updates', () => {
      const { result } = renderHook(() => useSurveyState());

      // Rapidly update multiple responses
      act(() => {
        result.current.updateResponse('envy', 1 as LikertScore, 'Note 1');
        result.current.updateResponse('arrogance', 2 as LikertScore, 'Note 2');
        result.current.updateResponse('selfDeception', 3 as LikertScore, 'Note 3');
        result.current.updateResponse('lust', 4 as LikertScore, 'Note 4');
      });

      // All updates should be persisted
      expect(result.current.state.responses.envy.score).toBe(1);
      expect(result.current.state.responses.arrogance.score).toBe(2);
      expect(result.current.state.responses.selfDeception.score).toBe(3);
      expect(result.current.state.responses.lust.score).toBe(4);

      // localStorage should have been called for each update
      expect(localStorageMock.setItem).toHaveBeenCalledTimes(4);
    });

    it('should preserve previous responses when adding new ones', () => {
      const { result } = renderHook(() => useSurveyState());

      act(() => {
        result.current.updateResponse('envy', 3 as LikertScore, 'First response');
      });

      act(() => {
        result.current.updateResponse('arrogance', 4 as LikertScore, 'Second response');
      });

      expect(result.current.state.responses.envy.score).toBe(3);
      expect(result.current.state.responses.envy.note).toBe('First response');
      expect(result.current.state.responses.arrogance.score).toBe(4);
      expect(result.current.state.responses.arrogance.note).toBe('Second response');
    });

    it('should allow updating existing responses without losing other data', () => {
      const { result } = renderHook(() => useSurveyState());

      // Initial response
      act(() => {
        result.current.updateResponse('envy', 3 as LikertScore, 'Original note');
      });

      // Update the same response
      act(() => {
        result.current.updateResponse('envy', 5 as LikertScore, 'Updated note');
      });

      expect(result.current.state.responses.envy.score).toBe(5);
      expect(result.current.state.responses.envy.note).toBe('Updated note');
      expect(result.current.state.responses.envy.answeredAt).toBeInstanceOf(Date);
    });
  });

  describe('Auto-save Recovery Scenarios', () => {
    it('should recover gracefully from localStorage corruption', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      // First render with corrupted data
      localStorageMock.getItem.mockReturnValue('{ invalid json }');

      const { result, rerender } = renderHook(() => useSurveyState());

      expect(result.current.state.currentPhase).toBe(1);
      expect(consoleWarnSpy).toHaveBeenCalled();

      // Should still be able to save new data
      act(() => {
        result.current.updateResponse('envy', 3 as LikertScore);
      });

      expect(localStorageMock.setItem).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it('should handle browser storage unavailable scenario', () => {
      // Simulate storage not available
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('localStorage is not available');
      });

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const { result } = renderHook(() => useSurveyState());

      act(() => {
        result.current.updateResponse('envy', 3 as LikertScore);
      });

      // Should still update in-memory state
      expect(result.current.state.responses.envy.score).toBe(3);
      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it('should maintain functionality when localStorage is disabled', () => {
      // Mock localStorage to be undefined (as in some private browsing modes)
      const originalLocalStorage = global.localStorage;
      (global as any).localStorage = undefined;

      const { result } = renderHook(() => useSurveyState());

      act(() => {
        result.current.updateResponse('envy', 3 as LikertScore, 'Test note');
      });

      // Should still work in memory
      expect(result.current.state.responses.envy.score).toBe(3);
      expect(result.current.state.responses.envy.note).toBe('Test note');

      // Restore localStorage
      global.localStorage = originalLocalStorage;
    });
  });

  describe('Performance Considerations', () => {
    it('should not cause memory leaks with frequent updates', () => {
      const { result } = renderHook(() => useSurveyState());

      // Simulate many rapid updates
      for (let i = 0; i < 100; i++) {
        act(() => {
          result.current.updateResponse('envy', (i % 5 + 1) as LikertScore, `Note ${i}`);
        });
      }

      // Should only keep the latest response
      expect(result.current.state.responses.envy.score).toBe(5); // 99 % 5 + 1 = 5
      expect(result.current.state.responses.envy.note).toBe('Note 99');

      // Should have called localStorage for each update
      expect(localStorageMock.setItem).toHaveBeenCalledTimes(100);
    });

    it('should handle large survey state efficiently', () => {
      const { result } = renderHook(() => useSurveyState());

      // Add responses for all possible questions
      const allQuestions = [
        'envy', 'arrogance', 'selfDeception', 'lust',
        'anger', 'malice', 'backbiting', 'suspicion',
        'loveOfDunya', 'laziness', 'despair'
      ];

      act(() => {
        allQuestions.forEach((question, index) => {
          result.current.updateResponse(
            question,
            ((index % 5) + 1) as LikertScore,
            `Detailed note for ${question} with multiple sentences and comprehensive feedback.`
          );
        });

        result.current.updateReflection(
          'strongestStruggle',
          'A very long reflection about my strongest struggle that contains many details and thoughts about my spiritual journey and areas where I need to improve.'
        );

        result.current.updateReflection(
          'dailyHabit',
          'A comprehensive description of the daily habit I want to develop, including specific times, methods, and goals for implementation.'
        );
      });

      // All data should be preserved
      expect(Object.keys(result.current.state.responses)).toHaveLength(11);
      expect(result.current.state.reflectionAnswers.strongestStruggle).toContain('strongest struggle');
      expect(result.current.state.reflectionAnswers.dailyHabit).toContain('daily habit');

      // Should still be able to save to localStorage
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });
  });
});