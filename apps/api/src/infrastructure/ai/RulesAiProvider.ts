import { AiProvider, PlanSuggestion } from './types';
import { MicroHabit } from '@sakinah/types';

const STRUGGLE_MAPPINGS = {
  // Takhliyah (Removing diseases)
  envy: {
    tags: ['envy', 'hasad', 'contentment', 'gratitude'],
    habits: [
      { title: 'Say Alhamdulillah 100 times after Fajr', schedule: 'daily', target: 1 },
      { title: 'Make dua for those you envy', schedule: 'daily', target: 1 },
      { title: 'Write 3 blessings in gratitude journal', schedule: 'daily', target: 3 },
    ],
    guidance: 'Envy corrodes the heart. Focus on gratitude and contentment with Allah\'s decree.',
  },
  anger: {
    tags: ['anger', 'patience', 'forgiveness', 'calm'],
    habits: [
      { title: 'Seek refuge when feeling angry', schedule: 'daily', target: 1 },
      { title: 'Perform wudu when angry', schedule: 'daily', target: 1 },
      { title: 'Practice 5 minutes of dhikr for patience', schedule: 'daily', target: 1 },
    ],
    guidance: 'Anger is from Shaytan. Cool it with wudu and remembrance.',
  },
  pride: {
    tags: ['pride', 'humility', 'arrogance', 'tawadu'],
    habits: [
      { title: 'Serve someone daily', schedule: 'daily', target: 1 },
      { title: 'Make istighfar 100 times', schedule: 'daily', target: 1 },
      { title: 'Reflect on one weakness', schedule: 'daily', target: 1 },
    ],
    guidance: 'Pride was the first sin. Remember you are dust and to dust you shall return.',
  },
  lust: {
    tags: ['lust', 'chastity', 'gaze', 'modesty'],
    habits: [
      { title: 'Lower gaze immediately', schedule: 'daily', target: 1 },
      { title: 'Fast on Mondays and Thursdays', schedule: 'weekly', target: 2 },
      { title: 'Extra prayer at night', schedule: 'daily', target: 1 },
    ],
    guidance: 'Guard your gaze and private parts. Fasting is a shield.',
  },

  // Tahliyah (Adorning with virtues)
  patience: {
    tags: ['patience', 'sabr', 'perseverance'],
    habits: [
      { title: 'Recite "Inna lillahi wa inna ilayhi rajioon" in difficulty', schedule: 'daily', target: 1 },
      { title: 'Delay one impulse daily', schedule: 'daily', target: 1 },
      { title: 'Read story of a patient prophet', schedule: 'daily', target: 1 },
    ],
    guidance: 'Patience is half of faith. It illuminates the path.',
  },
  gratitude: {
    tags: ['gratitude', 'shukr', 'thankfulness'],
    habits: [
      { title: 'List 5 blessings before sleep', schedule: 'daily', target: 5 },
      { title: 'Say Alhamdulillah after every meal', schedule: 'daily', target: 3 },
      { title: 'Thank someone daily', schedule: 'daily', target: 1 },
    ],
    guidance: 'Gratitude increases blessings. "If you are grateful, I will increase you."',
  },
  tawakkul: {
    tags: ['tawakkul', 'trust', 'reliance'],
    habits: [
      { title: 'Recite Hasbunallah wa ni\'mal wakeel', schedule: 'daily', target: 3 },
      { title: 'Make dua then leave outcome to Allah', schedule: 'daily', target: 1 },
      { title: 'Read about Allah\'s names Al-Wakeel', schedule: 'daily', target: 1 },
    ],
    guidance: 'Tie your camel and trust in Allah. He is sufficient for you.',
  },
};

export class RulesAiProvider implements AiProvider {
  async suggest(input: { mode: 'takhliyah' | 'tahliyah'; text: string }): Promise<PlanSuggestion> {
    const normalized = input.text.toLowerCase();

    // Find matching struggle/virtue
    for (const [key, mapping] of Object.entries(STRUGGLE_MAPPINGS)) {
      if (normalized.includes(key)) {
        return {
          microHabits: mapping.habits as MicroHabit[],
          tags: mapping.tags,
          guidance: mapping.guidance,
        };
      }
    }

    // Default fallback
    const defaultHabits: MicroHabit[] = input.mode === 'takhliyah'
      ? [
          { title: 'Daily istighfar 100 times', schedule: 'daily', target: 1 },
          { title: 'Reflect on the issue for 5 minutes', schedule: 'daily', target: 1 },
          { title: 'Make specific dua for help', schedule: 'daily', target: 1 },
        ]
      : [
          { title: 'Morning dhikr', schedule: 'daily', target: 1 },
          { title: 'Evening reflection', schedule: 'daily', target: 1 },
          { title: 'Act on the virtue once daily', schedule: 'daily', target: 1 },
        ];

    return {
      microHabits: defaultHabits,
      tags: [input.text.toLowerCase().split(' ')[0]],
      guidance: 'Start small and be consistent. Allah loves consistent deeds even if small.',
    };
  }

  async explain(input: { struggle: string }): Promise<{ guidance: string; refs?: string[] }> {
    const normalized = input.struggle.toLowerCase();

    for (const [key, mapping] of Object.entries(STRUGGLE_MAPPINGS)) {
      if (normalized.includes(key)) {
        return {
          guidance: mapping.guidance,
          refs: [
            'Quran: Various verses on ' + key,
            'Hadith: Prophetic guidance on ' + key,
          ],
        };
      }
    }

    return {
      guidance: 'Every soul will be tested. Turn to Allah with sincerity and He will guide you.',
      refs: ['Quran 2:286', 'Quran 94:5-6'],
    };
  }
}