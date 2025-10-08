import { describe, it, expect } from 'vitest';
import {
  validateLikertScore,
  validateReflectionText,
  validateNoteText,
  validatePhase1Data,
  validatePhase2Data,
  validateReflectionData,
  validatePhaseCompleteness,
  sanitizeTextInput,
  SURVEY_VALIDATION_RULES
} from '@/shared/validation/surveyValidation';
import { ErrorCode } from '@/shared/errors';
import { Result } from '@/shared/result';

describe('Survey Validation', () => {
  describe('validateLikertScore', () => {
    it('should validate correct Likert scores', () => {
      for (let score = 1; score <= 5; score++) {
        const result = validateLikertScore(score);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      }
    });

    it('should reject scores outside valid range', () => {
      const invalidScores = [0, 6, -1, 10];

      invalidScores.forEach(score => {
        const result = validateLikertScore(score);
        expect(result.isValid).toBe(false);
        expect(result.errorCode).toBe(ErrorCode.INVALID_LIKERT_SCORE);
        expect(result.error).toContain('must be between 1 and 5');
      });
    });

    it('should reject non-integer scores', () => {
      const nonIntegerScores = [1.5, 2.7, 3.14];

      nonIntegerScores.forEach(score => {
        const result = validateLikertScore(score);
        expect(result.isValid).toBe(false);
        expect(result.errorCode).toBe(ErrorCode.INVALID_LIKERT_SCORE);
        expect(result.error).toContain('whole number');
      });
    });

    it('should reject non-numeric values', () => {
      const nonNumericValues = ['3', true, {}, [], null, undefined];

      nonNumericValues.forEach(value => {
        const result = validateLikertScore(value);
        expect(result.isValid).toBe(false);
        expect(result.errorCode).toBeDefined();
      });
    });

    it('should handle null and undefined specifically', () => {
      const nullResult = validateLikertScore(null);
      expect(nullResult.isValid).toBe(false);
      expect(nullResult.errorCode).toBe(ErrorCode.REQUIRED_FIELD);

      const undefinedResult = validateLikertScore(undefined);
      expect(undefinedResult.isValid).toBe(false);
      expect(undefinedResult.errorCode).toBe(ErrorCode.REQUIRED_FIELD);
    });

    it('should reject NaN', () => {
      const result = validateLikertScore(NaN);
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe(ErrorCode.INVALID_LIKERT_SCORE);
    });
  });

  describe('validateReflectionText', () => {
    const minLength = SURVEY_VALIDATION_RULES.reflection.minLength;
    const maxLength = SURVEY_VALIDATION_RULES.reflection.maxLength;

    it('should validate text within valid length range', () => {
      const validTexts = [
        'A'.repeat(minLength), // Minimum length
        'A'.repeat(50), // Medium length
        'A'.repeat(maxLength) // Maximum length
      ];

      validTexts.forEach(text => {
        const result = validateReflectionText(text);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it('should reject text shorter than minimum length', () => {
      const shortTexts = ['', 'Hi', 'A'.repeat(minLength - 1)];

      shortTexts.forEach(text => {
        const result = validateReflectionText(text);
        expect(result.isValid).toBe(false);
        expect(result.errorCode).toBe(ErrorCode.REFLECTION_TOO_SHORT);
        expect(result.error).toContain(`at least ${minLength} characters`);
      });
    });

    it('should reject text longer than maximum length', () => {
      const longText = 'A'.repeat(maxLength + 1);

      const result = validateReflectionText(longText);
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe(ErrorCode.REFLECTION_TOO_LONG);
      expect(result.error).toContain(`cannot exceed ${maxLength} characters`);
    });

    it('should handle whitespace trimming', () => {
      const textWithWhitespace = '   ' + 'A'.repeat(minLength) + '   ';

      const result = validateReflectionText(textWithWhitespace);
      expect(result.isValid).toBe(true);
    });

    it('should reject non-string values', () => {
      const nonStringValues = [123, true, {}, [], null, undefined];

      nonStringValues.forEach(value => {
        const result = validateReflectionText(value);
        expect(result.isValid).toBe(false);
        expect(result.errorCode).toBeDefined();
      });
    });

    it('should use custom field name in error messages', () => {
      const result = validateReflectionText('short', 'Custom Field');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Custom Field');
    });
  });

  describe('validateNoteText', () => {
    const maxLength = SURVEY_VALIDATION_RULES.note.maxLength;

    it('should allow empty or null notes', () => {
      const emptyValues = [null, undefined, ''];

      emptyValues.forEach(value => {
        const result = validateNoteText(value);
        expect(result.isValid).toBe(true);
      });
    });

    it('should validate notes within length limit', () => {
      const validNotes = [
        'Short note',
        'A'.repeat(100),
        'A'.repeat(maxLength)
      ];

      validNotes.forEach(note => {
        const result = validateNoteText(note);
        expect(result.isValid).toBe(true);
      });
    });

    it('should reject notes exceeding maximum length', () => {
      const longNote = 'A'.repeat(maxLength + 1);

      const result = validateNoteText(longNote);
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe(ErrorCode.SURVEY_NOTE_TOO_LONG);
      expect(result.error).toContain(`cannot exceed ${maxLength} characters`);
    });

    it('should reject non-string values (except null/undefined)', () => {
      const nonStringValues = [123, true, {}, []];

      nonStringValues.forEach(value => {
        const result = validateNoteText(value);
        expect(result.isValid).toBe(false);
        expect(result.errorCode).toBe(ErrorCode.SURVEY_RESPONSE_INVALID);
      });
    });
  });

  describe('validatePhase1Data', () => {
    const validPhase1Data = {
      envyScore: 3,
      envyNote: 'Valid note',
      arroganceScore: 2,
      arroganceNote: 'Another valid note',
      selfDeceptionScore: 4,
      selfDeceptionNote: 'Yet another note',
      lustScore: 1,
      lustNote: 'Final note'
    };

    it('should validate complete and correct Phase 1 data', () => {
      const result = validatePhase1Data(validPhase1Data);
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value).toEqual(validPhase1Data);
      }
    });

    it('should validate data without optional notes', () => {
      const dataWithoutNotes = {
        envyScore: 3,
        arroganceScore: 2,
        selfDeceptionScore: 4,
        lustScore: 1
      };

      const result = validatePhase1Data(dataWithoutNotes);
      expect(Result.isOk(result)).toBe(true);
    });

    it('should reject data with invalid scores', () => {
      const invalidData = {
        ...validPhase1Data,
        envyScore: 6, // Invalid score
        arroganceScore: 'invalid' // Invalid type
      };

      const result = validatePhase1Data(invalidData);
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.error.message).toContain('Phase 1 validation failed');
        expect(result.error.message).toContain('Envy score');
        expect(result.error.message).toContain('Arrogance score');
      }
    });

    it('should reject data with notes that are too long', () => {
      const invalidData = {
        ...validPhase1Data,
        envyNote: 'A'.repeat(SURVEY_VALIDATION_RULES.note.maxLength + 1)
      };

      const result = validatePhase1Data(invalidData);
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.error.message).toContain('Envy note');
        expect(result.error.message).toContain('cannot exceed');
      }
    });

    it('should reject data missing required scores', () => {
      const incompleteData = {
        envyScore: 3,
        arroganceScore: 2
        // Missing selfDeceptionScore and lustScore
      };

      const result = validatePhase1Data(incompleteData);
      expect(Result.isError(result)).toBe(true);
    });
  });

  describe('validatePhase2Data', () => {
    const validPhase2Data = {
      angerScore: 3,
      angerNote: 'Valid note',
      maliceScore: 2,
      maliceNote: 'Another note',
      backbitingScore: 4,
      backbitingNote: 'Yet another note',
      suspicionScore: 1,
      suspicionNote: 'More notes',
      loveOfDunyaScore: 5,
      loveOfDunyaNote: 'Even more notes',
      lazinessScore: 2,
      lazinessNote: 'Additional note',
      despairScore: 3,
      despairNote: 'Final note'
    };

    it('should validate complete and correct Phase 2 data', () => {
      const result = validatePhase2Data(validPhase2Data);
      expect(Result.isOk(result)).toBe(true);
    });

    it('should validate data without optional notes', () => {
      const dataWithoutNotes = {
        angerScore: 3,
        maliceScore: 2,
        backbitingScore: 4,
        suspicionScore: 1,
        loveOfDunyaScore: 5,
        lazinessScore: 2,
        despairScore: 3
      };

      const result = validatePhase2Data(dataWithoutNotes);
      expect(Result.isOk(result)).toBe(true);
    });

    it('should reject data with invalid scores', () => {
      const invalidData = {
        ...validPhase2Data,
        angerScore: 0, // Invalid score
        maliceScore: null // Invalid value
      };

      const result = validatePhase2Data(invalidData);
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.error.message).toContain('Phase 2 validation failed');
      }
    });
  });

  describe('validateReflectionData', () => {
    const validReflectionData = {
      strongestStruggle: 'I struggle most with maintaining patience during difficult times.',
      dailyHabit: 'I want to develop a consistent morning dhikr practice.'
    };

    it('should validate complete and correct reflection data', () => {
      const result = validateReflectionData(validReflectionData);
      expect(Result.isOk(result)).toBe(true);
    });

    it('should reject data with text that is too short', () => {
      const invalidData = {
        strongestStruggle: 'Short', // Too short
        dailyHabit: validReflectionData.dailyHabit
      };

      const result = validateReflectionData(invalidData);
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.error.message).toContain('Strongest struggle');
      }
    });

    it('should reject data with text that is too long', () => {
      const invalidData = {
        strongestStruggle: validReflectionData.strongestStruggle,
        dailyHabit: 'A'.repeat(SURVEY_VALIDATION_RULES.reflection.maxLength + 1)
      };

      const result = validateReflectionData(invalidData);
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.error.message).toContain('Daily habit');
      }
    });

    it('should reject data with missing fields', () => {
      const incompleteData = {
        strongestStruggle: validReflectionData.strongestStruggle
        // Missing dailyHabit
      };

      const result = validateReflectionData(incompleteData);
      expect(Result.isError(result)).toBe(true);
    });
  });

  describe('validatePhaseCompleteness', () => {
    it('should validate complete Phase 1 data', () => {
      const completePhase1 = {
        envyScore: 3,
        arroganceScore: 2,
        selfDeceptionScore: 4,
        lustScore: 1
      };

      const result = validatePhaseCompleteness(1, completePhase1);
      expect(result.isValid).toBe(true);
    });

    it('should reject incomplete Phase 1 data', () => {
      const incompletePhase1 = {
        envyScore: 3,
        arroganceScore: 2
        // Missing selfDeceptionScore and lustScore
      };

      const result = validatePhaseCompleteness(1, incompletePhase1);
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe(ErrorCode.REQUIRED_QUESTIONS_MISSING);
      expect(result.error).toContain('Missing required fields');
    });

    it('should validate complete Phase 2 data', () => {
      const completePhase2 = {
        angerScore: 3,
        maliceScore: 2,
        backbitingScore: 4,
        suspicionScore: 1,
        loveOfDunyaScore: 5,
        lazinessScore: 2,
        despairScore: 3
      };

      const result = validatePhaseCompleteness(2, completePhase2);
      expect(result.isValid).toBe(true);
    });

    it('should validate complete reflection data', () => {
      const completeReflection = {
        strongestStruggle: 'I struggle with patience',
        dailyHabit: 'Morning dhikr practice'
      };

      const result = validatePhaseCompleteness(3, completeReflection);
      expect(result.isValid).toBe(true);
    });

    it('should reject reflection data with empty strings', () => {
      const incompleteReflection = {
        strongestStruggle: 'Valid struggle',
        dailyHabit: '' // Empty string
      };

      const result = validatePhaseCompleteness(3, incompleteReflection);
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe(ErrorCode.REQUIRED_QUESTIONS_MISSING);
    });

    it('should reject invalid phase numbers', () => {
      const result = validatePhaseCompleteness(5, {});
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe(ErrorCode.INVALID_PHASE_PROGRESSION);
    });
  });

  describe('sanitizeTextInput', () => {
    it('should trim whitespace', () => {
      const input = '  Hello World  ';
      const result = sanitizeTextInput(input);
      expect(result).toBe('Hello World');
    });

    it('should replace multiple whitespace with single space', () => {
      const input = 'Hello    World\n\nTest';
      const result = sanitizeTextInput(input);
      expect(result).toBe('Hello World Test');
    });

    it('should remove potential HTML characters', () => {
      const input = 'Hello<script>alert("xss")</script>World>';
      const result = sanitizeTextInput(input);
      expect(result).toBe('Helloscriptalert("xss")/scriptWorld');
    });

    it('should handle non-string input', () => {
      const inputs = [null, undefined, 123, true, {}];

      inputs.forEach(input => {
        const result = sanitizeTextInput(input as any);
        expect(result).toBe('');
      });
    });

    it('should handle empty string', () => {
      const result = sanitizeTextInput('');
      expect(result).toBe('');
    });
  });
});