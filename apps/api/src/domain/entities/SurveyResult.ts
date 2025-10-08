import { SurveyResultId } from '../value-objects/SurveyResultId';
import { UserId } from '../value-objects/UserId';

export type Disease = 'envy' | 'arrogance' | 'selfDeception' | 'lust' | 'anger' | 'malice' | 'backbiting' | 'suspicion' | 'loveOfDunya' | 'laziness' | 'despair';
export type LikertScore = 1 | 2 | 3 | 4 | 5;

export interface DiseaseScore {
  disease: Disease;
  score: LikertScore;
}

export interface ReflectionAnswer {
  strongestStruggle: string;
  dailyHabit: string;
}

export interface PersonalizedHabit {
  id: string;
  title: string;
  description: string;
  frequency: 'daily' | 'weekly' | 'bi-weekly';
  targetDisease: Disease;
  difficultyLevel: 'easy' | 'moderate' | 'challenging';
  estimatedDuration: string;
  islamicContentIds: string[];
}

export interface TazkiyahPlan {
  criticalDiseases: Disease[];
  planType: 'takhliyah';
  phases: TazkiyahPhase[];
  expectedDuration: string;
  milestones: PlanMilestone[];
}

export interface TazkiyahPhase {
  phaseNumber: number;
  title: string;
  description: string;
  targetDiseases: Disease[];
  duration: string;
  practices: Practice[];
  checkpoints: string[];
}

export interface Practice {
  name: string;
  type: 'dhikr' | 'dua' | 'reflection' | 'behavioral' | 'study';
  description: string;
  frequency: string;
  islamicContentIds: string[];
}

export interface PlanMilestone {
  id: string;
  title: string;
  description: string;
  targetDate: Date;
  completed: boolean;
}

export interface RadarChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
  }>;
}

export class SurveyResult {
  private constructor(
    private readonly _id: SurveyResultId,
    private readonly _userId: UserId,
    private readonly _diseaseScores: Map<Disease, LikertScore>,
    private readonly _criticalDiseases: Disease[],
    private readonly _reflectionAnswers: ReflectionAnswer,
    private readonly _personalizedHabits: PersonalizedHabit[],
    private readonly _tazkiyahPlan: TazkiyahPlan,
    private readonly _radarChartData: RadarChartData | undefined,
    private readonly _generatedAt: Date,
    private _updatedAt: Date
  ) {}

  static create(params: {
    id?: string;
    userId: string;
    diseaseScores: Record<Disease, LikertScore>;
    reflectionAnswers: ReflectionAnswer;
    personalizedHabits: PersonalizedHabit[];
    tazkiyahPlan: TazkiyahPlan;
    radarChartData?: RadarChartData;
    generatedAt?: Date;
    updatedAt?: Date;
  }): SurveyResult {
    // Validate reflection answers
    if (!params.reflectionAnswers.strongestStruggle || params.reflectionAnswers.strongestStruggle.length < 10) {
      throw new Error('Strongest struggle must be at least 10 characters');
    }
    if (!params.reflectionAnswers.dailyHabit || params.reflectionAnswers.dailyHabit.length < 10) {
      throw new Error('Daily habit must be at least 10 characters');
    }
    if (params.reflectionAnswers.strongestStruggle.length > 500) {
      throw new Error('Strongest struggle cannot exceed 500 characters');
    }
    if (params.reflectionAnswers.dailyHabit.length > 500) {
      throw new Error('Daily habit cannot exceed 500 characters');
    }

    // Convert disease scores to Map and identify critical diseases
    const diseaseScoreMap = new Map<Disease, LikertScore>();
    const criticalDiseases: Disease[] = [];

    Object.entries(params.diseaseScores).forEach(([disease, score]) => {
      diseaseScoreMap.set(disease as Disease, score);
      if (score >= 4) {
        criticalDiseases.push(disease as Disease);
      }
    });

    return new SurveyResult(
      new SurveyResultId(params.id),
      new UserId(params.userId),
      diseaseScoreMap,
      criticalDiseases,
      params.reflectionAnswers,
      params.personalizedHabits,
      params.tazkiyahPlan,
      params.radarChartData,
      params.generatedAt || new Date(),
      params.updatedAt || new Date()
    );
  }

  get id(): SurveyResultId {
    return this._id;
  }

  get userId(): UserId {
    return this._userId;
  }

  get diseaseScores(): Map<Disease, LikertScore> {
    return new Map(this._diseaseScores);
  }

  get criticalDiseases(): Disease[] {
    return [...this._criticalDiseases];
  }

  get moderateDiseases(): Disease[] {
    return Array.from(this._diseaseScores.entries())
      .filter(([_, score]) => score === 3)
      .map(([disease, _]) => disease);
  }

  get strengths(): Disease[] {
    return Array.from(this._diseaseScores.entries())
      .filter(([_, score]) => score <= 2)
      .map(([disease, _]) => disease);
  }

  get reflectionAnswers(): ReflectionAnswer {
    return { ...this._reflectionAnswers };
  }

  get personalizedHabits(): PersonalizedHabit[] {
    return [...this._personalizedHabits];
  }

  get tazkiyahPlan(): TazkiyahPlan {
    return JSON.parse(JSON.stringify(this._tazkiyahPlan));
  }

  get radarChartData(): RadarChartData | undefined {
    return this._radarChartData ? JSON.parse(JSON.stringify(this._radarChartData)) : undefined;
  }

  get generatedAt(): Date {
    return this._generatedAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  updateRadarChartData(chartData: RadarChartData): void {
    this._updatedAt = new Date();
  }

  addPersonalizedHabit(habit: PersonalizedHabit): void {
    if (this._personalizedHabits.some(h => h.id === habit.id)) {
      throw new Error('Habit with this ID already exists');
    }
    this._personalizedHabits.push(habit);
    this._updatedAt = new Date();
  }

  getCategorizedDiseases() {
    return {
      critical: this.criticalDiseases,
      moderate: this.moderateDiseases,
      strengths: this.strengths
    };
  }

  getScoreForDisease(disease: Disease): LikertScore | undefined {
    return this._diseaseScores.get(disease);
  }

  toDTO() {
    const diseaseScoresObject: Record<string, LikertScore> = {};
    this._diseaseScores.forEach((score, disease) => {
      diseaseScoresObject[disease] = score;
    });

    return {
      id: this._id.toString(),
      userId: this._userId.toString(),
      diseaseScores: diseaseScoresObject,
      categorizedDiseases: this.getCategorizedDiseases(),
      criticalDiseases: this._criticalDiseases,
      reflectionAnswers: this._reflectionAnswers,
      personalizedHabits: this._personalizedHabits,
      tazkiyahPlan: this._tazkiyahPlan,
      radarChartData: this._radarChartData,
      generatedAt: this._generatedAt.toISOString(),
      updatedAt: this._updatedAt.toISOString()
    };
  }
}