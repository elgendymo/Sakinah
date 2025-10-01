import { BaseId } from './BaseId';

export class UserId extends BaseId {
  get value(): string {
    return this.toString();
  }
}