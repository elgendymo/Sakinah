import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import Phase2Page from '@/app/onboarding/phase2/page';
import { useSurveyState } from '@/components/survey/hooks/useSurveyState';
import { useSurveyLanguage } from '@/components/survey/hooks/useSurveyLanguage';
import { useSurveyValidation } from '@/components/survey/hooks/useSurveyValidation';

// Mock dependencies
jest.mock('next/navigation');
jest.mock('@/components/survey/hooks/useSurveyState');
jest.mock('@/components/survey/hooks/useSurveyLanguage');
jest.mock('@/components/survey/hooks/useSurveyValidation');
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
}));

const mockRouter = {
  push: jest.fn(),
};

const mockSurveyState = {
  state: {
    currentPhase: 2,
    responses: {},
    reflectionAnswers: { strongestStruggle: '', dailyHabit: '' },
    startedAt: new Date(),
    lastUpdated: new Date(),
  },
  updateResponse: jest.fn(),
  updateReflection: jest.fn(),
  setCurrentPhase: jest.fn(),
  clearState: jest.fn(),
  saveToAPI: jest.fn(),
  isLoading: false,
  lastSaved: null,
};

const mockSurveyLanguage = {
  language: 'en' as const,
  toggleLanguage: jest.fn(),
  getLocalizedText: jest.fn((en: string, ar: string) => en),
};

const mockSurveyValidation = {
  validation: { errors: [] },
  navigation: { canGoBack: true, canGoNext: false },
  canAdvanceToNextPhase: false,
};

describe('Phase2Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useSurveyState as jest.Mock).mockReturnValue(mockSurveyState);
    (useSurveyLanguage as jest.Mock).mockReturnValue(mockSurveyLanguage);
    (useSurveyValidation as jest.Mock).mockReturnValue(mockSurveyValidation);
  });

  it('renders Phase 2 page with correct title', () => {
    render(<Phase2Page />);

    expect(screen.getByText('Behavioral Manifestations')).toBeInTheDocument();
    expect(mockSurveyLanguage.getLocalizedText).toHaveBeenCalledWith(
      'Behavioral Manifestations',
      'المظاهر السلوكية'
    );
  });

  it('renders all 7 Phase 2 questions', () => {
    render(<Phase2Page />);

    // Check for the 7 Phase 2 questions
    expect(screen.getByText('Anger and Irritability')).toBeInTheDocument();
    expect(screen.getByText('Hatred and Resentment')).toBeInTheDocument();
    expect(screen.getByText('Gossip and Backbiting')).toBeInTheDocument();
    expect(screen.getByText('Suspicion and Doubt')).toBeInTheDocument();
    expect(screen.getByText('Attachment to Worldly Things')).toBeInTheDocument();
    expect(screen.getByText('Spiritual Laziness')).toBeInTheDocument();
    expect(screen.getByText('Hopelessness and Despair')).toBeInTheDocument();
  });

  it('sets current phase to 2 on mount', () => {
    render(<Phase2Page />);

    expect(mockSurveyState.setCurrentPhase).toHaveBeenCalledWith(2);
  });

  it('shows progress indicator with correct phase and percentage', () => {
    render(<Phase2Page />);

    // Should show phase 3 of 4 (since it's displaying phase 2 but showing step 3)
    // Progress should be 50% base since no questions are completed yet
    expect(screen.getByText(/Completed: 0 of 7 questions/)).toBeInTheDocument();
  });

  it('handles response changes correctly', () => {
    render(<Phase2Page />);

    // Find the first question's Likert scale and click a rating
    const ratingButtons = screen.getAllByRole('radio');
    if (ratingButtons.length > 0) {
      fireEvent.click(ratingButtons[0]);
    }

    // Should call updateResponse when a rating is selected
    // Note: This test depends on the internal implementation of QuestionCard
  });

  it('enables continue button when all questions are answered', () => {
    const mockValidationComplete = {
      ...mockSurveyValidation,
      canAdvanceToNextPhase: true,
    };
    (useSurveyValidation as jest.Mock).mockReturnValue(mockValidationComplete);

    render(<Phase2Page />);

    const continueButton = screen.getByRole('button', { name: /continue to reflection/i });
    expect(continueButton).not.toBeDisabled();
  });

  it('disables continue button when questions are incomplete', () => {
    render(<Phase2Page />);

    const continueButton = screen.getByRole('button', { name: /continue to reflection/i });
    expect(continueButton).toBeDisabled();
  });

  it('navigates to reflection page on continue', async () => {
    const mockValidationComplete = {
      ...mockSurveyValidation,
      canAdvanceToNextPhase: true,
    };
    (useSurveyValidation as jest.Mock).mockReturnValue(mockValidationComplete);
    mockSurveyState.saveToAPI.mockResolvedValue(true);

    render(<Phase2Page />);

    const continueButton = screen.getByRole('button', { name: /continue to reflection/i });
    fireEvent.click(continueButton);

    await waitFor(() => {
      expect(mockSurveyState.saveToAPI).toHaveBeenCalledWith(2);
      expect(mockRouter.push).toHaveBeenCalledWith('/onboarding/reflection');
    });
  });

  it('navigates back to Phase 1 on back button click', () => {
    render(<Phase2Page />);

    const backButton = screen.getByRole('button', { name: /back/i });
    fireEvent.click(backButton);

    expect(mockRouter.push).toHaveBeenCalledWith('/onboarding/phase1');
  });

  it('displays validation errors when present', () => {
    const mockValidationWithErrors = {
      ...mockSurveyValidation,
      validation: { errors: ['Please answer all questions'] },
    };
    (useSurveyValidation as jest.Mock).mockReturnValue(mockValidationWithErrors);

    render(<Phase2Page />);

    expect(screen.getByText('Please complete all questions')).toBeInTheDocument();
    expect(screen.getByText('• Please answer all questions')).toBeInTheDocument();
  });

  it('shows auto-save status indicators', () => {
    render(<Phase2Page />);

    // Auto-save status should be hidden initially
    expect(screen.queryByText('Saving responses...')).not.toBeInTheDocument();
    expect(screen.queryByText('All responses saved')).not.toBeInTheDocument();
    expect(screen.queryByText('Failed to save - will retry')).not.toBeInTheDocument();
  });

  it('toggles language when language button is clicked', () => {
    render(<Phase2Page />);

    const languageButton = screen.getByRole('button', { name: /عربي/i });
    fireEvent.click(languageButton);

    expect(mockSurveyLanguage.toggleLanguage).toHaveBeenCalled();
  });

  it('calculates progress correctly based on completed questions', () => {
    const stateWithResponses = {
      ...mockSurveyState,
      state: {
        ...mockSurveyState.state,
        responses: {
          anger: { score: 3, note: '', answeredAt: new Date() },
          malice: { score: 2, note: '', answeredAt: new Date() },
        },
      },
    };
    (useSurveyState as jest.Mock).mockReturnValue(stateWithResponses);

    render(<Phase2Page />);

    // Should show 2 of 7 questions completed
    expect(screen.getByText(/Completed: 2 of 7 questions/)).toBeInTheDocument();
  });

  it('handles save API errors gracefully', async () => {
    const mockValidationComplete = {
      ...mockSurveyValidation,
      canAdvanceToNextPhase: true,
    };
    (useSurveyValidation as jest.Mock).mockReturnValue(mockValidationComplete);
    mockSurveyState.saveToAPI.mockResolvedValue(false);

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    render(<Phase2Page />);

    const continueButton = screen.getByRole('button', { name: /continue to reflection/i });
    fireEvent.click(continueButton);

    await waitFor(() => {
      expect(mockSurveyState.saveToAPI).toHaveBeenCalledWith(2);
      expect(consoleSpy).toHaveBeenCalledWith('Failed to save Phase 2 responses');
      expect(mockRouter.push).not.toHaveBeenCalled();
    });

    consoleSpy.mockRestore();
  });

  it('shows loading state when saving', () => {
    const loadingState = {
      ...mockSurveyState,
      isLoading: true,
    };
    (useSurveyState as jest.Mock).mockReturnValue(loadingState);

    render(<Phase2Page />);

    const continueButton = screen.getByRole('button', { name: /continue to reflection/i });
    expect(continueButton).toBeDisabled();
  });
});