import { describe, it, expect, beforeEach, vi } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import { CreateIntentionUseCase } from '@/application/usecases/intentions/CreateIntentionUseCase';
import { IIntentionRepository } from '@/domain/repositories';
import { Intention } from '@/domain/entities/Intention';
import { Result } from '@/shared/result';

// Mock repository
const mockIntentionRepository = {
  create: vi.fn(),
  findById: vi.fn(),
  findByUserId: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  findActiveByUserId: vi.fn(),
  findTodaysIntentions: vi.fn(),
  findOverdueIntentions: vi.fn(),
  findByTags: vi.fn(),
  findDueSoon: vi.fn(),
  countByStatus: vi.fn(),
  searchIntentions: vi.fn()
} as jest.Mocked<IIntentionRepository>;

describe('CreateIntentionUseCase', () => {
  let useCase: CreateIntentionUseCase;
  const testUserId = uuidv4();

  beforeEach(() => {
    vi.clearAllMocks();
    useCase = new CreateIntentionUseCase(mockIntentionRepository);
  });

  describe('successful creation', () => {
    it('should create intention with minimum required fields', async () => {
      const request = {
        userId: testUserId,
        text: 'Read Quran for 10 minutes'
      };

      const mockIntention = Intention.create({
        userId: testUserId,
        text: 'Read Quran for 10 minutes'
      });

      mockIntentionRepository.create.mockResolvedValue(Result.ok(mockIntention));

      const result = await useCase.execute(request);

      expect(result.ok).toBe(true);
      expect(result.value).toEqual(mockIntention);
      expect(mockIntentionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'Read Quran for 10 minutes',
          priority: 'medium'
        })
      );
    });

    it('should create intention with all optional fields', async () => {
      const targetDate = new Date('2024-01-15');
      const request = {
        userId: testUserId,
        text: 'Complete Fajr prayer',
        description: 'Wake up early for morning prayer',
        priority: 'high' as const,
        targetDate,
        reminder: {
          enabled: true,
          time: '05:00',
          daysOfWeek: [1, 2, 3, 4, 5]
        },
        tags: ['prayer', 'fajr', 'morning']
      };

      const mockIntention = Intention.create({
        userId: testUserId,
        text: 'Complete Fajr prayer',
        description: 'Wake up early for morning prayer',
        priority: 'high',
        targetDate,
        reminder: {
          enabled: true,
          time: '05:00',
          daysOfWeek: [1, 2, 3, 4, 5]
        },
        tags: ['prayer', 'fajr', 'morning']
      });

      mockIntentionRepository.create.mockResolvedValue(Result.ok(mockIntention));

      const result = await useCase.execute(request);

      expect(result.ok).toBe(true);
      expect(mockIntentionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'Complete Fajr prayer',
          description: 'Wake up early for morning prayer',
          priority: 'high',
          targetDate,
          reminder: {
            enabled: true,
            time: '05:00',
            daysOfWeek: [1, 2, 3, 4, 5]
          },
          tags: ['prayer', 'fajr', 'morning']
        })
      );
    });

    it('should trim and normalize tags', async () => {
      const request = {
        userId: testUserId,
        text: 'Test intention',
        tags: ['  Prayer  ', 'MORNING', 'worship ', '', '  ']
      };

      const mockIntention = Intention.create({
        userId: testUserId,
        text: 'Test intention',
        tags: ['prayer', 'morning', 'worship']
      });

      mockIntentionRepository.create.mockResolvedValue(Result.ok(mockIntention));

      const result = await useCase.execute(request);

      expect(result.ok).toBe(true);
      expect(mockIntentionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: ['prayer', 'morning', 'worship']
        })
      );
    });
  });

  describe('validation errors', () => {
    it('should reject empty text', async () => {
      const request = {
        userId: testUserId,
        text: ''
      };

      const result = await useCase.execute(request);

      expect(result.ok).toBe(false);
      expect(result.error.message).toBe('Intention text is required');
      expect(mockIntentionRepository.create).not.toHaveBeenCalled();
    });

    it('should reject text that is only whitespace', async () => {
      const request = {
        userId: testUserId,
        text: '   '
      };

      const result = await useCase.execute(request);

      expect(result.ok).toBe(false);
      expect(result.error.message).toBe('Intention text is required');
    });

    it('should reject text longer than 500 characters', async () => {
      const request = {
        userId: testUserId,
        text: 'x'.repeat(501)
      };

      const result = await useCase.execute(request);

      expect(result.ok).toBe(false);
      expect(result.error.message).toBe('Intention text must be 500 characters or less');
    });

    it('should reject description longer than 2000 characters', async () => {
      const request = {
        userId: testUserId,
        text: 'Valid text',
        description: 'x'.repeat(2001)
      };

      const result = await useCase.execute(request);

      expect(result.ok).toBe(false);
      expect(result.error.message).toBe('Description must be 2000 characters or less');
    });

    it('should reject target date in the past', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const request = {
        userId: testUserId,
        text: 'Valid text',
        targetDate: pastDate
      };

      const result = await useCase.execute(request);

      expect(result.ok).toBe(false);
      expect(result.error.message).toBe('Target date cannot be in the past');
    });

    it('should reject invalid reminder time format', async () => {
      const request = {
        userId: testUserId,
        text: 'Valid text',
        reminder: {
          enabled: true,
          time: '25:00' // Invalid hour
        }
      };

      const result = await useCase.execute(request);

      expect(result.ok).toBe(false);
      expect(result.error.message).toBe('Invalid reminder time format. Use HH:MM format');
    });

    it('should reject invalid days of week', async () => {
      const request = {
        userId: testUserId,
        text: 'Valid text',
        reminder: {
          enabled: true,
          daysOfWeek: [0, 1, 7, 8] // 7 and 8 are invalid
        }
      };

      const result = await useCase.execute(request);

      expect(result.ok).toBe(false);
      expect(result.error.message).toBe('Days of week must be between 0 (Sunday) and 6 (Saturday)');
    });
  });

  describe('repository errors', () => {
    it('should handle repository creation failure', async () => {
      const request = {
        userId: testUserId,
        text: 'Valid intention'
      };

      mockIntentionRepository.create.mockResolvedValue(
        Result.error(new Error('Database error'))
      );

      const result = await useCase.execute(request);

      expect(result.ok).toBe(false);
      expect(result.error.message).toBe('Failed to create intention');
    });
  });

  describe('edge cases', () => {
    it('should accept target date for today', async () => {
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      const request = {
        userId: testUserId,
        text: 'Complete today',
        targetDate: today
      };

      const mockIntention = Intention.create({
        userId: testUserId,
        text: 'Complete today',
        targetDate: today
      });

      mockIntentionRepository.create.mockResolvedValue(Result.ok(mockIntention));

      const result = await useCase.execute(request);

      expect(result.ok).toBe(true);
    });

    it('should handle reminder without time when enabled', async () => {
      const request = {
        userId: testUserId,
        text: 'Valid text',
        reminder: {
          enabled: true
          // No time specified
        }
      };

      const mockIntention = Intention.create({
        userId: testUserId,
        text: 'Valid text',
        reminder: { enabled: true }
      });

      mockIntentionRepository.create.mockResolvedValue(Result.ok(mockIntention));

      const result = await useCase.execute(request);

      expect(result.ok).toBe(true);
    });

    it('should handle valid time formats', async () => {
      const validTimes = ['00:00', '05:30', '12:00', '23:59'];

      for (const time of validTimes) {
        const request = {
          userId: testUserId,
          text: 'Valid text',
          reminder: {
            enabled: true,
            time
          }
        };

        const mockIntention = Intention.create({
          userId: testUserId,
          text: 'Valid text',
          reminder: { enabled: true, time }
        });

        mockIntentionRepository.create.mockResolvedValue(Result.ok(mockIntention));

        const result = await useCase.execute(request);

        expect(result.ok).toBe(true);
      }
    });

    it('should reject invalid time formats', async () => {
      const invalidTimes = ['24:00', '12:60', '1:30', '12:5', 'abc', ''];

      for (const time of invalidTimes) {
        const request = {
          userId: testUserId,
          text: 'Valid text',
          reminder: {
            enabled: true,
            time
          }
        };

        const result = await useCase.execute(request);

        expect(result.ok).toBe(false);
        expect(result.error.message).toContain('Invalid reminder time format');
      }
    });
  });
});