import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import LikertScale from '@/components/survey/LikertScale';

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

describe('LikertScale', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  const defaultProps = {
    value: null,
    onChange: mockOnChange
  };

  it('renders all 5 scale options', () => {
    render(<LikertScale {...defaultProps} />);

    // Should render buttons for values 1-5
    for (let i = 1; i <= 5; i++) {
      expect(screen.getByText(i.toString())).toBeInTheDocument();
    }
  });

  it('displays default English labels', () => {
    render(<LikertScale {...defaultProps} />);

    expect(screen.getByText('Never')).toBeInTheDocument();
    expect(screen.getByText('Rarely')).toBeInTheDocument();
    expect(screen.getByText('Sometimes')).toBeInTheDocument();
    expect(screen.getByText('Often')).toBeInTheDocument();
    expect(screen.getByText('Always')).toBeInTheDocument();
  });

  it('displays Arabic labels when language is Arabic', () => {
    render(<LikertScale {...defaultProps} language="ar" />);

    expect(screen.getByText('أبداً')).toBeInTheDocument();
    expect(screen.getByText('نادراً')).toBeInTheDocument();
    expect(screen.getByText('أحياناً')).toBeInTheDocument();
    expect(screen.getByText('غالباً')).toBeInTheDocument();
    expect(screen.getByText('دائماً')).toBeInTheDocument();
  });

  it('calls onChange when a value is selected', async () => {
    const user = userEvent.setup();
    render(<LikertScale {...defaultProps} />);

    const button3 = screen.getByRole('button', { name: /rate 3/i });
    await user.click(button3);

    expect(mockOnChange).toHaveBeenCalledWith(3);
  });

  it('highlights selected value', () => {
    render(<LikertScale {...defaultProps} value={3} />);

    const selectedButton = screen.getByRole('button', { name: /rate 3/i });
    expect(selectedButton).toHaveClass(expect.stringContaining('from-gold-500'));
  });

  it('shows selected value display when value is selected', () => {
    render(<LikertScale {...defaultProps} value={4} language="en" />);

    expect(screen.getByText('Selected: Often')).toBeInTheDocument();
  });

  it('shows Arabic selected value display', () => {
    render(<LikertScale {...defaultProps} value={2} language="ar" />);

    expect(screen.getByText('تم اختيار: نادراً')).toBeInTheDocument();
  });

  it('disables interaction when disabled prop is true', async () => {
    const user = userEvent.setup();
    render(<LikertScale {...defaultProps} disabled />);

    const button1 = screen.getByRole('button', { name: /rate 1/i });
    expect(button1).toBeDisabled();

    await user.click(button1);
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('applies correct color coding for different values', () => {
    render(<LikertScale {...defaultProps} />);

    // Low values (1-2) should have emerald styling
    const button1 = screen.getByRole('button', { name: /rate 1/i });
    expect(button1).toHaveClass(expect.stringContaining('emerald'));

    // Medium value (3) should have gold styling
    const button3 = screen.getByRole('button', { name: /rate 3/i });
    expect(button3).toHaveClass(expect.stringContaining('gold'));

    // High values (4-5) should have rose styling
    const button5 = screen.getByRole('button', { name: /rate 5/i });
    expect(button5).toHaveClass(expect.stringContaining('rose'));
  });

  it('uses custom labels when provided', () => {
    const customLabels = {
      1: 'Very Low',
      2: 'Low',
      3: 'Medium',
      4: 'High',
      5: 'Very High'
    };

    render(<LikertScale {...defaultProps} labels={customLabels} />);

    expect(screen.getByText('Very Low')).toBeInTheDocument();
    expect(screen.getByText('Very High')).toBeInTheDocument();
  });

  it('hides labels when showLabels is false', () => {
    render(<LikertScale {...defaultProps} showLabels={false} />);

    expect(screen.queryByText('Never')).not.toBeInTheDocument();
    expect(screen.queryByText('Always')).not.toBeInTheDocument();
  });

  it('hides numbers when showNumbers is false', () => {
    render(<LikertScale {...defaultProps} showNumbers={false} />);

    // Numbers should not be visible, but buttons should still exist
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(5);

    // Check that "1" is not visible as text
    expect(screen.queryByText('1')).not.toBeInTheDocument();
  });

  describe('Compact variant', () => {
    it('renders in compact format', () => {
      render(<LikertScale {...defaultProps} variant="compact" />);

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(5);

      // Compact variant should have smaller buttons
      buttons.forEach(button => {
        expect(button).toHaveClass(expect.stringContaining('w-10 h-10'));
      });
    });

    it('applies RTL direction in compact variant', () => {
      const { container } = render(
        <LikertScale {...defaultProps} variant="compact" language="ar" />
      );

      expect(container.firstChild).toHaveClass('flex-row-reverse');
    });
  });

  describe('Detailed variant', () => {
    it('renders in detailed format with full-width options', () => {
      render(<LikertScale {...defaultProps} variant="detailed" />);

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(5);

      // Detailed variant should have full-width buttons
      buttons.forEach(button => {
        expect(button).toHaveClass(expect.stringContaining('w-full'));
      });
    });

    it('shows checkmark for selected value in detailed variant', () => {
      render(<LikertScale {...defaultProps} variant="detailed" value={3} />);

      expect(screen.getByText('✓')).toBeInTheDocument();
    });
  });

  describe('RTL Support', () => {
    it('applies RTL classes when language is Arabic', () => {
      const { container } = render(<LikertScale {...defaultProps} language="ar" />);

      expect(container.firstChild).toHaveClass('rtl');
      expect(container.querySelector('.flex')).toHaveClass('flex-row-reverse');
    });

    it('applies Arabic text classes to labels', () => {
      render(<LikertScale {...defaultProps} language="ar" />);

      const arabicLabels = screen.getAllByText(/أبداً|نادراً|أحياناً|غالباً|دائماً/);
      arabicLabels.forEach(label => {
        expect(label).toHaveClass('arabic-text');
      });
    });
  });

  describe('Accessibility', () => {
    it('provides proper ARIA labels for each option', () => {
      render(<LikertScale {...defaultProps} />);

      for (let i = 1; i <= 5; i++) {
        const button = screen.getByRole('button', { name: new RegExp(`Rate ${i}`) });
        expect(button).toBeInTheDocument();
      }
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<LikertScale {...defaultProps} />);

      const firstButton = screen.getByRole('button', { name: /rate 1/i });
      firstButton.focus();

      await user.keyboard('{Enter}');
      expect(mockOnChange).toHaveBeenCalledWith(1);
    });

    it('provides focus indicators', () => {
      render(<LikertScale {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveClass(expect.stringContaining('focus:'));
      });
    });
  });

  describe('Animation and Interaction', () => {
    it('handles rapid clicking without issues', async () => {
      const user = userEvent.setup();
      render(<LikertScale {...defaultProps} />);

      const button2 = screen.getByRole('button', { name: /rate 2/i });
      const button4 = screen.getByRole('button', { name: /rate 4/i });

      await user.click(button2);
      await user.click(button4);
      await user.click(button2);

      expect(mockOnChange).toHaveBeenCalledTimes(3);
      expect(mockOnChange).toHaveBeenLastCalledWith(2);
    });
  });
});