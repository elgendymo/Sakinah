import { describe, it, expect } from 'vitest';
import { SignupRequestSchema, GenderEnum, LikertScoreEnum } from '@sakinah/types';

describe('SignupRequestSchema Validation', () => {
  describe('Valid signup requests', () => {
    it('should validate complete signup request with all fields', () => {
      const validRequest = {
        email: 'test@example.com',
        password: 'securePassword123',
        firstName: 'John',
        gender: 'male' as const
      };

      const result = SignupRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validRequest);
      }
    });

    it('should validate signup request with female gender', () => {
      const validRequest = {
        email: 'jane@example.com',
        password: 'anotherPassword456',
        firstName: 'Jane',
        gender: 'female' as const
      };

      const result = SignupRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.gender).toBe('female');
      }
    });

    it('should validate signup with minimum required password length', () => {
      const validRequest = {
        email: 'user@test.com',
        password: '12345678', // exactly 8 characters
        firstName: 'User',
        gender: 'male' as const
      };

      const result = SignupRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('should validate signup with maximum firstName length', () => {
      const validRequest = {
        email: 'user@test.com',
        password: 'validPassword123',
        firstName: 'A'.repeat(100), // exactly 100 characters
        gender: 'female' as const
      };

      const result = SignupRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });
  });

  describe('Invalid email validation', () => {
    it('should reject invalid email format', () => {
      const invalidRequest = {
        email: 'not-an-email',
        password: 'validPassword123',
        firstName: 'John',
        gender: 'male' as const
      };

      const result = SignupRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['email']);
        expect(result.error.issues[0].message).toContain('Invalid email');
      }
    });

    it('should reject empty email', () => {
      const invalidRequest = {
        email: '',
        password: 'validPassword123',
        firstName: 'John',
        gender: 'male' as const
      };

      const result = SignupRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['email']);
      }
    });

    it('should reject missing email', () => {
      const invalidRequest = {
        // email missing
        password: 'validPassword123',
        firstName: 'John',
        gender: 'male' as const
      };

      const result = SignupRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      if (!result.success) {
        const emailIssue = result.error.issues.find(issue =>
          issue.path.length === 1 && issue.path[0] === 'email'
        );
        expect(emailIssue).toBeDefined();
      }
    });
  });

  describe('Invalid password validation', () => {
    it('should reject password shorter than 8 characters', () => {
      const invalidRequest = {
        email: 'test@example.com',
        password: '1234567', // 7 characters
        firstName: 'John',
        gender: 'male' as const
      };

      const result = SignupRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['password']);
        expect(result.error.issues[0].message).toContain('at least 8');
      }
    });

    it('should reject empty password', () => {
      const invalidRequest = {
        email: 'test@example.com',
        password: '',
        firstName: 'John',
        gender: 'male' as const
      };

      const result = SignupRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['password']);
      }
    });

    it('should reject missing password', () => {
      const invalidRequest = {
        email: 'test@example.com',
        // password missing
        firstName: 'John',
        gender: 'male' as const
      };

      const result = SignupRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      if (!result.success) {
        const passwordIssue = result.error.issues.find(issue =>
          issue.path.length === 1 && issue.path[0] === 'password'
        );
        expect(passwordIssue).toBeDefined();
      }
    });
  });

  describe('Invalid firstName validation', () => {
    it('should reject empty firstName', () => {
      const invalidRequest = {
        email: 'test@example.com',
        password: 'validPassword123',
        firstName: '',
        gender: 'male' as const
      };

      const result = SignupRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['firstName']);
      }
    });

    it('should reject firstName longer than 100 characters', () => {
      const invalidRequest = {
        email: 'test@example.com',
        password: 'validPassword123',
        firstName: 'A'.repeat(101), // 101 characters
        gender: 'male' as const
      };

      const result = SignupRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['firstName']);
        expect(result.error.issues[0].message).toContain('at most 100');
      }
    });

    it('should reject missing firstName', () => {
      const invalidRequest = {
        email: 'test@example.com',
        password: 'validPassword123',
        // firstName missing
        gender: 'male' as const
      };

      const result = SignupRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      if (!result.success) {
        const firstNameIssue = result.error.issues.find(issue =>
          issue.path.length === 1 && issue.path[0] === 'firstName'
        );
        expect(firstNameIssue).toBeDefined();
      }
    });
  });

  describe('Invalid gender validation', () => {
    it('should reject invalid gender value', () => {
      const invalidRequest = {
        email: 'test@example.com',
        password: 'validPassword123',
        firstName: 'John',
        gender: 'other' as any // invalid gender
      };

      const result = SignupRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['gender']);
        expect(result.error.issues[0].message).toContain('male');
      }
    });

    it('should reject empty gender', () => {
      const invalidRequest = {
        email: 'test@example.com',
        password: 'validPassword123',
        firstName: 'John',
        gender: '' as any
      };

      const result = SignupRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['gender']);
      }
    });

    it('should reject missing gender', () => {
      const invalidRequest = {
        email: 'test@example.com',
        password: 'validPassword123',
        firstName: 'John'
        // gender missing
      };

      const result = SignupRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      if (!result.success) {
        const genderIssue = result.error.issues.find(issue =>
          issue.path.length === 1 && issue.path[0] === 'gender'
        );
        expect(genderIssue).toBeDefined();
      }
    });
  });

  describe('Multiple validation errors', () => {
    it('should return all validation errors for completely invalid request', () => {
      const invalidRequest = {
        email: 'not-an-email',
        password: '123', // too short
        firstName: '', // empty
        gender: 'invalid' as any // invalid value
      };

      const result = SignupRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toHaveLength(4);

        const paths = result.error.issues.map(issue => issue.path[0]);
        expect(paths).toContain('email');
        expect(paths).toContain('password');
        expect(paths).toContain('firstName');
        expect(paths).toContain('gender');
      }
    });

    it('should return specific error messages for each field', () => {
      const invalidRequest = {
        email: 'bad-email',
        password: 'short',
        firstName: 'A'.repeat(101),
        gender: 'unknown' as any
      };

      const result = SignupRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      if (!result.success) {
        const issues = result.error.issues;

        const emailIssue = issues.find(i => i.path[0] === 'email');
        expect(emailIssue?.message).toContain('Invalid email');

        const passwordIssue = issues.find(i => i.path[0] === 'password');
        expect(passwordIssue?.message).toContain('at least 8');

        const firstNameIssue = issues.find(i => i.path[0] === 'firstName');
        expect(firstNameIssue?.message).toContain('at most 100');

        const genderIssue = issues.find(i => i.path[0] === 'gender');
        expect(genderIssue?.message).toContain('male');
      }
    });
  });

  describe('GenderEnum validation', () => {
    it('should validate male gender', () => {
      const result = GenderEnum.safeParse('male');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('male');
      }
    });

    it('should validate female gender', () => {
      const result = GenderEnum.safeParse('female');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('female');
      }
    });

    it('should reject invalid gender values', () => {
      const invalidValues = ['other', 'non-binary', '', null, undefined, 123];

      invalidValues.forEach(value => {
        const result = GenderEnum.safeParse(value);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle whitespace in firstName', () => {
      const requestWithWhitespace = {
        email: 'test@example.com',
        password: 'validPassword123',
        firstName: '  John  ', // has whitespace
        gender: 'male' as const
      };

      const result = SignupRequestSchema.safeParse(requestWithWhitespace);
      expect(result.success).toBe(true);
      if (result.success) {
        // Zod should preserve the whitespace as provided
        expect(result.data.firstName).toBe('  John  ');
      }
    });

    it('should handle special characters in email', () => {
      const validEmails = [
        'test+tag@example.com',
        'user.name@sub.domain.com',
        'test_user@example-domain.org'
      ];

      validEmails.forEach(email => {
        const request = {
          email,
          password: 'validPassword123',
          firstName: 'Test',
          gender: 'male' as const
        };

        const result = SignupRequestSchema.safeParse(request);
        expect(result.success).toBe(true);
      });
    });

    it('should handle unicode characters in firstName', () => {
      const unicodeNames = [
        'José',
        'Müller',
        'محمد',
        '张三'
      ];

      unicodeNames.forEach(firstName => {
        const request = {
          email: 'test@example.com',
          password: 'validPassword123',
          firstName,
          gender: 'female' as const
        };

        const result = SignupRequestSchema.safeParse(request);
        expect(result.success).toBe(true);
      });
    });
  });
});