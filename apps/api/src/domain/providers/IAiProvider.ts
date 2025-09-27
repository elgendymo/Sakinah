import { MicroHabit } from '../entities/MicroHabit';

export interface AiSuggestion {
  microHabits: MicroHabit[];
  tags: string[];
}

export interface AiExplanation {
  guidance: string;
  refs?: string[];
}

export interface IAiProvider {
  suggest(params: { mode: 'takhliyah' | 'tahliyah'; text: string }): Promise<AiSuggestion>;
  explain(struggle: string): Promise<AiExplanation>;
}