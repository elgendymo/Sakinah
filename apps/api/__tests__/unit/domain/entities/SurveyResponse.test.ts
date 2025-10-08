import { describe, it, expect } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import { SurveyResponse } from '@/domain/entities/SurveyResponse';
import { QuestionResponse } from '@/domain/value-objects/QuestionResponse';

const testIds = {
  user1: uuidv4(),
  response1: uuidv4(),
};

describe('SurveyResponse', () => {
  describe('create', () => {
    it('should create a new survey response with valid parameters', () => {
      const response = SurveyResponse.create({
        userId: testIds.user1,
        phaseNumber: 1,
        questionId: 'envy',
        score: 4,
        note: 'I sometimes feel envious of others'
      });

      expect(response.userId.toString()).toBe(testIds.user1);
      expect(response.phaseNumber).toBe(1);
      expect(response.questionId).toBe('envy');
      expect(response.score).toBe(4);
      expect(response.note).toBe('I sometimes feel envious of others');
      expect(response.completedAt).toBeInstanceOf(Date);
      expect(response.createdAt).toBeInstanceOf(Date);
    });

    it('should create survey response without note', () => {
      const response = SurveyResponse.create({
        userId: testIds.user1,
        phaseNumber: 2,
        questionId: 'anger',
        score: 2
      });

      expect(response.note).toBeUndefined();
    });

    it('should throw error for invalid phase number', () => {
      expect(() => {
        SurveyResponse.create({
          userId: testIds.user1,
          phaseNumber: 0,
          questionId: 'envy',
          score: 3
        });
      }).toThrow('Phase number must be between 1 and 3');

      expect(() => {
        SurveyResponse.create({
          userId: testIds.user1,
          phaseNumber: 4,
          questionId: 'envy',
          score: 3
        });
      }).toThrow('Phase number must be between 1 and 3');
    });

    it('should throw error for invalid score', () => {
      expect(() => {
        SurveyResponse.create({
          userId: testIds.user1,
          phaseNumber: 1,
          questionId: 'envy',
          score: 0
        });
      }).toThrow('Score must be between 1 and 5');

      expect(() => {
        SurveyResponse.create({
          userId: testIds.user1,
          phaseNumber: 1,
          questionId: 'envy',
          score: 6
        });
      }).toThrow('Score must be between 1 and 5');
    });

    it('should throw error for empty question ID', () => {
      expect(() => {
        SurveyResponse.create({
          userId: testIds.user1,
          phaseNumber: 1,
          questionId: '',
          score: 3
        });
      }).toThrow('Question ID is required');
    });

    it('should throw error for note exceeding 1000 characters', () => {
      const longNote = 'a'.repeat(1001);
      expect(() => {
        SurveyResponse.create({
          userId: testIds.user1,
          phaseNumber: 1,
          questionId: 'envy',
          score: 3,
          note: longNote
        });
      }).toThrow('Note cannot exceed 1000 characters');
    });
  });

  describe('fromQuestionResponse', () => {
    it('should create SurveyResponse from QuestionResponse', () => {
      const questionResponse = new QuestionResponse('arrogance', 5, 'I struggle with pride');
      const surveyResponse = SurveyResponse.fromQuestionResponse(
        testIds.user1,
        1,
        questionResponse,
        testIds.response1
      );

      expect(surveyResponse.id.toString()).toBe(testIds.response1);
      expect(surveyResponse.userId.toString()).toBe(testIds.user1);
      expect(surveyResponse.phaseNumber).toBe(1);
      expect(surveyResponse.questionId).toBe('arrogance');
      expect(surveyResponse.score).toBe(5);
      expect(surveyResponse.note).toBe('I struggle with pride');
    });
  });

  describe('toQuestionResponse', () => {
    it('should convert SurveyResponse to QuestionResponse', () => {
      const surveyResponse = SurveyResponse.create({
        userId: testIds.user1,
        phaseNumber: 2,
        questionId: 'anger',
        score: 3,
        note: 'I get angry sometimes'
      });

      const questionResponse = surveyResponse.toQuestionResponse();

      expect(questionResponse.questionId).toBe('anger');
      expect(questionResponse.score).toBe(3);
      expect(questionResponse.note).toBe('I get angry sometimes');
    });
  });

  describe('toDTO', () => {
    it('should serialize survey response to DTO format', () => {
      const completedAt = new Date('2024-01-15T10:00:00Z');
      const createdAt = new Date('2024-01-15T09:30:00Z');

      const response = SurveyResponse.create({
        id: testIds.response1,
        userId: testIds.user1,
        phaseNumber: 1,
        questionId: 'selfDeception',
        score: 4,
        note: 'I sometimes deceive myself',
        completedAt,
        createdAt
      });

      const dto = response.toDTO();

      expect(dto).toMatchObject({
        id: testIds.response1,
        userId: testIds.user1,
        phaseNumber: 1,
        questionId: 'selfDeception',
        score: 4,
        note: 'I sometimes deceive myself',
        completedAt: completedAt.toISOString(),
        createdAt: createdAt.toISOString()
      });
    });
  });
});