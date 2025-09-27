import { injectable, inject } from 'tsyringe';
import { IPrayerTimesRepository } from '@/domain/repositories/IPrayerTimesRepository';
import { PrayerTimes } from '@/domain/entities/PrayerTimes';
import { PrayerTimesId } from '@/domain/value-objects/PrayerTimesId';
import { UserId } from '@/domain/value-objects/UserId';
import { Location } from '@/domain/value-objects/Location';
import { CalculationMethod } from '@/domain/value-objects/CalculationMethod';
import { IDatabaseClient, PrayerTimesData } from '../database/types';

@injectable()
export class PrayerTimesRepositoryAdapter implements IPrayerTimesRepository {
  constructor(
    @inject('IDatabaseClient') private db: IDatabaseClient
  ) {}

  async save(prayerTimes: PrayerTimes): Promise<void> {
    try {
      const data = {
        userId: prayerTimes.userId.toString(),
        latitude: prayerTimes.location.latitude,
        longitude: prayerTimes.location.longitude,
        city: prayerTimes.location.city,
        country: prayerTimes.location.country,
        timezone: prayerTimes.location.timezone,
        calculationMethod: prayerTimes.calculationMethod.method,
        date: prayerTimes.date.toISOString().split('T')[0], // YYYY-MM-DD
        fajr: prayerTimes.prayerTimes.fajr.toISOString(),
        sunrise: prayerTimes.prayerTimes.sunrise.toISOString(),
        dhuhr: prayerTimes.prayerTimes.dhuhr.toISOString(),
        asr: prayerTimes.prayerTimes.asr.toISOString(),
        maghrib: prayerTimes.prayerTimes.maghrib.toISOString(),
        isha: prayerTimes.prayerTimes.isha.toISOString(),
        qiyam: prayerTimes.prayerTimes.qiyam?.toISOString(),
        hijriDate: prayerTimes.hijriDate,
        validUntil: prayerTimes.validUntil.toISOString()
      };

      const result = await this.db.createPrayerTimes(data);

      if (result.error) {
        throw new Error(`Failed to save prayer times: ${result.error.message}`);
      }
    } catch (error) {
      throw new Error(`Failed to save prayer times: ${error}`);
    }
  }

  async findById(id: PrayerTimesId): Promise<PrayerTimes | null> {
    try {
      const result = await this.db.getPrayerTimesById(id.toString());

      if (result.error) {
        throw new Error(`Failed to find prayer times by ID: ${result.error.message}`);
      }

      if (!result.data) {
        return null;
      }

      return this.mapToDomain(result.data);
    } catch (error) {
      throw new Error(`Failed to find prayer times by ID: ${error}`);
    }
  }

  async findByUserAndDate(userId: UserId, date: Date): Promise<PrayerTimes | null> {
    try {
      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
      const result = await this.db.getPrayerTimesByUserAndDate(userId.toString(), dateStr);

      if (result.error) {
        throw new Error(`Failed to find prayer times by user and date: ${result.error.message}`);
      }

      if (!result.data) {
        return null;
      }

      return this.mapToDomain(result.data);
    } catch (error) {
      throw new Error(`Failed to find prayer times by user and date: ${error}`);
    }
  }

  async findByLocationAndDate(
    location: Location,
    calculationMethod: CalculationMethod,
    date: Date
  ): Promise<PrayerTimes | null> {
    try {
      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
      const result = await this.db.getPrayerTimesByLocationAndDate(
        location.latitude,
        location.longitude,
        calculationMethod.method,
        dateStr
      );

      if (result.error) {
        throw new Error(`Failed to find prayer times by location and date: ${result.error.message}`);
      }

      if (!result.data) {
        return null;
      }

      return this.mapToDomain(result.data);
    } catch (error) {
      throw new Error(`Failed to find prayer times by location and date: ${error}`);
    }
  }

  async findByUserAndDateRange(
    userId: UserId,
    startDate: Date,
    endDate: Date
  ): Promise<PrayerTimes[]> {
    try {
      const startDateStr = startDate.toISOString().split('T')[0]; // YYYY-MM-DD
      const endDateStr = endDate.toISOString().split('T')[0]; // YYYY-MM-DD

      const result = await this.db.getPrayerTimesByUserAndDateRange(
        userId.toString(),
        startDateStr,
        endDateStr
      );

      if (result.error) {
        throw new Error(`Failed to find prayer times by user and date range: ${result.error.message}`);
      }

      if (!result.data) {
        return [];
      }

      return result.data.map(data => this.mapToDomain(data));
    } catch (error) {
      throw new Error(`Failed to find prayer times by user and date range: ${error}`);
    }
  }

  async deleteExpired(): Promise<number> {
    try {
      const result = await this.db.deleteExpiredPrayerTimes();

      if (result.error) {
        throw new Error(`Failed to delete expired prayer times: ${result.error.message}`);
      }

      return result.data || 0;
    } catch (error) {
      throw new Error(`Failed to delete expired prayer times: ${error}`);
    }
  }

  async delete(id: PrayerTimesId): Promise<void> {
    try {
      const result = await this.db.deletePrayerTimes(id.toString());

      if (result.error) {
        throw new Error(`Failed to delete prayer times: ${result.error.message}`);
      }
    } catch (error) {
      throw new Error(`Failed to delete prayer times: ${error}`);
    }
  }

  async exists(userId: UserId, date: Date): Promise<boolean> {
    try {
      const prayerTimes = await this.findByUserAndDate(userId, date);
      return prayerTimes !== null && prayerTimes.isValid();
    } catch (error) {
      return false;
    }
  }

  private mapToDomain(data: PrayerTimesData): PrayerTimes {
    const location = Location.create({
      latitude: data.location.latitude,
      longitude: data.location.longitude,
      city: data.location.city,
      country: data.location.country,
      timezone: data.location.timezone
    });

    const calculationMethod = CalculationMethod.create(data.calculationMethod as any);

    return PrayerTimes.create({
      id: data.id,
      userId: data.userId,
      location,
      calculationMethod,
      prayerTimes: {
        date: new Date(data.date),
        fajr: new Date(data.prayerTimes.fajr),
        sunrise: new Date(data.prayerTimes.sunrise),
        dhuhr: new Date(data.prayerTimes.dhuhr),
        asr: new Date(data.prayerTimes.asr),
        maghrib: new Date(data.prayerTimes.maghrib),
        isha: new Date(data.prayerTimes.isha),
        qiyam: data.prayerTimes.qiyam ? new Date(data.prayerTimes.qiyam) : undefined
      },
      hijriDate: data.hijriDate,
      createdAt: new Date(data.createdAt),
      validUntil: new Date(data.validUntil)
    });
  }
}