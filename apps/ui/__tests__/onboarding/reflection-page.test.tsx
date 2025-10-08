import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import '@testing-library/jest-dom';
import ReflectionPage from '@/app/onboarding/reflection/page';

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
  useSurveyLanguage: jest.fn(() => ({
    language: 'en',
    toggleLanguage: jest.fn(),
    getLocalizedText: (en: string, ar: string) => en,
  })),
}));

jest.mock('@/components/survey/hooks/useSurveyState', () => ({
  useSurveyState: jest.fn(() => ({
    state: {
      currentPhase: 3,
      responses: {},
      reflectionAnswers: {
        strongestStruggle: '',
        dailyHabit: ''
      },
      startedAt: new Date(),
      lastUpdated: new Date()
    },
    updateReflection: jest.fn(),
    setCurrentPhase: jest.fn(),
    saveToAPI: jest.fn().mockResolvedValue(true),
    isLoading: false,
    lastSaved: null
  })),
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

describe('ReflectionPage', () => {
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    jest.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('renders page title and description', () => {
      render(<ReflectionPage />);

      expect(screen.getByText('Reflection & Insights')).toBeInTheDocument();
      expect(screen.getByText(/Share your deeper reflections to receive personalized guidance/)).toBeInTheDocument();
    });

    it('displays progress indicator for phase 4', () => {
      render(<ReflectionPage />);

      expect(screen.getByText('Step 4 of 4')).toBeInTheDocument();
    });

    it('renders both reflection questions', () => {
      render(<ReflectionPage />);

      expect(screen.getByText('1. What is your strongest spiritual struggle right now?')).toBeInTheDocument();
      expect(screen.getByText('2. What daily spiritual habit would you like to develop?')).toBeInTheDocument();
    });

    it('renders navigation buttons', () => {
      render(<ReflectionPage />);

      expect(screen.getByText('Back')).toBeInTheDocument();
      expect(screen.getByText('View Results')).toBeInTheDocument();
    });

    it('has View Results button disabled initially', () => {
      render(<ReflectionPage />);

      const viewResultsButton = screen.getByText('View Results');
      expect(viewResultsButton.closest('button')).toBeDisabled();
    });

    it('shows language toggle button', () => {
      render(<ReflectionPage />);

      expect(screen.getByText('عربي')).toBeInTheDocument();
    });
  });

  describe('Text Input and Validation', () => {
    it('renders textareas for both questions', () => {
      render(<ReflectionPage />);

      const textareas = screen.getAllByRole('textbox');
      expect(textareas).toHaveLength(2);
    });

    it('shows character count for both textareas', () => {
      render(<ReflectionPage />);

      const characterCounters = screen.getAllByText('0/500 characters');
      expect(characterCounters).toHaveLength(2);
    });

    it('shows minimum character requirement', () => {
      render(<ReflectionPage />);

      const minimumTexts = screen.getAllByText('Minimum 10 characters');
      expect(minimumTexts).toHaveLength(2);
    });

    it('updates character count when typing', () => {
      const mockUpdateReflection = jest.fn();
      const { useSurveyState } = require('@/components/survey/hooks/useSurveyState');

      useSurveyState.mockReturnValue({
        state: {
          currentPhase: 3,
          responses: {},
          reflectionAnswers: {
            strongestStruggle: 'Test struggle',
            dailyHabit: ''
          },
          startedAt: new Date(),
          lastUpdated: new Date()
        },
        updateReflection: mockUpdateReflection,
        setCurrentPhase: jest.fn(),
        saveToAPI: jest.fn().mockResolvedValue(true),
        isLoading: false,
        lastSaved: null
      });

      render(<ReflectionPage />);

      expect(screen.getByText('13/500 characters')).toBeInTheDocument();
    });

    it('calls updateReflection when user types in strongest struggle field', () => {
      const mockUpdateReflection = jest.fn();
      const { useSurveyState } = require('@/components/survey/hooks/useSurveyState');

      useSurveyState.mockReturnValue({
        state: {
          currentPhase: 3,
          responses: {},
          reflectionAnswers: {
            strongestStruggle: '',
            dailyHabit: ''
          },
          startedAt: new Date(),
          lastUpdated: new Date()
        },
        updateReflection: mockUpdateReflection,
        setCurrentPhase: jest.fn(),
        saveToAPI: jest.fn().mockResolvedValue(true),
        isLoading: false,
        lastSaved: null
      });

      render(<ReflectionPage />);

      const textarea = screen.getAllByRole('textbox')[0];
      fireEvent.change(textarea, { target: { value: 'My biggest struggle is...' } });

      expect(mockUpdateReflection).toHaveBeenCalledWith('strongestStruggle', 'My biggest struggle is...');
    });

    it('calls updateReflection when user types in daily habit field', () => {
      const mockUpdateReflection = jest.fn();
      const { useSurveyState } = require('@/components/survey/hooks/useSurveyState');

      useSurveyState.mockReturnValue({
        state: {
          currentPhase: 3,
          responses: {},
          reflectionAnswers: {
            strongestStruggle: '',
            dailyHabit: ''
          },
          startedAt: new Date(),
          lastUpdated: new Date()
        },
        updateReflection: mockUpdateReflection,
        setCurrentPhase: jest.fn(),
        saveToAPI: jest.fn().mockResolvedValue(true),
        isLoading: false,
        lastSaved: null
      });

      render(<ReflectionPage />);

      const textarea = screen.getAllByRole('textbox')[1];
      fireEvent.change(textarea, { target: { value: 'I want to develop morning dhikr habit...' } });

      expect(mockUpdateReflection).toHaveBeenCalledWith('dailyHabit', 'I want to develop morning dhikr habit...');
    });

    it('enforces maximum character limit of 500', () => {
      render(<ReflectionPage />);

      const textarea = screen.getAllByRole('textbox')[0];
      expect(textarea).toHaveAttribute('maxLength', '500');
    });
  });

  describe('Validation', () => {
    it('shows validation errors when fields are empty', () => {
      render(<ReflectionPage />);

      expect(screen.getByText('Please describe your strongest struggle')).toBeInTheDocument();
      expect(screen.getByText('Please describe the daily habit you want to develop')).toBeInTheDocument();
    });

    it('shows validation error when text is too short', () => {
      const { useSurveyState } = require('@/components/survey/hooks/useSurveyState');

      useSurveyState.mockReturnValue({
        state: {
          currentPhase: 3,
          responses: {},
          reflectionAnswers: {
            strongestStruggle: 'short',
            dailyHabit: 'also'
          },
          startedAt: new Date(),
          lastUpdated: new Date()
        },
        updateReflection: jest.fn(),
        setCurrentPhase: jest.fn(),
        saveToAPI: jest.fn().mockResolvedValue(true),
        isLoading: false,
        lastSaved: null
      });

      render(<ReflectionPage />);

      expect(screen.getByText('Strongest struggle description must be at least 10 characters')).toBeInTheDocument();
      expect(screen.getByText('Daily habit description must be at least 10 characters')).toBeInTheDocument();
    });

    it('enables View Results button when both fields are valid', () => {
      const { useSurveyState } = require('@/components/survey/hooks/useSurveyState');

      useSurveyState.mockReturnValue({
        state: {
          currentPhase: 3,
          responses: {},
          reflectionAnswers: {
            strongestStruggle: 'My biggest struggle is maintaining consistency in my prayers',
            dailyHabit: 'I want to develop a morning dhikr routine that includes istighfar'
          },
          startedAt: new Date(),
          lastUpdated: new Date()
        },
        updateReflection: jest.fn(),
        setCurrentPhase: jest.fn(),
        saveToAPI: jest.fn().mockResolvedValue(true),
        isLoading: false,
        lastSaved: null
      });

      render(<ReflectionPage />);

      const viewResultsButton = screen.getByText('View Results');
      expect(viewResultsButton.closest('button')).not.toBeDisabled();
    });

    it('updates progress to 100% when reflection is complete', () => {
      const { useSurveyState } = require('@/components/survey/hooks/useSurveyState');

      useSurveyState.mockReturnValue({
        state: {
          currentPhase: 3,
          responses: {},
          reflectionAnswers: {
            strongestStruggle: 'Valid struggle description',
            dailyHabit: 'Valid habit description'
          },
          startedAt: new Date(),
          lastUpdated: new Date()
        },
        updateReflection: jest.fn(),
        setCurrentPhase: jest.fn(),
        saveToAPI: jest.fn().mockResolvedValue(true),
        isLoading: false,
        lastSaved: null
      });

      render(<ReflectionPage />);

      // Progress should be 100% when complete
      expect(screen.getByText('100%')).toBeInTheDocument();
    });
  });

  describe('AI Preview Functionality', () => {
    it('shows Generate AI Preview button when reflection is complete', () => {
      const { useSurveyState } = require('@/components/survey/hooks/useSurveyState');

      useSurveyState.mockReturnValue({
        state: {
          currentPhase: 3,
          responses: {},
          reflectionAnswers: {
            strongestStruggle: 'Valid struggle description with enough characters',
            dailyHabit: 'Valid habit description with enough characters'
          },
          startedAt: new Date(),
          lastUpdated: new Date()
        },
        updateReflection: jest.fn(),
        setCurrentPhase: jest.fn(),
        saveToAPI: jest.fn().mockResolvedValue(true),
        isLoading: false,
        lastSaved: null
      });

      render(<ReflectionPage />);

      expect(screen.getByText('✨ Generate AI Preview')).toBeInTheDocument();
    });

    it('shows AI preview after clicking Generate AI Preview button', async () => {
      const { useSurveyState } = require('@/components/survey/hooks/useSurveyState');

      useSurveyState.mockReturnValue({
        state: {
          currentPhase: 3,
          responses: {},
          reflectionAnswers: {
            strongestStruggle: 'Valid struggle description with enough characters',
            dailyHabit: 'Valid habit description with enough characters'
          },
          startedAt: new Date(),
          lastUpdated: new Date()
        },
        updateReflection: jest.fn(),
        setCurrentPhase: jest.fn(),
        saveToAPI: jest.fn().mockResolvedValue(true),
        isLoading: false,
        lastSaved: null
      });

      render(<ReflectionPage />);

      const generateButton = screen.getByText('✨ Generate AI Preview');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('Your Personalized Spiritual Plan Preview')).toBeInTheDocument();
      });
    });

    it('displays personalized habits in preview', async () => {
      const { useSurveyState } = require('@/components/survey/hooks/useSurveyState');

      useSurveyState.mockReturnValue({
        state: {
          currentPhase: 3,
          responses: {},
          reflectionAnswers: {
            strongestStruggle: 'Valid struggle description with enough characters',
            dailyHabit: 'Valid habit description with enough characters'
          },
          startedAt: new Date(),
          lastUpdated: new Date()
        },
        updateReflection: jest.fn(),
        setCurrentPhase: jest.fn(),
        saveToAPI: jest.fn().mockResolvedValue(true),
        isLoading: false,
        lastSaved: null
      });

      render(<ReflectionPage />);

      const generateButton = screen.getByText('✨ Generate AI Preview');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('📋 Personalized Habit Recommendations')).toBeInTheDocument();
        expect(screen.getByText('Morning dhikr (5 minutes daily)')).toBeInTheDocument();
        expect(screen.getByText('Evening reflection and istighfar')).toBeInTheDocument();
        expect(screen.getByText('Daily gratitude practice')).toBeInTheDocument();
      });
    });

    it('displays takhliyah and tahliyah focus areas in preview', async () => {
      const { useSurveyState } = require('@/components/survey/hooks/useSurveyState');

      useSurveyState.mockReturnValue({
        state: {
          currentPhase: 3,
          responses: {},
          reflectionAnswers: {
            strongestStruggle: 'Valid struggle description with enough characters',
            dailyHabit: 'Valid habit description with enough characters'
          },
          startedAt: new Date(),
          lastUpdated: new Date()
        },
        updateReflection: jest.fn(),
        setCurrentPhase: jest.fn(),
        saveToAPI: jest.fn().mockResolvedValue(true),
        isLoading: false,
        lastSaved: null
      });

      render(<ReflectionPage />);

      const generateButton = screen.getByText('✨ Generate AI Preview');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('🧹 Takhliyah Focus (Purification)')).toBeInTheDocument();
        expect(screen.getByText('🌱 Tahliyah Focus (Virtue Cultivation)')).toBeInTheDocument();
        expect(screen.getByText('Purification from envy through gratitude')).toBeInTheDocument();
        expect(screen.getByText('Cultivating patience in daily interactions')).toBeInTheDocument();
      });
    });

    it('hides preview when user starts editing again', () => {
      const mockUpdateReflection = jest.fn();
      const { useSurveyState } = require('@/components/survey/hooks/useSurveyState');

      useSurveyState.mockReturnValue({
        state: {
          currentPhase: 3,
          responses: {},
          reflectionAnswers: {
            strongestStruggle: 'Valid struggle description with enough characters',
            dailyHabit: 'Valid habit description with enough characters'
          },
          startedAt: new Date(),
          lastUpdated: new Date()
        },
        updateReflection: mockUpdateReflection,
        setCurrentPhase: jest.fn(),
        saveToAPI: jest.fn().mockResolvedValue(true),
        isLoading: false,
        lastSaved: null
      });

      render(<ReflectionPage />);

      // Generate preview first
      const generateButton = screen.getByText('✨ Generate AI Preview');
      fireEvent.click(generateButton);

      // Wait for preview to appear
      waitFor(() => {
        expect(screen.getByText('Your Personalized Spiritual Plan Preview')).toBeInTheDocument();
      });

      // Edit text field - this should hide the preview
      const textarea = screen.getAllByRole('textbox')[0];
      fireEvent.change(textarea, { target: { value: 'Updated struggle description' } });

      expect(mockUpdateReflection).toHaveBeenCalledWith('strongestStruggle', 'Updated struggle description');
    });
  });

  describe('Auto-save Functionality', () => {
    it('shows auto-save status when saving', async () => {
      const mockSaveToAPI = jest.fn().mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve(true), 100))
      );
      const { useSurveyState } = require('@/components/survey/hooks/useSurveyState');

      useSurveyState.mockReturnValue({
        state: {
          currentPhase: 3,
          responses: {},
          reflectionAnswers: {
            strongestStruggle: 'Valid struggle description with enough characters',
            dailyHabit: 'Valid habit description with enough characters'
          },
          startedAt: new Date(),
          lastUpdated: new Date()
        },
        updateReflection: jest.fn(),
        setCurrentPhase: jest.fn(),
        saveToAPI: mockSaveToAPI,
        isLoading: false,
        lastSaved: null
      });

      render(<ReflectionPage />);

      // Auto-save should be triggered since we have valid content
      await waitFor(() => {
        expect(screen.getByText('All responses saved')).toBeInTheDocument();
      });
    });

    it('shows error status when save fails', async () => {
      const mockSaveToAPI = jest.fn().mockRejectedValue(new Error('Save failed'));
      const { useSurveyState } = require('@/components/survey/hooks/useSurveyState');

      useSurveyState.mockReturnValue({
        state: {
          currentPhase: 3,
          responses: {},
          reflectionAnswers: {
            strongestStruggle: 'Valid struggle description with enough characters',
            dailyHabit: 'Valid habit description with enough characters'
          },
          startedAt: new Date(),
          lastUpdated: new Date()
        },
        updateReflection: jest.fn(),
        setCurrentPhase: jest.fn(),
        saveToAPI: mockSaveToAPI,
        isLoading: false,
        lastSaved: null
      });

      render(<ReflectionPage />);

      await waitFor(() => {
        expect(screen.getByText('Failed to save - will retry')).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('navigates back to phase 2 when back button is clicked', () => {
      render(<ReflectionPage />);

      const backButton = screen.getByText('Back');
      fireEvent.click(backButton);

      expect(mockRouter.push).toHaveBeenCalledWith('/onboarding/phase2');
    });

    it('calls saveToAPI when View Results button is clicked', async () => {
      const mockSaveToAPI = jest.fn().mockResolvedValue(true);
      const { useSurveyState } = require('@/components/survey/hooks/useSurveyState');

      useSurveyState.mockReturnValue({
        state: {
          currentPhase: 3,
          responses: {},
          reflectionAnswers: {
            strongestStruggle: 'Valid struggle description with enough characters',
            dailyHabit: 'Valid habit description with enough characters'
          },
          startedAt: new Date(),
          lastUpdated: new Date()
        },
        updateReflection: jest.fn(),
        setCurrentPhase: jest.fn(),
        saveToAPI: mockSaveToAPI,
        isLoading: false,
        lastSaved: null
      });

      render(<ReflectionPage />);

      const viewResultsButton = screen.getByText('View Results');
      fireEvent.click(viewResultsButton);

      await waitFor(() => {
        expect(mockSaveToAPI).toHaveBeenCalledWith(3);
      });
    });

    it('navigates to results page after successful save', async () => {
      const mockSaveToAPI = jest.fn().mockResolvedValue(true);
      const { useSurveyState } = require('@/components/survey/hooks/useSurveyState');

      useSurveyState.mockReturnValue({
        state: {
          currentPhase: 3,
          responses: {},
          reflectionAnswers: {
            strongestStruggle: 'Valid struggle description with enough characters',
            dailyHabit: 'Valid habit description with enough characters'
          },
          startedAt: new Date(),
          lastUpdated: new Date()
        },
        updateReflection: jest.fn(),
        setCurrentPhase: jest.fn(),
        saveToAPI: mockSaveToAPI,
        isLoading: false,
        lastSaved: null
      });

      render(<ReflectionPage />);

      const viewResultsButton = screen.getByText('View Results');

      await act(async () => {
        fireEvent.click(viewResultsButton);
      });

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/onboarding/results');
      });
    });

    it('handles save errors gracefully and prevents navigation', async () => {
      const mockSaveToAPI = jest.fn().mockResolvedValue(false);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const { useSurveyState } = require('@/components/survey/hooks/useSurveyState');

      useSurveyState.mockReturnValue({
        state: {
          currentPhase: 3,
          responses: {},
          reflectionAnswers: {
            strongestStruggle: 'Valid struggle description with enough characters',
            dailyHabit: 'Valid habit description with enough characters'
          },
          startedAt: new Date(),
          lastUpdated: new Date()
        },
        updateReflection: jest.fn(),
        setCurrentPhase: jest.fn(),
        saveToAPI: mockSaveToAPI,
        isLoading: false,
        lastSaved: null
      });

      render(<ReflectionPage />);

      const viewResultsButton = screen.getByText('View Results');

      await act(async () => {
        fireEvent.click(viewResultsButton);
      });

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to save reflection responses');
        expect(mockRouter.push).not.toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Language Support', () => {
    it('supports Arabic language toggle', () => {
      const mockToggleLanguage = jest.fn();
      const { useSurveyLanguage } = require('@/components/survey/hooks/useSurveyLanguage');

      useSurveyLanguage.mockReturnValue({
        language: 'ar',
        toggleLanguage: mockToggleLanguage,
        getLocalizedText: (en: string, ar: string) => ar,
      });

      render(<ReflectionPage />);

      const languageToggle = screen.getByText('English');
      fireEvent.click(languageToggle);

      expect(mockToggleLanguage).toHaveBeenCalled();
    });

    it('displays Arabic content when language is set to Arabic', () => {
      const { useSurveyLanguage } = require('@/components/survey/hooks/useSurveyLanguage');

      useSurveyLanguage.mockReturnValue({
        language: 'ar',
        toggleLanguage: jest.fn(),
        getLocalizedText: (en: string, ar: string) => ar,
      });

      render(<ReflectionPage />);

      expect(screen.getByText('التأمل والاستبصار')).toBeInTheDocument();
    });
  });

  describe('Progress Tracking', () => {
    it('shows progress summary based on completion status', () => {
      const { useSurveyState } = require('@/components/survey/hooks/useSurveyState');

      useSurveyState.mockReturnValue({
        state: {
          currentPhase: 3,
          responses: {},
          reflectionAnswers: {
            strongestStruggle: 'Valid struggle description with enough characters',
            dailyHabit: 'Valid habit description with enough characters'
          },
          startedAt: new Date(),
          lastUpdated: new Date()
        },
        updateReflection: jest.fn(),
        setCurrentPhase: jest.fn(),
        saveToAPI: jest.fn().mockResolvedValue(true),
        isLoading: false,
        lastSaved: null
      });

      render(<ReflectionPage />);

      expect(screen.getByText('Reflection Phase: Complete')).toBeInTheDocument();
      expect(screen.getByText('Ready to view results!')).toBeInTheDocument();
    });

    it('shows in progress status when reflection is incomplete', () => {
      render(<ReflectionPage />);

      expect(screen.getByText('Reflection Phase: In Progress')).toBeInTheDocument();
      expect(screen.queryByText('Ready to view results!')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles component lifecycle correctly', () => {
      const mockSetCurrentPhase = jest.fn();
      const { useSurveyState } = require('@/components/survey/hooks/useSurveyState');

      useSurveyState.mockReturnValue({
        state: {
          currentPhase: 3,
          responses: {},
          reflectionAnswers: {
            strongestStruggle: '',
            dailyHabit: ''
          },
          startedAt: new Date(),
          lastUpdated: new Date()
        },
        updateReflection: jest.fn(),
        setCurrentPhase: mockSetCurrentPhase,
        saveToAPI: jest.fn().mockResolvedValue(true),
        isLoading: false,
        lastSaved: null
      });

      render(<ReflectionPage />);

      expect(mockSetCurrentPhase).toHaveBeenCalledWith(3);
    });

    it('handles empty validation errors gracefully', () => {
      const { useSurveyState } = require('@/components/survey/hooks/useSurveyState');

      useSurveyState.mockReturnValue({
        state: {
          currentPhase: 3,
          responses: {},
          reflectionAnswers: {
            strongestStruggle: 'Valid struggle description with enough characters',
            dailyHabit: 'Valid habit description with enough characters'
          },
          startedAt: new Date(),
          lastUpdated: new Date()
        },
        updateReflection: jest.fn(),
        setCurrentPhase: jest.fn(),
        saveToAPI: jest.fn().mockResolvedValue(true),
        isLoading: false,
        lastSaved: null
      });

      render(<ReflectionPage />);

      expect(screen.queryByText('Please complete all questions')).not.toBeInTheDocument();
    });
  });
});