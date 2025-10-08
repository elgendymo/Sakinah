import { UserId } from '../value-objects/UserId';

export class SurveyProgress {
  private constructor(
    private readonly _userId: UserId,
    private _currentPhase: number,
    private _phase1Completed: boolean,
    private _phase2Completed: boolean,
    private _reflectionCompleted: boolean,
    private _resultsGenerated: boolean,
    private readonly _startedAt: Date,
    private _lastUpdated: Date
  ) {}

  static create(params: {
    userId: string;
    currentPhase?: number;
    phase1Completed?: boolean;
    phase2Completed?: boolean;
    reflectionCompleted?: boolean;
    resultsGenerated?: boolean;
    startedAt?: Date;
    lastUpdated?: Date;
  }): SurveyProgress {
    const currentPhase = params.currentPhase ?? 0;

    if (currentPhase < 0 || currentPhase > 4) {
      throw new Error('Current phase must be between 0 and 4');
    }

    return new SurveyProgress(
      new UserId(params.userId),
      currentPhase,
      params.phase1Completed ?? false,
      params.phase2Completed ?? false,
      params.reflectionCompleted ?? false,
      params.resultsGenerated ?? false,
      params.startedAt || new Date(),
      params.lastUpdated || new Date()
    );
  }

  static createNew(userId: string): SurveyProgress {
    return SurveyProgress.create({
      userId,
      currentPhase: 0,
      startedAt: new Date()
    });
  }

  get userId(): UserId {
    return this._userId;
  }

  get currentPhase(): number {
    return this._currentPhase;
  }

  get phase1Completed(): boolean {
    return this._phase1Completed;
  }

  get phase2Completed(): boolean {
    return this._phase2Completed;
  }

  get reflectionCompleted(): boolean {
    return this._reflectionCompleted;
  }

  get resultsGenerated(): boolean {
    return this._resultsGenerated;
  }

  get startedAt(): Date {
    return this._startedAt;
  }

  get lastUpdated(): Date {
    return this._lastUpdated;
  }

  get isCompleted(): boolean {
    return this._resultsGenerated;
  }

  get progressPercentage(): number {
    if (this._resultsGenerated) return 100;
    if (this._reflectionCompleted) return 75;
    if (this._phase2Completed) return 50;
    if (this._phase1Completed) return 25;
    return 0;
  }

  advanceToPhase1(): void {
    if (this._currentPhase !== 0) {
      throw new Error('Can only advance to Phase 1 from welcome phase');
    }
    this._currentPhase = 1;
    this._lastUpdated = new Date();
  }

  completePhase1(): void {
    if (this._currentPhase !== 1) {
      throw new Error('Must be in Phase 1 to complete it');
    }
    if (this._phase1Completed) {
      throw new Error('Phase 1 is already completed');
    }
    this._phase1Completed = true;
    this._currentPhase = 2;
    this._lastUpdated = new Date();
  }

  completePhase2(): void {
    if (this._currentPhase !== 2) {
      throw new Error('Must be in Phase 2 to complete it');
    }
    if (!this._phase1Completed) {
      throw new Error('Phase 1 must be completed before Phase 2');
    }
    if (this._phase2Completed) {
      throw new Error('Phase 2 is already completed');
    }
    this._phase2Completed = true;
    this._currentPhase = 3;
    this._lastUpdated = new Date();
  }

  completeReflection(): void {
    if (this._currentPhase !== 3) {
      throw new Error('Must be in reflection phase to complete it');
    }
    if (!this._phase2Completed) {
      throw new Error('Phase 2 must be completed before reflection');
    }
    if (this._reflectionCompleted) {
      throw new Error('Reflection is already completed');
    }
    this._reflectionCompleted = true;
    this._currentPhase = 4;
    this._lastUpdated = new Date();
  }

  generateResults(): void {
    if (this._currentPhase !== 4) {
      throw new Error('Must be in results phase to generate results');
    }
    if (!this._reflectionCompleted) {
      throw new Error('Reflection must be completed before generating results');
    }
    if (this._resultsGenerated) {
      throw new Error('Results are already generated');
    }
    this._resultsGenerated = true;
    this._lastUpdated = new Date();
  }

  canAdvanceToPhase(targetPhase: number): boolean {
    switch (targetPhase) {
      case 1:
        return this._currentPhase === 0;
      case 2:
        return this._currentPhase >= 1 && this._phase1Completed;
      case 3:
        return this._currentPhase >= 2 && this._phase2Completed;
      case 4:
        return this._currentPhase >= 3 && this._reflectionCompleted;
      default:
        return false;
    }
  }

  getNextAvailablePhase(): number {
    if (!this._phase1Completed) return 1;
    if (!this._phase2Completed) return 2;
    if (!this._reflectionCompleted) return 3;
    if (!this._resultsGenerated) return 4;
    return 4; // Survey completed
  }

  reset(): void {
    this._currentPhase = 0;
    this._phase1Completed = false;
    this._phase2Completed = false;
    this._reflectionCompleted = false;
    this._resultsGenerated = false;
    this._lastUpdated = new Date();
  }

  toDTO() {
    return {
      userId: this._userId.toString(),
      currentPhase: this._currentPhase,
      phase1Completed: this._phase1Completed,
      phase2Completed: this._phase2Completed,
      reflectionCompleted: this._reflectionCompleted,
      resultsGenerated: this._resultsGenerated,
      isCompleted: this.isCompleted,
      progressPercentage: this.progressPercentage,
      nextAvailablePhase: this.getNextAvailablePhase(),
      startedAt: this._startedAt.toISOString(),
      lastUpdated: this._lastUpdated.toISOString()
    };
  }
}