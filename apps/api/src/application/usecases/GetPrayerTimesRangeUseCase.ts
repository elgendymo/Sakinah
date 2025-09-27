import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/result';
import { PrayerTimes } from '@/domain/entities/PrayerTimes';
import { IPrayerTimesRepository } from '@/domain/repositories/IPrayerTimesRepository';
import { GetPrayerTimesUseCase } from './GetPrayerTimesUseCase';
import { CalculationMethodType } from '@/domain/value-objects/CalculationMethod';

interface GetPrayerTimesRangeInput {
  userId: string;
  latitude: number;
  longitude: number;
  startDate: Date;
  endDate: Date;
  calculationMethod?: CalculationMethodType;
  timezone?: string;
}

interface GetPrayerTimesRangeResult {
  prayerTimesList: PrayerTimes[];
  qiblaDirection: number;
  totalDays: number;
}

@injectable()
export class GetPrayerTimesRangeUseCase {
  constructor(
    @inject('IPrayerTimesRepository') private prayerTimesRepo: IPrayerTimesRepository,
    @inject('GetPrayerTimesUseCase') private getPrayerTimesUseCase: GetPrayerTimesUseCase
  ) {}

  async execute(input: GetPrayerTimesRangeInput): Promise<Result<GetPrayerTimesRangeResult>> {
    try {
      const {
        userId,
        latitude,
        longitude,
        startDate,
        endDate,
        calculationMethod = 'MuslimWorldLeague',
        timezone
      } = input;

      // Validate date range
      if (startDate >= endDate) {
        return Result.error(new Error('Start date must be before end date'));
      }

      const maxDays = 30; // Limit to prevent abuse
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff > maxDays) {
        return Result.error(new Error(`Date range too large. Maximum ${maxDays} days allowed.`));
      }

      const prayerTimesList: PrayerTimes[] = [];
      let qiblaDirection = 0;

      // Generate prayer times for each day
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const result = await this.getPrayerTimesUseCase.execute({
          userId,
          latitude,
          longitude,
          date: new Date(currentDate),
          calculationMethod,
          timezone
        });

        if (Result.isError(result)) {
          // Log the error but continue with other days
          console.warn(`Failed to get prayer times for ${currentDate.toISOString()}:`, result.error);
        } else {
          prayerTimesList.push(result.value.prayerTimes);
          if (qiblaDirection === 0) {
            qiblaDirection = result.value.qiblaDirection;
          }
        }

        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }

      if (prayerTimesList.length === 0) {
        return Result.error(new Error('Failed to calculate prayer times for any day in the range'));
      }

      return Result.ok({
        prayerTimesList,
        qiblaDirection,
        totalDays: prayerTimesList.length
      });

    } catch (error) {
      return Result.error(error as Error);
    }
  }
}