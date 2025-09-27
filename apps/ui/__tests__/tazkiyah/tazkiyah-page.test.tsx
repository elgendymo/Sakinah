import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase-browser';
import { api } from '@/lib/services/api';
import TazkiyahPage from '@/app/tazkiyah/page';
import { useErrorHandler } from '@/components/ErrorDisplay';

// Mock dependencies
jest.mock('next/navigation');
jest.mock('next-intl');
jest.mock('@/lib/supabase-browser');
jest.mock('@/lib/services/api');
jest.mock('@/components/ErrorDisplay');
jest.mock('@/components/PageContainer', () => {
  return function MockPageContainer({ children, title, subtitle }: any) {
    return (
      <div data-testid="page-container">
        <h1>{title}</h1>
        <p>{subtitle}</p>
        {children}
      </div>
    );
  };
});

const mockRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseTranslations = useTranslations as jest.MockedFunction<typeof useTranslations>;
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockApi = api as jest.Mocked<typeof api>;
const mockUseErrorHandler = useErrorHandler as jest.MockedFunction<typeof useErrorHandler>;

// Mock translations
const mockTranslations = {
  'title': 'Tazkiyah - Soul Purification',
  'subtitle': 'Purify your soul through Islamic guidance',
  'chooseYourPath': 'Choose Your Path',
  'takhliyah': 'Takhliyah',
  'takhliyahDescription': 'Remove spiritual diseases',
  'tahliyah': 'Tahliyah',
  'tahliyahDescription': 'Build beautiful virtues',
  'whatStruggle': 'What struggle would you like to overcome?',
  'whatVirtue': 'What virtue would you like to develop?',
  'takhliyahPlaceholder': 'e.g., anger, envy, pride...',
  'tahliyahPlaceholder': 'e.g., patience, gratitude, humility...',
  'orChooseFrom': 'Or choose from common',
  'struggles': 'struggles',
  'virtues': 'virtues',
  'getPersonalizedPlan': 'Get Personalized Plan',
  'creatingPlan': 'Creating Plan...',
  'yourPersonalizedPlan': 'Your Personalized Plan',
  'purifyingFrom': 'Purifying from',
  'building': 'Building',
  'dailyMicroHabits': 'Daily Micro-Habits',
  'target': 'Target',
  'times': 'times',
  'acceptAndStart': 'Accept & Start Journey',
  'tryDifferentInput': 'Try Different Input',
  'commonStruggles.envy': 'Envy',
  'commonStruggles.anger': 'Anger',
  'commonStruggles.pride': 'Pride',
  'commonVirtues.patience': 'Patience',
  'commonVirtues.gratitude': 'Gratitude',
  'commonVirtues.tawakkul': 'Trust in Allah'
};

describe('TazkiyahPage', () => {
  const mockPush = jest.fn();
  const mockHandleError = jest.fn();
  const mockClearError = jest.fn();
  const mockSupabaseAuth = {
    getSession: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mocks
    mockRouter.mockReturnValue({ push: mockPush } as any);
    mockUseTranslations.mockReturnValue((key: string) => mockTranslations[key as keyof typeof mockTranslations] || key);
    mockCreateClient.mockReturnValue({ auth: mockSupabaseAuth } as any);
    mockUseErrorHandler.mockReturnValue({
      error: null,
      handleError: mockHandleError,
      clearError: mockClearError
    });

    // Default session mock
    mockSupabaseAuth.getSession.mockResolvedValue({
      data: { session: { access_token: 'mock-token' } }
    });
  });

  describe('Initial Rendering', () => {
    it('renders the page with correct title and subtitle', () => {
      render(<TazkiyahPage />);

      expect(screen.getByText('Tazkiyah - Soul Purification')).toBeInTheDocument();
      expect(screen.getByText('Purify your soul through Islamic guidance')).toBeInTheDocument();
    });

    it('renders mode selection buttons', () => {
      render(<TazkiyahPage />);

      expect(screen.getByText('Takhliyah')).toBeInTheDocument();
      expect(screen.getByText('Remove spiritual diseases')).toBeInTheDocument();
      expect(screen.getByText('Tahliyah')).toBeInTheDocument();
      expect(screen.getByText('Build beautiful virtues')).toBeInTheDocument();
    });

    it('has takhliyah mode selected by default', () => {
      render(<TazkiyahPage />);

      const takhliyahButton = screen.getByText('Takhliyah').closest('button');
      const tahliyahButton = screen.getByText('Tahliyah').closest('button');

      expect(takhliyahButton).toHaveClass('border-primary-500');
      expect(tahliyahButton).not.toHaveClass('border-primary-500');
    });

    it('renders input form with correct placeholder for takhliyah mode', () => {
      render(<TazkiyahPage />);

      const input = screen.getByPlaceholderText('e.g., anger, envy, pride...');
      expect(input).toBeInTheDocument();
    });

    it('renders common struggles buttons for takhliyah mode', () => {
      render(<TazkiyahPage />);

      expect(screen.getByText('Envy')).toBeInTheDocument();
      expect(screen.getByText('Anger')).toBeInTheDocument();
      expect(screen.getByText('Pride')).toBeInTheDocument();
    });
  });

  describe('Mode Switching', () => {
    it('switches to tahliyah mode when clicked', () => {
      render(<TazkiyahPage />);

      const tahliyahButton = screen.getByText('Tahliyah').closest('button');
      fireEvent.click(tahliyahButton!);

      expect(tahliyahButton).toHaveClass('border-primary-500');
      expect(screen.getByPlaceholderText('e.g., patience, gratitude, humility...')).toBeInTheDocument();
      expect(screen.getByText('What virtue would you like to develop?')).toBeInTheDocument();
    });

    it('shows virtues buttons in tahliyah mode', () => {
      render(<TazkiyahPage />);

      const tahliyahButton = screen.getByText('Tahliyah').closest('button');
      fireEvent.click(tahliyahButton!);

      expect(screen.getByText('Patience')).toBeInTheDocument();
      expect(screen.getByText('Gratitude')).toBeInTheDocument();
      expect(screen.getByText('Trust in Allah')).toBeInTheDocument();
    });
  });

  describe('Input Handling', () => {
    it('allows typing in the input field', () => {
      render(<TazkiyahPage />);

      const input = screen.getByPlaceholderText('e.g., anger, envy, pride...') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'pride' } });

      expect(input.value).toBe('pride');
    });

    it('sets input value when quick select button is clicked', () => {
      render(<TazkiyahPage />);

      const envyButton = screen.getByText('Envy');
      fireEvent.click(envyButton);

      const input = screen.getByPlaceholderText('e.g., anger, envy, pride...') as HTMLInputElement;
      expect(input.value).toBe('Envy');
    });

    it('disables submit button when input is empty', () => {
      render(<TazkiyahPage />);

      const submitButton = screen.getByText('Get Personalized Plan');
      expect(submitButton).toBeDisabled();
    });

    it('enables submit button when input has value', () => {
      render(<TazkiyahPage />);

      const input = screen.getByPlaceholderText('e.g., anger, envy, pride...');
      fireEvent.change(input, { target: { value: 'anger' } });

      const submitButton = screen.getByText('Get Personalized Plan');
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('Plan Suggestion', () => {
    const mockPlanResponse = {
      plan: {
        kind: 'takhliyah',
        target: 'anger',
        microHabits: [
          {
            id: '1',
            title: 'Deep breathing when angry',
            schedule: 'As needed',
            target: 3
          },
          {
            id: '2',
            title: 'Seek refuge in Allah',
            schedule: 'Daily',
            target: 5
          }
        ],
        duaIds: ['dua1'],
        contentIds: ['content1']
      }
    };

    beforeEach(() => {
      mockApi.suggestPlan.mockResolvedValue(mockPlanResponse);
    });

    it('calls suggest plan API with correct parameters', async () => {
      render(<TazkiyahPage />);

      const input = screen.getByPlaceholderText('e.g., anger, envy, pride...');
      fireEvent.change(input, { target: { value: 'anger' } });

      const submitButton = screen.getByText('Get Personalized Plan');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockApi.suggestPlan).toHaveBeenCalledWith('takhliyah', 'anger', {
          struggles: ['anger'],
          goals: [],
          preferences: {
            difficultyLevel: 'moderate',
            timeCommitment: 'medium',
            focusAreas: ['anger']
          }
        });
      });
    });

    it('shows loading state during API call', async () => {
      mockApi.suggestPlan.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));

      render(<TazkiyahPage />);

      const input = screen.getByPlaceholderText('e.g., anger, envy, pride...');
      fireEvent.change(input, { target: { value: 'anger' } });

      const submitButton = screen.getByText('Get Personalized Plan');
      fireEvent.click(submitButton);

      expect(screen.getByText('Creating Plan...')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });

    it('displays suggested plan when API succeeds', async () => {
      render(<TazkiyahPage />);

      const input = screen.getByPlaceholderText('e.g., anger, envy, pride...');
      fireEvent.change(input, { target: { value: 'anger' } });

      const submitButton = screen.getByText('Get Personalized Plan');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Your Personalized Plan')).toBeInTheDocument();
        expect(screen.getByText('anger')).toBeInTheDocument();
        expect(screen.getByText('Deep breathing when angry')).toBeInTheDocument();
        expect(screen.getByText('Seek refuge in Allah')).toBeInTheDocument();
      });
    });

    it('shows accept and try different input buttons after plan is generated', async () => {
      render(<TazkiyahPage />);

      const input = screen.getByPlaceholderText('e.g., anger, envy, pride...');
      fireEvent.change(input, { target: { value: 'anger' } });

      const submitButton = screen.getByText('Get Personalized Plan');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Accept & Start Journey')).toBeInTheDocument();
        expect(screen.getByText('Try Different Input')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles network errors with retry', async () => {
      const networkError = { code: 'NETWORK_ERROR' };
      mockApi.suggestPlan
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce({
          plan: { kind: 'takhliyah', target: 'anger', microHabits: [] }
        });

      render(<TazkiyahPage />);

      const input = screen.getByPlaceholderText('e.g., anger, envy, pride...');
      fireEvent.change(input, { target: { value: 'anger' } });

      const submitButton = screen.getByText('Get Personalized Plan');
      fireEvent.click(submitButton);

      // Should retry twice and then succeed
      await waitFor(() => {
        expect(mockApi.suggestPlan).toHaveBeenCalledTimes(3);
      });
    });

    it('shows retry indicator during retries', async () => {
      const networkError = { code: 'NETWORK_ERROR' };
      mockApi.suggestPlan.mockRejectedValue(networkError);

      render(<TazkiyahPage />);

      const input = screen.getByPlaceholderText('e.g., anger, envy, pride...');
      fireEvent.change(input, { target: { value: 'anger' } });

      const submitButton = screen.getByText('Get Personalized Plan');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Creating Plan.*Retry/)).toBeInTheDocument();
      });
    });

    it('handles authentication errors', async () => {
      const authError = { response: { status: 401 } };
      mockApi.suggestPlan.mockRejectedValue(authError);

      render(<TazkiyahPage />);

      const input = screen.getByPlaceholderText('e.g., anger, envy, pride...');
      fireEvent.change(input, { target: { value: 'anger' } });

      const submitButton = screen.getByText('Get Personalized Plan');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockHandleError).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Authentication expired. Please log in again.'
          }),
          'Authentication Error'
        );
      });
    });

    it('handles rate limiting errors', async () => {
      const rateLimitError = { response: { status: 429 } };
      mockApi.suggestPlan.mockRejectedValue(rateLimitError);

      render(<TazkiyahPage />);

      const input = screen.getByPlaceholderText('e.g., anger, envy, pride...');
      fireEvent.change(input, { target: { value: 'anger' } });

      const submitButton = screen.getByText('Get Personalized Plan');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockHandleError).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Too many requests. Please try again in a few minutes.'
          }),
          'Rate Limit Exceeded'
        );
      });
    });

    it('handles validation errors', async () => {
      const validationError = { response: { status: 400 } };
      mockApi.suggestPlan.mockRejectedValue(validationError);

      render(<TazkiyahPage />);

      const input = screen.getByPlaceholderText('e.g., anger, envy, pride...');
      fireEvent.change(input, { target: { value: 'anger' } });

      const submitButton = screen.getByText('Get Personalized Plan');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockHandleError).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Invalid input provided. Please check your selection and try again.'
          }),
          'Validation Error'
        );
      });
    });

    it('handles server errors', async () => {
      const serverError = { response: { status: 500 } };
      mockApi.suggestPlan.mockRejectedValue(serverError);

      render(<TazkiyahPage />);

      const input = screen.getByPlaceholderText('e.g., anger, envy, pride...');
      fireEvent.change(input, { target: { value: 'anger' } });

      const submitButton = screen.getByText('Get Personalized Plan');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockHandleError).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Server is temporarily unavailable. Please try again later.'
          }),
          'Server Error'
        );
      });
    });

    it('redirects to login when session is missing', async () => {
      mockSupabaseAuth.getSession.mockResolvedValue({
        data: { session: null }
      });

      render(<TazkiyahPage />);

      const input = screen.getByPlaceholderText('e.g., anger, envy, pride...');
      fireEvent.change(input, { target: { value: 'anger' } });

      const submitButton = screen.getByText('Get Personalized Plan');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login');
      });
    });
  });

  describe('Plan Creation', () => {
    const mockPlanResponse = {
      plan: {
        kind: 'takhliyah',
        target: 'anger',
        microHabits: [
          {
            id: '1',
            title: 'Deep breathing when angry',
            schedule: 'As needed',
            target: 3
          }
        ],
        duaIds: ['dua1'],
        contentIds: ['content1']
      }
    };

    beforeEach(() => {
      mockApi.suggestPlan.mockResolvedValue(mockPlanResponse);
      mockApi.createPlan.mockResolvedValue({ plan: { id: 'plan123' } });
    });

    it('creates plan when accept button is clicked', async () => {
      render(<TazkiyahPage />);

      // Generate plan first
      const input = screen.getByPlaceholderText('e.g., anger, envy, pride...');
      fireEvent.change(input, { target: { value: 'anger' } });

      const submitButton = screen.getByText('Get Personalized Plan');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Accept & Start Journey')).toBeInTheDocument();
      });

      // Accept the plan
      const acceptButton = screen.getByText('Accept & Start Journey');
      fireEvent.click(acceptButton);

      await waitFor(() => {
        expect(mockApi.createPlan).toHaveBeenCalledWith({
          kind: 'takhliyah',
          target: 'anger',
          microHabits: [
            {
              title: 'Deep breathing when angry',
              schedule: 'As needed',
              target: 3
            }
          ],
          duaIds: ['dua1'],
          contentIds: ['content1']
        });
      });
    });

    it('navigates to dashboard after successful plan creation', async () => {
      render(<TazkiyahPage />);

      // Generate and accept plan
      const input = screen.getByPlaceholderText('e.g., anger, envy, pride...');
      fireEvent.change(input, { target: { value: 'anger' } });

      const submitButton = screen.getByText('Get Personalized Plan');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Accept & Start Journey')).toBeInTheDocument();
      });

      const acceptButton = screen.getByText('Accept & Start Journey');
      fireEvent.click(acceptButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('handles plan creation errors', async () => {
      const createError = { response: { status: 500 } };
      mockApi.createPlan.mockRejectedValue(createError);

      render(<TazkiyahPage />);

      // Generate plan first
      const input = screen.getByPlaceholderText('e.g., anger, envy, pride...');
      fireEvent.change(input, { target: { value: 'anger' } });

      const submitButton = screen.getByText('Get Personalized Plan');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Accept & Start Journey')).toBeInTheDocument();
      });

      // Accept the plan
      const acceptButton = screen.getByText('Accept & Start Journey');
      fireEvent.click(acceptButton);

      await waitFor(() => {
        expect(mockHandleError).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Server error while creating plan. Please try again.'
          }),
          'Server Error'
        );
      });
    });

    it('resets to form when try different input is clicked', async () => {
      render(<TazkiyahPage />);

      // Generate plan first
      const input = screen.getByPlaceholderText('e.g., anger, envy, pride...');
      fireEvent.change(input, { target: { value: 'anger' } });

      const submitButton = screen.getByText('Get Personalized Plan');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Try Different Input')).toBeInTheDocument();
      });

      // Click try different input
      const tryDifferentButton = screen.getByText('Try Different Input');
      fireEvent.click(tryDifferentButton);

      expect(screen.getByText('Get Personalized Plan')).toBeInTheDocument();
      expect(screen.queryByText('Your Personalized Plan')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper form structure', () => {
      render(<TazkiyahPage />);

      const form = screen.getByRole('form');
      expect(form).toBeInTheDocument();

      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();

      const submitButton = screen.getByRole('button', { name: /get personalized plan/i });
      expect(submitButton).toBeInTheDocument();
    });

    it('has proper button roles', () => {
      render(<TazkiyahPage />);

      const takhliyahButton = screen.getByRole('button', { name: /takhliyah/i });
      const tahliyahButton = screen.getByRole('button', { name: /tahliyah/i });

      expect(takhliyahButton).toBeInTheDocument();
      expect(tahliyahButton).toBeInTheDocument();
    });
  });
});