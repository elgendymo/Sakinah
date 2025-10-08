import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ProgressIndicator from '@/components/survey/ProgressIndicator';

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

describe('ProgressIndicator', () => {
  const defaultProps = {
    currentPhase: 2,
    totalPhases: 4,
    percentage: 50
  };

  it('renders with default variant', () => {
    render(<ProgressIndicator {...defaultProps} />);

    expect(screen.getByText('Step 2 of 4')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('renders with minimal variant', () => {
    render(
      <ProgressIndicator
        {...defaultProps}
        variant="minimal"
        showPercentage={true}
      />
    );

    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.queryByText('Step 2 of 4')).not.toBeInTheDocument();
  });

  it('renders with detailed variant', () => {
    render(
      <ProgressIndicator
        {...defaultProps}
        variant="detailed"
      />
    );

    expect(screen.getByText('Progress: 50% complete')).toBeInTheDocument();

    // Should render step circles for each phase
    const stepCircles = screen.getAllByRole('generic').filter(
      el => el.className.includes('rounded-full') && el.className.includes('w-8 h-8')
    );
    expect(stepCircles).toHaveLength(4);
  });

  it('hides percentage when showPercentage is false', () => {
    render(
      <ProgressIndicator
        {...defaultProps}
        showPercentage={false}
      />
    );

    expect(screen.queryByText('50%')).not.toBeInTheDocument();
    expect(screen.getByText('Step 2 of 4')).toBeInTheDocument();
  });

  it('hides step text when showStepText is false', () => {
    render(
      <ProgressIndicator
        {...defaultProps}
        showStepText={false}
      />
    );

    expect(screen.queryByText('Step 2 of 4')).not.toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <ProgressIndicator
        {...defaultProps}
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('handles zero percentage correctly', () => {
    render(
      <ProgressIndicator
        currentPhase={1}
        totalPhases={4}
        percentage={0}
      />
    );

    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('handles 100% progress correctly', () => {
    render(
      <ProgressIndicator
        currentPhase={4}
        totalPhases={4}
        percentage={100}
      />
    );

    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('Step 4 of 4')).toBeInTheDocument();
  });

  it('renders progress bar with correct width style', () => {
    render(<ProgressIndicator {...defaultProps} />);

    // The progress bar should have the animated width
    const progressBars = screen.getAllByRole('generic').filter(
      el => el.className.includes('bg-gradient-to-r') && el.className.includes('from-emerald-500')
    );
    expect(progressBars.length).toBeGreaterThan(0);
  });

  it('shows step indicator dot positioned correctly', () => {
    const { container } = render(<ProgressIndicator {...defaultProps} />);

    // Look for the indicator dot
    const indicatorDot = container.querySelector('.absolute.top-1\\/2.w-4.h-4');
    expect(indicatorDot).toBeInTheDocument();
  });

  describe('Detailed variant step indicators', () => {
    it('shows completed steps with checkmarks', () => {
      render(
        <ProgressIndicator
          currentPhase={3}
          totalPhases={4}
          percentage={75}
          variant="detailed"
        />
      );

      // Steps 1 and 2 should be completed (checkmarks)
      const checkmarks = screen.getAllByRole('generic').filter(
        el => el.innerHTML.includes('M5 13l4 4L19 7')
      );
      expect(checkmarks.length).toBeGreaterThan(0);
    });

    it('highlights current step appropriately', () => {
      render(
        <ProgressIndicator
          currentPhase={2}
          totalPhases={4}
          percentage={50}
          variant="detailed"
        />
      );

      // Current step should have special styling
      const currentStepElement = screen.getByText('2');
      expect(currentStepElement.closest('div')).toHaveClass(
        expect.stringContaining('border-emerald-600')
      );
    });
  });

  describe('Accessibility', () => {
    it('provides meaningful structure for screen readers', () => {
      render(<ProgressIndicator {...defaultProps} />);

      // Should have text content that describes progress
      expect(screen.getByText('Step 2 of 4')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('maintains semantic structure in detailed variant', () => {
      render(
        <ProgressIndicator
          {...defaultProps}
          variant="detailed"
        />
      );

      expect(screen.getByText('Progress: 50% complete')).toBeInTheDocument();
    });
  });
});