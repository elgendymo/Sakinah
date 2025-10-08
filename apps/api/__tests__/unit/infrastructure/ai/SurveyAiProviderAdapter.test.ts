import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SurveyAiProviderAdapter } from '@/infrastructure/ai/SurveyAiProviderAdapter';
import { IContentRepository } from '@/domain/repositories/IContentRepository';
import { SurveyGenerationParams } from '@/domain/providers/ISurveyAiProvider';
import { Result } from '@/shared/result';
import { ContentSnippet } from '@sakinah/types';

describe('SurveyAiProviderAdapter', () => {
  let adapter: SurveyAiProviderAdapter;
  let mockContentRepository: IContentRepository;

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

  const mockContentSnippets: ContentSnippet[] = [
    {
      id: '1',
      type: 'ayah',
      text: 'And Allah has favored some of you over others in provision.',
      ref: 'Quran 16:71',
      tags: ['envy', 'provision', 'gratitude'],
      createdAt: '2023-01-01T00:00:00.000Z'
    }
  ];

  beforeEach(() => {
    mockContentRepository = {
      findByTags: vi.fn().mockResolvedValue(Result.ok(mockContentSnippets)),
      findById: vi.fn(),
      findAll: vi.fn(),
      findWithFilter: vi.fn()
    };

    adapter = new SurveyAiProviderAdapter(mockContentRepository);
  });

  describe('generatePersonalizedHabits', () => {
    it('should delegate to the underlying provider', async () => {
      const habits = await adapter.generatePersonalizedHabits(sampleParams);

      expect(habits).toBeDefined();
      expect(Array.isArray(habits)).toBe(true);
      expect(habits.length).toBeGreaterThan(0);

      // Verify the adapter properly passes through results
      habits.forEach(habit => {
        expect(habit.id).toBeDefined();
        expect(habit.title).toBeDefined();
        expect(habit.targetDisease).toBeDefined();
        expect(habit.islamicContent).toBeDefined();
      });
    });

    it('should handle errors from the underlying provider', async () => {
      // Force an error in the content repository
      vi.mocked(mockContentRepository.findByTags).mockRejectedValue(
        new Error('Database error')
      );

      // Should not throw, but handle gracefully
      const habits = await adapter.generatePersonalizedHabits(sampleParams);

      expect(habits).toBeDefined();
      expect(Array.isArray(habits)).toBe(true);
    });
  });

  describe('generateTazkiyahPlan', () => {
    it('should delegate to the underlying provider', async () => {
      const plan = await adapter.generateTazkiyahPlan(sampleParams);

      expect(plan).toBeDefined();
      expect(plan.planType).toBe('takhliyah');
      expect(plan.criticalDiseases).toBeDefined();
      expect(plan.phases).toBeDefined();
      expect(plan.milestones).toBeDefined();
      expect(plan.expectedDuration).toBeDefined();

      // Verify proper structure
      expect(Array.isArray(plan.criticalDiseases)).toBe(true);
      expect(Array.isArray(plan.phases)).toBe(true);
      expect(Array.isArray(plan.milestones)).toBe(true);
    });

    it('should maintain clean separation between adapter and implementation', async () => {
      const plan = await adapter.generateTazkiyahPlan(sampleParams);

      // The adapter should not add any business logic, just pass through
      expect(plan.phases.length).toBeGreaterThan(0);
      expect(plan.milestones.length).toBeGreaterThan(0);

      // Verify that phases have the expected structure from the provider
      plan.phases.forEach(phase => {
        expect(phase.phaseNumber).toBeDefined();
        expect(phase.title).toBeDefined();
        expect(phase.practices).toBeDefined();
        expect(phase.checkpoints).toBeDefined();
      });
    });
  });

  describe('Dependency Injection', () => {
    it('should properly inject the content repository', () => {
      expect(adapter).toBeDefined();

      // The adapter should be able to make calls without throwing
      expect(() => adapter.generatePersonalizedHabits(sampleParams)).not.toThrow();
      expect(() => adapter.generateTazkiyahPlan(sampleParams)).not.toThrow();
    });

    it('should work with different content repository implementations', async () => {
      const alternativeContentRepo: IContentRepository = {
        findByTags: vi.fn().mockResolvedValue(Result.ok([
          {
            id: '2',
            type: 'hadith',
            text: 'Alternative content',
            ref: 'Alternative source',
            tags: ['test'],
            createdAt: '2023-01-01T00:00:00.000Z'
          }
        ])),
        findById: vi.fn(),
        findAll: vi.fn(),
        findWithFilter: vi.fn()
      };

      const alternativeAdapter = new SurveyAiProviderAdapter(alternativeContentRepo);
      const habits = await alternativeAdapter.generatePersonalizedHabits(sampleParams);

      expect(habits).toBeDefined();
      expect(habits.length).toBeGreaterThan(0);
    });
  });
});