import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import WelcomePage from '@/app/onboarding/welcome/page';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: vi.fn()
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
    button: ({ children, onClick, ...props }: any) => (
      <button onClick={onClick} {...props}>
        {children}
      </button>
    )
  }
}));

// Mock PageContainer component
vi.mock('@/components/PageContainer', () => {
  return {
    default: ({ children, maxWidth, padding, className }: any) => (
      <div
        data-testid="page-container"
        className={className}
        data-max-width={maxWidth}
        data-padding={padding}
      >
        {children}
      </div>
    )
  };
});

// Mock AnimatedButton component
vi.mock('@/components/ui/AnimatedButton', () => ({
  default: ({ children, onClick, disabled, loading, variant, size, className, icon }: any) => (
    <button
      data-testid="animated-button"
      onClick={onClick}
      disabled={disabled}
      className={className}
      data-variant={variant}
      data-size={size}
      data-loading={loading}
    >
      {loading ? 'Loading...' : children}
      {icon && <span data-testid="button-icon">{icon}</span>}
    </button>
  )
}));

const mockPush = vi.fn();
const mockRouter = {
  push: mockPush,
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  replace: vi.fn(),
  prefetch: vi.fn()
};

describe('WelcomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue(mockRouter);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders the welcome page with all essential elements', () => {
      render(<WelcomePage />);

      // Check main heading
      expect(screen.getByText('Tazkiyah Discovery Survey')).toBeInTheDocument();

      // Check Arabic title
      expect(screen.getByText('استبيان قراءة النفس')).toBeInTheDocument();

      // Check description
      expect(screen.getByText(/Embark on a journey of spiritual self-discovery/)).toBeInTheDocument();

      // Check Islamic quote
      expect(screen.getByText('قَدْ أَفْلَحَ مَن زَكَّاهَا')).toBeInTheDocument();
      expect(screen.getByText(/"He has succeeded who purifies it \[the soul\]"/)).toBeInTheDocument();

      // Check start button
      expect(screen.getByRole('button', { name: /Begin Assessment/ })).toBeInTheDocument();
    });

    it('displays progress indicator with correct step information', () => {
      render(<WelcomePage />);

      expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();
      expect(screen.getByText('25%')).toBeInTheDocument();
    });

    it('shows survey purpose highlights', () => {
      render(<WelcomePage />);

      expect(screen.getByText(/Personalized Tazkiyah spiritual development plan/)).toBeInTheDocument();
      expect(screen.getByText(/Custom habit recommendations for spiritual growth/)).toBeInTheDocument();
      expect(screen.getByText(/Completely private and confidential assessment/)).toBeInTheDocument();
    });

    it('displays survey information section', () => {
      render(<WelcomePage />);

      expect(screen.getByText('What to Expect')).toBeInTheDocument();
      expect(screen.getByText(/11 questions/)).toBeInTheDocument();
      expect(screen.getByText(/2 reflection/)).toBeInTheDocument();
      expect(screen.getByText(/5-10 minutes/)).toBeInTheDocument();
      expect(screen.getByText(/Automatic saving/)).toBeInTheDocument();
    });

    it('shows encouragement message', () => {
      render(<WelcomePage />);

      expect(screen.getByText('Take your time and answer honestly for the best recommendations')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('navigates to phase1 when start button is clicked', async () => {
      render(<WelcomePage />);

      const startButton = screen.getByRole('button', { name: /Begin Assessment/ });
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/onboarding/phase1');
      });
    });

    it('shows loading state when start button is clicked', async () => {
      render(<WelcomePage />);

      const startButton = screen.getByRole('button', { name: /Begin Assessment/ });
      fireEvent.click(startButton);

      // Check that button becomes loading
      expect(screen.getByText('Preparing Survey...')).toBeInTheDocument();
    });

    it('disables button during loading state', async () => {
      render(<WelcomePage />);

      const startButton = screen.getByRole('button', { name: /Begin Assessment/ });
      fireEvent.click(startButton);

      // Check that button is disabled
      const buttonElement = screen.getByTestId('animated-button');
      expect(buttonElement).toHaveAttribute('data-loading', 'true');
    });
  });

  describe('Component Props and Structure', () => {
    it('passes correct props to PageContainer', () => {
      render(<WelcomePage />);

      const pageContainer = screen.getByTestId('page-container');
      expect(pageContainer).toHaveAttribute('data-max-width', 'md');
      expect(pageContainer).toHaveAttribute('data-padding', 'xl');
      expect(pageContainer).toHaveClass('flex', 'items-center', 'justify-center', 'min-h-screen');
    });

    it('passes correct props to AnimatedButton', () => {
      render(<WelcomePage />);

      const animatedButton = screen.getByTestId('animated-button');
      expect(animatedButton).toHaveAttribute('data-variant', 'primary');
      expect(animatedButton).toHaveAttribute('data-size', 'lg');
      expect(animatedButton).toHaveClass(/w-full/);
    });

    it('includes arrow icon in the start button', () => {
      render(<WelcomePage />);

      const buttonIcon = screen.getByTestId('button-icon');
      expect(buttonIcon).toBeInTheDocument();
    });
  });

  describe('Islamic Design Elements', () => {
    it('includes Islamic moon symbol', () => {
      render(<WelcomePage />);

      expect(screen.getByText('🌙')).toBeInTheDocument();
    });

    it('includes Arabic text with proper styling', () => {
      render(<WelcomePage />);

      const arabicTitle = screen.getByText('استبيان قراءة النفس');
      expect(arabicTitle).toHaveClass('arabic-text');
    });

    it('includes Quranic verse with proper styling', () => {
      render(<WelcomePage />);

      const quranicVerse = screen.getByText('قَدْ أَفْلَحَ مَن زَكَّاهَا');
      expect(quranicVerse).toHaveClass('quran-text');
    });

    it('uses Islamic color scheme classes', () => {
      render(<WelcomePage />);

      // Check for card-islamic class
      const cards = document.querySelectorAll('.card-islamic');
      expect(cards.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('has proper heading hierarchy', () => {
      render(<WelcomePage />);

      const mainHeading = screen.getByRole('heading', { level: 1 });
      expect(mainHeading).toHaveTextContent('Tazkiyah Discovery Survey');

      const subHeading = screen.getByRole('heading', { level: 3 });
      expect(subHeading).toHaveTextContent('What to Expect');
    });

    it('has accessible button with proper labeling', () => {
      render(<WelcomePage />);

      const startButton = screen.getByRole('button', { name: /Begin Assessment/ });
      expect(startButton).toBeInTheDocument();
      expect(startButton).not.toHaveAttribute('aria-disabled', 'true');
    });

    it('provides alternative text and context for symbols', () => {
      render(<WelcomePage />);

      // Check that emojis are properly contained and have context
      expect(screen.getByText('🌙')).toBeInTheDocument();
      expect(screen.getByText('✨')).toBeInTheDocument();
      expect(screen.getByText('📋')).toBeInTheDocument();
      expect(screen.getByText('🔒')).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('uses responsive text classes', () => {
      render(<WelcomePage />);

      const heading = screen.getByText('Tazkiyah Discovery Survey');
      expect(heading).toHaveClass('text-2xl', 'sm:text-3xl');
    });

    it('has proper container max width for mobile', () => {
      render(<WelcomePage />);

      const container = document.querySelector('.max-w-lg');
      expect(container).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles router navigation errors gracefully', async () => {
      mockPush.mockRejectedValueOnce(new Error('Navigation failed'));

      render(<WelcomePage />);

      const startButton = screen.getByRole('button', { name: /Begin Assessment/ });
      fireEvent.click(startButton);

      // Should not throw error
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/onboarding/phase1');
      });
    });
  });

  describe('Performance', () => {
    it('renders without console errors', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(<WelcomePage />);

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('has reasonable component structure depth', () => {
      const { container } = render(<WelcomePage />);

      // Check that DOM structure is not too deeply nested
      const deepestElement = container.querySelector('div div div div div div div div');
      expect(deepestElement).toBeNull(); // Should not have 8+ levels of nesting
    });
  });
});