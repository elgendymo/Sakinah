import { BaseId } from './BaseId';

export class OnboardingId extends BaseId {
  constructor(value: string) {
    super(value);
  }

  static create(): OnboardingId {
    return new OnboardingId(crypto.randomUUID());
  }

  static fromString(value: string): OnboardingId {
    return new OnboardingId(value);
  }
}