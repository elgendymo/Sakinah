import { SurveyResponseId } from '../value-objects/SurveyResponseId';
import { UserId } from '../value-objects/UserId';
import { QuestionResponse } from '../value-objects/QuestionResponse';

export class SurveyResponse {
  private constructor(
    private readonly _id: SurveyResponseId,
    private readonly _userId: UserId,
    private readonly _phaseNumber: number,
    private readonly _questionId: string,
    private readonly _score: number,
    private readonly _note: string | undefined,
    private readonly _completedAt: Date,
    private readonly _createdAt: Date
  ) {}

  static create(params: {
    id?: string;
    userId: string;
    phaseNumber: number;
    questionId: string;
    score: number;
    note?: string;
    completedAt?: Date;
    createdAt?: Date;
  }): SurveyResponse {
    if (params.phaseNumber < 1 || params.phaseNumber > 3) {
      throw new Error('Phase number must be between 1 and 3');
    }

    if (params.score < 1 || params.score > 5) {
      throw new Error('Score must be between 1 and 5');
    }

    if (!params.questionId || params.questionId.length === 0) {
      throw new Error('Question ID is required');
    }

    if (params.note && params.note.length > 1000) {
      throw new Error('Note cannot exceed 1000 characters');
    }

    return new SurveyResponse(
      new SurveyResponseId(params.id),
      new UserId(params.userId),
      params.phaseNumber,
      params.questionId,
      params.score,
      params.note,
      params.completedAt || new Date(),
      params.createdAt || new Date()
    );
  }

  static fromQuestionResponse(
    userId: string,
    phaseNumber: number,
    questionResponse: QuestionResponse,
    id?: string
  ): SurveyResponse {
    return SurveyResponse.create({
      id,
      userId,
      phaseNumber,
      questionId: questionResponse.questionId,
      score: questionResponse.score,
      note: questionResponse.note
    });
  }

  get id(): SurveyResponseId {
    return this._id;
  }

  get userId(): UserId {
    return this._userId;
  }

  get phaseNumber(): number {
    return this._phaseNumber;
  }

  get questionId(): string {
    return this._questionId;
  }

  get score(): number {
    return this._score;
  }

  get note(): string | undefined {
    return this._note;
  }

  get completedAt(): Date {
    return this._completedAt;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  toQuestionResponse(): QuestionResponse {
    return new QuestionResponse(this._questionId, this._score as any, this._note);
  }

  toDTO() {
    return {
      id: this._id.toString(),
      userId: this._userId.toString(),
      phaseNumber: this._phaseNumber,
      questionId: this._questionId,
      score: this._score,
      note: this._note,
      completedAt: this._completedAt.toISOString(),
      createdAt: this._createdAt.toISOString()
    };
  }
}