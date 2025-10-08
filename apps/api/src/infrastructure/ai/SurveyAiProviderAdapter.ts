import { injectable, inject } from 'tsyringe';
import { ISurveyAiProvider, SurveyGenerationParams } from '@/domain/providers/ISurveyAiProvider';
import { IContentRepository } from '@/domain/repositories/IContentRepository';
import { SurveyAiProvider } from './SurveyAiProvider';
import { PersonalizedHabit, TazkiyahPlan } from '@sakinah/types';

/**
 * Adapter for the Survey AI Provider
 * Provides a clean interface between domain and infrastructure layers
 */
@injectable()
export class SurveyAiProviderAdapter implements ISurveyAiProvider {
  private provider: SurveyAiProvider;

  constructor(
    @inject('IContentRepository') contentRepository: IContentRepository
  ) {
    this.provider = new SurveyAiProvider(contentRepository);
  }

  async generatePersonalizedHabits(params: SurveyGenerationParams): Promise<PersonalizedHabit[]> {
    return this.provider.generatePersonalizedHabits(params);
  }

  async generateTazkiyahPlan(params: SurveyGenerationParams): Promise<TazkiyahPlan> {
    return this.provider.generateTazkiyahPlan(params);
  }
}