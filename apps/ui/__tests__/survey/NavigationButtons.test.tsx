import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import NavigationButtons from '@/components/survey/NavigationButtons';

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

describe('NavigationButtons', () => {
  const mockOnNext = vi.fn();
  const mockOnBack = vi.fn();

  beforeEach(() => {
    mockOnNext.mockClear();
    mockOnBack.mockClear();
  });

  const defaultProps = {
    onNext: mockOnNext,
    onBack: mockOnBack
  };

  it('renders next button with default label', () => {
    render(<NavigationButtons {...defaultProps} />);

    expect(screen.getByText('Continue')).toBeInTheDocument();
  });

  it('renders back button when showBack is true', () => {
    render(<NavigationButtons {...defaultProps} showBack />);

    expect(screen.getByText('Back')).toBeInTheDocument();
  });

  it('hides back button when showBack is false', () => {
    render(<NavigationButtons {...defaultProps} showBack={false} />);

    expect(screen.queryByText('Back')).not.toBeInTheDocument();
  });

  it('uses custom labels when provided', () => {
    render(
      <NavigationButtons
        {...defaultProps}
        nextLabel="Next Step"
        backLabel="Previous"
        showBack
      />
    );

    expect(screen.getByText('Next Step')).toBeInTheDocument();
    expect(screen.getByText('Previous')).toBeInTheDocument();
  });

  it('displays Arabic labels when language is Arabic', () => {
    render(
      <NavigationButtons
        {...defaultProps}
        language="ar"
        showBack
      />
    );

    expect(screen.getByText('التالي')).toBeInTheDocument();
    expect(screen.getByText('السابق')).toBeInTheDocument();
  });

  it('calls onNext when next button is clicked', async () => {
    const user = userEvent.setup();
    render(<NavigationButtons {...defaultProps} />);

    const nextButton = screen.getByText('Continue');
    await user.click(nextButton);

    expect(mockOnNext).toHaveBeenCalledTimes(1);
  });

  it('calls onBack when back button is clicked', async () => {
    const user = userEvent.setup();
    render(<NavigationButtons {...defaultProps} showBack />);

    const backButton = screen.getByText('Back');
    await user.click(backButton);

    expect(mockOnBack).toHaveBeenCalledTimes(1);
  });

  it('disables next button when nextDisabled is true', () => {
    render(<NavigationButtons {...defaultProps} nextDisabled />);

    const nextButton = screen.getByText('Continue');
    expect(nextButton).toBeDisabled();
  });

  it('shows loading state when loading is true', () => {
    render(<NavigationButtons {...defaultProps} loading />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('applies RTL layout when language is Arabic', () => {
    const { container } = render(
      <NavigationButtons {...defaultProps} language="ar" showBack />
    );

    const flexContainer = container.querySelector('.flex-row-reverse');
    expect(flexContainer).toBeInTheDocument();
  });

  it('renders custom next icon when provided', () => {
    const customIcon = <span data-testid="custom-icon">→</span>;
    render(<NavigationButtons {...defaultProps} nextIcon={customIcon} />);

    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  describe('Floating variant', () => {
    it('renders with floating layout', () => {
      render(<NavigationButtons {...defaultProps} variant="floating" />);

      const floatingContainer = screen.getByText('Continue').closest('.fixed');
      expect(floatingContainer).toBeInTheDocument();
      expect(floatingContainer).toHaveClass('bottom-6');
    });

    it('shows progress ring when progress is provided', () => {
      render(
        <NavigationButtons
          {...defaultProps}
          variant="floating"
          progress={75}
        />
      );

      expect(screen.getByText('75%')).toBeInTheDocument();
    });

    it('applies safe area padding for mobile', () => {
      render(<NavigationButtons {...defaultProps} variant="floating" />);

      const container = screen.getByText('Continue').closest('.fixed');
      expect(container).toHaveClass('safe-area-bottom');
    });
  });

  describe('Minimal variant', () => {
    it('renders with minimal layout', () => {
      render(<NavigationButtons {...defaultProps} variant="minimal" />);

      const container = screen.getByText('Continue').closest('.flex');
      expect(container).toHaveClass('justify-end');
    });

    it('renders back button as text link in minimal variant', () => {
      render(
        <NavigationButtons
          {...defaultProps}
          variant="minimal"
          showBack
        />
      );

      const backButton = screen.getByText('Back');
      expect(backButton.tagName).toBe('BUTTON');
      expect(backButton).toHaveClass(expect.stringContaining('text-sage-600'));
    });
  });

  describe('Progress bar integration', () => {
    it('shows progress bar when progress is provided in default variant', () => {
      render(<NavigationButtons {...defaultProps} progress={60} />);

      // Progress bar should be visible
      const progressBars = screen.getAllByRole('generic').filter(el =>
        el.className.includes('bg-gradient-to-r') && el.className.includes('from-emerald-500')
      );
      expect(progressBars.length).toBeGreaterThan(0);
    });

    it('hides progress bar when progress is 0', () => {
      render(<NavigationButtons {...defaultProps} progress={0} />);

      // No progress elements should be visible
      const progressElements = screen.queryAllByRole('generic').filter(el =>
        el.className.includes('h-1') && el.className.includes('bg-sage-200')
      );
      expect(progressElements).toHaveLength(0);
    });
  });

  describe('Accessibility', () => {
    it('provides proper button roles and labels', () => {
      render(<NavigationButtons {...defaultProps} showBack />);

      const nextButton = screen.getByRole('button', { name: /continue/i });
      const backButton = screen.getByRole('button', { name: /back/i });

      expect(nextButton).toBeInTheDocument();
      expect(backButton).toBeInTheDocument();
    });

    it('maintains proper tab order', async () => {
      const user = userEvent.setup();
      render(<NavigationButtons {...defaultProps} showBack />);

      // Should be able to tab between buttons
      await user.tab();
      const firstFocused = document.activeElement;

      await user.tab();
      const secondFocused = document.activeElement;

      expect(firstFocused).not.toBe(secondFocused);
    });

    it('provides appropriate ARIA states for disabled button', () => {
      render(<NavigationButtons {...defaultProps} nextDisabled />);

      const nextButton = screen.getByRole('button', { name: /continue/i });
      expect(nextButton).toBeDisabled();
      expect(nextButton).toHaveAttribute('disabled');
    });

    it('provides loading state accessibility', () => {
      render(<NavigationButtons {...defaultProps} loading />);

      const nextButton = screen.getByRole('button');
      expect(nextButton).toBeDisabled();
    });
  });

  describe('Keyboard navigation', () => {
    it('responds to Enter key on buttons', async () => {
      const user = userEvent.setup();
      render(<NavigationButtons {...defaultProps} />);

      const nextButton = screen.getByText('Continue');
      nextButton.focus();

      await user.keyboard('{Enter}');
      expect(mockOnNext).toHaveBeenCalledTimes(1);
    });

    it('responds to Space key on buttons', async () => {
      const user = userEvent.setup();
      render(<NavigationButtons {...defaultProps} showBack />);

      const backButton = screen.getByText('Back');
      backButton.focus();

      await user.keyboard(' ');
      expect(mockOnBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error handling', () => {
    it('handles missing onBack gracefully when showBack is true', () => {
      expect(() =>
        render(
          <NavigationButtons
            onNext={mockOnNext}
            showBack
            // onBack is undefined
          />
        )
      ).not.toThrow();
    });

    it('prevents interaction when buttons are disabled', async () => {
      const user = userEvent.setup();
      render(<NavigationButtons {...defaultProps} nextDisabled />);

      const nextButton = screen.getByText('Continue');
      await user.click(nextButton);

      expect(mockOnNext).not.toHaveBeenCalled();
    });
  });

  describe('Mobile optimization', () => {
    it('includes haptic feedback classes for mobile interaction', () => {
      render(<NavigationButtons {...defaultProps} />);

      // Should include touch-friendly sizing
      const nextButton = screen.getByText('Continue');
      expect(nextButton.closest('button')).toHaveClass(expect.stringContaining('px-6 py-3'));
    });
  });

  describe('Animation and transitions', () => {
    it('handles rapid navigation clicks without errors', async () => {
      const user = userEvent.setup();
      render(<NavigationButtons {...defaultProps} showBack />);

      const nextButton = screen.getByText('Continue');
      const backButton = screen.getByText('Back');

      // Rapid clicking should not cause errors
      await user.click(nextButton);
      await user.click(backButton);
      await user.click(nextButton);

      expect(mockOnNext).toHaveBeenCalledTimes(2);
      expect(mockOnBack).toHaveBeenCalledTimes(1);
    });
  });
});