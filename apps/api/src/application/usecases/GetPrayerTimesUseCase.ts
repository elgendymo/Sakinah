import { injectable, inject } from 'tsyringe';
import { Coordinates, PrayerTimes as AdhanPrayerTimes, CalculationMethod as AdhanCalculationMethod, Qibla } from 'adhan';
import { Result } from '@/shared/result';
import { PrayerTimes, DailyPrayerTimes } from '@/domain/entities/PrayerTimes';
import { IPrayerTimesRepository } from '@/domain/repositories/IPrayerTimesRepository';
import { Location } from '@/domain/value-objects/Location';
import { CalculationMethod, CalculationMethodType } from '@/domain/value-objects/CalculationMethod';
import { UserId } from '@/domain/value-objects/UserId';
import { ICacheService } from '@/domain/services/ICacheService';

interface GetPrayerTimesInput {
  userId: string;
  latitude: number;
  longitude: number;
  date?: Date;
  calculationMethod?: CalculationMethodType;
  timezone?: string;
}

interface GetPrayerTimesResult {
  prayerTimes: PrayerTimes;
  qiblaDirection: number;
}

@injectable()
export class GetPrayerTimesUseCase {
  constructor(
    @inject('IPrayerTimesRepository') private prayerTimesRepo: IPrayerTimesRepository,
    @inject('ICacheService') private cacheService: ICacheService
  ) {}

  async execute(input: GetPrayerTimesInput): Promise<Result<GetPrayerTimesResult>> {
    try {
      const {
        userId,
        latitude,
        longitude,
        date = new Date(),
        calculationMethod = 'MuslimWorldLeague',
        timezone
      } = input;

      // Validate inputs
      if (!this.isValidLatitude(latitude)) {
        return Result.error(new Error('Invalid latitude. Must be between -90 and 90 degrees.'));
      }

      if (!this.isValidLongitude(longitude)) {
        return Result.error(new Error('Invalid longitude. Must be between -180 and 180 degrees.'));
      }

      if (!CalculationMethod.isValidMethod(calculationMethod)) {
        return Result.error(new Error(`Invalid calculation method: ${calculationMethod}`));
      }

      // Create domain objects
      const location = Location.create({
        latitude,
        longitude,
        timezone
      });

      const calcMethod = CalculationMethod.create(calculationMethod);
      const userIdVO = new UserId(userId);

      // Normalize date to start of day for caching
      const normalizedDate = new Date(date);
      normalizedDate.setHours(0, 0, 0, 0);

      // Check cache first
      const cacheKey = this.generateCacheKey(location, calcMethod, normalizedDate);
      const cached = await this.getCachedPrayerTimes(cacheKey);

      if (cached) {
        // Update userId for cached entry if different user
        const updatedPrayerTimes = PrayerTimes.create({
          userId: userId,
          location: cached.location,
          calculationMethod: cached.calculationMethod,
          prayerTimes: cached.prayerTimes,
          hijriDate: cached.hijriDate,
          createdAt: cached.createdAt,
          validUntil: cached.validUntil
        });

        const qibla = new Qibla(new Coordinates(latitude, longitude));

        return Result.ok({
          prayerTimes: updatedPrayerTimes,
          qiblaDirection: qibla.direction
        });
      }

      // Check database for existing prayer times
      const existing = await this.prayerTimesRepo.findByUserAndDate(userIdVO, normalizedDate);

      if (existing && existing.isValid()) {
        const qibla = new Qibla(new Coordinates(latitude, longitude));

        return Result.ok({
          prayerTimes: existing,
          qiblaDirection: qibla.direction
        });
      }

      // Calculate new prayer times
      const calculationResult = await this.calculatePrayerTimes(location, calcMethod, normalizedDate);

      if (Result.isError(calculationResult)) {
        return calculationResult;
      }

      const dailyPrayerTimes = calculationResult.value;

      // Create prayer times entity
      const prayerTimes = PrayerTimes.create({
        userId: userId,
        location: location,
        calculationMethod: calcMethod,
        prayerTimes: dailyPrayerTimes,
        hijriDate: await this.getHijriDate(normalizedDate)
      });

      // Save to database
      await this.prayerTimesRepo.save(prayerTimes);

      // Cache the result
      await this.cachePrayerTimes(cacheKey, prayerTimes);

      // Calculate Qibla direction
      const qibla = new Qibla(new Coordinates(latitude, longitude));

      return Result.ok({
        prayerTimes,
        qiblaDirection: qibla.direction
      });

    } catch (error) {
      return Result.error(error as Error);
    }
  }

  private async calculatePrayerTimes(
    location: Location,
    calculationMethod: CalculationMethod,
    date: Date
  ): Promise<Result<DailyPrayerTimes>> {
    try {
      const coordinates = new Coordinates(location.latitude, location.longitude);
      const adhanMethod = this.mapCalculationMethod(calculationMethod.method);

      const prayerTimes = new AdhanPrayerTimes(coordinates, date, adhanMethod);

      // Calculate Qiyam (last third of night)
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextFajr = new AdhanPrayerTimes(coordinates, nextDay, adhanMethod).fajr;

      const nightDuration = nextFajr.getTime() - prayerTimes.maghrib.getTime();
      const lastThirdStart = new Date(prayerTimes.maghrib.getTime() + (nightDuration * 2/3));

      const dailyPrayerTimes: DailyPrayerTimes = {
        date: date,
        fajr: prayerTimes.fajr,
        sunrise: prayerTimes.sunrise,
        dhuhr: prayerTimes.dhuhr,
        asr: prayerTimes.asr,
        maghrib: prayerTimes.maghrib,
        isha: prayerTimes.isha,
        qiyam: lastThirdStart
      };

      return Result.ok(dailyPrayerTimes);
    } catch (error) {
      return Result.error(new Error(`Failed to calculate prayer times: ${error}`));
    }
  }

  private mapCalculationMethod(method: CalculationMethodType): any {
    const methodMap: Record<CalculationMethodType, any> = {
      'MuslimWorldLeague': AdhanCalculationMethod.MuslimWorldLeague(),
      'Egyptian': AdhanCalculationMethod.Egyptian(),
      'Karachi': AdhanCalculationMethod.Karachi(),
      'UmmAlQura': AdhanCalculationMethod.UmmAlQura(),
      'Dubai': AdhanCalculationMethod.Dubai(),
      'MoonsightingCommittee': AdhanCalculationMethod.MoonsightingCommittee(),
      'NorthAmerica': AdhanCalculationMethod.NorthAmerica(),
      'Kuwait': AdhanCalculationMethod.Kuwait(),
      'Qatar': AdhanCalculationMethod.Qatar(),
      'Singapore': AdhanCalculationMethod.Singapore(),
      'Tehran': AdhanCalculationMethod.Tehran(),
      'Turkey': AdhanCalculationMethod.Turkey()
    };

    return methodMap[method];
  }

  private generateCacheKey(location: Location, method: CalculationMethod, date: Date): string {
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    const coordsStr = `${location.latitude.toFixed(4)},${location.longitude.toFixed(4)}`;
    return `prayer_times:${coordsStr}:${method.method}:${dateStr}`;
  }

  private async getCachedPrayerTimes(cacheKey: string): Promise<PrayerTimes | null> {
    try {
      const cached = await this.cacheService.get<any>(cacheKey);
      if (!cached) return null;

      // Reconstruct PrayerTimes from cached data
      const location = Location.create(cached.location);
      const calculationMethod = CalculationMethod.create(cached.calculationMethod);

      const prayerTimes = PrayerTimes.create({
        id: cached.id,
        userId: cached.userId,
        location,
        calculationMethod,
        prayerTimes: {
          date: new Date(cached.prayerTimes.date),
          fajr: new Date(cached.prayerTimes.fajr),
          sunrise: new Date(cached.prayerTimes.sunrise),
          dhuhr: new Date(cached.prayerTimes.dhuhr),
          asr: new Date(cached.prayerTimes.asr),
          maghrib: new Date(cached.prayerTimes.maghrib),
          isha: new Date(cached.prayerTimes.isha),
          qiyam: cached.prayerTimes.qiyam ? new Date(cached.prayerTimes.qiyam) : undefined
        },
        hijriDate: cached.hijriDate,
        createdAt: new Date(cached.createdAt),
        validUntil: new Date(cached.validUntil)
      });

      return prayerTimes.isValid() ? prayerTimes : null;
    } catch (error) {
      // If cache fails, continue without cache
      return null;
    }
  }

  private async cachePrayerTimes(cacheKey: string, prayerTimes: PrayerTimes): Promise<void> {
    try {
      const cacheData = prayerTimes.toDTO();
      // Cache for 6 hours (prayer times change daily but cache can be shorter for memory management)
      await this.cacheService.set(cacheKey, cacheData, 6 * 60 * 60 * 1000);
    } catch (error) {
      // Cache failure shouldn't break the flow
      console.warn('Failed to cache prayer times:', error);
    }
  }

  private async getHijriDate(date: Date): Promise<string> {
    try {
      // Simple Hijri date calculation - in production you might want a more sophisticated library
      const islamicEpoch = new Date('622-07-16');
      const daysSinceEpoch = Math.floor((date.getTime() - islamicEpoch.getTime()) / (1000 * 60 * 60 * 24));
      const hijriYear = Math.floor(daysSinceEpoch / 354.367) + 1;
      const dayOfYear = daysSinceEpoch % 354;
      const hijriMonth = Math.floor(dayOfYear / 29.5) + 1;
      const hijriDay = dayOfYear % 29 + 1;

      return `${hijriDay}/${hijriMonth}/${hijriYear} AH`;
    } catch (error) {
      return `${date.getFullYear()} CE`;
    }
  }

  private isValidLatitude(lat: number): boolean {
    return typeof lat === 'number' && lat >= -90 && lat <= 90;
  }

  private isValidLongitude(lng: number): boolean {
    return typeof lng === 'number' && lng >= -180 && lng <= 180;
  }
}