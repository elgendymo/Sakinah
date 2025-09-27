import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase-browser';
import { api } from '@/lib/services/api';
import TazkiyahPage from '@/app/tazkiyah/page';

// Mock all dependencies
jest.mock('next/navigation');
jest.mock('next-intl');
jest.mock('@/lib/supabase-browser');
jest.mock('@/components/PageContainer', () => {
  return function MockPageContainer({ children, title }: any) {
    return (
      <div data-testid="page-container">
        <h1>{title}</h1>
        {children}
      </div>
    );
  };
});
jest.mock('@/components/ErrorDisplay', () => ({
  ErrorDisplay: ({ error, onDismiss }: any) => (
    <div data-testid="error-display">
      {error?.message}
      <button onClick={onDismiss}>Dismiss</button>
    </div>
  ),
  useErrorHandler: () => ({
    error: null,
    handleError: jest.fn(),
    clearError: jest.fn()
  })
}));

// Real API service (mocked at the fetch level)
jest.mock('@/lib/services/api', () => {
  const originalModule = jest.requireActual('@/lib/services/api');
  return {
    ...originalModule,
    api: {
      suggestPlan: jest.fn(),
      createPlan: jest.fn()
    }
  };
});

const mockRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseTranslations = useTranslations as jest.MockedFunction<typeof useTranslations>;
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockApi = api as jest.Mocked<typeof api>;

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

describe('Tazkiyah v2 Integration', () => {
  const mockPush = jest.fn();
  const mockSupabaseAuth = {
    getSession: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mocks
    mockRouter.mockReturnValue({ push: mockPush } as any);
    mockUseTranslations.mockReturnValue((key: string) => mockTranslations[key as keyof typeof mockTranslations] || key);
    mockCreateClient.mockReturnValue({ auth: mockSupabaseAuth } as any);

    // Default session mock
    mockSupabaseAuth.getSession.mockResolvedValue({
      data: { session: { access_token: 'mock-token' } }
    });
  });

  describe('Full Tazkiyah Flow - Takhliyah', () => {
    const mockSuggestPlanResponse = {
      plan: {
        id: 'plan123',
        kind: 'takhliyah',
        target: 'anger',
        microHabits: [
          {
            id: 'habit1',
            title: 'Recite "A\'udhu billahi min ash-shaytani\'r-rajim" when angry',
            schedule: 'When needed',
            target: 1
          },
          {
            id: 'habit2',
            title: 'Perform ablution (wudu) to cool down',
            schedule: 'When angry',
            target: 1
          },
          {
            id: 'habit3',
            title: 'Seek forgiveness (istighfar) 10 times',
            schedule: 'After anger incident',
            target: 10
          }
        ],
        duaIds: ['dua_anger_1', 'dua_anger_2'],
        contentIds: ['hadith_anger_1', 'quran_anger_1']
      },
      confidence: 0.9,
      reasoning: {
        mode: 'This takhliyah plan focuses on purification from negative traits.',
        microHabits: [
          {
            id: 'habit1',
            reasoning: 'Seeking refuge helps break the cycle of anger through divine protection.'
          },
          {
            id: 'habit2',
            reasoning: 'Physical purification helps achieve spiritual calmness.'
          },
          {
            id: 'habit3',
            reasoning: 'Seeking forgiveness redirects negative energy into spiritual growth.'
          }
        ],
        content: 'Selected Islamic content will provide spiritual guidance and motivation.'
      },
      alternatives: [],
      nextSteps: [
        'Review the suggested micro-habits and adjust schedules if needed',
        'Consider adding relevant duas or Quranic verses',
        'Set realistic expectations and start with one habit at a time',
        'Track progress regularly and celebrate small victories'
      ],
      metadata: {
        generatedAt: '2024-01-01T00:00:00Z',
        version: '2.0',
        aiProvider: 'rules'
      }
    };

    const mockCreatePlanResponse = {
      plan: {
        id: 'plan123',
        userId: 'user123',
        kind: 'takhliyah',
        target: 'anger',
        status: 'active',
        microHabits: mockSuggestPlanResponse.plan.microHabits,
        duaIds: mockSuggestPlanResponse.plan.duaIds,
        contentIds: mockSuggestPlanResponse.plan.contentIds,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      },
      events: ['plan_created'],
      metadata: {
        createdAt: '2024-01-01T00:00:00Z',
        version: '2.0'
      }
    };

    beforeEach(() => {
      mockApi.suggestPlan.mockResolvedValue(mockSuggestPlanResponse);
      mockApi.createPlan.mockResolvedValue(mockCreatePlanResponse);
    });

    it('should complete full takhliyah flow successfully', async () => {
      render(<TazkiyahPage />);

      // 1. Verify initial state
      expect(screen.getByText('Tazkiyah - Soul Purification')).toBeInTheDocument();
      expect(screen.getByText('Takhliyah')).toBeInTheDocument();

      // 2. Select takhliyah mode (should be default)
      const takhliyahButton = screen.getByText('Takhliyah').closest('button');
      expect(takhliyahButton).toHaveClass('border-primary-500');

      // 3. Enter struggle input
      const input = screen.getByPlaceholderText('e.g., anger, envy, pride...');
      fireEvent.change(input, { target: { value: 'anger' } });
      expect((input as HTMLInputElement).value).toBe('anger');

      // 4. Submit for plan suggestion
      const submitButton = screen.getByText('Get Personalized Plan');
      expect(submitButton).not.toBeDisabled();
      fireEvent.click(submitButton);

      // 5. Verify loading state
      expect(screen.getByText('Creating Plan...')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();

      // 6. Wait for plan suggestion to complete
      await waitFor(() => {
        expect(screen.getByText('Your Personalized Plan')).toBeInTheDocument();
      });

      // 7. Verify API call was made with correct parameters
      expect(mockApi.suggestPlan).toHaveBeenCalledWith('takhliyah', 'anger', {
        struggles: ['anger'],
        goals: [],
        preferences: {
          difficultyLevel: 'moderate',
          timeCommitment: 'medium',
          focusAreas: ['anger']
        }
      });

      // 8. Verify suggested plan is displayed
      expect(screen.getByText('anger')).toBeInTheDocument();
      expect(screen.getByText('Recite "A\'udhu billahi min ash-shaytani\'r-rajim" when angry')).toBeInTheDocument();
      expect(screen.getByText('Perform ablution (wudu) to cool down')).toBeInTheDocument();
      expect(screen.getByText('Seek forgiveness (istighfar) 10 times')).toBeInTheDocument();

      // 9. Verify action buttons are present
      expect(screen.getByText('Accept & Start Journey')).toBeInTheDocument();
      expect(screen.getByText('Try Different Input')).toBeInTheDocument();

      // 10. Accept the plan
      const acceptButton = screen.getByText('Accept & Start Journey');
      fireEvent.click(acceptButton);

      // 11. Verify plan creation API call
      await waitFor(() => {
        expect(mockApi.createPlan).toHaveBeenCalledWith({
          kind: 'takhliyah',
          target: 'anger',
          microHabits: [
            {
              title: 'Recite "A\'udhu billahi min ash-shaytani\'r-rajim" when angry',
              schedule: 'When needed',
              target: 1
            },
            {
              title: 'Perform ablution (wudu) to cool down',
              schedule: 'When angry',
              target: 1
            },
            {
              title: 'Seek forgiveness (istighfar) 10 times',
              schedule: 'After anger incident',
              target: 10
            }
          ],
          duaIds: ['dua_anger_1', 'dua_anger_2'],
          contentIds: ['hadith_anger_1', 'quran_anger_1']
        });
      });

      // 12. Verify navigation to dashboard
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('should handle quick select flow', async () => {
      render(<TazkiyahPage />);

      // 1. Click on quick select anger button
      const angerButton = screen.getByText('Anger');
      fireEvent.click(angerButton);

      // 2. Verify input is populated
      const input = screen.getByPlaceholderText('e.g., anger, envy, pride...') as HTMLInputElement;
      expect(input.value).toBe('Anger');

      // 3. Submit the form
      const submitButton = screen.getByText('Get Personalized Plan');
      fireEvent.click(submitButton);

      // 4. Verify API is called with quick select value
      await waitFor(() => {
        expect(mockApi.suggestPlan).toHaveBeenCalledWith('takhliyah', 'Anger', expect.any(Object));
      });
    });

    it('should handle try different input flow', async () => {
      render(<TazkiyahPage />);

      // 1. Complete plan suggestion
      const input = screen.getByPlaceholderText('e.g., anger, envy, pride...');
      fireEvent.change(input, { target: { value: 'anger' } });

      const submitButton = screen.getByText('Get Personalized Plan');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Your Personalized Plan')).toBeInTheDocument();
      });

      // 2. Click try different input
      const tryDifferentButton = screen.getByText('Try Different Input');
      fireEvent.click(tryDifferentButton);

      // 3. Verify form is reset
      expect(screen.getByText('Get Personalized Plan')).toBeInTheDocument();
      expect(screen.queryByText('Your Personalized Plan')).not.toBeInTheDocument();
      expect((input as HTMLInputElement).value).toBe('anger'); // Input value should remain
    });
  });

  describe('Full Tazkiyah Flow - Tahliyah', () => {
    const mockTahliyahResponse = {
      plan: {
        id: 'plan456',
        kind: 'tahliyah',
        target: 'patience',
        microHabits: [
          {
            id: 'habit1',
            title: 'Recite "Rabbana atina fi\'d-dunya hasanatan" daily',
            schedule: 'Morning',
            target: 7
          },
          {
            id: 'habit2',
            title: 'Practice gratitude journaling',
            schedule: 'Evening',
            target: 3
          }
        ],
        duaIds: ['dua_patience_1'],
        contentIds: ['hadith_patience_1']
      }
    };

    beforeEach(() => {
      mockApi.suggestPlan.mockResolvedValue(mockTahliyahResponse);
      mockApi.createPlan.mockResolvedValue({
        plan: { ...mockTahliyahResponse.plan, id: 'plan456' },
        events: ['plan_created'],
        metadata: { version: '2.0' }
      });
    });

    it('should complete full tahliyah flow successfully', async () => {
      render(<TazkiyahPage />);

      // 1. Switch to tahliyah mode
      const tahliyahButton = screen.getByText('Tahliyah').closest('button');
      fireEvent.click(tahliyahButton!);

      // 2. Verify mode switch
      expect(tahliyahButton).toHaveClass('border-primary-500');
      expect(screen.getByText('What virtue would you like to develop?')).toBeInTheDocument();

      // 3. Use quick select for patience
      const patienceButton = screen.getByText('Patience');
      fireEvent.click(patienceButton);

      // 4. Submit form
      const submitButton = screen.getByText('Get Personalized Plan');
      fireEvent.click(submitButton);

      // 5. Wait for plan generation
      await waitFor(() => {
        expect(screen.getByText('Your Personalized Plan')).toBeInTheDocument();
      });

      // 6. Verify API call with tahliyah parameters
      expect(mockApi.suggestPlan).toHaveBeenCalledWith('tahliyah', 'Patience', {
        struggles: [],
        goals: ['Patience'],
        preferences: {
          difficultyLevel: 'moderate',
          timeCommitment: 'medium',
          focusAreas: ['Patience']
        }
      });

      // 7. Verify plan content
      expect(screen.getByText('patience')).toBeInTheDocument();
      expect(screen.getByText('Recite "Rabbana atina fi\'d-dunya hasanatan" daily')).toBeInTheDocument();
      expect(screen.getByText('Practice gratitude journaling')).toBeInTheDocument();

      // 8. Accept and complete flow
      const acceptButton = screen.getByText('Accept & Start Journey');
      fireEvent.click(acceptButton);

      await waitFor(() => {
        expect(mockApi.createPlan).toHaveBeenCalledWith({
          kind: 'tahliyah',
          target: 'patience',
          microHabits: expect.arrayContaining([
            expect.objectContaining({
              title: 'Recite "Rabbana atina fi\'d-dunya hasanatan" daily'
            })
          ]),
          duaIds: ['dua_patience_1'],
          contentIds: ['hadith_patience_1']
        });
      });

      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  describe('Error Recovery Flow', () => {
    it('should handle network errors with retry and eventual success', async () => {
      // First two calls fail, third succeeds
      const networkError = { code: 'NETWORK_ERROR' };
      mockApi.suggestPlan
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce({
          plan: {
            id: 'plan123',
            kind: 'takhliyah',
            target: 'anger',
            microHabits: []
          }
        });

      render(<TazkiyahPage />);

      const input = screen.getByPlaceholderText('e.g., anger, envy, pride...');
      fireEvent.change(input, { target: { value: 'anger' } });

      const submitButton = screen.getByText('Get Personalized Plan');
      fireEvent.click(submitButton);

      // Should show retry indicators
      await waitFor(() => {
        expect(screen.getByText(/Creating Plan.*Retry/)).toBeInTheDocument();
      });

      // Eventually succeeds
      await waitFor(() => {
        expect(screen.getByText('Your Personalized Plan')).toBeInTheDocument();
      }, { timeout: 5000 });

      // Verify retry attempts
      expect(mockApi.suggestPlan).toHaveBeenCalledTimes(3);
    });

    it('should handle authentication expiry gracefully', async () => {
      const authError = { response: { status: 401 } };
      mockApi.suggestPlan.mockRejectedValue(authError);

      render(<TazkiyahPage />);

      const input = screen.getByPlaceholderText('e.g., anger, envy, pride...');
      fireEvent.change(input, { target: { value: 'anger' } });

      const submitButton = screen.getByText('Get Personalized Plan');
      fireEvent.click(submitButton);

      // Should eventually redirect to login
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login');
      }, { timeout: 3000 });
    });
  });
});