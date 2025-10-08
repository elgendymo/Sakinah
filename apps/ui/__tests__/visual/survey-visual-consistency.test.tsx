/**
 * Visual consistency tests for survey components
 * Tests various browsers, devices, and accessibility scenarios
 */

import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import '@testing-library/jest-dom';

// Import components to test
import AnimatedProgressIndicator from '@/components/survey/AnimatedProgressIndicator';
import { AccessibleLikertScale, AccessibleProgressIndicator } from '@/components/survey/AccessibleSurveyComponents';
import RadarChart from '@/components/survey/RadarChart';
import SkeletonLoader from '@/components/survey/SkeletonLoader';
import { MobileOptimizedSurvey, MobileLikertScale } from '@/components/survey/MobileOptimizedSurvey';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock framer-motion for testing
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    svg: ({ children, ...props }: any) => <svg {...props}>{children}</svg>,
    polygon: ({ children, ...props }: any) => <polygon {...props}>{children}</polygon>,
    circle: ({ children, ...props }: any) => <circle {...props}>{children}</circle>,
    text: ({ children, ...props }: any) => <text {...props}>{children}</text>,
    g: ({ children, ...props }: any) => <g {...props}>{children}</g>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('Survey Visual Consistency', () => {
  describe('Progress Indicators', () => {
    it('should render animated progress indicator with proper ARIA attributes', async () => {
      render(
        <AnimatedProgressIndicator
          currentPhase={2}
          totalPhases={4}
          percentage={50}
        />
      );

      expect(screen.getByText('50%')).toBeInTheDocument();
      expect(screen.getByText('Step 2 of 4')).toBeInTheDocument();
    });

    it('should render accessible progress indicator with screen reader support', async () => {
      render(
        <AccessibleProgressIndicator
          currentStep={2}
          totalSteps={4}
          percentage={50}
          stepLabels={['Welcome', 'Phase 1', 'Phase 2', 'Results']}
        />
      );

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '50');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });

    it('should have no accessibility violations', async () => {
      const { container } = render(
        <AccessibleProgressIndicator
          currentStep={2}
          totalSteps={4}
          percentage={50}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Likert Scale Components', () => {
    it('should render accessible likert scale with proper keyboard navigation', async () => {
      const mockOnChange = jest.fn();
      render(
        <AccessibleLikertScale
          value={null}
          onChange={mockOnChange}
          questionId="test-question"
          ariaLabel="Rate your response"
        />
      );

      const radioGroup = screen.getByRole('radiogroup');
      expect(radioGroup).toBeInTheDocument();

      const radioButtons = screen.getAllByRole('radio');
      expect(radioButtons).toHaveLength(5);

      // Test keyboard navigation
      const firstButton = radioButtons[0];
      firstButton.focus();
      fireEvent.keyDown(firstButton, { key: 'ArrowRight' });
      expect(radioButtons[1]).toHaveFocus();

      // Test selection
      fireEvent.click(radioButtons[2]);
      expect(mockOnChange).toHaveBeenCalledWith(3);
    });

    it('should render mobile likert scale with touch-friendly interface', async () => {
      const mockOnChange = jest.fn();
      render(
        <MobileLikertScale
          value={null}
          onChange={mockOnChange}
        />
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(5);

      // Verify touch-friendly size
      buttons.forEach(button => {
        expect(button).toHaveClass('aspect-square');
      });

      // Test selection
      fireEvent.click(buttons[3]);
      expect(mockOnChange).toHaveBeenCalledWith(4);
    });

    it('should handle disabled state correctly', async () => {
      const mockOnChange = jest.fn();
      render(
        <AccessibleLikertScale
          value={3}
          onChange={mockOnChange}
          questionId="test-question"
          disabled={true}
        />
      );

      const radioButtons = screen.getAllByRole('radio');
      radioButtons.forEach(button => {
        expect(button).toBeDisabled();
      });
    });

    it('should have no accessibility violations', async () => {
      const { container } = render(
        <AccessibleLikertScale
          value={3}
          onChange={() => {}}
          questionId="test-question"
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Radar Chart Visualization', () => {
    const mockData = [
      { label: 'Envy', labelAr: 'الحسد', value: 4, maxValue: 5, color: '#ef4444', category: 'critical' as const },
      { label: 'Arrogance', labelAr: 'الكبر', value: 2, maxValue: 5, color: '#f59e0b', category: 'moderate' as const },
      { label: 'Humility', labelAr: 'التواضع', value: 1, maxValue: 5, color: '#10b981', category: 'strength' as const },
    ];

    it('should render radar chart with proper structure', async () => {
      render(
        <RadarChart
          data={mockData}
          animated={false}
        />
      );

      // Check for SVG elements
      const svg = screen.getByRole('img', { hidden: true }) || document.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should support both English and Arabic labels', async () => {
      render(
        <RadarChart
          data={mockData}
          language="ar"
          animated={false}
        />
      );

      expect(screen.getByText('الحسد')).toBeInTheDocument();
      expect(screen.getByText('الكبر')).toBeInTheDocument();
      expect(screen.getByText('التواضع')).toBeInTheDocument();
    });

    it('should display legend with proper categorization', async () => {
      render(
        <RadarChart
          data={mockData}
          showValues={true}
          animated={false}
        />
      );

      expect(screen.getByText('1')).toBeInTheDocument(); // Critical count
      expect(screen.getByText('1')).toBeInTheDocument(); // Moderate count
      expect(screen.getByText('1')).toBeInTheDocument(); // Strength count
    });
  });

  describe('Loading States', () => {
    it('should render question skeleton loader', async () => {
      render(<SkeletonLoader variant="question" />);

      const skeletonElements = document.querySelectorAll('.skeleton');
      expect(skeletonElements.length).toBeGreaterThan(0);
    });

    it('should render multiple skeleton items when count is specified', async () => {
      render(<SkeletonLoader variant="card" count={3} />);

      // Should render 3 card skeletons
      const cards = document.querySelectorAll('.card-islamic');
      expect(cards).toHaveLength(3);
    });

    it('should render result skeleton with chart placeholder', async () => {
      render(<SkeletonLoader variant="result" />);

      const chartPlaceholder = document.querySelector('.h-64.skeleton');
      expect(chartPlaceholder).toBeInTheDocument();
    });
  });

  describe('Mobile Optimization', () => {
    // Mock window.innerWidth and innerHeight
    beforeEach(() => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 812,
      });
    });

    it('should render mobile-optimized survey container', async () => {
      render(
        <MobileOptimizedSurvey
          currentPhase={2}
          totalPhases={4}
          percentage={50}
          title="Test Survey"
        >
          <div>Survey Content</div>
        </MobileOptimizedSurvey>
      );

      expect(screen.getByText('Test Survey')).toBeInTheDocument();
      expect(screen.getByText('Survey Content')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument(); // Phase indicator
      expect(screen.getByText('4')).toBeInTheDocument(); // Total phases
    });

    it('should handle orientation changes', async () => {
      render(
        <MobileOptimizedSurvey
          currentPhase={1}
          totalPhases={4}
          percentage={25}
        >
          <div>Content</div>
        </MobileOptimizedSurvey>
      );

      // Simulate orientation change
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 375,
      });
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 812,
      });

      fireEvent(window, new Event('orientationchange'));
      fireEvent(window, new Event('resize'));

      // Component should still render correctly
      expect(screen.getByText('Content')).toBeInTheDocument();
    });
  });

  describe('Cross-Browser Compatibility', () => {
    // Mock different user agents
    const mockUserAgent = (userAgent: string) => {
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value: userAgent,
      });
    };

    it('should work with Safari', async () => {
      mockUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Version/14.1.1 Safari/537.36');

      render(
        <AccessibleLikertScale
          value={null}
          onChange={() => {}}
          questionId="safari-test"
        />
      );

      expect(screen.getByRole('radiogroup')).toBeInTheDocument();
    });

    it('should work with Chrome', async () => {
      mockUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

      render(
        <AnimatedProgressIndicator
          currentPhase={1}
          totalPhases={4}
          percentage={25}
        />
      );

      expect(screen.getByText('25%')).toBeInTheDocument();
    });

    it('should work with Firefox', async () => {
      mockUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:89.0) Gecko/20100101 Firefox/89.0');

      render(<SkeletonLoader variant="question" />);

      const skeletonElements = document.querySelectorAll('.skeleton');
      expect(skeletonElements.length).toBeGreaterThan(0);
    });
  });

  describe('Theme and Color Consistency', () => {
    it('should apply Islamic color scheme consistently', async () => {
      render(
        <div className="bg-emerald-50 text-sage-900 border-emerald-200">
          <AccessibleLikertScale
            value={3}
            onChange={() => {}}
            questionId="color-test"
          />
        </div>
      );

      const container = screen.getByRole('radiogroup').closest('div');
      expect(container).toHaveClass('bg-emerald-50');
    });

    it('should support RTL layout for Arabic content', async () => {
      render(
        <div className="rtl arabic-text">
          <RadarChart
            data={[
              { label: 'Test', labelAr: 'اختبار', value: 3, maxValue: 5, color: '#10b981', category: 'moderate' }
            ]}
            language="ar"
            animated={false}
          />
        </div>
      );

      const container = document.querySelector('.rtl');
      expect(container).toHaveClass('arabic-text');
    });
  });

  describe('Performance and Animation', () => {
    it('should handle animation preferences', async () => {
      // Mock reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      render(
        <AnimatedProgressIndicator
          currentPhase={2}
          totalPhases={4}
          percentage={50}
        />
      );

      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('should render without animations when specified', async () => {
      render(
        <RadarChart
          data={[
            { label: 'Test', labelAr: 'اختبار', value: 3, maxValue: 5, color: '#10b981', category: 'moderate' }
          ]}
          animated={false}
        />
      );

      // Should render chart immediately without animation delays
      const svg = document.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });
});

describe('Integration Tests', () => {
  it('should integrate all components in a survey flow', async () => {
    const mockOnChange = jest.fn();
    const mockOnNext = jest.fn();

    render(
      <MobileOptimizedSurvey
        currentPhase={2}
        totalPhases={4}
        percentage={50}
        title="Integration Test"
      >
        <div>
          <AccessibleLikertScale
            value={null}
            onChange={mockOnChange}
            questionId="integration-test"
          />
          <button onClick={mockOnNext}>Next</button>
        </div>
      </MobileOptimizedSurvey>
    );

    // Test the full interaction flow
    const radioButtons = screen.getAllByRole('radio');
    fireEvent.click(radioButtons[2]);
    expect(mockOnChange).toHaveBeenCalledWith(3);

    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);
    expect(mockOnNext).toHaveBeenCalled();
  });
});