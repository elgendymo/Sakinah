import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import {
  SurveyErrorMessage,
  ValidationErrorMessage,
  NetworkErrorMessage,
  ProgressErrorMessage,
  ResultsErrorMessage,
  SurveyErrorBoundary
} from '@/components/survey/SurveyErrorMessage';

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  AlertCircle: ({ className }: { className?: string }) => <div data-testid="alert-circle" className={className} />,
  RefreshCw: ({ className }: { className?: string }) => <div data-testid="refresh-cw" className={className} />,
  Wifi: ({ className }: { className?: string }) => <div data-testid="wifi" className={className} />,
  WifiOff: ({ className }: { className?: string }) => <div data-testid="wifi-off" className={className} />,
  Clock: ({ className }: { className?: string }) => <div data-testid="clock" className={className} />,
  Shield: ({ className }: { className?: string }) => <div data-testid="shield" className={className} />
}));

describe('SurveyErrorMessage', () => {
  it('should render basic error message', () => {
    render(
      <SurveyErrorMessage
        errorCode="invalid_likert_score"
        message="Please select a rating between 1 and 5"
      />
    );

    expect(screen.getByText('Please select a rating between 1 and 5')).toBeInTheDocument();
    expect(screen.getByTestId('alert-circle')).toBeInTheDocument();
  });

  it('should use enhanced message for known error codes', () => {
    render(<SurveyErrorMessage errorCode="reflection_too_short" />);

    expect(screen.getByText(/Your reflection helps us understand your spiritual journey/)).toBeInTheDocument();
  });

  it('should display recommendation when provided', () => {
    render(
      <SurveyErrorMessage
        errorCode="auto_save_failed"
        recommendation="Please try submitting manually"
      />
    );

    expect(screen.getByText('Please try submitting manually')).toBeInTheDocument();
  });

  it('should show retry button when onRetry is provided', () => {
    const onRetry = vi.fn();
    render(
      <SurveyErrorMessage
        errorCode="network_error"
        onRetry={onRetry}
        showRetry={true}
      />
    );

    const retryButton = screen.getByRole('button', { name: /try again/i });
    expect(retryButton).toBeInTheDocument();

    fireEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('should show dismiss button when onDismiss is provided', () => {
    const onDismiss = vi.fn();
    render(
      <SurveyErrorMessage
        errorCode="validation_error"
        onDismiss={onDismiss}
      />
    );

    const dismissButton = screen.getByRole('button', { name: /dismiss/i });
    expect(dismissButton).toBeInTheDocument();

    fireEvent.click(dismissButton);
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('should apply correct severity styles', () => {
    const { rerender } = render(
      <SurveyErrorMessage
        errorCode="test_error"
        severity="error"
        data-testid="error-container"
      />
    );

    // Test error severity (default)
    expect(screen.getByRole('alert')).toHaveClass('border-red-200', 'bg-red-50', 'text-red-800');

    rerender(
      <SurveyErrorMessage
        errorCode="test_error"
        severity="warning"
        data-testid="warning-container"
      />
    );

    // Test warning severity
    expect(screen.getByRole('alert')).toHaveClass('border-amber-200', 'bg-amber-50', 'text-amber-800');

    rerender(
      <SurveyErrorMessage
        errorCode="test_error"
        severity="info"
        data-testid="info-container"
      />
    );

    // Test info severity
    expect(screen.getByRole('alert')).toHaveClass('border-blue-200', 'bg-blue-50', 'text-blue-800');
  });

  it('should use correct icon for different error codes', () => {
    const iconTestCases = [
      { errorCode: 'invalid_likert_score', expectedIcon: 'alert-circle' },
      { errorCode: 'auto_save_failed', expectedIcon: 'wifi-off' },
      { errorCode: 'network_error', expectedIcon: 'wifi-off' },
      { errorCode: 'timeout_error', expectedIcon: 'clock' },
      { errorCode: 'survey_phase_access_denied', expectedIcon: 'shield' },
      { errorCode: 'results_generation_failed', expectedIcon: 'refresh-cw' },
      { errorCode: 'unknown_error', expectedIcon: 'alert-circle' }
    ];

    iconTestCases.forEach(({ errorCode, expectedIcon }) => {
      const { unmount } = render(<SurveyErrorMessage errorCode={errorCode} />);
      expect(screen.getByTestId(expectedIcon)).toBeInTheDocument();
      unmount();
    });
  });

  it('should hide retry button when showRetry is false', () => {
    render(
      <SurveyErrorMessage
        errorCode="network_error"
        onRetry={vi.fn()}
        showRetry={false}
      />
    );

    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
  });

  it('should include Islamic geometric pattern background', () => {
    render(<SurveyErrorMessage errorCode="test_error" />);

    const svgElement = screen.getByRole('img', { hidden: true });
    expect(svgElement).toBeInTheDocument();

    const pattern = screen.getByRole('img', { hidden: true }).querySelector('pattern');
    expect(pattern).toHaveAttribute('id', 'islamic-pattern');
  });
});

describe('ValidationErrorMessage', () => {
  it('should render validation error with field name', () => {
    render(
      <ValidationErrorMessage
        field="envyScore"
        message="Score must be between 1 and 5"
      />
    );

    expect(screen.getByText('Score must be between 1 and 5')).toBeInTheDocument();
  });

  it('should call onFocus when dismissed', () => {
    const onFocus = vi.fn();
    render(
      <ValidationErrorMessage
        field="testField"
        message="Test message"
        onFocus={onFocus}
      />
    );

    const dismissButton = screen.getByRole('button', { name: /dismiss/i });
    fireEvent.click(dismissButton);

    expect(onFocus).toHaveBeenCalledOnce();
  });

  it('should have warning severity by default', () => {
    render(
      <ValidationErrorMessage
        field="testField"
        message="Test message"
      />
    );

    expect(screen.getByRole('alert')).toHaveClass('border-amber-200', 'bg-amber-50', 'text-amber-800');
  });
});

describe('NetworkErrorMessage', () => {
  it('should render network error with retry functionality', () => {
    const onRetry = vi.fn();
    render(<NetworkErrorMessage onRetry={onRetry} />);

    expect(screen.getByText(/connection failed/i)).toBeInTheDocument();

    const retryButton = screen.getByRole('button', { name: /try again/i });
    fireEvent.click(retryButton);

    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('should show auto-save specific error when autoSaveStatus is failed', () => {
    render(
      <NetworkErrorMessage
        onRetry={vi.fn()}
        autoSaveStatus="failed"
      />
    );

    expect(screen.getByText(/could not be saved automatically/i)).toBeInTheDocument();
  });

  it('should show sync error when autoSaveStatus is sync_error', () => {
    render(
      <NetworkErrorMessage
        onRetry={vi.fn()}
        autoSaveStatus="sync_error"
      />
    );

    expect(screen.getByText(/could not be saved automatically/i)).toBeInTheDocument();
  });

  it('should show generic network error when no autoSaveStatus', () => {
    render(<NetworkErrorMessage onRetry={vi.fn()} />);

    expect(screen.getByText(/connection failed/i)).toBeInTheDocument();
  });
});

describe('ProgressErrorMessage', () => {
  it('should render progress error with phase information', () => {
    const onNavigate = vi.fn();
    render(
      <ProgressErrorMessage
        currentPhase={3}
        requiredPhase={2}
        onNavigate={onNavigate}
      />
    );

    expect(screen.getByText(/complete Phase 2 before accessing Phase 3/i)).toBeInTheDocument();

    const navigateButton = screen.getByRole('button', { name: /try again/i });
    fireEvent.click(navigateButton);

    expect(onNavigate).toHaveBeenCalledOnce();
  });

  it('should have info severity', () => {
    render(
      <ProgressErrorMessage
        currentPhase={2}
        requiredPhase={1}
        onNavigate={vi.fn()}
      />
    );

    expect(screen.getByRole('alert')).toHaveClass('border-blue-200', 'bg-blue-50', 'text-blue-800');
  });
});

describe('ResultsErrorMessage', () => {
  it('should render generation failed error with retry', () => {
    const onRetry = vi.fn();
    render(
      <ResultsErrorMessage
        errorType="generation_failed"
        onRetry={onRetry}
      />
    );

    expect(screen.getByText(/encountered an issue generating/i)).toBeInTheDocument();

    const retryButton = screen.getByRole('button', { name: /try again/i });
    fireEvent.click(retryButton);

    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('should render AI failed error with retry', () => {
    const onRetry = vi.fn();
    render(
      <ResultsErrorMessage
        errorType="ai_failed"
        onRetry={onRetry}
      />
    );

    expect(screen.getByText(/temporarily unavailable/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('should render not found error without retry', () => {
    render(
      <ResultsErrorMessage
        errorType="not_found"
      />
    );

    expect(screen.getByText(/not available yet/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
  });

  it('should have correct severity for different error types', () => {
    const { rerender } = render(
      <ResultsErrorMessage errorType="generation_failed" />
    );

    // Error severity for generation_failed and ai_failed
    expect(screen.getByRole('alert')).toHaveClass('border-red-200', 'bg-red-50', 'text-red-800');

    rerender(<ResultsErrorMessage errorType="not_found" />);

    // Info severity for not_found
    expect(screen.getByRole('alert')).toHaveClass('border-blue-200', 'bg-blue-50', 'text-blue-800');
  });
});

describe('SurveyErrorBoundary', () => {
  // Mock console.error to avoid error logs in tests
  const originalConsoleError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  it('should render children when no error occurs', () => {
    render(
      <SurveyErrorBoundary>
        <div>Test content</div>
      </SurveyErrorBoundary>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('should render fallback when provided and error occurs', () => {
    const FallbackComponent = () => <div>Custom error fallback</div>;

    // Simulate an error by adding an error event listener
    const { container } = render(
      <SurveyErrorBoundary fallback={<FallbackComponent />}>
        <div>Test content</div>
      </SurveyErrorBoundary>
    );

    // Trigger an error event
    const errorEvent = new ErrorEvent('error', {
      message: 'Test error',
      filename: 'test.js',
      lineno: 1,
      colno: 1
    });

    fireEvent(window, errorEvent);

    // Wait for state update
    waitFor(() => {
      expect(screen.getByText('Custom error fallback')).toBeInTheDocument();
    });
  });

  it('should render default error message when no fallback provided and error occurs', () => {
    render(
      <SurveyErrorBoundary>
        <div>Test content</div>
      </SurveyErrorBoundary>
    );

    // Trigger an error event
    const errorEvent = new ErrorEvent('error', {
      message: 'Test error',
      filename: 'test.js',
      lineno: 1,
      colno: 1
    });

    fireEvent(window, errorEvent);

    waitFor(() => {
      expect(screen.getByText(/unexpected error occurred/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });
  });

  it('should reload page when retry button is clicked in default error state', () => {
    // Mock window.location.reload
    const mockReload = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: mockReload },
      writable: true
    });

    render(
      <SurveyErrorBoundary>
        <div>Test content</div>
      </SurveyErrorBoundary>
    );

    // Trigger an error event
    const errorEvent = new ErrorEvent('error', {
      message: 'Test error',
      filename: 'test.js',
      lineno: 1,
      colno: 1
    });

    fireEvent(window, errorEvent);

    waitFor(() => {
      const retryButton = screen.getByRole('button', { name: /try again/i });
      fireEvent.click(retryButton);

      expect(mockReload).toHaveBeenCalledOnce();
    });
  });
});