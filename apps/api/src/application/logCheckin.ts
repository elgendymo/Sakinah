import { Result } from '@/shared/result';
import { Checkin } from '@sakinah/types';
import { CheckinRepository } from '@/infrastructure/repos/CheckinRepository';

interface LogCheckinInput {
  userId: string;
  mood?: number;
  intention?: string;
  reflection?: string;
}

export async function logCheckin(input: LogCheckinInput): Promise<Result<Checkin>> {
  try {
    const checkinRepo = new CheckinRepository();

    const today = new Date().toISOString().split('T')[0];

    // Check if already checked in today
    const existingResult = await checkinRepo.getByDate(input.userId, today);

    if (!existingResult.ok) {
      return existingResult;
    }

    if (existingResult.value) {
      // Update existing checkin
      const updateResult = await checkinRepo.updateCheckin(existingResult.value.id, input.userId, {
        mood: input.mood,
        intention: input.intention,
        reflection: input.reflection,
      });

      if (!updateResult.ok) {
        return updateResult;
      }

      return Result.ok(updateResult.value);
    }

    // Create new checkin
    const createResult = await checkinRepo.createCheckin({
      userId: input.userId,
      date: today,
      mood: input.mood,
      intention: input.intention,
      reflection: input.reflection,
    });

    if (!createResult.ok) {
      return createResult;
    }

    return Result.ok(createResult.value);
  } catch (error) {
    return Result.error(error as Error);
  }
}