export type CalculationMethodType =
  | 'MuslimWorldLeague'
  | 'Egyptian'
  | 'Karachi'
  | 'UmmAlQura'
  | 'Dubai'
  | 'MoonsightingCommittee'
  | 'NorthAmerica'
  | 'Kuwait'
  | 'Qatar'
  | 'Singapore'
  | 'Tehran'
  | 'Turkey';

export class CalculationMethod {
  private constructor(private readonly _method: CalculationMethodType) {}

  static create(method: CalculationMethodType): CalculationMethod {
    return new CalculationMethod(method);
  }

  static getDefault(): CalculationMethod {
    return new CalculationMethod('MuslimWorldLeague');
  }

  get method(): CalculationMethodType {
    return this._method;
  }

  equals(other: CalculationMethod): boolean {
    return this._method === other._method;
  }

  toString(): string {
    return this._method;
  }

  static getAvailableMethods(): CalculationMethodType[] {
    return [
      'MuslimWorldLeague',
      'Egyptian',
      'Karachi',
      'UmmAlQura',
      'Dubai',
      'MoonsightingCommittee',
      'NorthAmerica',
      'Kuwait',
      'Qatar',
      'Singapore',
      'Tehran',
      'Turkey'
    ];
  }

  static isValidMethod(method: string): method is CalculationMethodType {
    return CalculationMethod.getAvailableMethods().includes(method as CalculationMethodType);
  }
}