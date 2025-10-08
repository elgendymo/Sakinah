import { describe, it, expect } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import { SurveyResult, Disease, LikertScore, PersonalizedHabit, TazkiyahPlan } from '@/domain/entities/SurveyResult';

const testIds = {
  user1: uuidv4(),
  result1: uuidv4(),
  habit1: uuidv4(),
};

describe('SurveyResult', () => {
  const mockDiseaseScores: Record<Disease, LikertScore> = {
    envy: 4,
    arrogance: 5,
    selfDeception: 3,
    lust: 2,
    anger: 4,
    malice: 1,
    backbiting: 3,
    suspicion: 2,
    loveOfDunya: 5,
    laziness: 3,
    despair: 1
  };

  const mockReflectionAnswers = {
    strongestStruggle: 'I struggle most with controlling my anger and pride',
    dailyHabit: 'I want to develop a habit of daily dhikr after each prayer'
  };

  const mockPersonalizedHabits: PersonalizedHabit[] = [
    {
      id: testIds.habit1,
      title: 'Morning Dhikr',
      description: 'Recite Asma al-Husna after Fajr prayer',
      frequency: 'daily',
      targetDisease: 'anger',
      difficultyLevel: 'easy',
      estimatedDuration: '10 minutes',
      islamicContentIds: ['content-1', 'content-2']
    }
  ];

  const mockTazkiyahPlan: TazkiyahPlan = {
    criticalDiseases: ['envy', 'arrogance', 'anger', 'loveOfDunya'],
    planType: 'takhliyah',
    phases: [
      {
        phaseNumber: 1,
        title: 'Self-Awareness Phase',
        description: 'Building awareness of negative traits',
        targetDiseases: ['envy', 'arrogance'],
        duration: '2 weeks',
        practices: [
          {
            name: 'Daily reflection',
            type: 'reflection',
            description: 'Reflect on instances of envy and pride',
            frequency: 'daily',
            islamicContentIds: ['content-3']
          }
        ],
        checkpoints: ['Complete daily reflections', 'Identify triggers']
      }
    ],
    expectedDuration: '3 months',
    milestones: [
      {
        id: 'milestone-1',
        title: 'Complete Phase 1',
        description: 'Successfully complete self-awareness phase',
        targetDate: new Date('2024-04-15'),
        completed: false
      }
    ]
  };

  describe('create', () => {
    it('should create a new survey result with valid parameters', () => {
      const result = SurveyResult.create({
        userId: testIds.user1,
        diseaseScores: mockDiseaseScores,
        reflectionAnswers: mockReflectionAnswers,
        personalizedHabits: mockPersonalizedHabits,
        tazkiyahPlan: mockTazkiyahPlan
      });

      expect(result.userId.toString()).toBe(testIds.user1);
      expect(result.diseaseScores.size).toBe(11);
      expect(result.criticalDiseases).toEqual(['envy', 'arrogance', 'anger', 'loveOfDunya']);
      expect(result.reflectionAnswers).toEqual(mockReflectionAnswers);
      expect(result.personalizedHabits).toHaveLength(1);
      expect(result.generatedAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should identify critical diseases (scores 4-5)', () => {
      const result = SurveyResult.create({
        userId: testIds.user1,
        diseaseScores: mockDiseaseScores,
        reflectionAnswers: mockReflectionAnswers,
        personalizedHabits: mockPersonalizedHabits,
        tazkiyahPlan: mockTazkiyahPlan
      });

      const criticalDiseases = result.criticalDiseases;
      expect(criticalDiseases).toContain('envy'); // score 4
      expect(criticalDiseases).toContain('arrogance'); // score 5
      expect(criticalDiseases).toContain('anger'); // score 4
      expect(criticalDiseases).toContain('loveOfDunya'); // score 5
      expect(criticalDiseases).not.toContain('selfDeception'); // score 3
      expect(criticalDiseases).not.toContain('lust'); // score 2
    });

    it('should throw error for invalid reflection answers - too short', () => {
      expect(() => {
        SurveyResult.create({
          userId: testIds.user1,
          diseaseScores: mockDiseaseScores,
          reflectionAnswers: {
            strongestStruggle: 'short', // less than 10 characters
            dailyHabit: mockReflectionAnswers.dailyHabit
          },
          personalizedHabits: mockPersonalizedHabits,
          tazkiyahPlan: mockTazkiyahPlan
        });
      }).toThrow('Strongest struggle must be at least 10 characters');
    });

    it('should throw error for reflection answers too long', () => {
      const longText = 'a'.repeat(501);
      expect(() => {
        SurveyResult.create({
          userId: testIds.user1,
          diseaseScores: mockDiseaseScores,
          reflectionAnswers: {
            strongestStruggle: longText,
            dailyHabit: mockReflectionAnswers.dailyHabit
          },
          personalizedHabits: mockPersonalizedHabits,
          tazkiyahPlan: mockTazkiyahPlan
        });
      }).toThrow('Strongest struggle cannot exceed 500 characters');
    });

    it('should throw error for daily habit too short', () => {
      expect(() => {
        SurveyResult.create({
          userId: testIds.user1,
          diseaseScores: mockDiseaseScores,
          reflectionAnswers: {
            strongestStruggle: mockReflectionAnswers.strongestStruggle,
            dailyHabit: 'short' // less than 10 characters
          },
          personalizedHabits: mockPersonalizedHabits,
          tazkiyahPlan: mockTazkiyahPlan
        });
      }).toThrow('Daily habit must be at least 10 characters');
    });
  });

  describe('disease categorization', () => {
    let result: SurveyResult;

    beforeEach(() => {
      result = SurveyResult.create({
        userId: testIds.user1,
        diseaseScores: mockDiseaseScores,
        reflectionAnswers: mockReflectionAnswers,
        personalizedHabits: mockPersonalizedHabits,
        tazkiyahPlan: mockTazkiyahPlan
      });
    });

    it('should categorize diseases correctly', () => {
      const categorized = result.getCategorizedDiseases();

      expect(categorized.critical).toEqual(['envy', 'arrogance', 'anger', 'loveOfDunya']);
      expect(categorized.moderate).toEqual(['selfDeception', 'backbiting', 'laziness']);
      expect(categorized.strengths).toEqual(['lust', 'malice', 'suspicion', 'despair']);
    });

    it('should get moderate diseases (score 3)', () => {
      const moderate = result.moderateDiseases;
      expect(moderate).toContain('selfDeception');
      expect(moderate).toContain('backbiting');
      expect(moderate).toContain('laziness');
      expect(moderate).toHaveLength(3);
    });

    it('should get strengths (scores 1-2)', () => {
      const strengths = result.strengths;
      expect(strengths).toContain('lust'); // score 2
      expect(strengths).toContain('malice'); // score 1
      expect(strengths).toContain('suspicion'); // score 2
      expect(strengths).toContain('despair'); // score 1
      expect(strengths).toHaveLength(4);
    });

    it('should get score for specific disease', () => {
      expect(result.getScoreForDisease('envy')).toBe(4);
      expect(result.getScoreForDisease('arrogance')).toBe(5);
      expect(result.getScoreForDisease('malice')).toBe(1);
    });
  });

  describe('addPersonalizedHabit', () => {
    it('should add a new personalized habit', () => {
      const result = SurveyResult.create({
        userId: testIds.user1,
        diseaseScores: mockDiseaseScores,
        reflectionAnswers: mockReflectionAnswers,
        personalizedHabits: [],
        tazkiyahPlan: mockTazkiyahPlan
      });

      const newHabit: PersonalizedHabit = {
        id: 'habit-2',
        title: 'Evening Istighfar',
        description: 'Seek forgiveness 100 times before sleep',
        frequency: 'daily',
        targetDisease: 'arrogance',
        difficultyLevel: 'moderate',
        estimatedDuration: '15 minutes',
        islamicContentIds: ['content-4']
      };

      result.addPersonalizedHabit(newHabit);

      expect(result.personalizedHabits).toHaveLength(1);
      expect(result.personalizedHabits[0]).toEqual(newHabit);
    });

    it('should throw error when adding habit with duplicate ID', () => {
      const result = SurveyResult.create({
        userId: testIds.user1,
        diseaseScores: mockDiseaseScores,
        reflectionAnswers: mockReflectionAnswers,
        personalizedHabits: mockPersonalizedHabits,
        tazkiyahPlan: mockTazkiyahPlan
      });

      const duplicateHabit: PersonalizedHabit = {
        id: testIds.habit1, // same ID as existing habit
        title: 'Duplicate Habit',
        description: 'This should fail',
        frequency: 'daily',
        targetDisease: 'anger',
        difficultyLevel: 'easy',
        estimatedDuration: '5 minutes',
        islamicContentIds: []
      };

      expect(() => {
        result.addPersonalizedHabit(duplicateHabit);
      }).toThrow('Habit with this ID already exists');
    });
  });

  describe('toDTO', () => {
    it('should serialize survey result to DTO format', () => {
      const generatedAt = new Date('2024-01-15T10:00:00Z');
      const updatedAt = new Date('2024-01-15T10:30:00Z');

      const result = SurveyResult.create({
        id: testIds.result1,
        userId: testIds.user1,
        diseaseScores: mockDiseaseScores,
        reflectionAnswers: mockReflectionAnswers,
        personalizedHabits: mockPersonalizedHabits,
        tazkiyahPlan: mockTazkiyahPlan,
        generatedAt,
        updatedAt
      });

      const dto = result.toDTO();

      expect(dto.id).toBe(testIds.result1);
      expect(dto.userId).toBe(testIds.user1);
      expect(dto.diseaseScores).toEqual(mockDiseaseScores);
      expect(dto.categorizedDiseases.critical).toEqual(['envy', 'arrogance', 'anger', 'loveOfDunya']);
      expect(dto.reflectionAnswers).toEqual(mockReflectionAnswers);
      expect(dto.personalizedHabits).toEqual(mockPersonalizedHabits);
      expect(dto.tazkiyahPlan).toEqual(mockTazkiyahPlan);
      expect(dto.generatedAt).toBe(generatedAt.toISOString());
      expect(dto.updatedAt).toBe(updatedAt.toISOString());
    });
  });
});