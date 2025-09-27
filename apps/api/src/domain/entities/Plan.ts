import { PlanId } from '../value-objects/PlanId';
import { UserId } from '../value-objects/UserId';
import { MicroHabit } from './MicroHabit';

export type PlanKind = 'takhliyah' | 'tahliyah';
export type PlanStatus = 'active' | 'archived';

export class Plan {
  private constructor(
    private readonly _id: PlanId,
    private readonly _userId: UserId,
    private readonly _kind: PlanKind,
    private readonly _target: string,
    private _microHabits: MicroHabit[],
    private _duaIds: string[],
    private _contentIds: string[],
    private _status: PlanStatus,
    private readonly _createdAt: Date
  ) {}

  static create(params: {
    id?: string;
    userId: string;
    kind: PlanKind;
    target: string;
    microHabits: MicroHabit[];
    duaIds?: string[];
    contentIds?: string[];
    status?: PlanStatus;
    createdAt?: Date;
  }): Plan {
    return new Plan(
      new PlanId(params.id),
      new UserId(params.userId),
      params.kind,
      params.target,
      params.microHabits,
      params.duaIds || [],
      params.contentIds || [],
      params.status || 'active',
      params.createdAt || new Date()
    );
  }

  get id(): PlanId {
    return this._id;
  }

  get userId(): UserId {
    return this._userId;
  }

  get kind(): PlanKind {
    return this._kind;
  }

  get target(): string {
    return this._target;
  }

  get microHabits(): MicroHabit[] {
    return [...this._microHabits];
  }

  get duaIds(): string[] {
    return [...this._duaIds];
  }

  get contentIds(): string[] {
    return [...this._contentIds];
  }

  get status(): PlanStatus {
    return this._status;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  archive(): void {
    if (this._status === 'archived') {
      throw new Error('Plan is already archived');
    }
    this._status = 'archived';
  }

  activate(): void {
    if (this._status === 'active') {
      throw new Error('Plan is already active');
    }
    this._status = 'active';
  }

  addMicroHabit(habit: MicroHabit): void {
    this._microHabits.push(habit);
  }

  addContent(contentId: string): void {
    if (!this._contentIds.includes(contentId)) {
      this._contentIds.push(contentId);
    }
  }

  addDua(duaId: string): void {
    if (!this._duaIds.includes(duaId)) {
      this._duaIds.push(duaId);
    }
  }

  toDTO() {
    return {
      id: this._id.toString(),
      userId: this._userId.toString(),
      kind: this._kind,
      target: this._target,
      microHabits: this._microHabits.map(h => h.toDTO()),
      duaIds: this._duaIds,
      contentIds: this._contentIds,
      status: this._status,
      createdAt: this._createdAt.toISOString()
    };
  }
}