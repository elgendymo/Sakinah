export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

export class Location {
  private constructor(
    private readonly _latitude: number,
    private readonly _longitude: number,
    private readonly _city?: string,
    private readonly _country?: string,
    private readonly _timezone?: string
  ) {
    this.validateCoordinates();
  }

  static create(params: {
    latitude: number;
    longitude: number;
    city?: string;
    country?: string;
    timezone?: string;
  }): Location {
    return new Location(
      params.latitude,
      params.longitude,
      params.city,
      params.country,
      params.timezone
    );
  }

  static fromCoordinates(coordinates: LocationCoordinates): Location {
    return new Location(
      coordinates.latitude,
      coordinates.longitude
    );
  }

  get latitude(): number {
    return this._latitude;
  }

  get longitude(): number {
    return this._longitude;
  }

  get city(): string | undefined {
    return this._city;
  }

  get country(): string | undefined {
    return this._country;
  }

  get timezone(): string | undefined {
    return this._timezone;
  }

  get coordinates(): LocationCoordinates {
    return {
      latitude: this._latitude,
      longitude: this._longitude
    };
  }

  private validateCoordinates(): void {
    if (this._latitude < -90 || this._latitude > 90) {
      throw new Error('Latitude must be between -90 and 90 degrees');
    }

    if (this._longitude < -180 || this._longitude > 180) {
      throw new Error('Longitude must be between -180 and 180 degrees');
    }
  }

  equals(other: Location): boolean {
    return (
      this._latitude === other._latitude &&
      this._longitude === other._longitude &&
      this._city === other._city &&
      this._country === other._country &&
      this._timezone === other._timezone
    );
  }

  toString(): string {
    return `Location(${this._latitude}, ${this._longitude}${this._city ? `, ${this._city}` : ''}${this._country ? `, ${this._country}` : ''})`;
  }
}