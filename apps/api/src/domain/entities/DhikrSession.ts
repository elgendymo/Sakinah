import { DhikrSessionId } from '../value-objects/DhikrSessionId';
import { UserId } from '../value-objects/UserId';
import { AggregateRoot } from '../events/base/AggregateRoot';
import {
  DhikrSessionCreatedEvent,
  DhikrCountIncrementedEvent,
  DhikrSessionCompletedEvent,
  DhikrTargetReachedEvent
} from '../events/DhikrEvents';

export class DhikrSession extends AggregateRoot {
  private constructor(
    private readonly _id: DhikrSessionId,
    private readonly _userId: UserId,
    private readonly _dhikrType: string,
    private readonly _dhikrText: string,
    private _count: number,
    private readonly _targetCount: number | null,
    private readonly _date: string,
    private readonly _sessionStart: Date,
    private _sessionEnd: Date | null,
    private _notes: string | null,
    private _tags: string[],
    private readonly _createdAt: Date,
    private _updatedAt: Date
  ) {
    super();
  }

  static create(params: {
    id?: string;
    userId: string;
    dhikrType: string;
    dhikrText: string;
    count?: number;
    targetCount?: number;
    date: string;
    sessionStart?: Date;
    sessionEnd?: Date;
    notes?: string;
    tags?: string[];
    createdAt?: Date;
    updatedAt?: Date;
  }): DhikrSession {
    const session = new DhikrSession(
      new DhikrSessionId(params.id),
      new UserId(params.userId),
      params.dhikrType,
      params.dhikrText,
      params.count || 0,
      params.targetCount || null,
      params.date,
      params.sessionStart || new Date(),
      params.sessionEnd || null,
      params.notes || null,
      params.tags || [],
      params.createdAt || new Date(),
      params.updatedAt || new Date()
    );

    // Emit creation event only for new sessions
    if (!params.id) {
      session.addDomainEvent(
        new DhikrSessionCreatedEvent(
          session._id.toString(),
          session._userId.toString(),
          session._dhikrType,
          session._dhikrText,
          session._date,
          session._targetCount
        )
      );
    }

    return session;
  }

  get id(): DhikrSessionId {
    return this._id;
  }

  get userId(): UserId {
    return this._userId;
  }

  get dhikrType(): string {
    return this._dhikrType;
  }

  get dhikrText(): string {
    return this._dhikrText;
  }

  get count(): number {
    return this._count;
  }

  get targetCount(): number | null {
    return this._targetCount;
  }

  get date(): string {
    return this._date;
  }

  get sessionStart(): Date {
    return this._sessionStart;
  }

  get sessionEnd(): Date | null {
    return this._sessionEnd;
  }

  get notes(): string | null {
    return this._notes;
  }

  get tags(): string[] {
    return [...this._tags];
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  get isCompleted(): boolean {
    return this._sessionEnd !== null;
  }

  get hasReachedTarget(): boolean {
    return this._targetCount !== null && this._count >= this._targetCount;
  }

  get sessionDuration(): number | null {
    if (!this._sessionEnd) return null;
    return Math.floor((this._sessionEnd.getTime() - this._sessionStart.getTime()) / 1000);
  }

  incrementCount(increment: number = 1): void {
    if (this.isCompleted) {
      throw new Error('Cannot increment count on completed session');
    }

    const previousCount = this._count;
    this._count += increment;
    this._updatedAt = new Date();

    this.addDomainEvent(
      new DhikrCountIncrementedEvent(
        this._id.toString(),
        this._userId.toString(),
        this._dhikrType,
        previousCount,
        this._count,
        increment
      )
    );

    // Check if target reached
    if (this._targetCount && previousCount < this._targetCount && this._count >= this._targetCount) {
      this.addDomainEvent(
        new DhikrTargetReachedEvent(
          this._id.toString(),
          this._userId.toString(),
          this._dhikrType,
          this._targetCount,
          this._count
        )
      );
    }
  }

  updateNotes(notes: string): void {
    this._notes = notes;
    this._updatedAt = new Date();
  }

  updateTags(tags: string[]): void {
    this._tags = [...tags];
    this._updatedAt = new Date();
  }

  completeSession(): void {
    if (this.isCompleted) {
      throw new Error('Session is already completed');
    }

    this._sessionEnd = new Date();
    this._updatedAt = new Date();

    this.addDomainEvent(
      new DhikrSessionCompletedEvent(
        this._id.toString(),
        this._userId.toString(),
        this._dhikrType,
        this._count,
        this.sessionDuration!,
        this.hasReachedTarget
      )
    );
  }

  protected get aggregateId(): string {
    return this._id.toString();
  }

  protected get aggregateType(): string {
    return 'DhikrSession';
  }

  toDTO() {
    return {
      id: this._id.toString(),
      userId: this._userId.toString(),
      dhikrType: this._dhikrType,
      dhikrText: this._dhikrText,
      count: this._count,
      targetCount: this._targetCount,
      date: this._date,
      sessionStart: this._sessionStart.toISOString(),
      sessionEnd: this._sessionEnd?.toISOString() || null,
      notes: this._notes,
      tags: this._tags,
      isCompleted: this.isCompleted,
      hasReachedTarget: this.hasReachedTarget,
      sessionDuration: this.sessionDuration,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString()
    };
  }
}