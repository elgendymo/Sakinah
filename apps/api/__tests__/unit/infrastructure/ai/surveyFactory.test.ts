import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { container } from 'tsyringe';
import { getSurveyAIProvider } from '@/infrastructure/ai/surveyFactory';
import { ISurveyAiProvider } from '@/domain/providers/ISurveyAiProvider';
import { SurveyAiProviderAdapter } from '@/infrastructure/ai/SurveyAiProviderAdapter';
import { IContentRepository } from '@/domain/repositories/IContentRepository';
import { Result } from '@/shared/result';

describe('getSurveyAIProvider', () => {
  let mockContentRepository: IContentRepository;

  beforeEach(() => {
    mockContentRepository = {
      findByTags: vi.fn().mockResolvedValue(Result.ok([])),
      findById: vi.fn(),
      findAll: vi.fn(),
      findWithFilter: vi.fn()
    };

    // Register the mock in the container
    container.registerInstance('IContentRepository', mockContentRepository);
  });

  afterEach(() => {
    container.clearInstances();
  });

  it('should return a SurveyAiProvider instance', () => {
    const provider = getSurveyAIProvider();

    expect(provider).toBeDefined();
    expect(provider).toBeInstanceOf(SurveyAiProviderAdapter);
  });

  it('should return the same instance type on multiple calls', () => {
    const provider1 = getSurveyAIProvider();
    const provider2 = getSurveyAIProvider();

    expect(provider1).toBeInstanceOf(SurveyAiProviderAdapter);
    expect(provider2).toBeInstanceOf(SurveyAiProviderAdapter);

    // They should be different instances (not singletons)
    expect(provider1).not.toBe(provider2);
  });

  it('should create a provider that implements ISurveyAiProvider interface', () => {
    const provider = getSurveyAIProvider();

    // Check that it has the required methods
    expect(typeof provider.generatePersonalizedHabits).toBe('function');
    expect(typeof provider.generateTazkiyahPlan).toBe('function');
  });

  it('should resolve dependencies through the container', async () => {
    const provider = getSurveyAIProvider();

    // Verify that the provider can actually work (dependencies resolved)
    const testParams = {
      diseaseScores: {
        envy: 5,
        arrogance: 4,
        selfDeception: 3,
        lust: 2,
        anger: 2,
        malice: 2,
        backbiting: 1,
        suspicion: 1,
        loveOfDunya: 2,
        laziness: 2,
        despair: 1
      },
      reflectionAnswers: {
        strongestStruggle: 'Test struggle',
        dailyHabit: 'Test habit'
      }
    };

    // Should not throw because dependencies are properly resolved
    await expect(provider.generatePersonalizedHabits(testParams)).resolves.toBeDefined();
    await expect(provider.generateTazkiyahPlan(testParams)).resolves.toBeDefined();
  });

  it('should handle missing dependencies gracefully', () => {
    // Clear the container to simulate missing dependencies
    container.clearInstances();

    // Should not throw during creation (tsyringe will handle missing deps)
    expect(() => getSurveyAIProvider()).not.toThrow();
  });

  describe('Future extensibility', () => {
    it('should allow for easy configuration changes in the future', () => {
      // The factory pattern allows for easy switching between implementations
      // This test documents the intended extensibility

      const provider = getSurveyAIProvider();
      expect(provider).toBeInstanceOf(SurveyAiProviderAdapter);

      // In the future, this could be extended to:
      // - Read from environment variables
      // - Support different provider types (rules vs LLM)
      // - Allow runtime switching

      // For now, verify it returns the expected type
      expect(provider).toBeDefined();
    });

    it('should be consistent with existing AI provider factory patterns', () => {
      // This factory should follow similar patterns to the main AI provider factory
      const provider = getSurveyAIProvider();

      // Should return a provider that follows the same interface patterns
      expect(provider.generatePersonalizedHabits).toBeDefined();
      expect(provider.generateTazkiyahPlan).toBeDefined();

      // Methods should return Promises (async)
      const result1 = provider.generatePersonalizedHabits({
        diseaseScores: {} as any,
        reflectionAnswers: { strongestStruggle: '', dailyHabit: '' }
      });
      const result2 = provider.generateTazkiyahPlan({
        diseaseScores: {} as any,
        reflectionAnswers: { strongestStruggle: '', dailyHabit: '' }
      });

      expect(result1).toBeInstanceOf(Promise);
      expect(result2).toBeInstanceOf(Promise);
    });
  });
});