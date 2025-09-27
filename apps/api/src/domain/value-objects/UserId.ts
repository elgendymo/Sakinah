import { BaseId } from './BaseId';

export class UserId extends BaseId {
  static fromString(value: string): UserId {
    return new UserId(value);
  }

  get value(): string {
    return this.toString();
  }
}