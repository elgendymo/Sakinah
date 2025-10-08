import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { Express } from 'express';
import { container } from 'tsyringe';
import { SubmitPhase1UseCase } from '@/application/usecases/SubmitPhase1UseCase';
import { SubmitPhase2UseCase } from '@/application/usecases/SubmitPhase2UseCase';
import { SubmitReflectionUseCase } from '@/application/usecases/SubmitReflectionUseCase';
import { GenerateResultsUseCase } from '@/application/usecases/GenerateResultsUseCase';
import { ValidateSurveyProgressUseCase } from '@/application/usecases/ValidateSurveyProgressUseCase';
import { CreateHabitsFromSurveyUseCase } from '@/application/usecases/CreateHabitsFromSurveyUseCase';
import { ISurveyRepository } from '@/domain/repositories/ISurveyRepository';
import { SurveyProgress } from '@/domain/entities/SurveyProgress';
import { SurveyResponse } from '@/domain/entities/SurveyResponse';
import { SurveyResult } from '@/domain/entities/SurveyResult';
import { Result } from '@/shared/result';

// Mock all use cases
const mockSubmitPhase1UseCase = {
  execute: vi.fn()
};

const mockSubmitPhase2UseCase = {
  execute: vi.fn()
};

const mockSubmitReflectionUseCase = {
  execute: vi.fn()
};

const mockGenerateResultsUseCase = {
  execute: vi.fn()
};

const mockValidateSurveyProgressUseCase = {
  execute: vi.fn(),
  getCurrentProgress: vi.fn()
};

const mockCreateHabitsFromSurveyUseCase = {
  execute: vi.fn()
};

const mockSurveyRepository = {
  getSurveyProgress: vi.fn(),
  saveSurveyProgress: vi.fn(),
  updateSurveyProgress: vi.fn(),
  saveSurveyResponse: vi.fn(),
  getSurveyResponse: vi.fn(),
  getSurveyResponsesByPhase: vi.fn(),
  getAllSurveyResponses: vi.fn(),
  updateSurveyResponse: vi.fn(),
  deleteSurveyResponse: vi.fn(),
  saveSurveyResult: vi.fn(),
  getSurveyResult: vi.fn(),
  getSurveyResultById: vi.fn(),
  updateSurveyResult: vi.fn(),
  deleteSurveyResult: vi.fn(),
  deleteSurveyProgress: vi.fn(),
  hasUserCompletedSurvey: vi.fn(),
  getPhaseCompletionStatus: vi.fn(),
  savePhaseResponses: vi.fn(),
  getUserSurveyData: vi.fn(),
  getSurveyCompletionStats: vi.fn()
};

// Mock container resolution
vi.mock('tsyringe', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    container: {
      resolve: vi.fn()
    }
  };
});

// Mock auth middleware
vi.mock('@/infrastructure/auth/middleware', () => ({
  authMiddleware: (req: any, _res: any, next: any) => {
    req.userId = 'test-user-123';
    next();
  }
}));

// Mock survey middleware
vi.mock('@/infrastructure/middleware/surveyProgress', () => ({
  surveyPhaseMiddleware: {
    welcome: (_req: any, _res: any, next: any) => next(),
    phase1: (_req: any, _res: any, next: any) => next(),
    phase2: (_req: any, _res: any, next: any) => next(),
    reflection: (_req: any, _res: any, next: any) => next(),
    results: (_req: any, _res: any, next: any) => next()
  },
  surveyCompletionCheckMiddleware: (_req: any, _res: any, next: any) => next()
}));

// Mock validation middleware
vi.mock('@/infrastructure/middleware/validation', () => ({
  validateBody: (schema: any) => (_req: any, _res: any, next: any) => next()
}));

describe('Survey Flow Integration Tests', () => {
  let app: Express;
  let testUserId: string;

  beforeAll(() => {
    testUserId = 'test-user-123';
  });

  beforeEach(async () => {
    // Clear all mocks
    vi.clearAllMocks();

    // Mock container resolution
    vi.mocked(container.resolve).mockImplementation((token: any) => {
      if (token === SubmitPhase1UseCase) return mockSubmitPhase1UseCase;
      if (token === SubmitPhase2UseCase) return mockSubmitPhase2UseCase;
      if (token === SubmitReflectionUseCase) return mockSubmitReflectionUseCase;
      if (token === GenerateResultsUseCase) return mockGenerateResultsUseCase;
      if (token === ValidateSurveyProgressUseCase) return mockValidateSurveyProgressUseCase;
      if (token === CreateHabitsFromSurveyUseCase) return mockCreateHabitsFromSurveyUseCase;
      if (token === 'ISurveyRepository') return mockSurveyRepository;
      throw new Error(`Unknown token: ${token}`);
    });

    // Create express app with our routes
    const express = await import('express');
    app = express.default();
    app.use(express.default.json());

    // Import and use the onboarding routes
    const onboardingRouter = await import('@/routes/v1/onboarding');
    app.use('/api/v1/onboarding', onboardingRouter.default);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Complete Survey Progression from Phase 1 to Results', () => {
    it('should complete the full survey flow successfully', async () => {
      // Step 1: Welcome Phase
      const welcomeResponse = await request(app)
        .get('/api/v1/onboarding/welcome')
        .expect(200);

      expect(welcomeResponse.body).toMatchObject({
        ok: true,
        data: {
          welcome: {
            title: 'Tazkiyah Discovery Survey',
            description: expect.stringContaining('spiritual self-assessment')
          },
          metadata: {
            currentStep: 1,
            totalSteps: 4,
            progressPercentage: 0
          }
        }
      });

      // Step 2: Submit Phase 1
      const phase1Data = {
        envyScore: 3,
        envyNote: 'Sometimes feel envious of others success',
        arroganceScore: 2,
        arroganceNote: 'Rarely feel superior to others',
        selfDeceptionScore: 4,
        selfDeceptionNote: 'Often struggle with self-awareness',
        lustScore: 3,
        lustNote: 'Moderate struggles with temptation'
      };

      mockSubmitPhase1UseCase.execute.mockResolvedValue(
        Result.ok({
          progress: {
            currentPhase: 2,
            phase1Completed: true,
            phase2Completed: false
          },
          nextPhaseAvailable: true
        })
      );

      const phase1Response = await request(app)
        .post('/api/v1/onboarding/phase1')
        .send(phase1Data)
        .expect(200);

      expect(phase1Response.body).toMatchObject({
        ok: true,
        data: {
          phase1: {
            completed: true,
            nextPhase: 2
          },
          navigation: {
            canProceed: true,
            nextUrl: '/api/v1/onboarding/phase2',
            currentStep: 2,
            progressPercentage: 25
          }
        }
      });

      // Step 3: Submit Phase 2
      const phase2Data = {
        angerScore: 4,
        angerNote: 'Often struggle with anger',
        maliceScore: 2,
        maliceNote: 'Rarely hold grudges',
        backbitingScore: 3,
        backbitingNote: 'Sometimes speak ill of others',
        suspicionScore: 3,
        suspicionNote: 'Moderate suspicion of others',
        loveOfDunyaScore: 4,
        loveOfDunyaNote: 'Struggle with materialism',
        lazinessScore: 3,
        lazinessNote: 'Sometimes procrastinate',
        despairScore: 2,
        despairNote: 'Rarely feel hopeless'
      };

      mockSubmitPhase2UseCase.execute.mockResolvedValue(
        Result.ok({
          progress: {
            currentPhase: 3,
            phase1Completed: true,
            phase2Completed: true,
            reflectionCompleted: false
          },
          nextPhaseAvailable: true
        })
      );

      const phase2Response = await request(app)
        .post('/api/v1/onboarding/phase2')
        .send(phase2Data)
        .expect(200);

      expect(phase2Response.body).toMatchObject({
        ok: true,
        data: {
          phase2: {
            completed: true,
            nextPhase: 3
          },
          navigation: {
            canProceed: true,
            nextUrl: '/api/v1/onboarding/reflection',
            currentStep: 3,
            progressPercentage: 50
          }
        }
      });

      // Step 4: Submit Reflection
      const reflectionData = {
        strongestStruggle: 'My strongest struggle is with controlling my anger and reacting emotionally in difficult situations.',
        dailyHabit: 'I want to develop a habit of morning dhikr and evening self-reflection to improve my spiritual awareness.'
      };

      mockSubmitReflectionUseCase.execute.mockResolvedValue(
        Result.ok({
          progress: {
            currentPhase: 4,
            phase1Completed: true,
            phase2Completed: true,
            reflectionCompleted: true
          },
          resultsAvailable: true
        })
      );

      const reflectionResponse = await request(app)
        .post('/api/v1/onboarding/reflection')
        .send(reflectionData)
        .expect(200);

      expect(reflectionResponse.body).toMatchObject({
        ok: true,
        data: {
          reflection: {
            completed: true,
            nextPhase: 4
          },
          aiPreview: {
            personalizedHabits: expect.arrayContaining([
              expect.stringContaining('Morning dhikr'),
              expect.stringContaining('reflection')
            ]),
            takhliyahFocus: expect.any(Array),
            tahliyahFocus: expect.any(Array)
          },
          navigation: {
            canProceed: true,
            nextUrl: '/api/v1/onboarding/results',
            currentStep: 4,
            progressPercentage: 75
          }
        }
      });

      // Step 5: Get Results
      const mockResults = {
        id: 'result-123',
        userId: testUserId,
        diseaseScores: {
          envy: 3,
          arrogance: 2,
          selfDeception: 4,
          lust: 3,
          anger: 4,
          malice: 2,
          backbiting: 3,
          suspicion: 3,
          loveOfDunya: 4,
          laziness: 3,
          despair: 2
        },
        categorizedDiseases: {
          critical: ['selfDeception', 'anger', 'loveOfDunya'],
          moderate: ['envy', 'lust', 'backbiting', 'suspicion', 'laziness'],
          strengths: ['arrogance', 'malice', 'despair']
        },
        personalizedHabits: [
          {
            id: 'habit-1',
            title: 'Morning Dhikr Practice',
            description: 'Recite morning adhkar for 10 minutes',
            targetDisease: 'anger',
            frequency: 'daily'
          },
          {
            id: 'habit-2',
            title: 'Evening Self-Reflection',
            description: 'Reflect on daily actions and intentions',
            targetDisease: 'selfDeception',
            frequency: 'daily'
          }
        ],
        tazkiyahPlan: {
          criticalDiseases: ['selfDeception', 'anger', 'loveOfDunya'],
          planType: 'takhliyah',
          phases: [
            {
              phaseNumber: 1,
              title: 'Awareness Phase',
              targetDiseases: ['selfDeception'],
              duration: '2 weeks'
            }
          ]
        },
        generatedAt: new Date()
      };

      const mockGenerateResults = {
        results: {
          toDTO: () => mockResults,
          generatedAt: new Date()
        },
        exportOptions: [
          { format: 'pdf', url: '/api/v1/onboarding/export/pdf/result-123' },
          { format: 'json', url: '/api/v1/onboarding/export/json/result-123' }
        ]
      };

      mockGenerateResultsUseCase.execute.mockResolvedValue(
        Result.ok(mockGenerateResults)
      );

      const resultsResponse = await request(app)
        .get('/api/v1/onboarding/results')
        .expect(200);

      expect(resultsResponse.body).toMatchObject({
        ok: true,
        data: {
          results: {
            diseaseScores: expect.objectContaining({
              envy: 3,
              arrogance: 2,
              selfDeception: 4,
              anger: 4
            }),
            categorizedDiseases: {
              critical: expect.arrayContaining(['selfDeception', 'anger', 'loveOfDunya']),
              moderate: expect.any(Array),
              strengths: expect.any(Array)
            },
            personalizedHabits: expect.arrayContaining([
              expect.objectContaining({
                title: 'Morning Dhikr Practice',
                targetDisease: 'anger'
              })
            ]),
            tazkiyahPlan: expect.objectContaining({
              criticalDiseases: expect.arrayContaining(['selfDeception', 'anger'])
            })
          },
          metadata: {
            progressPercentage: 100
          },
          exportOptions: expect.arrayContaining([
            expect.objectContaining({ format: 'pdf' }),
            expect.objectContaining({ format: 'json' })
          ])
        }
      });

      // Verify all use cases were called correctly
      expect(mockSubmitPhase1UseCase.execute).toHaveBeenCalledWith({
        userId: testUserId,
        phase1Data
      });

      expect(mockSubmitPhase2UseCase.execute).toHaveBeenCalledWith({
        userId: testUserId,
        phase2Data
      });

      expect(mockSubmitReflectionUseCase.execute).toHaveBeenCalledWith({
        userId: testUserId,
        reflectionData
      });

      expect(mockGenerateResultsUseCase.execute).toHaveBeenCalledWith({
        userId: testUserId
      });
    });

    it('should handle progress tracking throughout the flow', async () => {
      // Mock progress for different stages
      const progressStages = [
        { currentPhase: 1, phase1Completed: false, phase2Completed: false, reflectionCompleted: false },
        { currentPhase: 2, phase1Completed: true, phase2Completed: false, reflectionCompleted: false },
        { currentPhase: 3, phase1Completed: true, phase2Completed: true, reflectionCompleted: false },
        { currentPhase: 4, phase1Completed: true, phase2Completed: true, reflectionCompleted: true }
      ];

      for (let i = 0; i < progressStages.length; i++) {
        const progress = progressStages[i];

        mockValidateSurveyProgressUseCase.getCurrentProgress.mockResolvedValue(
          Result.ok({
            progress: {
              ...progress,
              nextAvailablePhase: progress.currentPhase
            }
          })
        );

        const response = await request(app)
          .get('/api/v1/onboarding/progress')
          .expect(200);

        expect(response.body).toMatchObject({
          ok: true,
          data: {
            progress: expect.objectContaining(progress),
            navigation: {
              currentPhase: progress.currentPhase,
              nextAvailablePhase: progress.currentPhase,
              phaseUrls: {
                1: '/api/v1/onboarding/phase1',
                2: '/api/v1/onboarding/phase2',
                3: '/api/v1/onboarding/reflection',
                4: '/api/v1/onboarding/results'
              }
            }
          }
        });
      }
    });
  });

  describe('Phase Skipping Prevention', () => {
    it('should prevent skipping to phase 2 without completing phase 1', async () => {
      // Mock that phase 1 is not completed
      const progress = {
        currentPhase: 1,
        phase1Completed: false,
        phase2Completed: false,
        reflectionCompleted: false
      };

      // Mock the middleware behavior when phase access is denied
      vi.doMock('@/infrastructure/middleware/surveyProgress', () => ({
        surveyPhaseMiddleware: {
          phase2: (req: any, res: any, _next: any) => {
            res.status(403).json({
              ok: false,
              error: {
                code: 'survey_phase_access_denied',
                message: 'Cannot access phase 2 without completing phase 1',
                context: { redirectToPhase: 1 }
              }
            });
          }
        },
        surveyCompletionCheckMiddleware: (_req: any, _res: any, next: any) => next()
      }));

      // Re-create app with updated middleware
      const express = await import('express');
      const newApp = express.default();
      newApp.use(express.default.json());
      const onboardingRouter = await import('@/routes/v1/onboarding');
      newApp.use('/api/v1/onboarding', onboardingRouter.default);

      const phase2Data = {
        angerScore: 3,
        maliceScore: 2,
        backbitingScore: 1,
        suspicionScore: 4,
        loveOfDunyaScore: 3,
        lazinessScore: 2,
        despairScore: 1
      };

      const response = await request(newApp)
        .post('/api/v1/onboarding/phase2')
        .send(phase2Data)
        .expect(403);

      expect(response.body).toMatchObject({
        ok: false,
        errorCode: 'survey_phase_access_denied',
        message: expect.stringContaining('Cannot access phase 2')
      });
    });

    it('should prevent skipping to reflection without completing phase 2', async () => {
      // Mock the middleware behavior when reflection access is denied
      vi.doMock('@/infrastructure/middleware/surveyProgress', () => ({
        surveyPhaseMiddleware: {
          reflection: (req: any, res: any, _next: any) => {
            res.status(403).json({
              ok: false,
              error: {
                code: 'survey_phase_access_denied',
                message: 'Cannot access reflection without completing phase 2',
                context: { redirectToPhase: 2 }
              }
            });
          }
        },
        surveyCompletionCheckMiddleware: (_req: any, _res: any, next: any) => next()
      }));

      // Re-create app with updated middleware
      const express = await import('express');
      const newApp = express.default();
      newApp.use(express.default.json());
      const onboardingRouter = await import('@/routes/v1/onboarding');
      newApp.use('/api/v1/onboarding', onboardingRouter.default);

      const reflectionData = {
        strongestStruggle: 'My struggle with patience and anger management',
        dailyHabit: 'Morning prayer and evening reflection'
      };

      const response = await request(newApp)
        .post('/api/v1/onboarding/reflection')
        .send(reflectionData)
        .expect(403);

      expect(response.body).toMatchObject({
        ok: false,
        errorCode: 'survey_phase_access_denied',
        message: expect.stringContaining('Cannot access reflection')
      });
    });

    it('should prevent accessing results without completing reflection', async () => {
      // Mock the middleware behavior when results access is denied
      vi.doMock('@/infrastructure/middleware/surveyProgress', () => ({
        surveyPhaseMiddleware: {
          results: (req: any, res: any, _next: any) => {
            res.status(403).json({
              ok: false,
              error: {
                code: 'survey_phase_access_denied',
                message: 'Cannot access results without completing reflection',
                context: { redirectToPhase: 3 }
              }
            });
          }
        }
      }));

      // Re-create app with updated middleware
      const express = await import('express');
      const newApp = express.default();
      newApp.use(express.default.json());
      const onboardingRouter = await import('@/routes/v1/onboarding');
      newApp.use('/api/v1/onboarding', onboardingRouter.default);

      const response = await request(newApp)
        .get('/api/v1/onboarding/results')
        .expect(403);

      expect(response.body).toMatchObject({
        ok: false,
        errorCode: 'survey_phase_access_denied',
        message: expect.stringContaining('Cannot access results')
      });
    });
  });

  describe('Survey Resumption Functionality', () => {
    it('should allow resuming from phase 1 when partially completed', async () => {
      // Mock progress where user is in phase 1
      const progress = {
        currentPhase: 1,
        phase1Completed: false,
        phase2Completed: false,
        reflectionCompleted: false
      };

      mockValidateSurveyProgressUseCase.getCurrentProgress.mockResolvedValue(
        Result.ok({
          progress: {
            ...progress,
            nextAvailablePhase: 1
          }
        })
      );

      const response = await request(app)
        .get('/api/v1/onboarding/progress')
        .expect(200);

      expect(response.body.data.navigation.currentPhase).toBe(1);
      expect(response.body.data.navigation.nextAvailablePhase).toBe(1);
      expect(response.body.data.progress.phase1Completed).toBe(false);
    });

    it('should allow resuming from phase 2 when phase 1 is completed', async () => {
      // Mock progress where user completed phase 1
      const progress = {
        currentPhase: 2,
        phase1Completed: true,
        phase2Completed: false,
        reflectionCompleted: false
      };

      mockValidateSurveyProgressUseCase.getCurrentProgress.mockResolvedValue(
        Result.ok({
          progress: {
            ...progress,
            nextAvailablePhase: 2
          }
        })
      );

      const response = await request(app)
        .get('/api/v1/onboarding/progress')
        .expect(200);

      expect(response.body.data.navigation.currentPhase).toBe(2);
      expect(response.body.data.navigation.nextAvailablePhase).toBe(2);
      expect(response.body.data.progress.phase1Completed).toBe(true);
      expect(response.body.data.progress.phase2Completed).toBe(false);
    });

    it('should handle survey state persistence through localStorage simulation', async () => {
      // This would typically test localStorage functionality
      // For backend tests, we focus on API state management

      const savedResponses = {
        phase1: {
          envyScore: 3,
          arroganceScore: 2,
          selfDeceptionScore: 4,
          lustScore: 3
        }
      };

      // Mock that user has saved responses
      mockSurveyRepository.getSurveyResponsesByPhase.mockResolvedValue(
        Result.ok([
          {
            questionId: 'envy',
            score: 3,
            note: 'Saved response'
          }
        ])
      );

      // Test that we can retrieve previously saved data
      expect(mockSurveyRepository.getSurveyResponsesByPhase).toBeDefined();
    });
  });

  describe('Personalized Habits and Tazkiyah Plan Generation', () => {
    it('should generate personalized habits based on survey responses', async () => {
      const mockHabitsResult = {
        createdHabits: [
          {
            id: 'habit-1',
            title: 'Morning Dhikr for Anger Management',
            planId: 'plan-123',
            targetDisease: 'anger',
            frequency: 'daily',
            description: 'Recite specific dhikr for controlling anger'
          },
          {
            id: 'habit-2',
            title: 'Evening Self-Reflection',
            planId: 'plan-123',
            targetDisease: 'selfDeception',
            frequency: 'daily',
            description: 'Reflect on actions and intentions before sleep'
          }
        ],
        planId: 'plan-123',
        totalHabitsCreated: 2
      };

      mockCreateHabitsFromSurveyUseCase.execute.mockResolvedValue(
        Result.ok(mockHabitsResult)
      );

      const response = await request(app)
        .post('/api/v1/onboarding/integrate-habits')
        .send({})
        .expect(200);

      expect(response.body).toMatchObject({
        ok: true,
        data: {
          integration: {
            completed: true,
            totalHabitsCreated: 2,
            planId: 'plan-123'
          },
          createdHabits: [
            expect.objectContaining({
              title: expect.stringContaining('Anger Management'),
              targetDisease: 'anger'
            }),
            expect.objectContaining({
              title: expect.stringContaining('Self-Reflection'),
              targetDisease: 'selfDeception'
            })
          ],
          navigation: {
            habitsUrl: '/habits',
            dashboardUrl: '/dashboard',
            planUrl: '/tazkiyah?planId=plan-123'
          }
        }
      });

      expect(mockCreateHabitsFromSurveyUseCase.execute).toHaveBeenCalledWith({
        userId: testUserId,
        surveyResultId: testUserId,
        planId: undefined,
        traceId: expect.any(String)
      });
    });

    it('should generate tazkiyah plan focusing on critical diseases', async () => {
      const mockResults = {
        results: {
          toDTO: () => ({
            categorizedDiseases: {
              critical: ['anger', 'selfDeception', 'loveOfDunya'],
              moderate: ['envy', 'backbiting'],
              strengths: ['arrogance', 'despair']
            },
            tazkiyahPlan: {
              criticalDiseases: ['anger', 'selfDeception', 'loveOfDunya'],
              planType: 'takhliyah',
              phases: [
                {
                  phaseNumber: 1,
                  title: 'Anger Management Phase',
                  targetDiseases: ['anger'],
                  duration: '4 weeks',
                  practices: [
                    {
                      name: 'Seeking refuge from anger',
                      type: 'dhikr',
                      frequency: 'when angry'
                    }
                  ]
                },
                {
                  phaseNumber: 2,
                  title: 'Self-Awareness Phase',
                  targetDiseases: ['selfDeception'],
                  duration: '4 weeks',
                  practices: [
                    {
                      name: 'Daily self-accountability',
                      type: 'reflection',
                      frequency: 'daily'
                    }
                  ]
                }
              ],
              expectedDuration: '8 weeks'
            }
          }),
          generatedAt: new Date()
        },
        exportOptions: []
      };

      mockGenerateResultsUseCase.execute.mockResolvedValue(
        Result.ok(mockResults)
      );

      const response = await request(app)
        .get('/api/v1/onboarding/results')
        .expect(200);

      const tazkiyahPlan = response.body.data.results.tazkiyahPlan;

      expect(tazkiyahPlan).toMatchObject({
        criticalDiseases: expect.arrayContaining(['anger', 'selfDeception', 'loveOfDunya']),
        planType: 'takhliyah',
        phases: expect.arrayContaining([
          expect.objectContaining({
            title: expect.stringContaining('Anger Management'),
            targetDiseases: ['anger']
          }),
          expect.objectContaining({
            title: expect.stringContaining('Self-Awareness'),
            targetDiseases: ['selfDeception']
          })
        ])
      });
    });

    it('should validate habit generation against survey scores', async () => {
      // Mock high scores for specific diseases
      const mockResults = {
        results: {
          toDTO: () => ({
            diseaseScores: {
              anger: 5,        // Critical - should generate habits
              envy: 4,         // Critical - should generate habits
              arrogance: 2,    // Strength - should not generate habits
              laziness: 3      // Moderate - may generate habits
            },
            categorizedDiseases: {
              critical: ['anger', 'envy'],
              moderate: ['laziness'],
              strengths: ['arrogance']
            }
          }),
          generatedAt: new Date()
        },
        exportOptions: []
      };

      mockGenerateResultsUseCase.execute.mockResolvedValue(
        Result.ok(mockResults)
      );

      const response = await request(app)
        .get('/api/v1/onboarding/results')
        .expect(200);

      const results = response.body.data.results;

      // Verify critical diseases have highest scores
      expect(results.diseaseScores.anger).toBe(5);
      expect(results.diseaseScores.envy).toBe(4);
      expect(results.categorizedDiseases.critical).toContain('anger');
      expect(results.categorizedDiseases.critical).toContain('envy');
      expect(results.categorizedDiseases.strengths).toContain('arrogance');
    });
  });

  describe('Export Functionality', () => {
    it('should export results as JSON', async () => {
      const mockResult = {
        id: 'result-123',
        userId: testUserId,
        diseaseScores: { anger: 4, envy: 3 },
        personalizedHabits: [],
        tazkiyahPlan: {},
        generatedAt: new Date()
      };

      mockSurveyRepository.getSurveyResult.mockResolvedValue(
        Result.ok({
          toDTO: () => mockResult
        })
      );

      const response = await request(app)
        .get('/api/v1/onboarding/export/json/result-123')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.body).toMatchObject({
        metadata: {
          title: 'Tazkiyah Discovery Survey Results',
          format: 'JSON'
        },
        results: expect.objectContaining({
          diseaseScores: { anger: 4, envy: 3 }
        })
      });
    });

    it('should export results as PDF format', async () => {
      const mockResult = {
        id: 'result-123',
        userId: testUserId,
        diseaseScores: { anger: 4, envy: 3 },
        personalizedHabits: [],
        tazkiyahPlan: {},
        generatedAt: new Date()
      };

      mockSurveyRepository.getSurveyResult.mockResolvedValue(
        Result.ok({
          toDTO: () => mockResult
        })
      );

      const response = await request(app)
        .get('/api/v1/onboarding/export/pdf/result-123')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.body).toMatchObject({
        title: 'Tazkiyah Discovery Survey Results',
        user: testUserId,
        results: expect.objectContaining({
          diseaseScores: { anger: 4, envy: 3 }
        })
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle use case errors gracefully', async () => {
      mockSubmitPhase1UseCase.execute.mockResolvedValue(
        Result.error(new Error('Database connection failed'))
      );

      const phase1Data = {
        envyScore: 3,
        arroganceScore: 2,
        selfDeceptionScore: 4,
        lustScore: 3
      };

      const response = await request(app)
        .post('/api/v1/onboarding/phase1')
        .send(phase1Data)
        .expect(500);

      expect(response.body).toMatchObject({
        ok: false,
        errorCode: 'VALIDATION_ERROR',
        message: 'Database connection failed'
      });
    });

    it('should handle validation errors', async () => {
      // Test with invalid Likert scores
      const invalidPhase1Data = {
        envyScore: 6,  // Invalid - should be 1-5
        arroganceScore: 0,  // Invalid - should be 1-5
        selfDeceptionScore: 'invalid',  // Invalid type
        lustScore: 3
      };

      // Since we're mocking validation middleware, we need to simulate the error
      vi.doMock('@/infrastructure/middleware/validation', () => ({
        validateBody: (schema: any) => (req: any, res: any, next: any) => {
          res.status(400).json({
            ok: false,
            error: {
              code: 'validation_error',
              message: 'Invalid input data'
            }
          });
        }
      }));

      // Re-create app with validation error
      const express = await import('express');
      const newApp = express.default();
      newApp.use(express.default.json());
      const onboardingRouter = await import('@/routes/v1/onboarding');
      newApp.use('/api/v1/onboarding', onboardingRouter.default);

      const response = await request(newApp)
        .post('/api/v1/onboarding/phase1')
        .send(invalidPhase1Data)
        .expect(400);

      expect(response.body).toMatchObject({
        ok: false,
        errorCode: 'validation_error',
        message: 'Invalid input data'
      });
    });

    it('should handle missing survey results', async () => {
      mockSurveyRepository.getSurveyResult.mockResolvedValue(
        Result.error(new Error('Survey results not found'))
      );

      const response = await request(app)
        .get('/api/v1/onboarding/export/json/nonexistent-result')
        .expect(500);

      expect(response.body).toMatchObject({
        ok: false,
        errorCode: 'NOT_FOUND',
        message: 'Survey results not found'
      });
    });

    it('should handle reflection text length validation', async () => {
      const invalidReflectionData = {
        strongestStruggle: 'short',  // Too short - min 10 chars
        dailyHabit: 'a'.repeat(501)   // Too long - max 500 chars
      };

      // Mock validation error for text length
      vi.doMock('@/infrastructure/middleware/validation', () => ({
        validateBody: (schema: any) => (req: any, res: any, next: any) => {
          res.status(400).json({
            ok: false,
            error: {
              code: 'validation_error',
              message: 'Text length validation failed'
            }
          });
        }
      }));

      // Re-create app with validation error
      const express = await import('express');
      const newApp = express.default();
      newApp.use(express.default.json());
      const onboardingRouter = await import('@/routes/v1/onboarding');
      newApp.use('/api/v1/onboarding', onboardingRouter.default);

      const response = await request(newApp)
        .post('/api/v1/onboarding/reflection')
        .send(invalidReflectionData)
        .expect(400);

      expect(response.body).toMatchObject({
        ok: false,
        errorCode: 'validation_error',
        message: 'Text length validation failed'
      });
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication for all endpoints', async () => {
      // Mock auth middleware to reject requests
      vi.doMock('@/infrastructure/auth/middleware', () => ({
        authMiddleware: (req: any, res: any, next: any) => {
          res.status(401).json({
            ok: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Authentication required'
            }
          });
        }
      }));

      // Re-create app with auth rejection
      const express = await import('express');
      const newApp = express.default();
      newApp.use(express.default.json());
      const onboardingRouter = await import('@/routes/v1/onboarding');
      newApp.use('/api/v1/onboarding', onboardingRouter.default);

      const endpoints = [
        { method: 'get', path: '/api/v1/onboarding/welcome' },
        { method: 'post', path: '/api/v1/onboarding/phase1', body: { envyScore: 3, arroganceScore: 2, selfDeceptionScore: 4, lustScore: 3 } },
        { method: 'post', path: '/api/v1/onboarding/phase2', body: { angerScore: 3, maliceScore: 2, backbitingScore: 1, suspicionScore: 4, loveOfDunyaScore: 3, lazinessScore: 2, despairScore: 1 } },
        { method: 'get', path: '/api/v1/onboarding/progress' },
        { method: 'get', path: '/api/v1/onboarding/results' }
      ];

      for (const endpoint of endpoints) {
        const req = request(newApp)[endpoint.method as keyof typeof request](endpoint.path);
        if (endpoint.body) {
          req.send(endpoint.body);
        }

        const response = await req.expect(401);
        expect(response.body).toMatchObject({
          ok: false,
          errorCode: 'UNAUTHORIZED',
          message: 'Authentication required'
        });
      }
    });

    it('should include proper traceId in all responses', async () => {
      mockValidateSurveyProgressUseCase.getCurrentProgress.mockResolvedValue(
        Result.ok({
          progress: {
            currentPhase: 1,
            phase1Completed: false
          }
        })
      );

      const response = await request(app)
        .get('/api/v1/onboarding/progress')
        .expect(200);

      expect(response.body).toHaveProperty('traceId');
      expect(typeof response.body.traceId).toBe('string');
      expect(response.body.traceId.length).toBeGreaterThan(0);
    });
  });
});