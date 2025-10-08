import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import ResultsPage from '@/app/onboarding/results/page';
import type { SurveyResults } from '@sakinah/types';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock Chart.js
vi.mock('chart.js', () => ({
  Chart: {
    register: vi.fn(),
  },
  RadialLinearScale: vi.fn(),
  PointElement: vi.fn(),
  LineElement: vi.fn(),
  Filler: vi.fn(),
  Tooltip: vi.fn(),
  Legend: vi.fn(),
}));

// Mock react-chartjs-2
vi.mock('react-chartjs-2', () => ({
  Radar: ({ data, options }: any) => (
    <div data-testid="radar-chart" data-chart-labels={data.labels.join(',')}>
      Radar Chart Mock
    </div>
  ),
}));

// Mock survey hooks
vi.mock('@/components/survey/hooks/useSurveyLanguage', () => ({
  useSurveyLanguage: () => ({
    language: 'en',
    toggleLanguage: vi.fn(),
    getLocalizedText: (en: string, ar: string) => en,
  }),
}));

// Mock PageContainer
vi.mock('@/components/PageContainer', () => ({
  __esModule: true,
  default: ({ children, ...props }: any) => <div data-testid="page-container" {...props}>{children}</div>,
}));

// Mock ProgressIndicator
vi.mock('@/components/survey/ui/ProgressIndicator', () => ({
  __esModule: true,
  default: ({ currentPhase, totalPhases, percentage }: any) => (
    <div data-testid="progress-indicator">
      Step {currentPhase} of {totalPhases} - {percentage}%
    </div>
  ),
}));

const mockPush = vi.fn();

const mockSurveyResults: SurveyResults = {
  id: 'test-result-id',
  userId: 'test-user-id',
  diseaseScores: {
    envy: 4,
    arrogance: 2,
    selfDeception: 3,
    lust: 2,
    anger: 5,
    malice: 1,
    backbiting: 2,
    suspicion: 3,
    loveOfDunya: 4,
    laziness: 2,
    despair: 1,
  },
  categorizedDiseases: {
    critical: ['anger', 'envy', 'loveOfDunya'],
    moderate: ['selfDeception', 'suspicion'],
    strengths: ['malice', 'despair'],
  },
  reflectionAnswers: {
    strongestStruggle: 'I struggle with anger management',
    dailyHabit: 'I want to establish regular dhikr practice',
  },
  personalizedHabits: [
    {
      id: 'habit-1',
      title: 'Morning dhikr practice',
      description: 'Recite morning adhkar after Fajr prayer',
      frequency: 'daily',
      targetDisease: 'anger',
      difficultyLevel: 'easy',
      estimatedDuration: '10 minutes',
      islamicContent: [],
    },
    {
      id: 'habit-2',
      title: 'Gratitude reflection',
      description: 'Write down 3 things you are grateful for',
      frequency: 'daily',
      targetDisease: 'envy',
      difficultyLevel: 'moderate',
      estimatedDuration: '5 minutes',
      islamicContent: [],
    },
  ],
  tazkiyahPlan: {
    criticalDiseases: ['anger', 'envy'],
    planType: 'takhliyah',
    phases: [
      {
        phaseNumber: 1,
        title: 'Awareness and Recognition',
        description: 'Building awareness of spiritual diseases',
        targetDiseases: ['anger', 'envy'],
        duration: '2 weeks',
        practices: [
          {
            name: 'Daily Self-Accountability',
            type: 'reflection',
            description: 'Review your day for instances of anger and envy',
            frequency: 'Daily',
            islamicBasis: [],
          },
        ],
        checkpoints: ['Identify triggers', 'Establish routine'],
      },
    ],
    expectedDuration: '3 months',
    milestones: [
      {
        id: 'milestone-1',
        title: 'Foundation Established',
        description: 'Basic awareness established',
        targetDate: new Date().toISOString(),
        completed: false,
      },
    ],
  },
  radarChartData: {
    labels: ['Envy', 'Arrogance', 'Self-Deception', 'Lust', 'Anger', 'Malice', 'Backbiting', 'Suspicion', 'Love of Dunya', 'Laziness', 'Despair'],
    datasets: [
      {
        label: 'Spiritual Assessment',
        data: [4, 2, 3, 2, 5, 1, 2, 3, 4, 2, 1],
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        borderColor: 'rgba(16, 185, 129, 0.8)',
      },
    ],
  },
  exportOptions: [
    { format: 'pdf', available: true },
    { format: 'json', available: true },
  ],
  generatedAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('ResultsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue({
      push: mockPush,
    });

    // Mock fetch
    global.fetch = vi.fn();
  });

  it('should render loading state initially', () => {
    // Mock fetch to never resolve
    (global.fetch as any).mockImplementation(() => new Promise(() => {}));

    render(<ResultsPage />);

    expect(screen.getByText('Generating your results...')).toBeInTheDocument();
  });

  it('should render error state when fetch fails', async () => {
    // Mock fetch to reject
    (global.fetch as any).mockRejectedValue(new Error('Network error'));

    render(<ResultsPage />);

    await waitFor(() => {
      expect(screen.getByText('Error Loading Results')).toBeInTheDocument();
      expect(screen.getByText('An error occurred while loading your results.')).toBeInTheDocument();
    });
  });

  it('should render results when data loads successfully', async () => {
    // Mock successful fetch
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        data: {
          results: mockSurveyResults,
        },
      }),
    });

    render(<ResultsPage />);

    await waitFor(() => {
      expect(screen.getByText('Your Spiritual Assessment Results')).toBeInTheDocument();
      expect(screen.getByTestId('radar-chart')).toBeInTheDocument();
    });
  });

  it('should display progress indicator with 100% completion', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        data: {
          results: mockSurveyResults,
        },
      }),
    });

    render(<ResultsPage />);

    await waitFor(() => {
      const progressIndicator = screen.getByTestId('progress-indicator');
      expect(progressIndicator).toHaveTextContent('Step 4 of 4 - 100%');
    });
  });

  it('should display disease categories correctly', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        data: {
          results: mockSurveyResults,
        },
      }),
    });

    render(<ResultsPage />);

    await waitFor(() => {
      expect(screen.getByText('Critical Areas')).toBeInTheDocument();
      expect(screen.getByText('Areas for Improvement')).toBeInTheDocument();
      expect(screen.getByText('Your Strengths')).toBeInTheDocument();
    });
  });

  it('should switch between tabs correctly', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        data: {
          results: mockSurveyResults,
        },
      }),
    });

    render(<ResultsPage />);

    await waitFor(() => {
      expect(screen.getByText('Overview')).toBeInTheDocument();
    });

    // Click on Habits tab
    fireEvent.click(screen.getByText('Habits'));
    await waitFor(() => {
      expect(screen.getByText('Personalized Habit Recommendations')).toBeInTheDocument();
      expect(screen.getByText('Morning dhikr practice')).toBeInTheDocument();
    });

    // Click on Tazkiyah Plan tab
    fireEvent.click(screen.getByText('Tazkiyah Plan'));
    await waitFor(() => {
      expect(screen.getByText('Your Tazkiyah Development Plan')).toBeInTheDocument();
      expect(screen.getByText('Plan Focus: Takhliyah (Purification)')).toBeInTheDocument();
    });
  });

  it('should display personalized habits with correct information', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        data: {
          results: mockSurveyResults,
        },
      }),
    });

    render(<ResultsPage />);

    // Switch to habits tab
    await waitFor(() => {
      fireEvent.click(screen.getByText('Habits'));
    });

    await waitFor(() => {
      expect(screen.getByText('Morning dhikr practice')).toBeInTheDocument();
      expect(screen.getByText('Gratitude reflection')).toBeInTheDocument();
      expect(screen.getByText('Frequency: daily')).toBeInTheDocument();
      expect(screen.getByText('Duration: 10 minutes')).toBeInTheDocument();
    });
  });

  it('should display Tazkiyah plan phases', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        data: {
          results: mockSurveyResults,
        },
      }),
    });

    render(<ResultsPage />);

    // Switch to plan tab
    await waitFor(() => {
      fireEvent.click(screen.getByText('Tazkiyah Plan'));
    });

    await waitFor(() => {
      expect(screen.getByText('Phase 1: Awareness and Recognition')).toBeInTheDocument();
      expect(screen.getByText('Building awareness of spiritual diseases')).toBeInTheDocument();
      expect(screen.getByText('Duration: 2 weeks')).toBeInTheDocument();
      expect(screen.getByText('Daily Self-Accountability')).toBeInTheDocument();
    });
  });

  it('should have working export buttons', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        data: {
          results: mockSurveyResults,
        },
      }),
    });

    render(<ResultsPage />);

    await waitFor(() => {
      expect(screen.getByText('Export PDF')).toBeInTheDocument();
      expect(screen.getByText('Export JSON')).toBeInTheDocument();
    });
  });

  it('should navigate to dashboard when button is clicked', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        data: {
          results: mockSurveyResults,
        },
      }),
    });

    render(<ResultsPage />);

    await waitFor(() => {
      const dashboardButton = screen.getByText('Go to Dashboard');
      fireEvent.click(dashboardButton);
    });

    expect(mockPush).toHaveBeenCalledWith('/dashboard');
  });

  it('should render completion message', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        data: {
          results: mockSurveyResults,
        },
      }),
    });

    render(<ResultsPage />);

    await waitFor(() => {
      expect(screen.getByText('Congratulations!')).toBeInTheDocument();
      expect(screen.getByText(/You have completed your Tazkiyah Discovery Survey/)).toBeInTheDocument();
    });
  });

  it('should toggle language when language button is clicked', async () => {
    const mockToggleLanguage = vi.fn();

    // Mock language hook with toggle function
    vi.doMock('@/components/survey/hooks/useSurveyLanguage', () => ({
      useSurveyLanguage: () => ({
        language: 'en',
        toggleLanguage: mockToggleLanguage,
        getLocalizedText: (en: string, ar: string) => en,
      }),
    }));

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        data: {
          results: mockSurveyResults,
        },
      }),
    });

    render(<ResultsPage />);

    await waitFor(() => {
      const languageButton = screen.getByText('عربي');
      fireEvent.click(languageButton);
    });

    expect(mockToggleLanguage).toHaveBeenCalled();
  });
});