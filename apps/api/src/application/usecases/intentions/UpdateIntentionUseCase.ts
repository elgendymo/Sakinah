import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/result';
import { IIntentionRepository } from '@/domain/repositories';
import { Intention, IntentionPriority } from '@/domain/entities/Intention';
import { IntentionId } from '@/domain/value-objects/IntentionId';
import { UserId } from '@/domain/value-objects/UserId';

export interface UpdateIntentionRequest {
  intentionId: string;
  userId: string;
  text?: string;
  description?: string;
  priority?: IntentionPriority;
  targetDate?: Date | null;
  reminder?: {
    enabled: boolean;
    time?: string;
    daysOfWeek?: number[];
  };
  tags?: string[];
}

@injectable()
export class UpdateIntentionUseCase {
  constructor(
    @inject('IIntentionRepository') private intentionRepo: IIntentionRepository
  ) {}

  async execute(request: UpdateIntentionRequest): Promise<Result<Intention>> {
    try {
      const intentionId = new IntentionId(request.intentionId);
      const userId = new UserId(request.userId);

      // Get the existing intention
      const intentionResult = await this.intentionRepo.findById(intentionId);

      if (Result.isError(intentionResult)) {
        return Result.error(new Error('Failed to find intention'));
      }

      if (!intentionResult.value) {
        return Result.error(new Error('Intention not found'));
      }

      const intention = intentionResult.value;

      // Verify ownership
      if (!intention.userId.equals(userId)) {
        return Result.error(new Error('Unauthorized: You can only update your own intentions'));
      }

      // Check if intention is archived
      if (intention.status === 'archived') {
        return Result.error(new Error('Cannot update an archived intention'));
      }

      // Apply updates
      if (request.text !== undefined) {
        if (!request.text || request.text.trim().length === 0) {
          return Result.error(new Error('Intention text is required'));
        }

        if (request.text.trim().length > 500) {
          return Result.error(new Error('Intention text must be 500 characters or less'));
        }

        intention.updateText(request.text.trim());
      }

      if (request.description !== undefined) {
        if (request.description && request.description.length > 2000) {
          return Result.error(new Error('Description must be 2000 characters or less'));
        }

        intention.updateDescription(request.description?.trim() || null);
      }

      if (request.priority !== undefined) {
        intention.updatePriority(request.priority);
      }

      if (request.targetDate !== undefined) {
        // Validate target date is not in the past (if provided)
        if (request.targetDate) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const target = new Date(request.targetDate);
          target.setHours(0, 0, 0, 0);

          if (target < today) {
            return Result.error(new Error('Target date cannot be in the past'));
          }
        }

        intention.updateTargetDate(request.targetDate);
      }

      if (request.reminder !== undefined) {
        // Validate reminder time format
        if (request.reminder.enabled && request.reminder.time) {
          const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
          if (!timeRegex.test(request.reminder.time)) {
            return Result.error(new Error('Invalid reminder time format. Use HH:MM format'));
          }
        }

        // Validate days of week
        if (request.reminder.daysOfWeek) {
          const invalidDays = request.reminder.daysOfWeek.filter(day => day < 0 || day > 6);
          if (invalidDays.length > 0) {
            return Result.error(new Error('Days of week must be between 0 (Sunday) and 6 (Saturday)'));
          }
        }

        intention.updateReminder(request.reminder);
      }

      if (request.tags !== undefined) {
        // Clear existing tags and add new ones
        const currentTags = [...intention.tags];
        currentTags.forEach(tag => intention.removeTag(tag));

        const validTags = request.tags
          .map(tag => tag.trim().toLowerCase())
          .filter(tag => tag.length > 0);

        validTags.forEach(tag => intention.addTag(tag));
      }

      // Save the updated intention
      const result = await this.intentionRepo.update(intention);

      if (Result.isError(result)) {
        return Result.error(new Error('Failed to update intention'));
      }

      return Result.ok(result.value);
    } catch (error) {
      return Result.error(error as Error);
    }
  }
}