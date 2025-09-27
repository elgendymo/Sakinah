import { PrayerTimesId } from '../value-objects/PrayerTimesId';
import { UserId } from '../value-objects/UserId';
import { Location } from '../value-objects/Location';
import { CalculationMethod } from '../value-objects/CalculationMethod';

export interface PrayerTime {
  name: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
  time: Date;
  localTime: string; // Formatted time in local timezone
}

export interface DailyPrayerTimes {
  date: Date;
  fajr: Date;
  sunrise: Date;
  dhuhr: Date;
  asr: Date;
  maghrib: Date;
  isha: Date;
  qiyam?: Date; // Last third of night
}

export class PrayerTimes {
  private constructor(
    private readonly _id: PrayerTimesId,
    private readonly _userId: UserId,
    private readonly _location: Location,
    private readonly _calculationMethod: CalculationMethod,
    private readonly _prayerTimes: DailyPrayerTimes,
    private readonly _hijriDate?: string,
    private readonly _createdAt: Date = new Date(),
    private readonly _validUntil: Date = new Date(Date.now() + 24 * 60 * 60 * 1000) // Valid for 24 hours
  ) {}

  static create(params: {
    id?: string;
    userId: string;
    location: Location;
    calculationMethod: CalculationMethod;
    prayerTimes: DailyPrayerTimes;
    hijriDate?: string;
    createdAt?: Date;
    validUntil?: Date;
  }): PrayerTimes {
    return new PrayerTimes(
      new PrayerTimesId(params.id),
      new UserId(params.userId),
      params.location,
      params.calculationMethod,
      params.prayerTimes,
      params.hijriDate,
      params.createdAt,
      params.validUntil
    );
  }

  get id(): PrayerTimesId {
    return this._id;
  }

  get userId(): UserId {
    return this._userId;
  }

  get location(): Location {
    return this._location;
  }

  get calculationMethod(): CalculationMethod {
    return this._calculationMethod;
  }

  get prayerTimes(): DailyPrayerTimes {
    return { ...this._prayerTimes };
  }

  get hijriDate(): string | undefined {
    return this._hijriDate;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get validUntil(): Date {
    return this._validUntil;
  }

  get date(): Date {
    return this._prayerTimes.date;
  }

  isValid(): boolean {
    return new Date() < this._validUntil;
  }

  isExpired(): boolean {
    return !this.isValid();
  }

  getPrayerTimesList(): PrayerTime[] {
    return [
      {
        name: 'fajr',
        time: this._prayerTimes.fajr,
        localTime: this.formatTime(this._prayerTimes.fajr)
      },
      {
        name: 'dhuhr',
        time: this._prayerTimes.dhuhr,
        localTime: this.formatTime(this._prayerTimes.dhuhr)
      },
      {
        name: 'asr',
        time: this._prayerTimes.asr,
        localTime: this.formatTime(this._prayerTimes.asr)
      },
      {
        name: 'maghrib',
        time: this._prayerTimes.maghrib,
        localTime: this.formatTime(this._prayerTimes.maghrib)
      },
      {
        name: 'isha',
        time: this._prayerTimes.isha,
        localTime: this.formatTime(this._prayerTimes.isha)
      }
    ];
  }

  getCurrentPrayer(): PrayerTime | null {
    const now = new Date();
    const prayers = this.getPrayerTimesList();

    for (let i = 0; i < prayers.length; i++) {
      const currentPrayer = prayers[i];
      const nextPrayer = prayers[i + 1];

      if (now >= currentPrayer.time && (!nextPrayer || now < nextPrayer.time)) {
        return currentPrayer;
      }
    }

    // If we're past Isha, current prayer is Isha until Fajr next day
    if (now >= prayers[prayers.length - 1].time) {
      return prayers[prayers.length - 1];
    }

    // If we're before Fajr, we're in the night prayer time
    return null;
  }

  getNextPrayer(): PrayerTime | null {
    const now = new Date();
    const prayers = this.getPrayerTimesList();

    for (const prayer of prayers) {
      if (now < prayer.time) {
        return prayer;
      }
    }

    // If all prayers have passed, next prayer is Fajr tomorrow
    return null; // Caller should request next day's prayer times
  }

  getTimeUntilNextPrayer(): number | null {
    const nextPrayer = this.getNextPrayer();
    if (!nextPrayer) return null;

    return nextPrayer.time.getTime() - new Date().getTime();
  }

  private formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: this._location.timezone || 'UTC'
    });
  }

  toDTO() {
    return {
      id: this._id.toString(),
      userId: this._userId.toString(),
      location: {
        latitude: this._location.latitude,
        longitude: this._location.longitude,
        city: this._location.city,
        country: this._location.country,
        timezone: this._location.timezone
      },
      calculationMethod: this._calculationMethod.method,
      date: this._prayerTimes.date.toISOString(),
      prayerTimes: {
        fajr: {
          time: this._prayerTimes.fajr.toISOString(),
          localTime: this.formatTime(this._prayerTimes.fajr)
        },
        sunrise: {
          time: this._prayerTimes.sunrise.toISOString(),
          localTime: this.formatTime(this._prayerTimes.sunrise)
        },
        dhuhr: {
          time: this._prayerTimes.dhuhr.toISOString(),
          localTime: this.formatTime(this._prayerTimes.dhuhr)
        },
        asr: {
          time: this._prayerTimes.asr.toISOString(),
          localTime: this.formatTime(this._prayerTimes.asr)
        },
        maghrib: {
          time: this._prayerTimes.maghrib.toISOString(),
          localTime: this.formatTime(this._prayerTimes.maghrib)
        },
        isha: {
          time: this._prayerTimes.isha.toISOString(),
          localTime: this.formatTime(this._prayerTimes.isha)
        },
        qiyam: this._prayerTimes.qiyam ? {
          time: this._prayerTimes.qiyam.toISOString(),
          localTime: this.formatTime(this._prayerTimes.qiyam)
        } : undefined
      },
      currentPrayer: this.getCurrentPrayer(),
      nextPrayer: this.getNextPrayer(),
      hijriDate: this._hijriDate,
      isValid: this.isValid(),
      validUntil: this._validUntil.toISOString(),
      createdAt: this._createdAt.toISOString()
    };
  }
}