import { container } from 'tsyringe';
import { ISurveyAiProvider } from '@/domain/providers/ISurveyAiProvider';
import { SurveyAiProviderAdapter } from './SurveyAiProviderAdapter';

/**
 * Factory for Survey AI Provider
 * Currently only provides rules-based provider, but can be extended for LLM-based providers
 */
export function getSurveyAIProvider(): ISurveyAiProvider {
  // For now, always return the rules-based provider
  // In the future, this could be configurable like the main AI provider
  return container.resolve(SurveyAiProviderAdapter);
}