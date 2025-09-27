import { inject, injectable } from 'tsyringe';
import { Result } from '@/shared/result';
import { IDhikrRepository } from '@/domain/repositories/IDhikrRepository';
import { DhikrSession } from '@/domain/entities/DhikrSession';
import { UserId } from '@/domain/value-objects/UserId';
import { DhikrSessionId } from '@/domain/value-objects/DhikrSessionId';

export interface IncrementDhikrCountRequest {
  sessionId: string;
  userId: string;
  increment?: number;
}

@injectable()
export class IncrementDhikrCountUseCase {
  constructor(
    @inject('IDhikrRepository') private readonly dhikrRepository: IDhikrRepository
  ) {}

  async execute(request: IncrementDhikrCountRequest): Promise<Result<DhikrSession, Error>> {
    try {
      // Validate input
      if (!request.sessionId) {
        return Result.error(new Error('Session ID is required'));
      }
      if (!request.userId) {
        return Result.error(new Error('User ID is required'));
      }

      const sessionId = new DhikrSessionId(request.sessionId);
      const userId = new UserId(request.userId);
      const increment = request.increment || 1;

      if (increment <= 0) {
        return Result.error(new Error('Increment must be positive'));
      }

      // Get the session
      const sessionResult = await this.dhikrRepository.getDhikrSessionById(sessionId);
      if (Result.isError(sessionResult)) {
        return Result.error(sessionResult.error);
      }

      const session = sessionResult.value;
      if (!session) {
        return Result.error(new Error('Dhikr session not found'));
      }

      // Verify ownership
      if (session.userId.toString() !== userId.toString()) {
        return Result.error(new Error('Unauthorized to modify this session'));
      }

      // Check if session is completed
      if (session.isCompleted) {
        return Result.error(new Error('Cannot increment count on completed session'));
      }

      // Increment the count
      session.incrementCount(increment);

      // Save the session
      const saveResult = await this.dhikrRepository.saveDhikrSession(session);
      if (Result.isError(saveResult)) {
        return Result.error(saveResult.error);
      }

      return Result.ok(saveResult.value);
    } catch (error) {
      return Result.error(error as Error);
    }
  }
}