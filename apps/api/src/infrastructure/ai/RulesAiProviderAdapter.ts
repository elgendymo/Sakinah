import { IAiProvider, AiSuggestion, AiExplanation } from '@/domain/providers/IAiProvider';
import { MicroHabit } from '@/domain/entities/MicroHabit';
import { RulesAiProvider } from './RulesAiProvider';

export class RulesAiProviderAdapter implements IAiProvider {
  private provider: RulesAiProvider;

  constructor() {
    this.provider = new RulesAiProvider();
  }

  async suggest(params: { mode: 'takhliyah' | 'tahliyah'; text: string }): Promise<AiSuggestion> {
    const result = await this.provider.suggest(params);

    return {
      microHabits: result.microHabits.map(h =>
        MicroHabit.create(h.title, h.schedule, h.target)
      ),
      tags: result.tags
    };
  }

  async explain(struggle: string): Promise<AiExplanation> {
    return await this.provider.explain({ struggle });
  }
}