import { AiProvider, PlanSuggestion } from './types';

export class LlmAiProvider implements AiProvider {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }
  }

  async suggest(input: { mode: 'takhliyah' | 'tahliyah'; text: string }): Promise<PlanSuggestion> {
    // This is a placeholder for LLM integration
    // In production, you would call OpenAI or another LLM here

    // const prompt = input.mode === 'takhliyah'
    //   ? `Create a spiritual purification plan for someone struggling with: ${input.text}`
    //   : `Create a virtue development plan for cultivating: ${input.text}`;

    // For now, return a structured response
    // In production, parse LLM response into this structure
    return {
      microHabits: [
        { title: 'Morning reflection on the issue', schedule: 'daily', target: 1 },
        { title: 'Specific dhikr practice', schedule: 'daily', target: 1 },
        { title: 'Practical action step', schedule: 'daily', target: 1 },
      ],
      tags: [input.text.toLowerCase().split(' ')[0]],
      guidance: 'AI-generated guidance would appear here based on Islamic sources.',
    };
  }

  async explain(input: { struggle: string }): Promise<{ guidance: string; refs?: string[] }> {
    // Placeholder for LLM explanation
    return {
      guidance: 'AI-generated Islamic guidance about ' + input.struggle,
      refs: ['Relevant Quranic verses', 'Applicable Hadith'],
    };
  }
}