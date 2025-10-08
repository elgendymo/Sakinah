import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import '@testing-library/jest-dom';
import Phase1Page from '@/app/onboarding/phase1/page';

// Mock the hooks and dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock the survey hooks
jest.mock('@/components/survey/hooks/useSurveyLanguage', () => ({
  useSurveyLanguage: () => ({
    language: 'en',
    toggleLanguage: jest.fn(),
    getLocalizedText: (en: string, ar: string) => en,
  }),
}));

jest.mock('@/components/survey/hooks/useSurveyValidation', () => ({
  useSurveyValidation: jest.fn(() => ({
    validation: {
      isValid: true,
      errors: [],
      warnings: [],
      completedQuestions: 0,
      totalQuestions: 4,
      missingRequired: []
    },
    navigation: {
      canGoBack: true,
      canGoNext: false,
      currentPhase: 1,
      nextPhase: null,
      previousPhase: null,
      totalPhases: 4,
      progressPercentage: 25
    },
    canAdvanceToNextPhase: false
  })),
}));

jest.mock('@/components/survey/hooks/useSurveyState', () => ({
  useSurveyState: () => ({
    state: {
      currentPhase: 1,
      responses: {},
      reflectionAnswers: {
        strongestStruggle: '',
        dailyHabit: ''
      },
      startedAt: new Date(),
      lastUpdated: new Date()
    },
    updateResponse: jest.fn(),
    setCurrentPhase: jest.fn(),
    saveToAPI: jest.fn().mockResolvedValue(true),
    isLoading: false,
    lastSaved: null
  }),
}));

// Mock fetch for API calls
global.fetch = jest.fn();

const mockRouter = {
  push: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  replace: jest.fn(),
};

describe('Phase1Page', () => {
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    jest.clearAllMocks();
  });

  it('renders page title and description', () => {
    render(<Phase1Page />);

    expect(screen.getByText('Inner Heart Assessment')).toBeInTheDocument();
    expect(screen.getByText(/Reflect honestly on your inner spiritual state/)).toBeInTheDocument();
  });

  it('displays progress indicator', () => {
    render(<Phase1Page />);

    expect(screen.getByText('Step 2 of 4')).toBeInTheDocument();
  });

  it('renders all Phase 1 questions', () => {
    render(<Phase1Page />);

    // Check for Phase 1 question titles
    expect(screen.getByText('Envy and Jealousy')).toBeInTheDocument();
    expect(screen.getByText('Pride and Arrogance')).toBeInTheDocument();
    expect(screen.getByText('Self-Deception')).toBeInTheDocument();
    expect(screen.getByText('Inappropriate Desires')).toBeInTheDocument();
  });

  it('renders navigation buttons', () => {
    render(<Phase1Page />);

    expect(screen.getByText('Back')).toBeInTheDocument();
    expect(screen.getByText(/Continue to Phase 2/)).toBeInTheDocument();
  });

  it('has continue button disabled initially', () => {
    render(<Phase1Page />);

    const continueButton = screen.getByText(/Continue to Phase 2/);
    expect(continueButton.closest('button')).toBeDisabled();
  });

  it('navigates back to welcome page when back button is clicked', () => {
    render(<Phase1Page />);

    const backButton = screen.getByText('Back');
    fireEvent.click(backButton);

    expect(mockRouter.push).toHaveBeenCalledWith('/onboarding/welcome');
  });

  it('shows language toggle button', () => {
    render(<Phase1Page />);

    expect(screen.getByText('عربي')).toBeInTheDocument();
  });

  describe('Question Interaction', () => {
    it('renders Likert scale for each question', () => {
      render(<Phase1Page />);

      // Check for Likert scale buttons (1-5 for each question)
      const likertButtons = screen.getAllByTestId(/likert-score-/);
      expect(likertButtons).toHaveLength(20); // 4 questions × 5 scores each
    });

    it('shows question numbers in order', () => {
      render(<Phase1Page />);

      expect(screen.getByText('1')).toBeInTheDocument(); // Envy
      expect(screen.getByText('2')).toBeInTheDocument(); // Arrogance
      expect(screen.getByText('3')).toBeInTheDocument(); // Self-Deception
      expect(screen.getByText('4')).toBeInTheDocument(); // Lust
    });
  });

  describe('Validation States', () => {
    it('shows validation errors when present', () => {
      const { useSurveyValidation } = require('@/components/survey/hooks/useSurveyValidation');

      useSurveyValidation.mockReturnValue({
        validation: {
          isValid: false,
          errors: ['Please answer all questions'],
          warnings: [],
          completedQuestions: 2,
          totalQuestions: 4,
          missingRequired: ['envy', 'arrogance']
        },
        navigation: {
          canGoBack: true,
          canGoNext: false,
          currentPhase: 1,
          nextPhase: null,
          previousPhase: null,
          totalPhases: 4,
          progressPercentage: 25
        },
        canAdvanceToNextPhase: false
      });

      render(<Phase1Page />);

      expect(screen.getByText('Please complete all questions')).toBeInTheDocument();
      expect(screen.getByText('• Please answer all questions')).toBeInTheDocument();
    });

    it('enables continue button when all questions are answered', () => {
      const { useSurveyValidation } = require('@/components/survey/hooks/useSurveyValidation');

      useSurveyValidation.mockReturnValue({
        validation: {
          isValid: true,
          errors: [],
          warnings: [],
          completedQuestions: 4,
          totalQuestions: 4,
          missingRequired: []
        },
        navigation: {
          canGoBack: true,
          canGoNext: true,
          currentPhase: 1,
          nextPhase: 2,
          previousPhase: null,
          totalPhases: 4,
          progressPercentage: 50
        },
        canAdvanceToNextPhase: true
      });

      render(<Phase1Page />);

      const continueButton = screen.getByText(/Continue to Phase 2/);
      expect(continueButton.closest('button')).not.toBeDisabled();
    });
  });

  describe('Auto-save Functionality', () => {
    it('shows auto-save status when saving', () => {
      const { useSurveyState } = require('@/components/survey/hooks/useSurveyState');

      useSurveyState.mockReturnValue({
        state: {
          currentPhase: 1,
          responses: {
            envy: { score: 3, note: '', answeredAt: new Date() }
          },
          reflectionAnswers: { strongestStruggle: '', dailyHabit: '' },
          startedAt: new Date(),
          lastUpdated: new Date()
        },
        updateResponse: jest.fn(),
        setCurrentPhase: jest.fn(),
        saveToAPI: jest.fn().mockResolvedValue(true),
        isLoading: false,
        lastSaved: new Date()
      });

      render(<Phase1Page />);

      // Auto-save status should be shown
      expect(screen.getByText('All responses saved')).toBeInTheDocument();
    });
  });

  describe('Progress Tracking', () => {
    it('updates progress based on completed questions', () => {
      const { useSurveyState } = require('@/components/survey/hooks/useSurveyState');

      useSurveyState.mockReturnValue({
        state: {
          currentPhase: 1,
          responses: {
            envy: { score: 3, note: '', answeredAt: new Date() },
            arrogance: { score: 4, note: 'test note', answeredAt: new Date() }
          },
          reflectionAnswers: { strongestStruggle: '', dailyHabit: '' },
          startedAt: new Date(),
          lastUpdated: new Date()
        },
        updateResponse: jest.fn(),
        setCurrentPhase: jest.fn(),
        saveToAPI: jest.fn().mockResolvedValue(true),
        isLoading: false,
        lastSaved: null
      });

      render(<Phase1Page />);

      // Should show progress for 2 out of 4 questions completed
      expect(screen.getByText('Completed: 2 of 4 questions')).toBeInTheDocument();
    });
  });

  describe('API Integration', () => {
    it('calls saveToAPI when continue button is clicked', async () => {
      const mockSaveToAPI = jest.fn().mockResolvedValue(true);
      const { useSurveyValidation, useSurveyState } = require('@/components/survey/hooks/useSurveyValidation');

      useSurveyValidation.mockReturnValue({
        validation: { isValid: true, errors: [], warnings: [], completedQuestions: 4, totalQuestions: 4, missingRequired: [] },
        navigation: { canGoBack: true, canGoNext: true, currentPhase: 1, nextPhase: 2, previousPhase: null, totalPhases: 4, progressPercentage: 50 },
        canAdvanceToNextPhase: true
      });

      require('@/components/survey/hooks/useSurveyState').useSurveyState.mockReturnValue({
        state: {
          currentPhase: 1,
          responses: {
            envy: { score: 3, note: '', answeredAt: new Date() },
            arrogance: { score: 4, note: '', answeredAt: new Date() },
            selfDeception: { score: 2, note: '', answeredAt: new Date() },
            lust: { score: 1, note: '', answeredAt: new Date() }
          },
          reflectionAnswers: { strongestStruggle: '', dailyHabit: '' },
          startedAt: new Date(),
          lastUpdated: new Date()
        },
        updateResponse: jest.fn(),
        setCurrentPhase: jest.fn(),
        saveToAPI: mockSaveToAPI,
        isLoading: false,
        lastSaved: null
      });

      render(<Phase1Page />);

      const continueButton = screen.getByText(/Continue to Phase 2/);
      fireEvent.click(continueButton);

      await waitFor(() => {
        expect(mockSaveToAPI).toHaveBeenCalledWith(1);
      });
    });

    it('navigates to phase 2 after successful save', async () => {
      const mockSaveToAPI = jest.fn().mockResolvedValue(true);
      const { useSurveyValidation } = require('@/components/survey/hooks/useSurveyValidation');

      useSurveyValidation.mockReturnValue({
        validation: { isValid: true, errors: [], warnings: [], completedQuestions: 4, totalQuestions: 4, missingRequired: [] },
        navigation: { canGoBack: true, canGoNext: true, currentPhase: 1, nextPhase: 2, previousPhase: null, totalPhases: 4, progressPercentage: 50 },
        canAdvanceToNextPhase: true
      });

      require('@/components/survey/hooks/useSurveyState').useSurveyState.mockReturnValue({
        state: {
          currentPhase: 1,
          responses: {
            envy: { score: 3, note: '', answeredAt: new Date() },
            arrogance: { score: 4, note: '', answeredAt: new Date() },
            selfDeception: { score: 2, note: '', answeredAt: new Date() },
            lust: { score: 1, note: '', answeredAt: new Date() }
          },
          reflectionAnswers: { strongestStruggle: '', dailyHabit: '' },
          startedAt: new Date(),
          lastUpdated: new Date()
        },
        updateResponse: jest.fn(),
        setCurrentPhase: jest.fn(),
        saveToAPI: mockSaveToAPI,
        isLoading: false,
        lastSaved: null
      });

      render(<Phase1Page />);

      const continueButton = screen.getByText(/Continue to Phase 2/);

      await act(async () => {
        fireEvent.click(continueButton);
      });

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/onboarding/phase2');
      });
    });

    it('handles save errors gracefully', async () => {
      const mockSaveToAPI = jest.fn().mockResolvedValue(false);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const { useSurveyValidation } = require('@/components/survey/hooks/useSurveyValidation');

      useSurveyValidation.mockReturnValue({
        validation: { isValid: true, errors: [], warnings: [], completedQuestions: 4, totalQuestions: 4, missingRequired: [] },
        navigation: { canGoBack: true, canGoNext: true, currentPhase: 1, nextPhase: 2, previousPhase: null, totalPhases: 4, progressPercentage: 50 },
        canAdvanceToNextPhase: true
      });

      require('@/components/survey/hooks/useSurveyState').useSurveyState.mockReturnValue({
        state: {
          currentPhase: 1,
          responses: {
            envy: { score: 3, note: '', answeredAt: new Date() },
            arrogance: { score: 4, note: '', answeredAt: new Date() },
            selfDeception: { score: 2, note: '', answeredAt: new Date() },
            lust: { score: 1, note: '', answeredAt: new Date() }
          },
          reflectionAnswers: { strongestStruggle: '', dailyHabit: '' },
          startedAt: new Date(),
          lastUpdated: new Date()
        },
        updateResponse: jest.fn(),
        setCurrentPhase: jest.fn(),
        saveToAPI: mockSaveToAPI,
        isLoading: false,
        lastSaved: null
      });

      render(<Phase1Page />);

      const continueButton = screen.getByText(/Continue to Phase 2/);

      await act(async () => {
        fireEvent.click(continueButton);
      });

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to save Phase 1 responses');
        expect(mockRouter.push).not.toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });
  });
});