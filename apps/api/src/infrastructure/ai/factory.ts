import { AiProvider } from './types';
import { RulesAiProvider } from './RulesAiProvider';
import { LlmAiProvider } from './LlmAiProvider';

export function getAIProvider(): AiProvider {
  const provider = process.env.AI_PROVIDER || 'rules';

  switch (provider) {
    case 'llm':
      return new LlmAiProvider();
    case 'rules':
    default:
      return new RulesAiProvider();
  }
}