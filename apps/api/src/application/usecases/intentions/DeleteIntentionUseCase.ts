import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/result';
import { IIntentionRepository } from '@/domain/repositories';
import { IntentionId } from '@/domain/value-objects/IntentionId';
import { UserId } from '@/domain/value-objects/UserId';

export interface DeleteIntentionRequest {
  intentionId: string;
  userId: string;
}

@injectable()
export class DeleteIntentionUseCase {
  constructor(
    @inject('IIntentionRepository') private intentionRepo: IIntentionRepository
  ) {}

  async execute(request: DeleteIntentionRequest): Promise<Result<void>> {
    try {
      const intentionId = new IntentionId(request.intentionId);
      const userId = new UserId(request.userId);

      // Get the intention first to verify ownership
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
        return Result.error(new Error('Unauthorized: You can only delete your own intentions'));
      }

      // Delete the intention
      const result = await this.intentionRepo.delete(intentionId, userId);

      if (Result.isError(result)) {
        return Result.error(new Error('Failed to delete intention'));
      }

      return Result.ok(undefined);
    } catch (error) {
      return Result.error(error as Error);
    }
  }
}