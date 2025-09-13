import { MicroHabit } from '@sakinah/types';

export interface PlanSuggestion {
  microHabits: MicroHabit[];
  tags: string[];
  guidance?: string;
}

export interface AiProvider {
  suggest(input: { mode: 'takhliyah' | 'tahliyah'; text: string }): Promise<PlanSuggestion>;
  explain(input: { struggle: string }): Promise<{ guidance: string; refs?: string[] }>;
}