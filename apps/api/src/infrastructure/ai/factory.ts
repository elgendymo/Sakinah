import { IAiProvider } from '@/domain/providers/IAiProvider';
import { RulesAiProviderAdapter } from './RulesAiProviderAdapter';
import { LlmAiProviderAdapter } from './LlmAiProviderAdapter';

export function getAIProvider(): IAiProvider {
  const provider = process.env.AI_PROVIDER || 'rules';

  switch (provider) {
    case 'llm':
      return new LlmAiProviderAdapter();
    case 'rules':
    default:
      return new RulesAiProviderAdapter();
  }
}