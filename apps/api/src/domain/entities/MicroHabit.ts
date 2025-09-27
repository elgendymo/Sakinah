export class MicroHabit {
  private constructor(
    private readonly _title: string,
    private readonly _schedule: string,
    private readonly _target: number
  ) {
    if (_target < 1) {
      throw new Error('Target must be at least 1');
    }
  }

  static create(title: string, schedule: string, target: number): MicroHabit {
    return new MicroHabit(title, schedule, target);
  }

  get title(): string {
    return this._title;
  }

  get schedule(): string {
    return this._schedule;
  }

  get target(): number {
    return this._target;
  }

  toDTO() {
    return {
      title: this._title,
      schedule: this._schedule,
      target: this._target
    };
  }
}