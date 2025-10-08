import React, { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import type { LikertScore } from '@sakinah/types';

import ProgressIndicator from '@/components/survey/ProgressIndicator';
import QuestionCard from '@/components/survey/QuestionCard';
import NavigationButtons from '@/components/survey/NavigationButtons';
import { useSurveyLanguage } from '@/components/survey/hooks/useSurveyLanguage';

const mockIntersectionObserver = () => {
  const mockIntersectionObserver = vi.fn();
  mockIntersectionObserver.mockReturnValue({
    observe: () => null,
    unobserve: () => null,
    disconnect: () => null
  });
  window.IntersectionObserver = mockIntersectionObserver;
};

beforeAll(() => {
  mockIntersectionObserver();
});

// Mock localStorage for language hook
const localStorageMock = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Test component that integrates all survey components
const IntegratedSurveyTest: React.FC = () => {
  const [currentPhase, setCurrentPhase] = useState(1);
  const [responses, setResponses] = useState<Record<string, LikertScore>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const { language, setLanguage, getLocalizedText } = useSurveyLanguage();

  const totalPhases = 4;
  const questions = [
    {
      id: 'envy',
      titleEn: 'Envy',
      titleAr: 'الحسد',
      questionEn: 'How often do you feel envious?',
      questionAr: 'كم مرة تشعر بالحسد؟'
    },
    {
      id: 'anger',
      titleEn: 'Anger',
      titleAr: 'الغضب',
      questionEn: 'How often do you feel angry?',
      questionAr: 'كم مرة تشعر بالغضب؟'
    }
  ];

  const currentQuestion = questions[currentPhase - 1];
  const progress = (currentPhase / totalPhases) * 100;
  const completedQuestions = Object.keys(responses).length;

  const handleQuestionResponse = (questionId: string, value: LikertScore) => {
    setResponses(prev => ({ ...prev, [questionId]: value }));
  };

  const handleNoteChange = (questionId: string, note: string) => {
    setNotes(prev => ({ ...prev, [questionId]: note }));
  };

  const handleNext = () => {
    if (currentPhase < totalPhases) {
      setCurrentPhase(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentPhase > 1) {
      setCurrentPhase(prev => prev - 1);
    }
  };

  const canGoNext = currentQuestion ? responses[currentQuestion.id] !== undefined : false;

  return (
    <div className="survey-container">
      {/* Language Toggle */}
      <div className="mb-4">
        <button
          onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
          data-testid="language-toggle"
        >
          {language === 'en' ? 'العربية' : 'English'}
        </button>
      </div>

      {/* Progress Indicator */}
      <ProgressIndicator
        currentPhase={currentPhase}
        totalPhases={totalPhases}
        percentage={progress}
      />

      {/* Current Question */}
      {currentQuestion && (
        <QuestionCard
          number={currentPhase}
          titleEn={currentQuestion.titleEn}
          titleAr={currentQuestion.titleAr}
          questionEn={currentQuestion.questionEn}
          questionAr={currentQuestion.questionAr}
          value={responses[currentQuestion.id] || null}
          onChange={(value) => handleQuestionResponse(currentQuestion.id, value)}
          note={notes[currentQuestion.id] || ''}
          onNoteChange={(note) => handleNoteChange(currentQuestion.id, note)}
          language={language}
        />
      )}

      {/* Navigation */}
      <NavigationButtons
        onNext={handleNext}
        onBack={currentPhase > 1 ? handleBack : undefined}
        showBack={currentPhase > 1}
        nextDisabled={!canGoNext}
        language={language}
        nextLabel={
          currentPhase === totalPhases
            ? getLocalizedText('Finish', 'إنهاء')
            : getLocalizedText('Continue', 'التالي')
        }
      />

      {/* Debug Info */}
      <div data-testid="debug-info" className="mt-4 text-sm text-gray-500">
        <p>Phase: {currentPhase}</p>
        <p>Progress: {progress}%</p>
        <p>Completed: {completedQuestions}/{questions.length}</p>
        <p>Language: {language}</p>
      </div>
    </div>
  );
};

describe('Survey Components Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders complete survey interface', () => {
    render(<IntegratedSurveyTest />);

    // Should show progress indicator
    expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();
    expect(screen.getByText('25%')).toBeInTheDocument();

    // Should show first question
    expect(screen.getByText('Envy')).toBeInTheDocument();
    expect(screen.getByText('How often do you feel envious?')).toBeInTheDocument();

    // Should show navigation buttons
    expect(screen.getByText('Continue')).toBeInTheDocument();
    expect(screen.queryByText('Back')).not.toBeInTheDocument(); // First phase has no back

    // Should show language toggle
    expect(screen.getByTestId('language-toggle')).toBeInTheDocument();
  });

  it('completes full survey flow', async () => {
    const user = userEvent.setup();
    render(<IntegratedSurveyTest />);

    // Step 1: Answer first question
    const rating3Button = screen.getByRole('button', { name: /rate 3/i });
    await user.click(rating3Button);

    // Next button should be enabled
    const continueButton = screen.getByText('Continue');
    expect(continueButton).not.toBeDisabled();

    // Go to next question
    await user.click(continueButton);

    // Should be on question 2
    expect(screen.getByText('Step 2 of 4')).toBeInTheDocument();
    expect(screen.getByText('Anger')).toBeInTheDocument();

    // Back button should now be visible
    expect(screen.getByText('Back')).toBeInTheDocument();

    // Answer second question
    const rating4Button = screen.getByRole('button', { name: /rate 4/i });
    await user.click(rating4Button);

    // Progress should update
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('supports language switching throughout flow', async () => {
    const user = userEvent.setup();
    render(<IntegratedSurveyTest />);

    // Initially in English
    expect(screen.getByText('Envy')).toBeInTheDocument();
    expect(screen.getByText('Continue')).toBeInTheDocument();

    // Switch to Arabic
    const languageToggle = screen.getByTestId('language-toggle');
    await user.click(languageToggle);

    // Should show Arabic content
    expect(screen.getByText('الحسد')).toBeInTheDocument();
    expect(screen.getByText('التالي')).toBeInTheDocument();

    // Answer question in Arabic
    const rating2Button = screen.getByRole('button', { name: /rate 2/i });
    await user.click(rating2Button);

    // Should show Arabic selected state
    expect(screen.getByText('تم اختيار: نادراً')).toBeInTheDocument();

    // Switch back to English
    await user.click(languageToggle);

    // Should retain answer but show English labels
    expect(screen.getByText('Selected: Rarely')).toBeInTheDocument();
  });

  it('maintains state when navigating back and forth', async () => {
    const user = userEvent.setup();
    render(<IntegratedSurveyTest />);

    // Answer first question
    const rating5Button = screen.getByRole('button', { name: /rate 5/i });
    await user.click(rating5Button);

    // Add a note
    const addNoteButton = screen.getByText('Add note');
    await user.click(addNoteButton);

    const noteTextarea = screen.getByPlaceholderText('Write your note here...');
    await user.type(noteTextarea, 'This is my test note');

    // Go to next question
    const continueButton = screen.getByText('Continue');
    await user.click(continueButton);

    // Answer second question
    const rating3Button = screen.getByRole('button', { name: /rate 3/i });
    await user.click(rating3Button);

    // Go back to first question
    const backButton = screen.getByText('Back');
    await user.click(backButton);

    // Should retain previous answer and note
    expect(screen.getByText('Selected: Always')).toBeInTheDocument();
    expect(screen.getByText(/Add note \(19 chars\)/)).toBeInTheDocument();

    // Note should still be there when expanded
    await user.click(screen.getByText(/Add note/));
    const restoredTextarea = screen.getByDisplayValue('This is my test note');
    expect(restoredTextarea).toBeInTheDocument();
  });

  it('prevents navigation when questions are incomplete', async () => {
    const user = userEvent.setup();
    render(<IntegratedSurveyTest />);

    // Continue button should be disabled initially
    const continueButton = screen.getByText('Continue');
    expect(continueButton).toBeDisabled();

    // Try to click it anyway
    await user.click(continueButton);

    // Should still be on first question
    expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();
    expect(screen.getByText('Envy')).toBeInTheDocument();
  });

  it('shows proper completion status across questions', async () => {
    const user = userEvent.setup();
    render(<IntegratedSurveyTest />);

    // Question should show pending state
    const questionNumber = screen.getByText('1');
    expect(questionNumber.closest('div')).not.toHaveClass('bg-emerald-600');

    // Answer the question
    const rating2Button = screen.getByRole('button', { name: /rate 2/i });
    await user.click(rating2Button);

    // Should show completed state
    expect(screen.getByText('Completed')).toBeInTheDocument();

    // Go to next question
    await user.click(screen.getByText('Continue'));

    // Go back and verify completion status persists
    await user.click(screen.getByText('Back'));

    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('integrates with note functionality across languages', async () => {
    const user = userEvent.setup();
    render(<IntegratedSurveyTest />);

    // Add note in English
    await user.click(screen.getByText('Add note'));
    const noteTextarea = screen.getByPlaceholderText('Write your note here...');
    await user.type(noteTextarea, 'English note');

    // Switch to Arabic
    await user.click(screen.getByTestId('language-toggle'));

    // Note button should be in Arabic
    expect(screen.getByText(/إضافة ملاحظة/)).toBeInTheDocument();

    // Note content should be preserved
    expect(screen.getByDisplayValue('English note')).toBeInTheDocument();

    // Placeholder should be in Arabic
    expect(noteTextarea).toHaveAttribute('placeholder', 'اكتب ملاحظتك هنا...');
  });

  it('handles progress calculation correctly', async () => {
    const user = userEvent.setup();
    render(<IntegratedSurveyTest />);

    // Initial progress
    expect(screen.getByText('25%')).toBeInTheDocument();

    // Answer first question and proceed
    await user.click(screen.getByRole('button', { name: /rate 3/i }));
    await user.click(screen.getByText('Continue'));

    // Progress should update
    expect(screen.getByText('50%')).toBeInTheDocument();

    // Answer second question and proceed
    await user.click(screen.getByRole('button', { name: /rate 4/i }));
    await user.click(screen.getByText('Continue'));

    // Progress should continue to update
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  describe('Accessibility integration', () => {
    it('maintains proper focus order throughout survey', async () => {
      const user = userEvent.setup();
      render(<IntegratedSurveyTest />);

      // Should be able to tab through interactive elements
      await user.tab(); // Language toggle
      expect(document.activeElement).toBe(screen.getByTestId('language-toggle'));

      await user.tab(); // First Likert scale button
      expect(document.activeElement?.getAttribute('aria-label')).toContain('Rate 1');
    });

    it('provides proper semantic structure', () => {
      render(<IntegratedSurveyTest />);

      // Should have proper heading structure
      const questionHeading = screen.getByRole('heading', { level: 3 });
      expect(questionHeading).toHaveTextContent('Envy');

      // Should have proper button roles
      const continueButton = screen.getByRole('button', { name: /continue/i });
      expect(continueButton).toBeInTheDocument();
    });
  });

  describe('Error scenarios', () => {
    it('handles missing question data gracefully', () => {
      // Mock a scenario where currentQuestion might be undefined
      const EmptyQuestionTest = () => {
        return (
          <div>
            <ProgressIndicator currentPhase={1} totalPhases={4} percentage={25} />
            <NavigationButtons onNext={() => {}} />
          </div>
        );
      };

      expect(() => render(<EmptyQuestionTest />)).not.toThrow();
    });
  });
});