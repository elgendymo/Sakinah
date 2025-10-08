import { renderHook, act } from '@testing-library/react';
import { useSurveyState } from '../hooks/useSurveyState';
import type { LikertScore } from '@sakinah/types';

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

describe('Survey Resumption Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true })
    } as Response);
  });

  describe('Phase 1 Resumption', () => {
    it('should resume from Phase 1 with partial responses', () => {
      const partialPhase1State = {
        currentPhase: 1,
        responses: {
          envy: {
            score: 4,
            note: 'Partially completed',
            answeredAt: '2024-01-01T10:00:00.000Z'
          },
          arrogance: {
            score: 2,
            note: '',
            answeredAt: '2024-01-01T10:01:00.000Z'
          }
          // Missing selfDeception and lust
        },
        reflectionAnswers: {
          strongestStruggle: '',
          dailyHabit: ''
        },
        startedAt: '2024-01-01T09:00:00.000Z',
        lastUpdated: '2024-01-01T10:01:00.000Z'
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(partialPhase1State));

      const { result } = renderHook(() => useSurveyState());

      expect(result.current.state.currentPhase).toBe(1);
      expect(result.current.state.responses.envy.score).toBe(4);
      expect(result.current.state.responses.arrogance.score).toBe(2);
      expect(result.current.state.responses.selfDeception).toBeUndefined();
      expect(result.current.state.responses.lust).toBeUndefined();
    });

    it('should allow completing remaining Phase 1 questions after resumption', () => {
      const partialPhase1State = {
        currentPhase: 1,
        responses: {
          envy: {
            score: 4,
            note: 'Test note',
            answeredAt: '2024-01-01T10:00:00.000Z'
          }
        },
        reflectionAnswers: { strongestStruggle: '', dailyHabit: '' },
        startedAt: '2024-01-01T09:00:00.000Z',
        lastUpdated: '2024-01-01T10:00:00.000Z'
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(partialPhase1State));

      const { result } = renderHook(() => useSurveyState());

      // Complete remaining questions
      act(() => {
        result.current.updateResponse('arrogance', 3 as LikertScore, 'Arrogance note');
        result.current.updateResponse('selfDeception', 2 as LikertScore, 'Self-deception note');
        result.current.updateResponse('lust', 5 as LikertScore, 'Lust note');
      });

      expect(result.current.state.responses.envy.score).toBe(4); // Preserved
      expect(result.current.state.responses.arrogance.score).toBe(3); // New
      expect(result.current.state.responses.selfDeception.score).toBe(2); // New
      expect(result.current.state.responses.lust.score).toBe(5); // New
    });

    it('should maintain original timestamps for resumed responses', () => {
      const originalTimestamp = '2024-01-01T10:00:00.000Z';
      const partialPhase1State = {
        currentPhase: 1,
        responses: {
          envy: {
            score: 4,
            note: 'Original response',
            answeredAt: originalTimestamp
          }
        },
        reflectionAnswers: { strongestStruggle: '', dailyHabit: '' },
        startedAt: '2024-01-01T09:00:00.000Z',
        lastUpdated: '2024-01-01T10:00:00.000Z'
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(partialPhase1State));

      const { result } = renderHook(() => useSurveyState());

      expect(result.current.state.responses.envy.answeredAt).toEqual(new Date(originalTimestamp));

      // Add a new response - should have a new timestamp
      act(() => {
        result.current.updateResponse('arrogance', 3 as LikertScore);
      });

      expect(result.current.state.responses.arrogance.answeredAt.getTime()).toBeGreaterThan(
        new Date(originalTimestamp).getTime()
      );
    });
  });

  describe('Phase 2 Resumption', () => {
    it('should resume from Phase 2 with partial responses', () => {
      const partialPhase2State = {
        currentPhase: 2,
        responses: {
          // Complete Phase 1
          envy: { score: 4, note: '', answeredAt: '2024-01-01T10:00:00.000Z' },
          arrogance: { score: 3, note: '', answeredAt: '2024-01-01T10:01:00.000Z' },
          selfDeception: { score: 2, note: '', answeredAt: '2024-01-01T10:02:00.000Z' },
          lust: { score: 5, note: '', answeredAt: '2024-01-01T10:03:00.000Z' },
          // Partial Phase 2
          anger: { score: 3, note: 'Anger note', answeredAt: '2024-01-01T10:04:00.000Z' },
          malice: { score: 1, note: '', answeredAt: '2024-01-01T10:05:00.000Z' },
          backbiting: { score: 4, note: 'Backbiting note', answeredAt: '2024-01-01T10:06:00.000Z' }
          // Missing suspicion, loveOfDunya, laziness, despair
        },
        reflectionAnswers: { strongestStruggle: '', dailyHabit: '' },
        startedAt: '2024-01-01T09:00:00.000Z',
        lastUpdated: '2024-01-01T10:06:00.000Z'
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(partialPhase2State));

      const { result } = renderHook(() => useSurveyState());

      expect(result.current.state.currentPhase).toBe(2);
      // Phase 1 should be complete
      expect(result.current.state.responses.envy.score).toBe(4);
      expect(result.current.state.responses.arrogance.score).toBe(3);
      expect(result.current.state.responses.selfDeception.score).toBe(2);
      expect(result.current.state.responses.lust.score).toBe(5);
      // Phase 2 should be partial
      expect(result.current.state.responses.anger.score).toBe(3);
      expect(result.current.state.responses.malice.score).toBe(1);
      expect(result.current.state.responses.backbiting.score).toBe(4);
      expect(result.current.state.responses.suspicion).toBeUndefined();
    });

    it('should allow completing remaining Phase 2 questions after resumption', () => {
      const partialPhase2State = {
        currentPhase: 2,
        responses: {
          // Complete Phase 1
          envy: { score: 4, note: '', answeredAt: '2024-01-01T10:00:00.000Z' },
          arrogance: { score: 3, note: '', answeredAt: '2024-01-01T10:01:00.000Z' },
          selfDeception: { score: 2, note: '', answeredAt: '2024-01-01T10:02:00.000Z' },
          lust: { score: 5, note: '', answeredAt: '2024-01-01T10:03:00.000Z' },
          // Partial Phase 2
          anger: { score: 3, note: '', answeredAt: '2024-01-01T10:04:00.000Z' }
        },
        reflectionAnswers: { strongestStruggle: '', dailyHabit: '' },
        startedAt: '2024-01-01T09:00:00.000Z',
        lastUpdated: '2024-01-01T10:04:00.000Z'
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(partialPhase2State));

      const { result } = renderHook(() => useSurveyState());

      // Complete remaining Phase 2 questions
      act(() => {
        result.current.updateResponse('malice', 2 as LikertScore, 'Malice note');
        result.current.updateResponse('backbiting', 4 as LikertScore, 'Backbiting note');
        result.current.updateResponse('suspicion', 1 as LikertScore, 'Suspicion note');
        result.current.updateResponse('loveOfDunya', 5 as LikertScore, 'Love of dunya note');
        result.current.updateResponse('laziness', 3 as LikertScore, 'Laziness note');
        result.current.updateResponse('despair', 2 as LikertScore, 'Despair note');
      });

      // All Phase 1 responses should be preserved
      expect(result.current.state.responses.envy.score).toBe(4);
      expect(result.current.state.responses.lust.score).toBe(5);

      // Original Phase 2 response should be preserved
      expect(result.current.state.responses.anger.score).toBe(3);

      // New Phase 2 responses should be added
      expect(result.current.state.responses.malice.score).toBe(2);
      expect(result.current.state.responses.despair.score).toBe(2);
    });
  });

  describe('Reflection Phase Resumption', () => {
    it('should resume from reflection phase with partial answers', () => {
      const partialReflectionState = {
        currentPhase: 3,
        responses: {
          // Complete Phase 1 & 2
          envy: { score: 4, note: '', answeredAt: '2024-01-01T10:00:00.000Z' },
          arrogance: { score: 3, note: '', answeredAt: '2024-01-01T10:01:00.000Z' },
          selfDeception: { score: 2, note: '', answeredAt: '2024-01-01T10:02:00.000Z' },
          lust: { score: 5, note: '', answeredAt: '2024-01-01T10:03:00.000Z' },
          anger: { score: 3, note: '', answeredAt: '2024-01-01T10:04:00.000Z' },
          malice: { score: 1, note: '', answeredAt: '2024-01-01T10:05:00.000Z' },
          backbiting: { score: 4, note: '', answeredAt: '2024-01-01T10:06:00.000Z' },
          suspicion: { score: 2, note: '', answeredAt: '2024-01-01T10:07:00.000Z' },
          loveOfDunya: { score: 5, note: '', answeredAt: '2024-01-01T10:08:00.000Z' },
          laziness: { score: 3, note: '', answeredAt: '2024-01-01T10:09:00.000Z' },
          despair: { score: 2, note: '', answeredAt: '2024-01-01T10:10:00.000Z' }
        },
        reflectionAnswers: {
          strongestStruggle: 'My biggest challenge is controlling my temper when stressed.',
          dailyHabit: '' // Partially completed reflection
        },
        startedAt: '2024-01-01T09:00:00.000Z',
        lastUpdated: '2024-01-01T10:11:00.000Z'
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(partialReflectionState));

      const { result } = renderHook(() => useSurveyState());

      expect(result.current.state.currentPhase).toBe(3);
      expect(result.current.state.reflectionAnswers.strongestStruggle).toBe(
        'My biggest challenge is controlling my temper when stressed.'
      );
      expect(result.current.state.reflectionAnswers.dailyHabit).toBe('');
    });

    it('should allow completing remaining reflection answers after resumption', () => {
      const partialReflectionState = {
        currentPhase: 3,
        responses: {
          envy: { score: 4, note: '', answeredAt: '2024-01-01T10:00:00.000Z' },
          arrogance: { score: 3, note: '', answeredAt: '2024-01-01T10:01:00.000Z' },
          selfDeception: { score: 2, note: '', answeredAt: '2024-01-01T10:02:00.000Z' },
          lust: { score: 5, note: '', answeredAt: '2024-01-01T10:03:00.000Z' },
          anger: { score: 3, note: '', answeredAt: '2024-01-01T10:04:00.000Z' },
          malice: { score: 1, note: '', answeredAt: '2024-01-01T10:05:00.000Z' },
          backbiting: { score: 4, note: '', answeredAt: '2024-01-01T10:06:00.000Z' },
          suspicion: { score: 2, note: '', answeredAt: '2024-01-01T10:07:00.000Z' },
          loveOfDunya: { score: 5, note: '', answeredAt: '2024-01-01T10:08:00.000Z' },
          laziness: { score: 3, note: '', answeredAt: '2024-01-01T10:09:00.000Z' },
          despair: { score: 2, note: '', answeredAt: '2024-01-01T10:10:00.000Z' }
        },
        reflectionAnswers: {
          strongestStruggle: 'Existing struggle answer',
          dailyHabit: ''
        },
        startedAt: '2024-01-01T09:00:00.000Z',
        lastUpdated: '2024-01-01T10:11:00.000Z'
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(partialReflectionState));

      const { result } = renderHook(() => useSurveyState());

      // Complete the remaining reflection answer
      act(() => {
        result.current.updateReflection('dailyHabit', 'I want to establish a morning routine of reading Quran for 15 minutes');
      });

      expect(result.current.state.reflectionAnswers.strongestStruggle).toBe('Existing struggle answer');
      expect(result.current.state.reflectionAnswers.dailyHabit).toBe(
        'I want to establish a morning routine of reading Quran for 15 minutes'
      );
    });
  });

  describe('Cross-Session Resumption', () => {
    it('should handle resumption after browser restart', () => {
      const savedCompleteState = {
        currentPhase: 2,
        responses: {
          envy: { score: 4, note: 'Envy struggles', answeredAt: '2024-01-01T10:00:00.000Z' },
          arrogance: { score: 3, note: '', answeredAt: '2024-01-01T10:01:00.000Z' },
          selfDeception: { score: 2, note: 'Self-awareness needed', answeredAt: '2024-01-01T10:02:00.000Z' },
          lust: { score: 5, note: 'Biggest challenge', answeredAt: '2024-01-01T10:03:00.000Z' }
        },
        reflectionAnswers: {
          strongestStruggle: '',
          dailyHabit: ''
        },
        startedAt: '2024-01-01T09:00:00.000Z',
        lastUpdated: '2024-01-01T10:03:00.000Z'
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedCompleteState));

      // Simulate hook initialization after browser restart
      const { result } = renderHook(() => useSurveyState());

      expect(result.current.state.currentPhase).toBe(2);
      expect(result.current.state.responses.envy.score).toBe(4);
      expect(result.current.state.responses.envy.note).toBe('Envy struggles');
      expect(result.current.state.responses.lust.note).toBe('Biggest challenge');
      expect(result.current.state.startedAt).toEqual(new Date('2024-01-01T09:00:00.000Z'));
    });

    it('should handle resumption after session timeout', () => {
      const oldSessionState = {
        currentPhase: 1,
        responses: {
          envy: { score: 4, note: 'Old session', answeredAt: '2024-01-01T10:00:00.000Z' }
        },
        reflectionAnswers: { strongestStruggle: '', dailyHabit: '' },
        startedAt: '2024-01-01T09:00:00.000Z',
        lastUpdated: '2024-01-01T10:00:00.000Z'
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(oldSessionState));

      const { result } = renderHook(() => useSurveyState());

      // Should restore the old session state
      expect(result.current.state.currentPhase).toBe(1);
      expect(result.current.state.responses.envy.score).toBe(4);
      expect(result.current.state.responses.envy.note).toBe('Old session');

      // Should allow continuing from where left off
      act(() => {
        result.current.updateResponse('arrogance', 2 as LikertScore, 'Continuing session');
      });

      expect(result.current.state.responses.arrogance.score).toBe(2);
      expect(result.current.state.responses.arrogance.note).toBe('Continuing session');
    });
  });

  describe('API Synchronization on Resumption', () => {
    it('should successfully save resumed and completed phase data to API', async () => {
      const resumedState = {
        currentPhase: 1,
        responses: {
          envy: { score: 4, note: 'Resumed', answeredAt: '2024-01-01T10:00:00.000Z' },
          arrogance: { score: 3, note: '', answeredAt: '2024-01-01T10:01:00.000Z' }
        },
        reflectionAnswers: { strongestStruggle: '', dailyHabit: '' },
        startedAt: '2024-01-01T09:00:00.000Z',
        lastUpdated: '2024-01-01T10:01:00.000Z'
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(resumedState));

      const { result } = renderHook(() => useSurveyState());

      // Complete the remaining responses
      act(() => {
        result.current.updateResponse('selfDeception', 2 as LikertScore, 'Self-deception note');
        result.current.updateResponse('lust', 5 as LikertScore, 'Lust note');
      });

      // Save to API
      let saveResult: boolean;
      await act(async () => {
        saveResult = await result.current.saveToAPI(1);
      });

      expect(saveResult!).toBe(true);
      expect(fetch).toHaveBeenCalledWith('/api/v1/onboarding/phase1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          envyScore: 4,
          envyNote: 'Resumed',
          arroganceScore: 3,
          arroganceNote: '',
          selfDeceptionScore: 2,
          selfDeceptionNote: 'Self-deception note',
          lustScore: 5,
          lustNote: 'Lust note'
        })
      });
    });

    it('should handle API failures gracefully during resumed session', async () => {
      const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValue({
        ok: false,
        statusText: 'Server Error'
      } as Response);

      const resumedState = {
        currentPhase: 1,
        responses: {
          envy: { score: 4, note: '', answeredAt: '2024-01-01T10:00:00.000Z' },
          arrogance: { score: 3, note: '', answeredAt: '2024-01-01T10:01:00.000Z' },
          selfDeception: { score: 2, note: '', answeredAt: '2024-01-01T10:02:00.000Z' },
          lust: { score: 5, note: '', answeredAt: '2024-01-01T10:03:00.000Z' }
        },
        reflectionAnswers: { strongestStruggle: '', dailyHabit: '' },
        startedAt: '2024-01-01T09:00:00.000Z',
        lastUpdated: '2024-01-01T10:03:00.000Z'
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(resumedState));

      const { result } = renderHook(() => useSurveyState());

      // Attempt to save to API should fail gracefully
      let saveResult: boolean;
      await act(async () => {
        saveResult = await result.current.saveToAPI(1);
      });

      expect(saveResult!).toBe(false);
      // State should still be preserved in localStorage
      expect(result.current.state.responses.envy.score).toBe(4);
      expect(result.current.state.responses.lust.score).toBe(5);
    });
  });

  describe('Edge Cases in Resumption', () => {
    it('should handle resumption with invalid phase number', () => {
      const invalidState = {
        currentPhase: 99, // Invalid phase
        responses: {
          envy: { score: 4, note: '', answeredAt: '2024-01-01T10:00:00.000Z' }
        },
        reflectionAnswers: { strongestStruggle: '', dailyHabit: '' },
        startedAt: '2024-01-01T09:00:00.000Z',
        lastUpdated: '2024-01-01T10:00:00.000Z'
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(invalidState));

      const { result } = renderHook(() => useSurveyState());

      // Should still load the responses but maintain the invalid phase
      expect(result.current.state.currentPhase).toBe(99);
      expect(result.current.state.responses.envy.score).toBe(4);

      // Should allow correcting the phase
      act(() => {
        result.current.setCurrentPhase(1);
      });

      expect(result.current.state.currentPhase).toBe(1);
    });

    it('should handle resumption with mixed valid and invalid scores', () => {
      const mixedState = {
        currentPhase: 1,
        responses: {
          envy: { score: 4, note: 'Valid', answeredAt: '2024-01-01T10:00:00.000Z' },
          arrogance: { score: 99 as any, note: 'Invalid score', answeredAt: '2024-01-01T10:01:00.000Z' }
        },
        reflectionAnswers: { strongestStruggle: '', dailyHabit: '' },
        startedAt: '2024-01-01T09:00:00.000Z',
        lastUpdated: '2024-01-01T10:01:00.000Z'
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mixedState));

      const { result } = renderHook(() => useSurveyState());

      // Should load valid responses
      expect(result.current.state.responses.envy.score).toBe(4);
      // Invalid score should still be loaded (validation happens at API level)
      expect(result.current.state.responses.arrogance.score).toBe(99);

      // Should allow correcting invalid responses
      act(() => {
        result.current.updateResponse('arrogance', 3 as LikertScore, 'Corrected score');
      });

      expect(result.current.state.responses.arrogance.score).toBe(3);
      expect(result.current.state.responses.arrogance.note).toBe('Corrected score');
    });

    it('should handle resumption with future timestamps', () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
      const futureState = {
        currentPhase: 1,
        responses: {
          envy: { score: 4, note: 'Future response', answeredAt: futureDate.toISOString() }
        },
        reflectionAnswers: { strongestStruggle: '', dailyHabit: '' },
        startedAt: futureDate.toISOString(),
        lastUpdated: futureDate.toISOString()
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(futureState));

      const { result } = renderHook(() => useSurveyState());

      // Should still load the state with future timestamps
      expect(result.current.state.responses.envy.score).toBe(4);
      expect(result.current.state.responses.envy.answeredAt).toEqual(futureDate);
      expect(result.current.state.startedAt).toEqual(futureDate);
    });
  });
});