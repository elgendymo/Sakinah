import { describe, it, expect, beforeEach } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import { SurveyProgress } from '@/domain/entities/SurveyProgress';

const testIds = {
  user1: uuidv4(),
};

describe('SurveyProgress', () => {
  describe('create', () => {
    it('should create new survey progress with default values', () => {
      const progress = SurveyProgress.create({
        userId: testIds.user1
      });

      expect(progress.userId.toString()).toBe(testIds.user1);
      expect(progress.currentPhase).toBe(0);
      expect(progress.phase1Completed).toBe(false);
      expect(progress.phase2Completed).toBe(false);
      expect(progress.reflectionCompleted).toBe(false);
      expect(progress.resultsGenerated).toBe(false);
      expect(progress.isCompleted).toBe(false);
      expect(progress.progressPercentage).toBe(0);
      expect(progress.startedAt).toBeInstanceOf(Date);
      expect(progress.lastUpdated).toBeInstanceOf(Date);
    });

    it('should create survey progress with custom values', () => {
      const startedAt = new Date('2024-01-15T09:00:00Z');
      const lastUpdated = new Date('2024-01-15T10:00:00Z');

      const progress = SurveyProgress.create({
        userId: testIds.user1,
        currentPhase: 2,
        phase1Completed: true,
        phase2Completed: false,
        reflectionCompleted: false,
        resultsGenerated: false,
        startedAt,
        lastUpdated
      });

      expect(progress.currentPhase).toBe(2);
      expect(progress.phase1Completed).toBe(true);
      expect(progress.startedAt).toEqual(startedAt);
      expect(progress.lastUpdated).toEqual(lastUpdated);
    });

    it('should throw error for invalid phase number', () => {
      expect(() => {
        SurveyProgress.create({
          userId: testIds.user1,
          currentPhase: -1
        });
      }).toThrow('Current phase must be between 0 and 4');

      expect(() => {
        SurveyProgress.create({
          userId: testIds.user1,
          currentPhase: 5
        });
      }).toThrow('Current phase must be between 0 and 4');
    });
  });

  describe('createNew', () => {
    it('should create new survey progress for user', () => {
      const progress = SurveyProgress.createNew(testIds.user1);

      expect(progress.userId.toString()).toBe(testIds.user1);
      expect(progress.currentPhase).toBe(0);
      expect(progress.phase1Completed).toBe(false);
      expect(progress.startedAt).toBeInstanceOf(Date);
    });
  });

  describe('phase progression', () => {
    let progress: SurveyProgress;

    beforeEach(() => {
      progress = SurveyProgress.createNew(testIds.user1);
    });

    describe('advanceToPhase1', () => {
      it('should advance from welcome to phase 1', () => {
        progress.advanceToPhase1();

        expect(progress.currentPhase).toBe(1);
        expect(progress.lastUpdated).toBeInstanceOf(Date);
      });

      it('should throw error if not in welcome phase', () => {
        progress.advanceToPhase1();

        expect(() => {
          progress.advanceToPhase1();
        }).toThrow('Can only advance to Phase 1 from welcome phase');
      });
    });

    describe('completePhase1', () => {
      beforeEach(() => {
        progress.advanceToPhase1();
      });

      it('should complete phase 1 and advance to phase 2', () => {
        progress.completePhase1();

        expect(progress.phase1Completed).toBe(true);
        expect(progress.currentPhase).toBe(2);
        expect(progress.progressPercentage).toBe(25);
      });

      it('should throw error if not in phase 1', () => {
        const newProgress = SurveyProgress.createNew(testIds.user1);

        expect(() => {
          newProgress.completePhase1();
        }).toThrow('Must be in Phase 1 to complete it');
      });

      it('should throw error if phase 1 already completed', () => {
        progress.completePhase1();

        expect(() => {
          progress.completePhase1();
        }).toThrow('Phase 1 is already completed');
      });
    });

    describe('completePhase2', () => {
      beforeEach(() => {
        progress.advanceToPhase1();
        progress.completePhase1();
      });

      it('should complete phase 2 and advance to reflection', () => {
        progress.completePhase2();

        expect(progress.phase2Completed).toBe(true);
        expect(progress.currentPhase).toBe(3);
        expect(progress.progressPercentage).toBe(50);
      });

      it('should throw error if not in phase 2', () => {
        const newProgress = SurveyProgress.createNew(testIds.user1);

        expect(() => {
          newProgress.completePhase2();
        }).toThrow('Must be in Phase 2 to complete it');
      });

      it('should throw error if phase 1 not completed', () => {
        const newProgress = SurveyProgress.create({
          userId: testIds.user1,
          currentPhase: 2,
          phase1Completed: false
        });

        expect(() => {
          newProgress.completePhase2();
        }).toThrow('Phase 1 must be completed before Phase 2');
      });

      it('should throw error if phase 2 already completed', () => {
        progress.completePhase2();

        expect(() => {
          progress.completePhase2();
        }).toThrow('Phase 2 is already completed');
      });
    });

    describe('completeReflection', () => {
      beforeEach(() => {
        progress.advanceToPhase1();
        progress.completePhase1();
        progress.completePhase2();
      });

      it('should complete reflection and advance to results', () => {
        progress.completeReflection();

        expect(progress.reflectionCompleted).toBe(true);
        expect(progress.currentPhase).toBe(4);
        expect(progress.progressPercentage).toBe(75);
      });

      it('should throw error if not in reflection phase', () => {
        const newProgress = SurveyProgress.createNew(testIds.user1);

        expect(() => {
          newProgress.completeReflection();
        }).toThrow('Must be in reflection phase to complete it');
      });

      it('should throw error if phase 2 not completed', () => {
        const newProgress = SurveyProgress.create({
          userId: testIds.user1,
          currentPhase: 3,
          phase2Completed: false
        });

        expect(() => {
          newProgress.completeReflection();
        }).toThrow('Phase 2 must be completed before reflection');
      });

      it('should throw error if reflection already completed', () => {
        progress.completeReflection();

        expect(() => {
          progress.completeReflection();
        }).toThrow('Reflection is already completed');
      });
    });

    describe('generateResults', () => {
      beforeEach(() => {
        progress.advanceToPhase1();
        progress.completePhase1();
        progress.completePhase2();
        progress.completeReflection();
      });

      it('should generate results and complete survey', () => {
        progress.generateResults();

        expect(progress.resultsGenerated).toBe(true);
        expect(progress.isCompleted).toBe(true);
        expect(progress.progressPercentage).toBe(100);
      });

      it('should throw error if not in results phase', () => {
        const newProgress = SurveyProgress.createNew(testIds.user1);

        expect(() => {
          newProgress.generateResults();
        }).toThrow('Must be in results phase to generate results');
      });

      it('should throw error if reflection not completed', () => {
        const newProgress = SurveyProgress.create({
          userId: testIds.user1,
          currentPhase: 4,
          reflectionCompleted: false
        });

        expect(() => {
          newProgress.generateResults();
        }).toThrow('Reflection must be completed before generating results');
      });

      it('should throw error if results already generated', () => {
        progress.generateResults();

        expect(() => {
          progress.generateResults();
        }).toThrow('Results are already generated');
      });
    });
  });

  describe('canAdvanceToPhase', () => {
    let progress: SurveyProgress;

    beforeEach(() => {
      progress = SurveyProgress.createNew(testIds.user1);
    });

    it('should allow advancement to phase 1 from welcome', () => {
      expect(progress.canAdvanceToPhase(1)).toBe(true);
      expect(progress.canAdvanceToPhase(2)).toBe(false);
    });

    it('should allow advancement to phase 2 after completing phase 1', () => {
      progress.advanceToPhase1();
      progress.completePhase1();

      expect(progress.canAdvanceToPhase(2)).toBe(true);
      expect(progress.canAdvanceToPhase(3)).toBe(false);
    });

    it('should allow advancement to reflection after completing phase 2', () => {
      progress.advanceToPhase1();
      progress.completePhase1();
      progress.completePhase2();

      expect(progress.canAdvanceToPhase(3)).toBe(true);
      expect(progress.canAdvanceToPhase(4)).toBe(false);
    });

    it('should allow advancement to results after completing reflection', () => {
      progress.advanceToPhase1();
      progress.completePhase1();
      progress.completePhase2();
      progress.completeReflection();

      expect(progress.canAdvanceToPhase(4)).toBe(true);
    });
  });

  describe('getNextAvailablePhase', () => {
    it('should return correct next available phase', () => {
      const progress = SurveyProgress.createNew(testIds.user1);

      expect(progress.getNextAvailablePhase()).toBe(1);

      progress.advanceToPhase1();
      progress.completePhase1();
      expect(progress.getNextAvailablePhase()).toBe(2);

      progress.completePhase2();
      expect(progress.getNextAvailablePhase()).toBe(3);

      progress.completeReflection();
      expect(progress.getNextAvailablePhase()).toBe(4);

      progress.generateResults();
      expect(progress.getNextAvailablePhase()).toBe(4); // Survey completed
    });
  });

  describe('reset', () => {
    it('should reset all progress to initial state', () => {
      const progress = SurveyProgress.createNew(testIds.user1);
      progress.advanceToPhase1();
      progress.completePhase1();
      progress.completePhase2();

      progress.reset();

      expect(progress.currentPhase).toBe(0);
      expect(progress.phase1Completed).toBe(false);
      expect(progress.phase2Completed).toBe(false);
      expect(progress.reflectionCompleted).toBe(false);
      expect(progress.resultsGenerated).toBe(false);
      expect(progress.progressPercentage).toBe(0);
    });
  });

  describe('toDTO', () => {
    it('should serialize survey progress to DTO format', () => {
      const startedAt = new Date('2024-01-15T09:00:00Z');
      const lastUpdated = new Date('2024-01-15T10:00:00Z');

      const progress = SurveyProgress.create({
        userId: testIds.user1,
        currentPhase: 2,
        phase1Completed: true,
        phase2Completed: false,
        reflectionCompleted: false,
        resultsGenerated: false,
        startedAt,
        lastUpdated
      });

      const dto = progress.toDTO();

      expect(dto).toMatchObject({
        userId: testIds.user1,
        currentPhase: 2,
        phase1Completed: true,
        phase2Completed: false,
        reflectionCompleted: false,
        resultsGenerated: false,
        isCompleted: false,
        progressPercentage: 25,
        nextAvailablePhase: 2,
        startedAt: startedAt.toISOString(),
        lastUpdated: lastUpdated.toISOString()
      });
    });
  });
});