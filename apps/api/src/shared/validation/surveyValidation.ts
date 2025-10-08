import { ErrorCode, createAppError } from '@/shared/errors';
import { Result } from '@/shared/result';

export type LikertScore = 1 | 2 | 3 | 4 | 5;

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  errorCode?: ErrorCode;
}

export interface SurveyValidationRules {
  likertScore: {
    min: number;
    max: number;
  };
  reflection: {
    minLength: number;
    maxLength: number;
  };
  note: {
    maxLength: number;
  };
}

export const SURVEY_VALIDATION_RULES: SurveyValidationRules = {
  likertScore: {
    min: 1,
    max: 5
  },
  reflection: {
    minLength: 10,
    maxLength: 500
  },
  note: {
    maxLength: 1000
  }
};

/**
 * Validates a Likert scale score (1-5)
 */
export function validateLikertScore(score: unknown): ValidationResult {
  // Check if score exists
  if (score === null || score === undefined) {
    return {
      isValid: false,
      error: 'Score is required',
      errorCode: ErrorCode.REQUIRED_FIELD
    };
  }

  // Check if score is a number
  if (typeof score !== 'number' || isNaN(score)) {
    return {
      isValid: false,
      error: 'Score must be a number',
      errorCode: ErrorCode.INVALID_LIKERT_SCORE
    };
  }

  // Check if score is an integer
  if (!Number.isInteger(score)) {
    return {
      isValid: false,
      error: 'Score must be a whole number',
      errorCode: ErrorCode.INVALID_LIKERT_SCORE
    };
  }

  // Check if score is within valid range
  if (score < SURVEY_VALIDATION_RULES.likertScore.min || score > SURVEY_VALIDATION_RULES.likertScore.max) {
    return {
      isValid: false,
      error: `Score must be between ${SURVEY_VALIDATION_RULES.likertScore.min} and ${SURVEY_VALIDATION_RULES.likertScore.max}`,
      errorCode: ErrorCode.INVALID_LIKERT_SCORE
    };
  }

  return { isValid: true };
}

/**
 * Validates reflection text length and content
 */
export function validateReflectionText(text: unknown, fieldName = 'reflection'): ValidationResult {
  // Check if text exists
  if (text === null || text === undefined) {
    return {
      isValid: false,
      error: `${fieldName} is required`,
      errorCode: ErrorCode.REQUIRED_FIELD
    };
  }

  // Check if text is a string
  if (typeof text !== 'string') {
    return {
      isValid: false,
      error: `${fieldName} must be text`,
      errorCode: ErrorCode.SURVEY_RESPONSE_INVALID
    };
  }

  const trimmedText = text.trim();

  // Check minimum length
  if (trimmedText.length < SURVEY_VALIDATION_RULES.reflection.minLength) {
    return {
      isValid: false,
      error: `${fieldName} must be at least ${SURVEY_VALIDATION_RULES.reflection.minLength} characters`,
      errorCode: ErrorCode.REFLECTION_TOO_SHORT
    };
  }

  // Check maximum length
  if (trimmedText.length > SURVEY_VALIDATION_RULES.reflection.maxLength) {
    return {
      isValid: false,
      error: `${fieldName} cannot exceed ${SURVEY_VALIDATION_RULES.reflection.maxLength} characters`,
      errorCode: ErrorCode.REFLECTION_TOO_LONG
    };
  }

  return { isValid: true };
}

/**
 * Validates optional note text length
 */
export function validateNoteText(note: unknown): ValidationResult {
  // Notes are optional, so null/undefined is valid
  if (note === null || note === undefined || note === '') {
    return { isValid: true };
  }

  // Check if note is a string
  if (typeof note !== 'string') {
    return {
      isValid: false,
      error: 'Note must be text',
      errorCode: ErrorCode.SURVEY_RESPONSE_INVALID
    };
  }

  // Check maximum length
  if (note.length > SURVEY_VALIDATION_RULES.note.maxLength) {
    return {
      isValid: false,
      error: `Note cannot exceed ${SURVEY_VALIDATION_RULES.note.maxLength} characters`,
      errorCode: ErrorCode.SURVEY_NOTE_TOO_LONG
    };
  }

  return { isValid: true };
}

/**
 * Validates a complete Phase 1 request
 */
export interface Phase1Data {
  envyScore: unknown;
  envyNote?: unknown;
  arroganceScore: unknown;
  arroganceNote?: unknown;
  selfDeceptionScore: unknown;
  selfDeceptionNote?: unknown;
  lustScore: unknown;
  lustNote?: unknown;
}

export function validatePhase1Data(data: Phase1Data): Result<Phase1Data, Error> {
  const errors: string[] = [];

  // Validate all required scores
  const scoreFields = [
    { field: 'envyScore', value: data.envyScore, name: 'Envy score' },
    { field: 'arroganceScore', value: data.arroganceScore, name: 'Arrogance score' },
    { field: 'selfDeceptionScore', value: data.selfDeceptionScore, name: 'Self-deception score' },
    { field: 'lustScore', value: data.lustScore, name: 'Lust score' }
  ];

  for (const { field, value, name } of scoreFields) {
    const validation = validateLikertScore(value);
    if (!validation.isValid) {
      errors.push(`${name}: ${validation.error}`);
    }
  }

  // Validate optional notes
  const noteFields = [
    { field: 'envyNote', value: data.envyNote, name: 'Envy note' },
    { field: 'arroganceNote', value: data.arroganceNote, name: 'Arrogance note' },
    { field: 'selfDeceptionNote', value: data.selfDeceptionNote, name: 'Self-deception note' },
    { field: 'lustNote', value: data.lustNote, name: 'Lust note' }
  ];

  for (const { field, value, name } of noteFields) {
    const validation = validateNoteText(value);
    if (!validation.isValid) {
      errors.push(`${name}: ${validation.error}`);
    }
  }

  if (errors.length > 0) {
    return Result.error(createAppError(
      ErrorCode.VALIDATION_ERROR,
      `Phase 1 validation failed: ${errors.join(', ')}`
    ));
  }

  return Result.ok(data);
}

/**
 * Validates a complete Phase 2 request
 */
export interface Phase2Data {
  angerScore: unknown;
  angerNote?: unknown;
  maliceScore: unknown;
  maliceNote?: unknown;
  backbitingScore: unknown;
  backbitingNote?: unknown;
  suspicionScore: unknown;
  suspicionNote?: unknown;
  loveOfDunyaScore: unknown;
  loveOfDunyaNote?: unknown;
  lazinessScore: unknown;
  lazinessNote?: unknown;
  despairScore: unknown;
  despairNote?: unknown;
}

export function validatePhase2Data(data: Phase2Data): Result<Phase2Data, Error> {
  const errors: string[] = [];

  // Validate all required scores
  const scoreFields = [
    { field: 'angerScore', value: data.angerScore, name: 'Anger score' },
    { field: 'maliceScore', value: data.maliceScore, name: 'Malice score' },
    { field: 'backbitingScore', value: data.backbitingScore, name: 'Backbiting score' },
    { field: 'suspicionScore', value: data.suspicionScore, name: 'Suspicion score' },
    { field: 'loveOfDunyaScore', value: data.loveOfDunyaScore, name: 'Love of dunya score' },
    { field: 'lazinessScore', value: data.lazinessScore, name: 'Laziness score' },
    { field: 'despairScore', value: data.despairScore, name: 'Despair score' }
  ];

  for (const { field, value, name } of scoreFields) {
    const validation = validateLikertScore(value);
    if (!validation.isValid) {
      errors.push(`${name}: ${validation.error}`);
    }
  }

  // Validate optional notes
  const noteFields = [
    { field: 'angerNote', value: data.angerNote, name: 'Anger note' },
    { field: 'maliceNote', value: data.maliceNote, name: 'Malice note' },
    { field: 'backbitingNote', value: data.backbitingNote, name: 'Backbiting note' },
    { field: 'suspicionNote', value: data.suspicionNote, name: 'Suspicion note' },
    { field: 'loveOfDunyaNote', value: data.loveOfDunyaNote, name: 'Love of dunya note' },
    { field: 'lazinessNote', value: data.lazinessNote, name: 'Laziness note' },
    { field: 'despairNote', value: data.despairNote, name: 'Despair note' }
  ];

  for (const { field, value, name } of noteFields) {
    const validation = validateNoteText(value);
    if (!validation.isValid) {
      errors.push(`${name}: ${validation.error}`);
    }
  }

  if (errors.length > 0) {
    return Result.error(createAppError(
      ErrorCode.VALIDATION_ERROR,
      `Phase 2 validation failed: ${errors.join(', ')}`
    ));
  }

  return Result.ok(data);
}

/**
 * Validates reflection phase data
 */
export interface ReflectionData {
  strongestStruggle: unknown;
  dailyHabit: unknown;
}

export function validateReflectionData(data: ReflectionData): Result<ReflectionData, Error> {
  const errors: string[] = [];

  // Validate strongest struggle
  const struggleValidation = validateReflectionText(data.strongestStruggle, 'Strongest struggle');
  if (!struggleValidation.isValid) {
    errors.push(`Strongest struggle: ${struggleValidation.error}`);
  }

  // Validate daily habit
  const habitValidation = validateReflectionText(data.dailyHabit, 'Daily habit');
  if (!habitValidation.isValid) {
    errors.push(`Daily habit: ${habitValidation.error}`);
  }

  if (errors.length > 0) {
    return Result.error(createAppError(
      ErrorCode.VALIDATION_ERROR,
      `Reflection validation failed: ${errors.join(', ')}`
    ));
  }

  return Result.ok(data);
}

/**
 * Utility function to sanitize text input
 */
export function sanitizeTextInput(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
    .replace(/[<>]/g, ''); // Remove potential HTML characters for basic security
}

/**
 * Validates that all required phase data is present
 */
export function validatePhaseCompleteness(phaseNumber: number, data: any): ValidationResult {
  switch (phaseNumber) {
    case 1:
      const phase1Required = ['envyScore', 'arroganceScore', 'selfDeceptionScore', 'lustScore'];
      const phase1Missing = phase1Required.filter(field => data[field] === undefined || data[field] === null);

      if (phase1Missing.length > 0) {
        return {
          isValid: false,
          error: `Missing required fields: ${phase1Missing.join(', ')}`,
          errorCode: ErrorCode.REQUIRED_QUESTIONS_MISSING
        };
      }
      break;

    case 2:
      const phase2Required = ['angerScore', 'maliceScore', 'backbitingScore', 'suspicionScore', 'loveOfDunyaScore', 'lazinessScore', 'despairScore'];
      const phase2Missing = phase2Required.filter(field => data[field] === undefined || data[field] === null);

      if (phase2Missing.length > 0) {
        return {
          isValid: false,
          error: `Missing required fields: ${phase2Missing.join(', ')}`,
          errorCode: ErrorCode.REQUIRED_QUESTIONS_MISSING
        };
      }
      break;

    case 3:
      const reflectionRequired = ['strongestStruggle', 'dailyHabit'];
      const reflectionMissing = reflectionRequired.filter(field => !data[field] || data[field].trim() === '');

      if (reflectionMissing.length > 0) {
        return {
          isValid: false,
          error: `Missing required fields: ${reflectionMissing.join(', ')}`,
          errorCode: ErrorCode.REQUIRED_QUESTIONS_MISSING
        };
      }
      break;

    default:
      return {
        isValid: false,
        error: 'Invalid phase number',
        errorCode: ErrorCode.INVALID_PHASE_PROGRESSION
      };
  }

  return { isValid: true };
}