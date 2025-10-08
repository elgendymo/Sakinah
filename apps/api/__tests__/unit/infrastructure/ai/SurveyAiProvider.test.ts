import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SurveyAiProvider } from '@/infrastructure/ai/SurveyAiProvider';
import { IContentRepository } from '@/domain/repositories/IContentRepository';
import { SurveyGenerationParams } from '@/domain/providers/ISurveyAiProvider';
import { ContentSnippet, Disease, LikertScore } from '@sakinah/types';
import { Result } from '@/shared/result';

describe('SurveyAiProvider', () => {
  let surveyAiProvider: SurveyAiProvider;
  let mockContentRepository: IContentRepository;

  const mockContentSnippets: ContentSnippet[] = [
    {
      id: '1',
      type: 'ayah',
      text: 'And Allah has favored some of you over others in provision.',
      ref: 'Quran 16:71',
      tags: ['envy', 'provision', 'gratitude'],
      createdAt: '2023-01-01T00:00:00.000Z'
    },
    {
      id: '2',
      type: 'hadith',
      text: 'Beware of envy, for envy devours good deeds just as fire devours firewood.',
      ref: 'Abu Dawud',
      tags: ['envy', 'hasad', 'warning'],
      createdAt: '2023-01-01T00:00:00.000Z'
    },
    {
      id: '3',
      type: 'hadith',
      text: 'Whoever has an atom\'s weight of pride in his heart will not enter Paradise.',
      ref: 'Muslim',
      tags: ['pride', 'arrogance', 'paradise'],
      createdAt: '2023-01-01T00:00:00.000Z'
    }
  ];

  const sampleParams: SurveyGenerationParams = {
    diseaseScores: {
      envy: 5,
      arrogance: 4,
      selfDeception: 3,
      lust: 2,
      anger: 4,
      malice: 2,
      backbiting: 1,
      suspicion: 3,
      loveOfDunya: 2,
      laziness: 4,
      despair: 1
    },
    reflectionAnswers: {
      strongestStruggle: 'I struggle with envy when seeing others succeed',
      dailyHabit: 'I want to develop a consistent dhikr practice'
    },
    userProfile: {
      firstName: 'Ahmad',
      gender: 'male'
    }
  };

  beforeEach(() => {
    mockContentRepository = {
      findByTags: vi.fn(),
      findById: vi.fn(),
      findAll: vi.fn(),
      findWithFilter: vi.fn()
    };

    surveyAiProvider = new SurveyAiProvider(mockContentRepository);
  });

  describe('generatePersonalizedHabits', () => {
    it('should generate habits for critical diseases (scores 4-5)', async () => {
      // Mock content repository to return relevant content
      vi.mocked(mockContentRepository.findByTags).mockResolvedValue(
        Result.ok(mockContentSnippets.filter(c => c.tags.includes('envy')))
      );

      const habits = await surveyAiProvider.generatePersonalizedHabits(sampleParams);

      expect(habits.length).toBeGreaterThan(0);

      // Should prioritize critical diseases (envy: 5, arrogance: 4, anger: 4, laziness: 4)
      const targetDiseases = habits.map(h => h.targetDisease);
      expect(targetDiseases).toContain('envy');
      expect(targetDiseases).toContain('arrogance');

      // Each habit should have required properties
      habits.forEach(habit => {
        expect(habit.id).toBeDefined();
        expect(habit.title).toBeDefined();
        expect(habit.description).toBeDefined();
        expect(habit.frequency).toMatch(/^(daily|weekly|bi-weekly)$/);
        expect(['easy', 'moderate', 'challenging']).toContain(habit.difficultyLevel);
        expect(habit.estimatedDuration).toBeDefined();
        expect(habit.islamicContent).toBeDefined();
        expect(Array.isArray(habit.islamicContent)).toBe(true);
      });
    });

    it('should personalize habit descriptions based on reflection answers', async () => {
      vi.mocked(mockContentRepository.findByTags).mockResolvedValue(
        Result.ok(mockContentSnippets.filter(c => c.tags.includes('envy')))
      );

      const habits = await surveyAiProvider.generatePersonalizedHabits(sampleParams);

      // Find a habit targeting envy (the strongest struggle mentioned)
      const envyHabit = habits.find(h => h.targetDisease === 'envy');
      expect(envyHabit).toBeDefined();

      if (envyHabit) {
        // Should contain personalized message about their struggle
        expect(envyHabit.description.toLowerCase()).toContain('envy');
      }
    });

    it('should limit total habits to manageable number (~10)', async () => {
      vi.mocked(mockContentRepository.findByTags).mockResolvedValue(
        Result.ok(mockContentSnippets)
      );

      const habits = await surveyAiProvider.generatePersonalizedHabits(sampleParams);

      expect(habits.length).toBeLessThanOrEqual(10);
    });

    it('should handle content repository errors gracefully', async () => {
      vi.mocked(mockContentRepository.findByTags).mockResolvedValue(
        Result.error(new Error('Database connection failed'))
      );

      const habits = await surveyAiProvider.generatePersonalizedHabits(sampleParams);

      // Should still return habits using fallback content
      expect(habits.length).toBeGreaterThan(0);

      // Each habit should still have islamic content (from fallback)
      habits.forEach(habit => {
        expect(habit.islamicContent).toBeDefined();
        expect(habit.islamicContent.length).toBeGreaterThan(0);
      });
    });

    it('should include moderate diseases when critical disease slots allow', async () => {
      const paramsWithFewCritical: SurveyGenerationParams = {
        ...sampleParams,
        diseaseScores: {
          envy: 5, // Only one critical disease
          arrogance: 3, // moderate
          selfDeception: 3, // moderate
          lust: 2,
          anger: 2,
          malice: 2,
          backbiting: 1,
          suspicion: 1,
          loveOfDunya: 2,
          laziness: 2,
          despair: 1
        }
      };

      vi.mocked(mockContentRepository.findByTags).mockResolvedValue(
        Result.ok(mockContentSnippets)
      );

      const habits = await surveyAiProvider.generatePersonalizedHabits(paramsWithFewCritical);

      const targetDiseases = habits.map(h => h.targetDisease);

      // Should include the critical disease
      expect(targetDiseases).toContain('envy');

      // Should also include some moderate diseases
      expect(targetDiseases.some(d => ['arrogance', 'selfDeception'].includes(d))).toBe(true);
    });
  });

  describe('generateTazkiyahPlan', () => {
    it('should create a comprehensive Tazkiyah plan focusing on critical diseases', async () => {
      vi.mocked(mockContentRepository.findByTags).mockResolvedValue(
        Result.ok(mockContentSnippets)
      );

      const plan = await surveyAiProvider.generateTazkiyahPlan(sampleParams);

      expect(plan.planType).toBe('takhliyah');
      expect(plan.criticalDiseases.length).toBeGreaterThan(0);
      expect(plan.phases.length).toBeGreaterThan(0);
      expect(plan.milestones.length).toBeGreaterThan(0);
      expect(plan.expectedDuration).toBeDefined();

      // Should focus on diseases with scores 4-5
      plan.criticalDiseases.forEach(disease => {
        expect(sampleParams.diseaseScores[disease]).toBeGreaterThanOrEqual(4);
      });
    });

    it('should include structured phases with progressive difficulty', async () => {
      vi.mocked(mockContentRepository.findByTags).mockResolvedValue(
        Result.ok(mockContentSnippets)
      );

      const plan = await surveyAiProvider.generateTazkiyahPlan(sampleParams);

      expect(plan.phases.length).toBeGreaterThanOrEqual(3);

      // First phase should be about awareness
      const firstPhase = plan.phases[0];
      expect(firstPhase.title.toLowerCase()).toContain('awareness');
      expect(firstPhase.phaseNumber).toBe(1);

      // Should have practices with Islamic basis
      plan.phases.forEach(phase => {
        expect(phase.practices.length).toBeGreaterThan(0);
        expect(phase.checkpoints.length).toBeGreaterThan(0);

        phase.practices.forEach(practice => {
          expect(practice.name).toBeDefined();
          expect(practice.type).toMatch(/^(dhikr|dua|reflection|behavioral|study)$/);
          expect(practice.islamicBasis).toBeDefined();
          expect(Array.isArray(practice.islamicBasis)).toBe(true);
        });
      });
    });

    it('should generate realistic milestones with proper dates', async () => {
      vi.mocked(mockContentRepository.findByTags).mockResolvedValue(
        Result.ok(mockContentSnippets)
      );

      const plan = await surveyAiProvider.generateTazkiyahPlan(sampleParams);

      expect(plan.milestones.length).toBeGreaterThan(0);

      // Milestones should be in chronological order
      const dates = plan.milestones.map(m => new Date(m.targetDate));
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i].getTime()).toBeGreaterThan(dates[i - 1].getTime());
      }

      // All milestones should be in the future
      const now = new Date();
      dates.forEach(date => {
        expect(date.getTime()).toBeGreaterThan(now.getTime());
      });

      // Each milestone should have required properties
      plan.milestones.forEach(milestone => {
        expect(milestone.id).toBeDefined();
        expect(milestone.title).toBeDefined();
        expect(milestone.description).toBeDefined();
        expect(milestone.completed).toBe(false);
      });
    });

    it('should handle cases with no critical diseases by focusing on highest moderate diseases', async () => {
      const paramsNoCritical: SurveyGenerationParams = {
        ...sampleParams,
        diseaseScores: {
          envy: 3,
          arrogance: 3,
          selfDeception: 2,
          lust: 2,
          anger: 2,
          malice: 2,
          backbiting: 1,
          suspicion: 1,
          loveOfDunya: 2,
          laziness: 2,
          despair: 1
        }
      };

      vi.mocked(mockContentRepository.findByTags).mockResolvedValue(
        Result.ok(mockContentSnippets)
      );

      const plan = await surveyAiProvider.generateTazkiyahPlan(paramsNoCritical);

      expect(plan.criticalDiseases.length).toBeGreaterThan(0);

      // Should focus on the highest scoring diseases even if they're moderate
      plan.criticalDiseases.forEach(disease => {
        expect(paramsNoCritical.diseaseScores[disease]).toBeGreaterThanOrEqual(3);
      });
    });

    it('should calculate appropriate duration based on disease count', async () => {
      vi.mocked(mockContentRepository.findByTags).mockResolvedValue(
        Result.ok(mockContentSnippets)
      );

      const plan = await surveyAiProvider.generateTazkiyahPlan(sampleParams);

      expect(plan.expectedDuration).toMatch(/\d+ months?/);

      // More critical diseases should generally mean longer duration
      if (plan.criticalDiseases.length > 2) {
        expect(plan.expectedDuration).toMatch(/(3|4|5|6) months?/);
      }
    });
  });

  describe('Integration with Content Repository', () => {
    it('should fetch relevant Islamic content from database', async () => {
      const envyContent = mockContentSnippets.filter(c => c.tags.includes('envy'));
      vi.mocked(mockContentRepository.findByTags).mockResolvedValue(
        Result.ok(envyContent)
      );

      const habits = await surveyAiProvider.generatePersonalizedHabits(sampleParams);

      // Should have called findByTags for each critical disease
      expect(mockContentRepository.findByTags).toHaveBeenCalled();

      // The returned habits should include the database content
      const envyHabit = habits.find(h => h.targetDisease === 'envy');
      if (envyHabit) {
        expect(envyHabit.islamicContent.length).toBeGreaterThan(0);
        expect(envyHabit.islamicContent.some(c => c.text.includes('provision'))).toBe(true);
      }
    });

    it('should limit Islamic content to 4 pieces per habit', async () => {
      const manyContentSnippets = Array.from({ length: 10 }, (_, i) => ({
        id: `${i + 1}`,
        type: 'ayah' as const,
        text: `Test content ${i + 1}`,
        ref: `Test ${i + 1}`,
        tags: ['envy'],
        createdAt: '2023-01-01T00:00:00.000Z'
      }));

      vi.mocked(mockContentRepository.findByTags).mockResolvedValue(
        Result.ok(manyContentSnippets)
      );

      const habits = await surveyAiProvider.generatePersonalizedHabits(sampleParams);

      habits.forEach(habit => {
        expect(habit.islamicContent.length).toBeLessThanOrEqual(4);
      });
    });

    it('should fall back to predefined content when database is empty', async () => {
      vi.mocked(mockContentRepository.findByTags).mockResolvedValue(
        Result.ok([]) // Empty result
      );

      const habits = await surveyAiProvider.generatePersonalizedHabits(sampleParams);

      // Should still have habits with Islamic content from fallback
      expect(habits.length).toBeGreaterThan(0);

      habits.forEach(habit => {
        expect(habit.islamicContent.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle content repository exceptions gracefully', async () => {
      vi.mocked(mockContentRepository.findByTags).mockRejectedValue(
        new Error('Network timeout')
      );

      const habits = await surveyAiProvider.generatePersonalizedHabits(sampleParams);

      // Should still return habits using fallback content
      expect(habits.length).toBeGreaterThan(0);

      habits.forEach(habit => {
        expect(habit.islamicContent).toBeDefined();
      });
    });

    it('should handle invalid disease mappings gracefully', async () => {
      const paramsWithInvalidDisease: SurveyGenerationParams = {
        ...sampleParams,
        diseaseScores: {
          ...sampleParams.diseaseScores,
          // @ts-ignore - Testing runtime behavior
          invalidDisease: 5
        }
      };

      vi.mocked(mockContentRepository.findByTags).mockResolvedValue(
        Result.ok(mockContentSnippets)
      );

      const habits = await surveyAiProvider.generatePersonalizedHabits(paramsWithInvalidDisease);

      // Should skip invalid diseases and continue with valid ones
      expect(habits.length).toBeGreaterThan(0);

      const targetDiseases = habits.map(h => h.targetDisease);
      expect(targetDiseases).not.toContain('invalidDisease');
    });
  });
});