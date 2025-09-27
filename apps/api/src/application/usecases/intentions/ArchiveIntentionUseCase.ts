import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/result';
import { IIntentionRepository } from '@/domain/repositories';
import { Intention } from '@/domain/entities/Intention';
import { IntentionId } from '@/domain/value-objects/IntentionId';
import { UserId } from '@/domain/value-objects/UserId';

export interface ArchiveIntentionRequest {
  intentionId: string;
  userId: string;
}

@injectable()
export class ArchiveIntentionUseCase {
  constructor(
    @inject('IIntentionRepository') private intentionRepo: IIntentionRepository
  ) {}

  async execute(request: ArchiveIntentionRequest): Promise<Result<Intention>> {
    try {
      const intentionId = new IntentionId(request.intentionId);
      const userId = new UserId(request.userId);

      // Get the intention
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
        return Result.error(new Error('Unauthorized: You can only archive your own intentions'));
      }

      // Archive the intention
      intention.archive();

      // Save the updated intention
      const result = await this.intentionRepo.update(intention);

      if (Result.isError(result)) {
        return Result.error(new Error('Failed to archive intention'));
      }

      return Result.ok(result.value);
    } catch (error) {
      return Result.error(error as Error);
    }
  }
}