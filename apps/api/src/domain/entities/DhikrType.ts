import { DhikrTypeId } from '../value-objects/DhikrTypeId';

export class DhikrType {
  private constructor(
    private readonly _id: DhikrTypeId,
    private readonly _name: string,
    private _displayName: string,
    private _arabicText: string | null,
    private _transliteration: string | null,
    private _translation: string | null,
    private _description: string | null,
    private _recommendedCount: number | null,
    private _tags: string[],
    private _isActive: boolean,
    private readonly _createdAt: Date
  ) {}

  static create(params: {
    id?: string;
    name: string;
    displayName: string;
    arabicText?: string;
    transliteration?: string;
    translation?: string;
    description?: string;
    recommendedCount?: number;
    tags?: string[];
    isActive?: boolean;
    createdAt?: Date;
  }): DhikrType {
    return new DhikrType(
      new DhikrTypeId(params.id),
      params.name,
      params.displayName,
      params.arabicText || null,
      params.transliteration || null,
      params.translation || null,
      params.description || null,
      params.recommendedCount || null,
      params.tags || [],
      params.isActive !== undefined ? params.isActive : true,
      params.createdAt || new Date()
    );
  }

  get id(): DhikrTypeId {
    return this._id;
  }

  get name(): string {
    return this._name;
  }

  get displayName(): string {
    return this._displayName;
  }

  get arabicText(): string | null {
    return this._arabicText;
  }

  get transliteration(): string | null {
    return this._transliteration;
  }

  get translation(): string | null {
    return this._translation;
  }

  get description(): string | null {
    return this._description;
  }

  get recommendedCount(): number | null {
    return this._recommendedCount;
  }

  get tags(): string[] {
    return [...this._tags];
  }

  get isActive(): boolean {
    return this._isActive;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  update(params: {
    displayName?: string;
    arabicText?: string;
    transliteration?: string;
    translation?: string;
    description?: string;
    recommendedCount?: number;
    tags?: string[];
    isActive?: boolean;
  }): void {
    if (params.displayName !== undefined) {
      this._displayName = params.displayName;
    }
    if (params.arabicText !== undefined) {
      this._arabicText = params.arabicText;
    }
    if (params.transliteration !== undefined) {
      this._transliteration = params.transliteration;
    }
    if (params.translation !== undefined) {
      this._translation = params.translation;
    }
    if (params.description !== undefined) {
      this._description = params.description;
    }
    if (params.recommendedCount !== undefined) {
      this._recommendedCount = params.recommendedCount;
    }
    if (params.tags !== undefined) {
      this._tags = [...params.tags];
    }
    if (params.isActive !== undefined) {
      this._isActive = params.isActive;
    }
  }

  activate(): void {
    this._isActive = true;
  }

  deactivate(): void {
    this._isActive = false;
  }

  toDTO() {
    return {
      id: this._id.toString(),
      name: this._name,
      displayName: this._displayName,
      arabicText: this._arabicText,
      transliteration: this._transliteration,
      translation: this._translation,
      description: this._description,
      recommendedCount: this._recommendedCount,
      tags: this._tags,
      isActive: this._isActive,
      createdAt: this._createdAt.toISOString()
    };
  }
}