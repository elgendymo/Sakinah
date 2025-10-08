import {
  PersonalizedHabit,
  TazkiyahPlan,
  Disease,
  LikertScore,
  ContentSnippet,
  TazkiyahPhase,
  Practice,
  PlanMilestone
} from '@sakinah/types';
import { ISurveyAiProvider, SurveyGenerationParams, ReflectionAnswers } from '@/domain/providers/ISurveyAiProvider';
import { IContentRepository } from '@/domain/repositories/IContentRepository';
import { Result } from '@/shared/result';
import { v4 as uuidv4 } from 'uuid';

/**
 * Rules-based AI provider for survey recommendations
 * Uses curated Islamic content and structured recommendations based on disease scores
 */
export class SurveyAiProvider implements ISurveyAiProvider {
  constructor(private contentRepository: IContentRepository) {}

  private readonly DISEASE_PRIORITY_MAPPINGS = {
    // Phase 1 - Inner Heart Diseases
    envy: {
      tags: ['envy', 'hasad', 'contentment', 'gratitude', 'rizq'],
      severity: 'critical',
      habits: [
        {
          title: 'Gratitude dhikr after each prayer',
          description: 'Say "Alhamdulillahi Rabbil Alameen" 33 times after each obligatory prayer',
          frequency: 'daily' as const,
          difficultyLevel: 'easy' as const,
          estimatedDuration: '5 minutes',
        },
        {
          title: 'Make dua for those you envy',
          description: 'When feeling envy, immediately make sincere dua for the person\'s continued blessings',
          frequency: 'daily' as const,
          difficultyLevel: 'moderate' as const,
          estimatedDuration: '2 minutes',
        },
        {
          title: 'Reflect on your unique blessings',
          description: 'Write down 3 blessings Allah has given specifically to you',
          frequency: 'daily' as const,
          difficultyLevel: 'easy' as const,
          estimatedDuration: '10 minutes',
        }
      ],
      content: [
        {
          type: 'ayah' as const,
          text: 'And Allah has favored some of you over others in provision. But those who were favored would not hand over their provision to those whom their right hands possess so they would be equal to them therein. Then is it the favor of Allah they reject?',
          ref: 'Quran 16:71',
          tags: ['envy', 'provision', 'gratitude']
        },
        {
          type: 'hadith' as const,
          text: 'Beware of envy, for envy devours good deeds just as fire devours firewood.',
          ref: 'Abu Dawud',
          tags: ['envy', 'hasad', 'warning']
        }
      ]
    },
    arrogance: {
      tags: ['pride', 'arrogance', 'humility', 'tawadu', 'takabbur'],
      severity: 'critical',
      habits: [
        {
          title: 'Serve someone daily',
          description: 'Perform a small act of service for family, friends, or community without expecting recognition',
          frequency: 'daily' as const,
          difficultyLevel: 'moderate' as const,
          estimatedDuration: '15 minutes',
        },
        {
          title: 'Istighfar practice',
          description: 'Say "Astaghfirullaha rabbi min kulli dhanbin wa atubu ilayh" 100 times',
          frequency: 'daily' as const,
          difficultyLevel: 'easy' as const,
          estimatedDuration: '10 minutes',
        },
        {
          title: 'Reflect on personal shortcomings',
          description: 'Before sleep, honestly reflect on one mistake or weakness from the day',
          frequency: 'daily' as const,
          difficultyLevel: 'challenging' as const,
          estimatedDuration: '5 minutes',
        }
      ],
      content: [
        {
          type: 'hadith' as const,
          text: 'Whoever has an atom\'s weight of pride in his heart will not enter Paradise.',
          ref: 'Muslim',
          tags: ['pride', 'arrogance', 'paradise']
        },
        {
          type: 'ayah' as const,
          text: 'And turn not your face away from men with pride, nor walk in insolence through the earth. Verily, Allah likes not each arrogant boaster.',
          ref: 'Quran 31:18',
          tags: ['arrogance', 'humility', 'character']
        }
      ]
    },
    selfDeception: {
      tags: ['self-deception', 'honesty', 'introspection', 'muhasabah'],
      severity: 'critical',
      habits: [
        {
          title: 'Daily self-accountability (Muhasabah)',
          description: 'Before Maghrib, spend 10 minutes honestly reviewing your actions and intentions',
          frequency: 'daily' as const,
          difficultyLevel: 'moderate' as const,
          estimatedDuration: '10 minutes',
        },
        {
          title: 'Seek counsel from trusted friends',
          description: 'Weekly ask a righteous friend for honest feedback about your character',
          frequency: 'weekly' as const,
          difficultyLevel: 'challenging' as const,
          estimatedDuration: '20 minutes',
        },
        {
          title: 'Study lives of righteous predecessors',
          description: 'Read about the honesty and self-awareness of the Sahaba and righteous scholars',
          frequency: 'daily' as const,
          difficultyLevel: 'easy' as const,
          estimatedDuration: '15 minutes',
        }
      ],
      content: [
        {
          type: 'hadith' as const,
          text: 'The believer is a mirror to his brother. If he sees any fault in him, he corrects it.',
          ref: 'Abu Dawud',
          tags: ['self-reflection', 'brotherhood', 'correction']
        },
        {
          type: 'ayah' as const,
          text: 'O you who believe! Be afraid of Allah, and be with those who are true (in words and deeds).',
          ref: 'Quran 9:119',
          tags: ['truthfulness', 'company', 'righteousness']
        }
      ]
    },
    lust: {
      tags: ['lust', 'chastity', 'gaze', 'modesty', 'shahwa'],
      severity: 'critical',
      habits: [
        {
          title: 'Immediate gaze lowering',
          description: 'When tempted, immediately lower your gaze and say "A\'udhu billahi min ash-shaytani\'r-rajim"',
          frequency: 'daily' as const,
          difficultyLevel: 'moderate' as const,
          estimatedDuration: '1 minute',
        },
        {
          title: 'Voluntary fasting',
          description: 'Fast on Mondays and Thursdays to build self-control and reduce desires',
          frequency: 'weekly' as const,
          difficultyLevel: 'challenging' as const,
          estimatedDuration: 'Full day',
        },
        {
          title: 'Night prayer (Tahajjud)',
          description: 'Wake up 30 minutes before Fajr for additional prayer and dhikr',
          frequency: 'daily' as const,
          difficultyLevel: 'challenging' as const,
          estimatedDuration: '30 minutes',
        }
      ],
      content: [
        {
          type: 'hadith' as const,
          text: 'O young men! Whoever among you can afford to marry, let him do so, and whoever cannot, then he should fast, for it will be a restraint for him.',
          ref: 'Bukhari & Muslim',
          tags: ['chastity', 'marriage', 'fasting']
        },
        {
          type: 'ayah' as const,
          text: 'Tell the believing men to lower their gaze and guard their private parts. That is purer for them.',
          ref: 'Quran 24:30',
          tags: ['gaze', 'modesty', 'purity']
        }
      ]
    },

    // Phase 2 - Behavioral Manifestations
    anger: {
      tags: ['anger', 'patience', 'forgiveness', 'calm', 'ghadab'],
      severity: 'high',
      habits: [
        {
          title: 'Immediate refuge seeking',
          description: 'When feeling angry, immediately say "A\'udhu billahi min ash-shaytani\'r-rajim"',
          frequency: 'daily' as const,
          difficultyLevel: 'easy' as const,
          estimatedDuration: '1 minute',
        },
        {
          title: 'Wudu when angry',
          description: 'Perform ablution when feeling anger to cool down physically and spiritually',
          frequency: 'daily' as const,
          difficultyLevel: 'easy' as const,
          estimatedDuration: '5 minutes',
        },
        {
          title: 'Patience dhikr practice',
          description: 'Recite "Rabbana atina fi\'d-dunya hasanatan..." 10 times when frustrated',
          frequency: 'daily' as const,
          difficultyLevel: 'moderate' as const,
          estimatedDuration: '5 minutes',
        }
      ],
      content: [
        {
          type: 'hadith' as const,
          text: 'Anger is from Satan, and Satan is created from fire. Fire is extinguished by water, so perform ablution when you are angry.',
          ref: 'Abu Dawud',
          tags: ['anger', 'wudu', 'satan']
        },
        {
          type: 'ayah' as const,
          text: 'And those who restrain anger and who pardon the people - and Allah loves the doers of good.',
          ref: 'Quran 3:134',
          tags: ['anger', 'forgiveness', 'patience']
        }
      ]
    },
    malice: {
      tags: ['malice', 'hatred', 'forgiveness', 'heart-purification'],
      severity: 'high',
      habits: [
        {
          title: 'Make dua for those who hurt you',
          description: 'Daily make sincere dua for the guidance and wellbeing of those who have wronged you',
          frequency: 'daily' as const,
          difficultyLevel: 'challenging' as const,
          estimatedDuration: '5 minutes',
        },
        {
          title: 'Heart purification dhikr',
          description: 'After each prayer, say "Rabbana aghfir lana wa li-ikhwanina alladhina sabaquna bil-iman"',
          frequency: 'daily' as const,
          difficultyLevel: 'moderate' as const,
          estimatedDuration: '2 minutes',
        },
        {
          title: 'Acts of kindness',
          description: 'Perform one unexpected act of kindness daily to soften your heart',
          frequency: 'daily' as const,
          difficultyLevel: 'moderate' as const,
          estimatedDuration: '10 minutes',
        }
      ],
      content: [
        {
          type: 'ayah' as const,
          text: 'The recompense for an evil is an evil equal thereto; but whoever forgives and makes reconciliation, his reward is with Allah.',
          ref: 'Quran 42:40',
          tags: ['forgiveness', 'reconciliation', 'reward']
        },
        {
          type: 'hadith' as const,
          text: 'Be merciful to others and you will receive mercy. Forgive others and Allah will forgive you.',
          ref: 'Ahmad',
          tags: ['mercy', 'forgiveness', 'reciprocity']
        }
      ]
    },
    backbiting: {
      tags: ['backbiting', 'speech', 'tongue', 'gossip', 'gheebah'],
      severity: 'high',
      habits: [
        {
          title: 'Guard your tongue',
          description: 'Before speaking about someone, ask: Is it true? Is it necessary? Is it kind?',
          frequency: 'daily' as const,
          difficultyLevel: 'moderate' as const,
          estimatedDuration: '1 minute',
        },
        {
          title: 'Defend the absent',
          description: 'When someone speaks ill of others, defend them or change the topic',
          frequency: 'daily' as const,
          difficultyLevel: 'challenging' as const,
          estimatedDuration: '2 minutes',
        }
      ],
      content: [
        {
          type: 'hadith' as const,
          text: 'Backbiting is mentioning about your brother that which he dislikes.',
          ref: 'Muslim',
          tags: ['backbiting', 'speech', 'brother']
        }
      ]
    },
    suspicion: {
      tags: ['suspicion', 'trust', 'good-opinion', 'husn-zann'],
      severity: 'moderate',
      habits: [
        {
          title: 'Assume good intentions',
          description: 'When in doubt about someone\'s actions, assume the best possible motive',
          frequency: 'daily' as const,
          difficultyLevel: 'moderate' as const,
          estimatedDuration: '1 minute',
        },
        {
          title: 'Verify before believing',
          description: 'If you hear something concerning about someone, verify it before accepting it',
          frequency: 'daily' as const,
          difficultyLevel: 'moderate' as const,
          estimatedDuration: '5 minutes',
        }
      ],
      content: [
        {
          type: 'ayah' as const,
          text: 'O you who believe! Avoid much suspicion, indeed some suspicions are sins.',
          ref: 'Quran 49:12',
          tags: ['suspicion', 'sin', 'avoid']
        }
      ]
    },
    loveOfDunya: {
      tags: ['dunya', 'materialism', 'detachment', 'zuhd'],
      severity: 'moderate',
      habits: [
        {
          title: 'Daily gratitude practice',
          description: 'List 3 non-material blessings you are grateful for each day',
          frequency: 'daily' as const,
          difficultyLevel: 'easy' as const,
          estimatedDuration: '5 minutes',
        },
        {
          title: 'Charity practice',
          description: 'Give something small in charity daily to detach from material possessions',
          frequency: 'daily' as const,
          difficultyLevel: 'moderate' as const,
          estimatedDuration: '5 minutes',
        }
      ],
      content: [
        {
          type: 'hadith' as const,
          text: 'The world is green and beautiful, and Allah has appointed you as His stewards over it.',
          ref: 'Muslim',
          tags: ['dunya', 'stewardship', 'responsibility']
        }
      ]
    },
    laziness: {
      tags: ['laziness', 'productivity', 'worship', 'energy'],
      severity: 'moderate',
      habits: [
        {
          title: 'Early rising for Fajr',
          description: 'Wake up 15 minutes before Fajr prayer time for preparation and dhikr',
          frequency: 'daily' as const,
          difficultyLevel: 'moderate' as const,
          estimatedDuration: '15 minutes',
        },
        {
          title: 'Set daily intentions',
          description: 'After Fajr, set 3 specific intentions for beneficial actions throughout the day',
          frequency: 'daily' as const,
          difficultyLevel: 'easy' as const,
          estimatedDuration: '5 minutes',
        }
      ],
      content: [
        {
          type: 'hadith' as const,
          text: 'Allah loves, when one of you does a job, that he does it with excellence.',
          ref: 'Bayhaqi',
          tags: ['excellence', 'work', 'ihsan']
        }
      ]
    },
    despair: {
      tags: ['despair', 'hope', 'trust', 'tawakkul'],
      severity: 'high',
      habits: [
        {
          title: 'Hope in Allah\'s mercy',
          description: 'When feeling hopeless, recite "La hawla wa la quwwata illa billah"',
          frequency: 'daily' as const,
          difficultyLevel: 'easy' as const,
          estimatedDuration: '2 minutes',
        },
        {
          title: 'Study stories of hope',
          description: 'Read one story of divine mercy or relief after hardship',
          frequency: 'daily' as const,
          difficultyLevel: 'easy' as const,
          estimatedDuration: '10 minutes',
        }
      ],
      content: [
        {
          type: 'ayah' as const,
          text: 'And whoever relies upon Allah - then He is sufficient for him. Indeed, Allah will accomplish His purpose.',
          ref: 'Quran 65:3',
          tags: ['trust', 'reliance', 'sufficiency']
        }
      ]
    }
  };

  async generatePersonalizedHabits(params: SurveyGenerationParams): Promise<PersonalizedHabit[]> {
    const { diseaseScores, reflectionAnswers } = params;
    const habits: PersonalizedHabit[] = [];

    // Identify critical and high-priority diseases (scores 4-5)
    const criticalDiseases = Object.entries(diseaseScores)
      .filter(([_, score]) => score >= 4)
      .map(([disease, _]) => disease as Disease)
      .sort((a, b) => diseaseScores[b] - diseaseScores[a]); // Sort by score descending

    // Identify moderate diseases (score 3)
    const moderateDiseases = Object.entries(diseaseScores)
      .filter(([_, score]) => score === 3)
      .map(([disease, _]) => disease as Disease);

    // Generate habits for critical diseases (limit to top 3 for focus)
    const topCriticalDiseases = criticalDiseases.slice(0, 3);

    for (const disease of topCriticalDiseases) {
      const diseaseMapping = this.DISEASE_PRIORITY_MAPPINGS[disease];
      if (!diseaseMapping) continue;

      // Fetch Islamic content for this disease from the database
      const islamicContentResult = await this.getIslamicContentForDisease(disease);
      const islamicContent = Result.isOk(islamicContentResult) ? islamicContentResult.value : [];

      // Generate 2-3 habits per critical disease
      const diseaseHabits = diseaseMapping.habits.slice(0, 3).map(habit => {
        const personalizedHabit: PersonalizedHabit = {
          id: uuidv4(),
          title: habit.title,
          description: this.personalizeHabitDescription(habit.description, reflectionAnswers, disease),
          frequency: habit.frequency,
          targetDisease: disease,
          difficultyLevel: habit.difficultyLevel,
          estimatedDuration: habit.estimatedDuration,
          islamicContent
        };
        return personalizedHabit;
      });

      habits.push(...diseaseHabits);
    }

    // Add 1 habit for each moderate disease (if we have room)
    const remainingSlots = Math.max(0, 10 - habits.length); // Limit total habits to ~10
    const moderateHabitsToAdd = moderateDiseases.slice(0, remainingSlots);

    for (const disease of moderateHabitsToAdd) {
      const diseaseMapping = this.DISEASE_PRIORITY_MAPPINGS[disease];
      if (!diseaseMapping || diseaseMapping.habits.length === 0) continue;

      // Fetch Islamic content for this disease from the database
      const islamicContentResult = await this.getIslamicContentForDisease(disease);
      const islamicContent = Result.isOk(islamicContentResult) ? islamicContentResult.value : [];

      // Take the easiest habit for moderate diseases
      const habit = diseaseMapping.habits.find(h => h.difficultyLevel === 'easy') || diseaseMapping.habits[0];

      const personalizedHabit: PersonalizedHabit = {
        id: uuidv4(),
        title: habit.title,
        description: this.personalizeHabitDescription(habit.description, reflectionAnswers, disease),
        frequency: habit.frequency,
        targetDisease: disease,
        difficultyLevel: habit.difficultyLevel,
        estimatedDuration: habit.estimatedDuration,
        islamicContent
      };

      habits.push(personalizedHabit);
    }

    return habits;
  }

  async generateTazkiyahPlan(params: SurveyGenerationParams): Promise<TazkiyahPlan> {
    const { diseaseScores, reflectionAnswers, userProfile } = params;

    // Identify critical diseases (scores 4-5) for the Tazkiyah plan focus
    const criticalDiseases = Object.entries(diseaseScores)
      .filter(([_, score]) => score >= 4)
      .map(([disease, _]) => disease as Disease)
      .sort((a, b) => diseaseScores[b] - diseaseScores[a]);

    // If no critical diseases, focus on highest moderate diseases
    const focusDiseases = criticalDiseases.length > 0
      ? criticalDiseases.slice(0, 3) // Focus on top 3 critical diseases
      : Object.entries(diseaseScores)
          .filter(([_, score]) => score >= 3)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 2)
          .map(([disease, _]) => disease as Disease);

    const phases = await this.generateTazkiyahPhases(focusDiseases, reflectionAnswers);
    const milestones = this.generatePlanMilestones(focusDiseases, phases.length);

    const tazkiyahPlan: TazkiyahPlan = {
      criticalDiseases: focusDiseases,
      planType: 'takhliyah', // Focus on purification from negative traits
      phases,
      expectedDuration: this.calculateExpectedDuration(focusDiseases.length, phases.length),
      milestones
    };

    return tazkiyahPlan;
  }

  private personalizeHabitDescription(
    baseDescription: string,
    reflectionAnswers: ReflectionAnswers,
    targetDisease: Disease
  ): string {
    // Add personalization based on reflection answers
    let personalized = baseDescription;

    // If the habit targets their strongest struggle, add encouragement
    if (reflectionAnswers.strongestStruggle.toLowerCase().includes(targetDisease.toLowerCase())) {
      personalized += ` This directly addresses your identified struggle with ${targetDisease}.`;
    }

    // If they mentioned wanting to develop a related habit, connect it
    const dailyHabitLower = reflectionAnswers.dailyHabit.toLowerCase();
    if (dailyHabitLower.includes('prayer') && baseDescription.includes('prayer')) {
      personalized += ' This aligns with your desire to strengthen your prayer practice.';
    } else if (dailyHabitLower.includes('dhikr') && baseDescription.includes('dhikr')) {
      personalized += ' This supports your goal to increase remembrance of Allah.';
    }

    return personalized;
  }

  private async generateTazkiyahPhases(
    focusDiseases: Disease[],
    reflectionAnswers: ReflectionAnswers
  ): Promise<TazkiyahPhase[]> {
    const phases: TazkiyahPhase[] = [];

    // Phase 1: Foundation - Awareness and Recognition (First 2 weeks)
    phases.push({
      phaseNumber: 1,
      title: 'Awareness and Recognition',
      description: 'Developing consciousness of spiritual diseases and building foundation for change',
      targetDiseases: focusDiseases,
      duration: '2 weeks',
      practices: [
        {
          name: 'Daily Self-Accountability (Muhasabah)',
          type: 'reflection',
          description: 'Before Maghrib, spend 10 minutes reviewing your day for instances of target diseases',
          frequency: 'Daily after Asr',
          islamicBasis: [{
            id: uuidv4(),
            type: 'hadith',
            text: 'Take account of yourselves before you are taken to account.',
            ref: 'Umar ibn al-Khattab',
            tags: ['muhasabah', 'self-accountability'],
            createdAt: new Date().toISOString()
          }]
        },
        {
          name: 'Morning Dhikr for Protection',
          type: 'dhikr',
          description: 'Recite morning adhkar focusing on seeking refuge from spiritual diseases',
          frequency: 'Daily after Fajr',
          islamicBasis: [{
            id: uuidv4(),
            type: 'dua',
            text: 'A\'udhu billahi min ash-shaytani\'r-rajim',
            ref: 'Quran',
            tags: ['protection', 'dhikr'],
            createdAt: new Date().toISOString()
          }]
        }
      ],
      checkpoints: [
        'Can identify when target diseases manifest during the day',
        'Established daily muhasabah routine',
        'Completed morning dhikr for 10 consecutive days'
      ]
    });

    // Phase 2: Active Purification (Weeks 3-6)
    phases.push({
      phaseNumber: 2,
      title: 'Active Purification (Takhliyah)',
      description: 'Actively working to remove and reduce the identified spiritual diseases',
      targetDiseases: focusDiseases,
      duration: '4 weeks',
      practices: await this.generatePhase2Practices(focusDiseases),
      checkpoints: [
        'Notice reduction in frequency of target diseases',
        'Can catch and correct yourself in real-time',
        'Others notice positive changes in your character',
        'Completed 75% of planned practices'
      ]
    });

    // Phase 3: Virtue Cultivation (Weeks 7-10)
    phases.push({
      phaseNumber: 3,
      title: 'Virtue Cultivation (Tahliyah)',
      description: 'Building positive spiritual qualities to replace the removed diseases',
      targetDiseases: [],
      duration: '4 weeks',
      practices: [
        {
          name: 'Gratitude Practice',
          type: 'reflection',
          description: 'Daily gratitude journaling and dhikr to cultivate contentment',
          frequency: 'Daily before sleep',
          islamicBasis: [{
            id: uuidv4(),
            type: 'ayah',
            text: 'And if you should count the favors of Allah, you could not enumerate them.',
            ref: 'Quran 16:18',
            tags: ['gratitude', 'blessings'],
            createdAt: new Date().toISOString()
          }]
        },
        {
          name: 'Service to Others',
          type: 'behavioral',
          description: 'Weekly acts of service to family and community',
          frequency: 'Weekly',
          islamicBasis: [{
            id: uuidv4(),
            type: 'hadith',
            text: 'The best of people are those who benefit others.',
            ref: 'Ahmad',
            tags: ['service', 'community'],
            createdAt: new Date().toISOString()
          }]
        }
      ],
      checkpoints: [
        'Established positive spiritual habits',
        'Others seek your advice on spiritual matters',
        'Feel genuine contentment and peace',
        'Ready to help others with similar struggles'
      ]
    });

    return phases;
  }

  private async generatePhase2Practices(focusDiseases: Disease[]): Promise<Practice[]> {
    const practices: Practice[] = [];

    for (const disease of focusDiseases) {
      const diseaseMapping = this.DISEASE_PRIORITY_MAPPINGS[disease];
      if (!diseaseMapping) continue;

      // Fetch Islamic content for this disease
      const islamicContentResult = await this.getIslamicContentForDisease(disease);
      const islamicContent = Result.isOk(islamicContentResult) ? islamicContentResult.value : [];

      // Convert the first 2 habits to practices
      const habitPractices = diseaseMapping.habits.slice(0, 2).map(habit => ({
        name: habit.title,
        type: 'behavioral' as const,
        description: habit.description,
        frequency: habit.frequency === 'daily' ? 'Daily' : 'Weekly',
        islamicBasis: islamicContent
      }));

      practices.push(...habitPractices);
    }

    return practices;
  }

  private generatePlanMilestones(
    focusDiseases: Disease[],
    phaseCount: number
  ): PlanMilestone[] {
    const milestones: PlanMilestone[] = [];
    const now = new Date();

    // Week 1 milestone
    milestones.push({
      id: uuidv4(),
      title: 'Self-Awareness Established',
      description: 'Successfully identified patterns and triggers for target spiritual diseases',
      targetDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      completed: false
    });

    // Month 1 milestone
    milestones.push({
      id: uuidv4(),
      title: 'Active Purification Initiated',
      description: `Began systematic work on removing ${focusDiseases.join(', ')} from daily life`,
      targetDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      completed: false
    });

    // Month 2 milestone
    milestones.push({
      id: uuidv4(),
      title: 'Character Transformation Visible',
      description: 'Others notice positive changes in character and spiritual state',
      targetDate: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      completed: false
    });

    // Final milestone
    milestones.push({
      id: uuidv4(),
      title: 'Spiritual Development Plan Completed',
      description: 'Successfully completed all phases of Tazkiyah plan and ready for advanced practices',
      targetDate: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      completed: false
    });

    return milestones;
  }

  private calculateExpectedDuration(diseaseCount: number, phaseCount: number): string {
    // Base duration: 2-3 months for thorough Tazkiyah work
    const baseWeeks = 10;
    const additionalWeeks = Math.max(0, diseaseCount - 2) * 2; // Add 2 weeks per additional disease
    const totalWeeks = baseWeeks + additionalWeeks;

    if (totalWeeks <= 12) {
      return `${Math.ceil(totalWeeks / 4)} months`;
    } else {
      return `${Math.ceil(totalWeeks / 4)}-${Math.ceil((totalWeeks + 4) / 4)} months`;
    }
  }

  /**
   * Fetches Islamic content (verses, hadith, duas) related to a specific spiritual disease
   * @param disease The spiritual disease to get content for
   * @returns Array of relevant Islamic content snippets
   */
  private async getIslamicContentForDisease(disease: Disease): Promise<Result<ContentSnippet[]>> {
    try {
      const diseaseMapping = this.DISEASE_PRIORITY_MAPPINGS[disease];
      if (!diseaseMapping) {
        return Result.ok([]);
      }

      // Get content by tags associated with this disease
      const contentResult = await this.contentRepository.findByTags(diseaseMapping.tags);

      if (Result.isError(contentResult)) {
        // Fallback to predefined content if database fails
        return Result.ok(diseaseMapping.content.map(content => ({
          id: uuidv4(),
          ...content,
          createdAt: new Date().toISOString()
        })));
      }

      const databaseContent = contentResult.value;

      // If we have database content, use it; otherwise fallback to predefined
      if (databaseContent.length > 0) {
        // Limit to 3-4 most relevant pieces
        return Result.ok(databaseContent.slice(0, 4));
      } else {
        // Use predefined content as fallback
        return Result.ok(diseaseMapping.content.map(content => ({
          id: uuidv4(),
          ...content,
          createdAt: new Date().toISOString()
        })));
      }
    } catch (error) {
      // Return predefined content on error
      const diseaseMapping = this.DISEASE_PRIORITY_MAPPINGS[disease];
      const fallbackContent = diseaseMapping?.content || [];

      return Result.ok(fallbackContent.map(content => ({
        id: uuidv4(),
        ...content,
        createdAt: new Date().toISOString()
      })));
    }
  }
}