import { PrayerTimes } from '../entities/PrayerTimes';
import { PrayerTimesId } from '../value-objects/PrayerTimesId';
import { UserId } from '../value-objects/UserId';
import { Location } from '../value-objects/Location';
import { CalculationMethod } from '../value-objects/CalculationMethod';

export interface IPrayerTimesRepository {
  /**
   * Save prayer times to the repository
   */
  save(prayerTimes: PrayerTimes): Promise<void>;

  /**
   * Find prayer times by ID
   */
  findById(id: PrayerTimesId): Promise<PrayerTimes | null>;

  /**
   * Find prayer times for a user on a specific date
   */
  findByUserAndDate(userId: UserId, date: Date): Promise<PrayerTimes | null>;

  /**
   * Find cached prayer times for a location and calculation method on a specific date
   */
  findByLocationAndDate(
    location: Location,
    calculationMethod: CalculationMethod,
    date: Date
  ): Promise<PrayerTimes | null>;

  /**
   * Find prayer times for a user in a date range
   */
  findByUserAndDateRange(
    userId: UserId,
    startDate: Date,
    endDate: Date
  ): Promise<PrayerTimes[]>;

  /**
   * Delete expired prayer times
   */
  deleteExpired(): Promise<number>;

  /**
   * Delete prayer times by ID
   */
  delete(id: PrayerTimesId): Promise<void>;

  /**
   * Check if prayer times exist for user and date
   */
  exists(userId: UserId, date: Date): Promise<boolean>;
}