'use client';

import { useState, useEffect, useCallback } from 'react';
import type { LikertScore } from '@sakinah/types';
import { buildApiUrl } from '@/lib/utils/apiUrl';

export interface SurveyResponse {
  score: LikertScore;
  note: string;
  answeredAt: Date;
}

export interface SurveyState {
  currentPhase: number;
  responses: Record<string, SurveyResponse>;
  reflectionAnswers: {
    strongestStruggle: string;
    dailyHabit: string;
  };
  startedAt: Date;
  lastUpdated: Date;
}

interface UseSurveyStateReturn {
  state: SurveyState;
  updateResponse: (questionId: string, score: LikertScore, note?: string) => void;
  updateReflection: (field: 'strongestStruggle' | 'dailyHabit', value: string) => void;
  setCurrentPhase: (phase: number) => void;
  clearState: () => void;
  saveToAPI: (phase: number) => Promise<boolean>;
  isLoading: boolean;
  lastSaved: Date | null;
}

const STORAGE_KEY = 'sakinah_survey_state';

export function useSurveyState(): UseSurveyStateReturn {
  const [state, setState] = useState<SurveyState>(() => {
    // Try to load from localStorage on initialization
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          return {
            ...parsed,
            startedAt: new Date(parsed.startedAt),
            lastUpdated: new Date(parsed.lastUpdated),
            responses: Object.fromEntries(
              Object.entries(parsed.responses).map(([key, value]: [string, any]) => [
                key,
                {
                  ...value,
                  answeredAt: new Date(value.answeredAt)
                }
              ])
            )
          };
        }
      } catch (error) {
        console.warn('Failed to load survey state from localStorage:', error);
      }
    }

    // Default state
    return {
      currentPhase: 1,
      responses: {},
      reflectionAnswers: {
        strongestStruggle: '',
        dailyHabit: ''
      },
      startedAt: new Date(),
      lastUpdated: new Date()
    };
  });

  const [isLoading, setIsLoading] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Auto-save to localStorage whenever state changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn('Failed to save survey state to localStorage:', error);
    }
  }, [state]);

  const updateResponse = useCallback((questionId: string, score: LikertScore, note: string = '') => {
    setState(prev => ({
      ...prev,
      responses: {
        ...prev.responses,
        [questionId]: {
          score,
          note,
          answeredAt: new Date()
        }
      },
      lastUpdated: new Date()
    }));
  }, []);

  const updateReflection = useCallback((field: 'strongestStruggle' | 'dailyHabit', value: string) => {
    setState(prev => ({
      ...prev,
      reflectionAnswers: {
        ...prev.reflectionAnswers,
        [field]: value
      },
      lastUpdated: new Date()
    }));
  }, []);

  const setCurrentPhase = useCallback((phase: number) => {
    setState(prev => ({
      ...prev,
      currentPhase: phase,
      lastUpdated: new Date()
    }));
  }, []);

  const clearState = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState({
      currentPhase: 1,
      responses: {},
      reflectionAnswers: {
        strongestStruggle: '',
        dailyHabit: ''
      },
      startedAt: new Date(),
      lastUpdated: new Date()
    });
  }, []);

  const saveToAPI = useCallback(async (phase: number): Promise<boolean> => {
    setIsLoading(true);

    let endpoint = '';
    let payload: any = {};

    try {

      if (phase === 1) {
        endpoint = buildApiUrl('/v1/onboarding/phase1');
        // Transform responses to Phase 1 format
        payload = {
          envyScore: state.responses.envy?.score,
          envyNote: state.responses.envy?.note || '',
          arroganceScore: state.responses.arrogance?.score,
          arroganceNote: state.responses.arrogance?.note || '',
          selfDeceptionScore: state.responses.selfDeception?.score,
          selfDeceptionNote: state.responses.selfDeception?.note || '',
          lustScore: state.responses.lust?.score,
          lustNote: state.responses.lust?.note || ''
        };
      } else if (phase === 2) {
        endpoint = buildApiUrl('/v1/onboarding/phase2');
        // Transform responses to Phase 2 format
        payload = {
          angerScore: state.responses.anger?.score,
          angerNote: state.responses.anger?.note || '',
          maliceScore: state.responses.malice?.score,
          maliceNote: state.responses.malice?.note || '',
          backbitingScore: state.responses.backbiting?.score,
          backbitingNote: state.responses.backbiting?.note || '',
          suspicionScore: state.responses.suspicion?.score,
          suspicionNote: state.responses.suspicion?.note || '',
          loveOfDunyaScore: state.responses.loveOfDunya?.score,
          loveOfDunyaNote: state.responses.loveOfDunya?.note || '',
          lazinessScore: state.responses.laziness?.score,
          lazinessNote: state.responses.laziness?.note || '',
          despairScore: state.responses.despair?.score,
          despairNote: state.responses.despair?.note || ''
        };
      } else if (phase === 3) {
        endpoint = buildApiUrl('/v1/onboarding/reflection');
        payload = state.reflectionAnswers;
      }

      // Check if all required scores are present (notes are optional)
      let hasAllRequired = true;

      if (phase === 1) {
        const requiredScores = [payload.envyScore, payload.arroganceScore, payload.selfDeceptionScore, payload.lustScore];
        hasAllRequired = requiredScores.every(score => score !== undefined && score !== null);
      } else if (phase === 2) {
        const requiredScores = [
          payload.angerScore, payload.maliceScore, payload.backbitingScore,
          payload.suspicionScore, payload.loveOfDunyaScore, payload.lazinessScore, payload.despairScore
        ];
        hasAllRequired = requiredScores.every(score => score !== undefined && score !== null);
      } else if (phase === 3) {
        hasAllRequired = payload.strongestStruggle && payload.dailyHabit;
      }

      if (!hasAllRequired) {
        console.warn('Not all required scores are filled for phase', phase);
        return false;
      }

      // Get auth token for API request
      let authToken = '';
      if (typeof localStorage !== 'undefined') {
        authToken = localStorage.getItem('accessToken') || '';
      }
      if (!authToken && typeof document !== 'undefined') {
        // Fallback to checking cookies for mock auth
        const cookieMatch = document.cookie.match(/(?:^|;\s*)(?:auth-token|mock-auth)=([^;]*)/);
        authToken = cookieMatch ? cookieMatch[1] : '';
      }

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      // Add authorization header if we have a token
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setLastSaved(new Date());
        console.log(`Phase ${phase} saved successfully to API`);
        return true;
      } else {
        let errorDetails: Record<string, unknown>;
        try {
          const errorText = await response.text();
          // Try to parse as JSON first
          try {
            errorDetails = JSON.parse(errorText);
          } catch {
            errorDetails = { message: errorText };
          }
        } catch (e) {
          errorDetails = { message: 'Failed to read error response' };
        }

        console.error(`API save failed for phase ${phase}:`, {
          status: response.status,
          statusText: response.statusText,
          url: endpoint,
          error: errorDetails,
          payload: payload
        });

        // Show more user-friendly error based on status
        if (response.status === 403) {
          console.log(`Phase ${phase} may have already been completed or access denied`);
        }

        return false;
      }
    } catch (error) {
      console.error(`Failed to save phase ${phase} to API:`, {
        error: error instanceof Error ? error.message : error,
        endpoint: endpoint || 'unknown',
        payload: payload || {},
        stack: error instanceof Error ? error.stack : undefined
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [state]);

  return {
    state,
    updateResponse,
    updateReflection,
    setCurrentPhase,
    clearState,
    saveToAPI,
    isLoading,
    lastSaved
  };
}