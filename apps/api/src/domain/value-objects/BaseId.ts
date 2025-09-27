import { v4 as uuidv4 } from 'uuid';

export abstract class BaseId {
  private readonly _value: string;

  constructor(value?: string) {
    this._value = value || uuidv4();
    if (!this.isValid(this._value)) {
      throw new Error(`Invalid ${this.constructor.name}: ${this._value}`);
    }
  }

  protected isValid(value: string): boolean {
    // UUID v4 validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  }

  toString(): string {
    return this._value;
  }

  equals(other: BaseId): boolean {
    return this._value === other._value;
  }
}