import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/result';
import { ICheckinRepository } from '@/domain/repositories';
import { Checkin } from '@/domain/entities/Checkin';
import { UserId } from '@/domain/value-objects/UserId';

@injectable()
export class LogCheckinUseCase {
  constructor(
    @inject('ICheckinRepository') private checkinRepo: ICheckinRepository
  ) {}

  async execute(params: {
    userId: string;
    mood?: number;
    intention?: string;
    reflection?: string;
  }): Promise<Result<Checkin>> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Check if checkin exists for today
      const existingResult = await this.checkinRepo.findByUserAndDate(
        new UserId(params.userId),
        today
      );

      if (existingResult.ok && existingResult.value) {
        // Update existing checkin
        const checkin = existingResult.value;

        if (params.mood !== undefined) {
          checkin.updateMood(params.mood);
        }
        if (params.intention !== undefined) {
          checkin.setIntention(params.intention);
        }
        if (params.reflection !== undefined) {
          checkin.setReflection(params.reflection);
        }

        return await this.checkinRepo.update(checkin);
      }

      // Create new checkin
      const checkin = Checkin.create({
        userId: params.userId,
        date: today,
        mood: params.mood,
        intention: params.intention,
        reflection: params.reflection
      });

      return await this.checkinRepo.create(checkin);
    } catch (error) {
      return Result.error(error as Error);
    }
  }

  async getToday(userId: string): Promise<Result<Checkin | null>> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return await this.checkinRepo.findByUserAndDate(new UserId(userId), today);
  }
}