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

describe('useSurveyState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  describe('State Initialization', () => {
    it('should initialize with default state when localStorage is empty', () => {
      const { result } = renderHook(() => useSurveyState());

      expect(result.current.state.currentPhase).toBe(1);
      expect(result.current.state.responses).toEqual({});
      expect(result.current.state.reflectionAnswers).toEqual({
        strongestStruggle: '',
        dailyHabit: ''
      });
      expect(result.current.state.startedAt).toBeInstanceOf(Date);
      expect(result.current.state.lastUpdated).toBeInstanceOf(Date);
    });

    it('should restore state from localStorage when available', () => {
      const storedState = {
        currentPhase: 2,
        responses: {
          envy: {
            score: 3,
            note: 'Test note',
            answeredAt: '2024-01-01T10:00:00.000Z'
          }
        },
        reflectionAnswers: {
          strongestStruggle: 'Test struggle',
          dailyHabit: 'Test habit'
        },
        startedAt: '2024-01-01T09:00:00.000Z',
        lastUpdated: '2024-01-01T10:00:00.000Z'
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedState));

      const { result } = renderHook(() => useSurveyState());

      expect(result.current.state.currentPhase).toBe(2);
      expect(result.current.state.responses.envy.score).toBe(3);
      expect(result.current.state.responses.envy.note).toBe('Test note');
      expect(result.current.state.reflectionAnswers.strongestStruggle).toBe('Test struggle');
      expect(result.current.state.reflectionAnswers.dailyHabit).toBe('Test habit');
    });

    it('should handle corrupted localStorage gracefully', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');
      console.warn = jest.fn();

      const { result } = renderHook(() => useSurveyState());

      expect(result.current.state.currentPhase).toBe(1);
      expect(result.current.state.responses).toEqual({});
      expect(console.warn).toHaveBeenCalledWith(
        'Failed to load survey state from localStorage:',
        expect.any(Error)
      );
    });
  });

  describe('Response Management', () => {
    it('should update response with score and note', () => {
      const { result } = renderHook(() => useSurveyState());

      act(() => {
        result.current.updateResponse('envy', 4 as LikertScore, 'Test note');
      });

      expect(result.current.state.responses.envy.score).toBe(4);
      expect(result.current.state.responses.envy.note).toBe('Test note');
      expect(result.current.state.responses.envy.answeredAt).toBeInstanceOf(Date);
    });

    it('should update response with score only (empty note)', () => {
      const { result } = renderHook(() => useSurveyState());

      act(() => {
        result.current.updateResponse('arrogance', 2 as LikertScore);
      });

      expect(result.current.state.responses.arrogance.score).toBe(2);
      expect(result.current.state.responses.arrogance.note).toBe('');
    });

    it('should update lastUpdated timestamp when response changes', () => {
      const { result } = renderHook(() => useSurveyState());
      const initialTimestamp = result.current.state.lastUpdated;

      act(() => {
        result.current.updateResponse('lust', 1 as LikertScore);
      });

      expect(result.current.state.lastUpdated.getTime()).toBeGreaterThan(
        initialTimestamp.getTime()
      );
    });
  });

  describe('Reflection Management', () => {
    it('should update strongest struggle reflection', () => {
      const { result } = renderHook(() => useSurveyState());

      act(() => {
        result.current.updateReflection('strongestStruggle', 'My biggest challenge');
      });

      expect(result.current.state.reflectionAnswers.strongestStruggle).toBe('My biggest challenge');
    });

    it('should update daily habit reflection', () => {
      const { result } = renderHook(() => useSurveyState());

      act(() => {
        result.current.updateReflection('dailyHabit', 'Morning dhikr');
      });

      expect(result.current.state.reflectionAnswers.dailyHabit).toBe('Morning dhikr');
    });

    it('should update lastUpdated timestamp when reflection changes', () => {
      const { result } = renderHook(() => useSurveyState());
      const initialTimestamp = result.current.state.lastUpdated;

      act(() => {
        result.current.updateReflection('strongestStruggle', 'Updated struggle');
      });

      expect(result.current.state.lastUpdated.getTime()).toBeGreaterThan(
        initialTimestamp.getTime()
      );
    });
  });

  describe('Phase Management', () => {
    it('should update current phase', () => {
      const { result } = renderHook(() => useSurveyState());

      act(() => {
        result.current.setCurrentPhase(3);
      });

      expect(result.current.state.currentPhase).toBe(3);
    });

    it('should update lastUpdated timestamp when phase changes', () => {
      const { result } = renderHook(() => useSurveyState());
      const initialTimestamp = result.current.state.lastUpdated;

      act(() => {
        result.current.setCurrentPhase(2);
      });

      expect(result.current.state.lastUpdated.getTime()).toBeGreaterThan(
        initialTimestamp.getTime()
      );
    });
  });

  describe('State Persistence', () => {
    it('should save state to localStorage on every change', () => {
      const { result } = renderHook(() => useSurveyState());

      act(() => {
        result.current.updateResponse('envy', 3 as LikertScore, 'Test');
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'sakinah_survey_state',
        expect.stringContaining('"envy"')
      );
    });

    it('should handle localStorage save errors gracefully', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });
      console.warn = jest.fn();

      const { result } = renderHook(() => useSurveyState());

      act(() => {
        result.current.updateResponse('envy', 3 as LikertScore);
      });

      expect(console.warn).toHaveBeenCalledWith(
        'Failed to save survey state to localStorage:',
        expect.any(Error)
      );
    });
  });

  describe('State Clearing', () => {
    it('should clear state and localStorage', () => {
      const { result } = renderHook(() => useSurveyState());

      // First add some data
      act(() => {
        result.current.updateResponse('envy', 5 as LikertScore, 'Test note');
        result.current.setCurrentPhase(2);
      });

      // Then clear
      act(() => {
        result.current.clearState();
      });

      expect(result.current.state.currentPhase).toBe(1);
      expect(result.current.state.responses).toEqual({});
      expect(result.current.state.reflectionAnswers).toEqual({
        strongestStruggle: '',
        dailyHabit: ''
      });
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('sakinah_survey_state');
    });
  });

  describe('API Integration', () => {
    it('should save Phase 1 responses to API', async () => {
      const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      } as Response);

      const { result } = renderHook(() => useSurveyState());

      // Add Phase 1 responses
      act(() => {
        result.current.updateResponse('envy', 4 as LikertScore, 'Envy note');
        result.current.updateResponse('arrogance', 3 as LikertScore, 'Arrogance note');
        result.current.updateResponse('selfDeception', 2 as LikertScore, 'Self-deception note');
        result.current.updateResponse('lust', 5 as LikertScore, 'Lust note');
      });

      let saveResult: boolean;
      await act(async () => {
        saveResult = await result.current.saveToAPI(1);
      });

      expect(saveResult!).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('/api/v1/onboarding/phase1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          envyScore: 4,
          envyNote: 'Envy note',
          arroganceScore: 3,
          arroganceNote: 'Arrogance note',
          selfDeceptionScore: 2,
          selfDeceptionNote: 'Self-deception note',
          lustScore: 5,
          lustNote: 'Lust note'
        })
      });
      expect(result.current.lastSaved).toBeInstanceOf(Date);
    });

    it('should save Phase 2 responses to API', async () => {
      const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      } as Response);

      const { result } = renderHook(() => useSurveyState());

      // Add Phase 2 responses
      act(() => {
        result.current.updateResponse('anger', 3 as LikertScore, 'Anger note');
        result.current.updateResponse('malice', 2 as LikertScore, 'Malice note');
        result.current.updateResponse('backbiting', 4 as LikertScore, 'Backbiting note');
        result.current.updateResponse('suspicion', 1 as LikertScore, 'Suspicion note');
        result.current.updateResponse('loveOfDunya', 5 as LikertScore, 'Love of dunya note');
        result.current.updateResponse('laziness', 3 as LikertScore, 'Laziness note');
        result.current.updateResponse('despair', 2 as LikertScore, 'Despair note');
      });

      let saveResult: boolean;
      await act(async () => {
        saveResult = await result.current.saveToAPI(2);
      });

      expect(saveResult!).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('/api/v1/onboarding/phase2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('"angerScore":3')
      });
    });

    it('should save reflection answers to API', async () => {
      const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      } as Response);

      const { result } = renderHook(() => useSurveyState());

      act(() => {
        result.current.updateReflection('strongestStruggle', 'My biggest struggle is patience');
        result.current.updateReflection('dailyHabit', 'I want to develop morning prayers');
      });

      let saveResult: boolean;
      await act(async () => {
        saveResult = await result.current.saveToAPI(3);
      });

      expect(saveResult!).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('/api/v1/onboarding/reflection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strongestStruggle: 'My biggest struggle is patience',
          dailyHabit: 'I want to develop morning prayers'
        })
      });
    });

    it('should handle API save failures', async () => {
      const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValue({
        ok: false,
        statusText: 'Internal Server Error'
      } as Response);

      console.error = jest.fn();

      const { result } = renderHook(() => useSurveyState());

      act(() => {
        result.current.updateResponse('envy', 4 as LikertScore);
        result.current.updateResponse('arrogance', 3 as LikertScore);
        result.current.updateResponse('selfDeception', 2 as LikertScore);
        result.current.updateResponse('lust', 5 as LikertScore);
      });

      let saveResult: boolean;
      await act(async () => {
        saveResult = await result.current.saveToAPI(1);
      });

      expect(saveResult!).toBe(false);
      expect(console.error).toHaveBeenCalledWith('API save failed:', 'Internal Server Error');
    });

    it('should handle network errors during API save', async () => {
      const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockRejectedValue(new Error('Network error'));

      console.error = jest.fn();

      const { result } = renderHook(() => useSurveyState());

      act(() => {
        result.current.updateResponse('envy', 4 as LikertScore);
        result.current.updateResponse('arrogance', 3 as LikertScore);
        result.current.updateResponse('selfDeception', 2 as LikertScore);
        result.current.updateResponse('lust', 5 as LikertScore);
      });

      let saveResult: boolean;
      await act(async () => {
        saveResult = await result.current.saveToAPI(1);
      });

      expect(saveResult!).toBe(false);
      expect(console.error).toHaveBeenCalledWith('Failed to save to API:', expect.any(Error));
    });

    it('should not save incomplete Phase 1 responses', async () => {
      const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
      console.warn = jest.fn();

      const { result } = renderHook(() => useSurveyState());

      // Only add partial responses
      act(() => {
        result.current.updateResponse('envy', 4 as LikertScore);
        result.current.updateResponse('arrogance', 3 as LikertScore);
        // Missing selfDeception and lust
      });

      let saveResult: boolean;
      await act(async () => {
        saveResult = await result.current.saveToAPI(1);
      });

      expect(saveResult!).toBe(false);
      expect(console.warn).toHaveBeenCalledWith('Not all required fields are filled');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should update loading state during API calls', async () => {
      const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockImplementation(() => new Promise(resolve =>
        setTimeout(() => resolve({
          ok: true,
          json: async () => ({ success: true })
        } as Response), 100)
      ));

      const { result } = renderHook(() => useSurveyState());

      act(() => {
        result.current.updateResponse('envy', 4 as LikertScore);
        result.current.updateResponse('arrogance', 3 as LikertScore);
        result.current.updateResponse('selfDeception', 2 as LikertScore);
        result.current.updateResponse('lust', 5 as LikertScore);
      });

      // Start the save operation
      const savePromise = act(async () => {
        return result.current.saveToAPI(1);
      });

      // Check loading state is true during the operation
      expect(result.current.isLoading).toBe(true);

      // Wait for completion
      await savePromise;

      // Check loading state is false after completion
      expect(result.current.isLoading).toBe(false);
    });
  });
});