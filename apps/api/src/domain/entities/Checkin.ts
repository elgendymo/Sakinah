import { CheckinId } from '../value-objects/CheckinId';
import { UserId } from '../value-objects/UserId';

export class Checkin {
  private constructor(
    private readonly _id: CheckinId,
    private readonly _userId: UserId,
    private readonly _date: Date,
    private _mood: number | null,
    private _intention: string | null,
    private _reflection: string | null,
    private readonly _createdAt: Date
  ) {
    if (_mood !== null && (_mood < -2 || _mood > 2)) {
      throw new Error('Mood must be between -2 and 2');
    }
  }

  static create(params: {
    id?: string;
    userId: string;
    date: Date;
    mood?: number | null;
    intention?: string | null;
    reflection?: string | null;
    createdAt?: Date;
  }): Checkin {
    return new Checkin(
      new CheckinId(params.id),
      new UserId(params.userId),
      params.date,
      params.mood || null,
      params.intention || null,
      params.reflection || null,
      params.createdAt || new Date()
    );
  }

  get id(): CheckinId {
    return this._id;
  }

  get userId(): UserId {
    return this._userId;
  }

  get date(): Date {
    return this._date;
  }

  get mood(): number | null {
    return this._mood;
  }

  get intention(): string | null {
    return this._intention;
  }

  get reflection(): string | null {
    return this._reflection;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  updateMood(mood: number): void {
    if (mood < -2 || mood > 2) {
      throw new Error('Mood must be between -2 and 2');
    }
    this._mood = mood;
  }

  setIntention(intention: string): void {
    this._intention = intention.trim() || null;
  }

  setReflection(reflection: string): void {
    this._reflection = reflection.trim() || null;
  }

  isComplete(): boolean {
    return this._mood !== null &&
           this._intention !== null &&
           this._reflection !== null;
  }

  toDTO() {
    return {
      id: this._id.toString(),
      userId: this._userId.toString(),
      date: this._date.toISOString().split('T')[0],
      mood: this._mood,
      intention: this._intention,
      reflection: this._reflection,
      createdAt: this._createdAt.toISOString()
    };
  }
}