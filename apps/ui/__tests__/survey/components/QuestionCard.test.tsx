import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import QuestionCard from '@/components/survey/ui/QuestionCard';
import type { SurveyQuestion } from '@/components/survey/types';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

const mockQuestion: SurveyQuestion = {
  id: 'q1',
  questionId: 'envy',
  titleEn: 'Envy and Jealousy',
  titleAr: 'الحسد والغيرة',
  questionEn: 'How often do you feel envious or jealous when you see others succeed?',
  questionAr: 'كم مرة تشعر بالحسد أو الغيرة عندما ترى الآخرين ينجحون؟',
  disease: 'envy',
  phase: 1,
  category: 'inner',
  order: 1
};

describe('QuestionCard', () => {
  const defaultProps = {
    question: mockQuestion,
    value: null as any,
    note: '',
    onChange: jest.fn(),
    onNoteChange: jest.fn(),
    language: 'en' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders question title and text in English', () => {
    render(<QuestionCard {...defaultProps} />);

    expect(screen.getByText('Envy and Jealousy')).toBeInTheDocument();
    expect(screen.getByText(/How often do you feel envious/)).toBeInTheDocument();
  });

  it('renders question title and text in Arabic', () => {
    render(<QuestionCard {...defaultProps} language="ar" />);

    expect(screen.getByText('الحسد والغيرة')).toBeInTheDocument();
    expect(screen.getByText(/كم مرة تشعر بالحسد/)).toBeInTheDocument();
  });

  it('displays question order number', () => {
    render(<QuestionCard {...defaultProps} />);

    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('renders Likert scale with all options', () => {
    render(<QuestionCard {...defaultProps} />);

    // Check for all 5 Likert scale buttons
    for (let i = 1; i <= 5; i++) {
      expect(screen.getByTestId(`likert-score-${i}`)).toBeInTheDocument();
    }
  });

  it('calls onChange when Likert scale option is selected', () => {
    const mockOnChange = jest.fn();
    render(<QuestionCard {...defaultProps} onChange={mockOnChange} />);

    const score3Button = screen.getByTestId('likert-score-3');
    fireEvent.click(score3Button);

    expect(mockOnChange).toHaveBeenCalledWith(3);
  });

  it('shows selected state for answered question', () => {
    render(<QuestionCard {...defaultProps} value={4} />);

    const score4Button = screen.getByTestId('likert-score-4');
    expect(score4Button).toHaveClass('bg-emerald-600');
  });
});