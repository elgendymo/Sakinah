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
    const existing = await checkinRepo.getByDate(input.userId, today);

    if (existing) {
      // Update existing checkin
      const updated = await checkinRepo.updateCheckin(existing.id, input.userId, {
        mood: input.mood,
        intention: input.intention,
        reflection: input.reflection,
      });
      return Result.ok(updated);
    }

    // Create new checkin
    const checkin = await checkinRepo.createCheckin({
      userId: input.userId,
      date: today,
      mood: input.mood,
      intention: input.intention,
      reflection: input.reflection,
    });

    return Result.ok(checkin);
  } catch (error) {
    return Result.error(error as Error);
  }
}