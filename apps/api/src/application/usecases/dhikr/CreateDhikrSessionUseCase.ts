import { inject, injectable } from 'tsyringe';
import { Result } from '@/shared/result';
import { IDhikrRepository } from '@/domain/repositories/IDhikrRepository';
import { DhikrSession } from '@/domain/entities/DhikrSession';
import { UserId } from '@/domain/value-objects/UserId';

export interface CreateDhikrSessionRequest {
  userId: string;
  dhikrType: string;
  dhikrText: string;
  targetCount?: number;
  date?: string;
  tags?: string[];
}

@injectable()
export class CreateDhikrSessionUseCase {
  constructor(
    @inject('IDhikrRepository') private readonly dhikrRepository: IDhikrRepository
  ) {}

  async execute(request: CreateDhikrSessionRequest): Promise<Result<DhikrSession, Error>> {
    try {
      // Validate input
      if (!request.userId) {
        return Result.error(new Error('User ID is required'));
      }
      if (!request.dhikrType) {
        return Result.error(new Error('Dhikr type is required'));
      }
      if (!request.dhikrText) {
        return Result.error(new Error('Dhikr text is required'));
      }

      const userId = new UserId(request.userId);
      const today = request.date || new Date().toISOString().split('T')[0];

      // Check if user already has an active session for this dhikr type today
      const existingSessionsResult = await this.dhikrRepository.getDhikrSessionsByDate(userId, today);
      if (Result.isError(existingSessionsResult)) {
        return Result.error(existingSessionsResult.error);
      }

      const existingSession = existingSessionsResult.value.find(
        session => session.dhikrType === request.dhikrType && !session.isCompleted
      );

      if (existingSession) {
        return Result.error(new Error(`Active session for ${request.dhikrType} already exists for today`));
      }

      // Create new dhikr session
      const dhikrSession = DhikrSession.create({
        userId: request.userId,
        dhikrType: request.dhikrType,
        dhikrText: request.dhikrText,
        targetCount: request.targetCount,
        date: today,
        tags: request.tags || []
      });

      const saveResult = await this.dhikrRepository.saveDhikrSession(dhikrSession);
      if (Result.isError(saveResult)) {
        return Result.error(saveResult.error);
      }

      return Result.ok(saveResult.value);
    } catch (error) {
      return Result.error(error as Error);
    }
  }
}