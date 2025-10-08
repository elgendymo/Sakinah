import { describe, it, expect } from 'vitest';
import { QuestionResponse } from '@/domain/value-objects/QuestionResponse';

describe('QuestionResponse', () => {
  describe('constructor', () => {
    it('should create a valid question response', () => {
      const response = new QuestionResponse('envy', 4, 'I sometimes feel envious');

      expect(response.questionId).toBe('envy');
      expect(response.score).toBe(4);
      expect(response.note).toBe('I sometimes feel envious');
    });

    it('should create question response without note', () => {
      const response = new QuestionResponse('anger', 3);

      expect(response.questionId).toBe('anger');
      expect(response.score).toBe(3);
      expect(response.note).toBeUndefined();
    });

    it('should accept all valid Likert scores (1-5)', () => {
      for (let score = 1; score <= 5; score++) {
        const response = new QuestionResponse('test', score as any);
        expect(response.score).toBe(score);
      }
    });

    it('should throw error for invalid Likert score - too low', () => {
      expect(() => {
        new QuestionResponse('envy', 0 as any);
      }).toThrow('Invalid Likert score: 0. Must be between 1 and 5.');
    });

    it('should throw error for invalid Likert score - too high', () => {
      expect(() => {
        new QuestionResponse('envy', 6 as any);
      }).toThrow('Invalid Likert score: 6. Must be between 1 and 5.');
    });

    it('should throw error for non-integer score', () => {
      expect(() => {
        new QuestionResponse('envy', 3.5 as any);
      }).toThrow('Invalid Likert score: 3.5. Must be between 1 and 5.');
    });

    it('should throw error for empty question ID', () => {
      expect(() => {
        new QuestionResponse('', 3);
      }).toThrow('Invalid question ID: ');
    });

    it('should throw error for note exceeding 1000 characters', () => {
      const longNote = 'a'.repeat(1001);
      expect(() => {
        new QuestionResponse('envy', 3, longNote);
      }).toThrow('Note cannot exceed 1000 characters');
    });

    it('should accept note with exactly 1000 characters', () => {
      const maxNote = 'a'.repeat(1000);
      const response = new QuestionResponse('envy', 3, maxNote);
      expect(response.note).toBe(maxNote);
    });

    it('should accept empty string as note', () => {
      const response = new QuestionResponse('envy', 3, '');
      expect(response.note).toBe('');
    });
  });

  describe('toDTO', () => {
    it('should serialize question response to DTO format with note', () => {
      const response = new QuestionResponse('arrogance', 5, 'I struggle with pride');
      const dto = response.toDTO();

      expect(dto).toEqual({
        questionId: 'arrogance',
        score: 5,
        note: 'I struggle with pride'
      });
    });

    it('should serialize question response to DTO format without note', () => {
      const response = new QuestionResponse('lust', 2);
      const dto = response.toDTO();

      expect(dto).toEqual({
        questionId: 'lust',
        score: 2,
        note: undefined
      });
    });

    it('should serialize question response with empty note', () => {
      const response = new QuestionResponse('despair', 1, '');
      const dto = response.toDTO();

      expect(dto).toEqual({
        questionId: 'despair',
        score: 1,
        note: ''
      });
    });
  });

  describe('edge cases', () => {
    it('should handle Unicode characters in question ID', () => {
      const response = new QuestionResponse('مشكلة_الحسد', 3);
      expect(response.questionId).toBe('مشكلة_الحسد');
    });

    it('should handle Unicode characters in note', () => {
      const arabicNote = 'أحياناً أشعر بالحسد';
      const response = new QuestionResponse('envy', 3, arabicNote);
      expect(response.note).toBe(arabicNote);
    });

    it('should handle special characters in note', () => {
      const specialNote = 'I feel this way 50% of the time... sometimes more!';
      const response = new QuestionResponse('anger', 3, specialNote);
      expect(response.note).toBe(specialNote);
    });

    it('should handle very long question ID (within limits)', () => {
      const longQuestionId = 'very_long_question_identifier_for_testing_purposes';
      const response = new QuestionResponse(longQuestionId, 4);
      expect(response.questionId).toBe(longQuestionId);
    });
  });
});