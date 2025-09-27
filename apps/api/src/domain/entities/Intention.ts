import { IntentionId } from '../value-objects/IntentionId';
import { UserId } from '../value-objects/UserId';
import { AggregateRoot } from '../events/base/AggregateRoot';
import {
  IntentionCreatedEvent,
  IntentionUpdatedEvent,
  IntentionCompletedEvent,
  IntentionArchivedEvent
} from '../events/IntentionEvents';

export type IntentionStatus = 'active' | 'completed' | 'archived';

export type IntentionPriority = 'low' | 'medium' | 'high';

export interface IntentionReminder {
  enabled: boolean;
  time?: string; // HH:MM format
  daysOfWeek?: number[]; // 0-6 (Sunday-Saturday)
}

export class Intention extends AggregateRoot {
  private constructor(
    private readonly _id: IntentionId,
    private readonly _userId: UserId,
    private _text: string,
    private _description: string | null,
    private _priority: IntentionPriority,
    private _status: IntentionStatus,
    private _targetDate: Date | null,
    private _completedAt: Date | null,
    private _reminder: IntentionReminder,
    private _tags: string[],
    private readonly _createdAt: Date,
    private _updatedAt: Date
  ) {
    super();
  }

  static create(params: {
    id?: string;
    userId: string;
    text: string;
    description?: string | null;
    priority?: IntentionPriority;
    status?: IntentionStatus;
    targetDate?: Date | null;
    completedAt?: Date | null;
    reminder?: IntentionReminder;
    tags?: string[];
    createdAt?: Date;
    updatedAt?: Date;
  }): Intention {
    const intention = new Intention(
      new IntentionId(params.id),
      new UserId(params.userId),
      params.text,
      params.description || null,
      params.priority || 'medium',
      params.status || 'active',
      params.targetDate || null,
      params.completedAt || null,
      params.reminder || { enabled: false },
      params.tags || [],
      params.createdAt || new Date(),
      params.updatedAt || new Date()
    );

    // Emit creation event only for new intentions
    if (!params.id) {
      intention.addDomainEvent(
        new IntentionCreatedEvent(
          intention._id.toString(),
          intention._userId.toString(),
          intention._text,
          intention._priority,
          intention._targetDate
        )
      );
    }

    return intention;
  }

  get id(): IntentionId {
    return this._id;
  }

  get userId(): UserId {
    return this._userId;
  }

  get text(): string {
    return this._text;
  }

  get description(): string | null {
    return this._description;
  }

  get priority(): IntentionPriority {
    return this._priority;
  }

  get status(): IntentionStatus {
    return this._status;
  }

  get targetDate(): Date | null {
    return this._targetDate;
  }

  get completedAt(): Date | null {
    return this._completedAt;
  }

  get reminder(): IntentionReminder {
    return { ...this._reminder };
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

  updateText(text: string): void {
    if (text.trim().length === 0) {
      throw new Error('Intention text cannot be empty');
    }

    const oldText = this._text;
    this._text = text.trim();
    this._updatedAt = new Date();

    this.addDomainEvent(
      new IntentionUpdatedEvent(
        this._id.toString(),
        this._userId.toString(),
        { text: { old: oldText, new: this._text } }
      )
    );
  }

  updateDescription(description: string | null): void {
    const oldDescription = this._description;
    this._description = description ? description.trim() : null;
    this._updatedAt = new Date();

    this.addDomainEvent(
      new IntentionUpdatedEvent(
        this._id.toString(),
        this._userId.toString(),
        { description: { old: oldDescription, new: this._description } }
      )
    );
  }

  updatePriority(priority: IntentionPriority): void {
    const oldPriority = this._priority;
    this._priority = priority;
    this._updatedAt = new Date();

    this.addDomainEvent(
      new IntentionUpdatedEvent(
        this._id.toString(),
        this._userId.toString(),
        { priority: { old: oldPriority, new: this._priority } }
      )
    );
  }

  updateTargetDate(targetDate: Date | null): void {
    const oldTargetDate = this._targetDate;
    this._targetDate = targetDate;
    this._updatedAt = new Date();

    this.addDomainEvent(
      new IntentionUpdatedEvent(
        this._id.toString(),
        this._userId.toString(),
        { targetDate: { old: oldTargetDate, new: this._targetDate } }
      )
    );
  }

  updateReminder(reminder: IntentionReminder): void {
    const oldReminder = this._reminder;
    this._reminder = { ...reminder };
    this._updatedAt = new Date();

    this.addDomainEvent(
      new IntentionUpdatedEvent(
        this._id.toString(),
        this._userId.toString(),
        { reminder: { old: oldReminder, new: this._reminder } }
      )
    );
  }

  addTag(tag: string): void {
    const normalizedTag = tag.trim().toLowerCase();
    if (normalizedTag && !this._tags.includes(normalizedTag)) {
      this._tags.push(normalizedTag);
      this._updatedAt = new Date();

      this.addDomainEvent(
        new IntentionUpdatedEvent(
          this._id.toString(),
          this._userId.toString(),
          { tags: { action: 'added', tag: normalizedTag } }
        )
      );
    }
  }

  removeTag(tag: string): void {
    const normalizedTag = tag.trim().toLowerCase();
    const index = this._tags.indexOf(normalizedTag);
    if (index >= 0) {
      this._tags.splice(index, 1);
      this._updatedAt = new Date();

      this.addDomainEvent(
        new IntentionUpdatedEvent(
          this._id.toString(),
          this._userId.toString(),
          { tags: { action: 'removed', tag: normalizedTag } }
        )
      );
    }
  }

  markCompleted(): void {
    if (this._status === 'completed') {
      throw new Error('Intention is already completed');
    }

    if (this._status === 'archived') {
      throw new Error('Cannot complete an archived intention');
    }

    this._status = 'completed';
    this._completedAt = new Date();
    this._updatedAt = new Date();

    this.addDomainEvent(
      new IntentionCompletedEvent(
        this._id.toString(),
        this._userId.toString(),
        this._completedAt,
        this._text
      )
    );
  }

  markActive(): void {
    if (this._status === 'archived') {
      throw new Error('Cannot reactivate an archived intention');
    }

    this._status = 'active';
    this._completedAt = null;
    this._updatedAt = new Date();

    this.addDomainEvent(
      new IntentionUpdatedEvent(
        this._id.toString(),
        this._userId.toString(),
        { status: { old: 'completed', new: 'active' } }
      )
    );
  }

  archive(): void {
    this._status = 'archived';
    this._updatedAt = new Date();

    this.addDomainEvent(
      new IntentionArchivedEvent(
        this._id.toString(),
        this._userId.toString(),
        this._text
      )
    );
  }

  isOverdue(): boolean {
    if (!this._targetDate || this._status !== 'active') {
      return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const target = new Date(this._targetDate);
    target.setHours(0, 0, 0, 0);

    return target < today;
  }

  getDaysUntilTarget(): number | null {
    if (!this._targetDate || this._status !== 'active') {
      return null;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const target = new Date(this._targetDate);
    target.setHours(0, 0, 0, 0);

    return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }

  protected get aggregateId(): string {
    return this._id.toString();
  }

  protected get aggregateType(): string {
    return 'Intention';
  }

  toDTO() {
    return {
      id: this._id.toString(),
      userId: this._userId.toString(),
      text: this._text,
      description: this._description,
      priority: this._priority,
      status: this._status,
      targetDate: this._targetDate?.toISOString() || null,
      completedAt: this._completedAt?.toISOString() || null,
      reminder: this._reminder,
      tags: [...this._tags],
      isOverdue: this.isOverdue(),
      daysUntilTarget: this.getDaysUntilTarget(),
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString()
    };
  }
}