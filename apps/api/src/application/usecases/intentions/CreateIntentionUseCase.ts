import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/result';
import { IIntentionRepository } from '@/domain/repositories';
import { Intention, IntentionPriority } from '@/domain/entities/Intention';

export interface CreateIntentionRequest {
  userId: string;
  text: string;
  description?: string;
  priority?: IntentionPriority;
  targetDate?: Date;
  reminder?: {
    enabled: boolean;
    time?: string;
    daysOfWeek?: number[];
  };
  tags?: string[];
}

@injectable()
export class CreateIntentionUseCase {
  constructor(
    @inject('IIntentionRepository') private intentionRepo: IIntentionRepository
  ) {}

  async execute(request: CreateIntentionRequest): Promise<Result<Intention>> {
    try {
      // Validate input
      if (!request.text || request.text.trim().length === 0) {
        return Result.error(new Error('Intention text is required'));
      }

      if (request.text.trim().length > 500) {
        return Result.error(new Error('Intention text must be 500 characters or less'));
      }

      if (request.description && request.description.length > 2000) {
        return Result.error(new Error('Description must be 2000 characters or less'));
      }

      // Validate target date is not in the past
      if (request.targetDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const target = new Date(request.targetDate);
        target.setHours(0, 0, 0, 0);

        if (target < today) {
          return Result.error(new Error('Target date cannot be in the past'));
        }
      }

      // Validate reminder time format
      if (request.reminder?.enabled && request.reminder.time) {
        const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(request.reminder.time)) {
          return Result.error(new Error('Invalid reminder time format. Use HH:MM format'));
        }
      }

      // Validate days of week
      if (request.reminder?.daysOfWeek) {
        const invalidDays = request.reminder.daysOfWeek.filter(day => day < 0 || day > 6);
        if (invalidDays.length > 0) {
          return Result.error(new Error('Days of week must be between 0 (Sunday) and 6 (Saturday)'));
        }
      }

      // Create the intention
      const intention = Intention.create({
        userId: request.userId,
        text: request.text.trim(),
        description: request.description?.trim() || null,
        priority: request.priority || 'medium',
        targetDate: request.targetDate || null,
        reminder: request.reminder || { enabled: false },
        tags: request.tags ? request.tags.map(tag => tag.trim().toLowerCase()).filter(tag => tag.length > 0) : []
      });

      // Save to repository
      const result = await this.intentionRepo.create(intention);

      if (Result.isError(result)) {
        return Result.error(new Error('Failed to create intention'));
      }

      return Result.ok(result.value);
    } catch (error) {
      return Result.error(error as Error);
    }
  }
}