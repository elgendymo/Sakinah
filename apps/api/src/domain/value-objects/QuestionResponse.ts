export type LikertScore = 1 | 2 | 3 | 4 | 5;

export class QuestionResponse {
  constructor(
    public readonly questionId: string,
    public readonly score: LikertScore,
    public readonly note?: string
  ) {
    if (!this.isValidScore(score)) {
      throw new Error(`Invalid Likert score: ${score}. Must be between 1 and 5.`);
    }
    if (!this.isValidQuestionId(questionId)) {
      throw new Error(`Invalid question ID: ${questionId}`);
    }
    if (note && note.length > 1000) {
      throw new Error('Note cannot exceed 1000 characters');
    }
  }

  private isValidScore(score: number): score is LikertScore {
    return Number.isInteger(score) && score >= 1 && score <= 5;
  }

  private isValidQuestionId(questionId: string): boolean {
    return questionId.length > 0 && questionId.length <= 50;
  }

  toDTO() {
    return {
      questionId: this.questionId,
      score: this.score,
      note: this.note
    };
  }
}