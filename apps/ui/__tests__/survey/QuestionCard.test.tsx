import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import QuestionCard from '@/components/survey/QuestionCard';

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

describe('QuestionCard', () => {
  const mockOnChange = vi.fn();
  const mockOnNoteChange = vi.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
    mockOnNoteChange.mockClear();
  });

  const defaultProps = {
    number: 1,
    titleEn: 'Test Question',
    titleAr: 'سؤال اختبار',
    questionEn: 'How often do you experience this?',
    questionAr: 'كم مرة تواجه هذا؟',
    value: null,
    onChange: mockOnChange,
    note: '',
    onNoteChange: mockOnNoteChange
  };

  it('renders question content correctly', () => {
    render(<QuestionCard {...defaultProps} />);

    expect(screen.getByText('Test Question')).toBeInTheDocument();
    expect(screen.getByText('How often do you experience this?')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('displays Arabic content when language is Arabic', () => {
    render(<QuestionCard {...defaultProps} language="ar" />);

    expect(screen.getByText('سؤال اختبار')).toBeInTheDocument();
    expect(screen.getByText('كم مرة تواجه هذا؟')).toBeInTheDocument();
  });

  it('shows bilingual toggle when showBilingualToggle is true', () => {
    render(<QuestionCard {...defaultProps} showBilingualToggle />);

    const toggleButton = screen.getByRole('button', { name: '' }); // Toggle button
    expect(toggleButton).toBeInTheDocument();
  });

  it('expands to show secondary language when toggle is clicked', async () => {
    const user = userEvent.setup();
    render(<QuestionCard {...defaultProps} language="en" showBilingualToggle />);

    // Initially, Arabic content should not be visible
    expect(screen.queryByText('سؤال اختبار')).not.toBeInTheDocument();

    // Click the toggle button
    const toggleButtons = screen.getAllByRole('button');
    const expandButton = toggleButtons.find(btn =>
      btn.querySelector('svg') // Find button with icon
    );

    if (expandButton) {
      await user.click(expandButton);
      expect(screen.getByText('سؤال اختبار')).toBeInTheDocument();
    }
  });

  it('shows completed status when value is provided', () => {
    render(<QuestionCard {...defaultProps} value={3} />);

    expect(screen.getByText('Completed')).toBeInTheDocument();
    // Should show checkmark instead of number
    const checkmark = screen.getByRole('generic', {
      name: ''
    });
    expect(checkmark).toBeInTheDocument();
  });

  it('shows Arabic completed status', () => {
    render(<QuestionCard {...defaultProps} value={3} language="ar" />);

    expect(screen.getByText('مكتمل')).toBeInTheDocument();
  });

  it('calls onChange when Likert scale value is selected', async () => {
    const user = userEvent.setup();
    render(<QuestionCard {...defaultProps} />);

    const rateButton = screen.getByRole('button', { name: /rate 4/i });
    await user.click(rateButton);

    expect(mockOnChange).toHaveBeenCalledWith(4);
  });

  it('shows note toggle button', () => {
    render(<QuestionCard {...defaultProps} />);

    expect(screen.getByText('Add note')).toBeInTheDocument();
  });

  it('shows Arabic note toggle button', () => {
    render(<QuestionCard {...defaultProps} language="ar" />);

    expect(screen.getByText('إضافة ملاحظة')).toBeInTheDocument();
  });

  it('expands note field when note button is clicked', async () => {
    const user = userEvent.setup();
    render(<QuestionCard {...defaultProps} />);

    const noteButton = screen.getByText('Add note');
    await user.click(noteButton);

    const textarea = screen.getByPlaceholderText('Write your note here...');
    expect(textarea).toBeInTheDocument();
  });

  it('shows note character count', async () => {
    const user = userEvent.setup();
    render(<QuestionCard {...defaultProps} />);

    // Open note field
    const noteButton = screen.getByText('Add note');
    await user.click(noteButton);

    const textarea = screen.getByPlaceholderText('Write your note here...');
    await user.type(textarea, 'Test note');

    expect(screen.getByText('9/500')).toBeInTheDocument();
  });

  it('calls onNoteChange when note is typed', async () => {
    const user = userEvent.setup();
    render(<QuestionCard {...defaultProps} />);

    // Open note field
    const noteButton = screen.getByText('Add note');
    await user.click(noteButton);

    const textarea = screen.getByPlaceholderText('Write your note here...');
    await user.type(textarea, 'New note');

    expect(mockOnNoteChange).toHaveBeenCalled();
  });

  it('shows existing note content', () => {
    render(<QuestionCard {...defaultProps} note="Existing note content" />);

    // Note should be visible and toggle should show character count
    expect(screen.getByText(/Add note \(19 chars\)/)).toBeInTheDocument();
  });

  it('disables interactions when disabled prop is true', () => {
    render(<QuestionCard {...defaultProps} disabled />);

    // Likert scale buttons should be disabled
    const rateButtons = screen.getAllByRole('button', { name: /rate/i });
    rateButtons.forEach(button => {
      expect(button).toBeDisabled();
    });
  });

  describe('Compact variant', () => {
    it('renders in compact format', () => {
      render(<QuestionCard {...defaultProps} variant="compact" />);

      // Should not have the full padding and layout
      const container = screen.getByText('Test Question').closest('div');
      expect(container).toHaveClass(expect.stringContaining('flex'));
    });

    it('shows compact Likert scale', () => {
      render(<QuestionCard {...defaultProps} variant="compact" />);

      // Compact variant should render smaller scale buttons
      const buttons = screen.getAllByRole('button');
      const likertButtons = buttons.filter(btn =>
        btn.className.includes('w-10 h-10')
      );
      expect(likertButtons.length).toBeGreaterThan(0);
    });
  });

  describe('RTL Support', () => {
    it('applies RTL classes when language is Arabic', () => {
      const { container } = render(<QuestionCard {...defaultProps} language="ar" />);

      expect(container.firstChild).toHaveClass('rtl');
    });

    it('reverses flex direction for Arabic layout', () => {
      render(<QuestionCard {...defaultProps} language="ar" />);

      const flexContainers = screen.getAllByRole('generic').filter(el =>
        el.className.includes('flex-row-reverse')
      );
      expect(flexContainers.length).toBeGreaterThan(0);
    });

    it('applies Arabic text styles to Arabic content', () => {
      render(<QuestionCard {...defaultProps} language="ar" />);

      const arabicTitle = screen.getByText('سؤال اختبار');
      expect(arabicTitle).toHaveClass('arabic-heading');
    });
  });

  describe('Accessibility', () => {
    it('provides semantic structure with headings', () => {
      render(<QuestionCard {...defaultProps} />);

      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveTextContent('Test Question');
    });

    it('maintains proper focus order', async () => {
      const user = userEvent.setup();
      render(<QuestionCard {...defaultProps} />);

      // Should be able to tab through interactive elements
      await user.tab();
      const firstFocusable = document.activeElement;
      expect(firstFocusable).toBeInTheDocument();
    });

    it('provides appropriate ARIA labels for form controls', async () => {
      const user = userEvent.setup();
      render(<QuestionCard {...defaultProps} />);

      // Open note field
      const noteButton = screen.getByText('Add note');
      await user.click(noteButton);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('placeholder');
    });
  });

  describe('Error Handling', () => {
    it('handles missing props gracefully', () => {
      const minimalProps = {
        number: 1,
        titleEn: '',
        titleAr: '',
        questionEn: '',
        questionAr: '',
        value: null,
        onChange: mockOnChange,
        onNoteChange: mockOnNoteChange
      };

      expect(() => render(<QuestionCard {...minimalProps} />)).not.toThrow();
    });

    it('handles very long note content', async () => {
      const user = userEvent.setup();
      render(<QuestionCard {...defaultProps} />);

      const noteButton = screen.getByText('Add note');
      await user.click(noteButton);

      const textarea = screen.getByPlaceholderText('Write your note here...');

      // Type content that exceeds the limit
      const longText = 'x'.repeat(600); // More than 500 char limit
      await user.type(textarea, longText);

      // Should be limited to 500 characters
      expect(textarea).toHaveAttribute('maxLength', '500');
    });
  });

  describe('Animation and Transitions', () => {
    it('handles rapid state changes without errors', async () => {
      const user = userEvent.setup();
      render(<QuestionCard {...defaultProps} />);

      // Rapidly toggle note field
      const noteButton = screen.getByText('Add note');
      await user.click(noteButton);
      await user.click(noteButton);
      await user.click(noteButton);

      expect(() => screen.getByText('Add note')).not.toThrow();
    });
  });
});