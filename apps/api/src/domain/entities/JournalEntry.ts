import { JournalId } from '../value-objects/JournalId';
import { UserId } from '../value-objects/UserId';

export class JournalEntry {
  private constructor(
    private readonly _id: JournalId,
    private readonly _userId: UserId,
    private _content: string,
    private _tags: string[],
    private readonly _createdAt: Date
  ) {
    if (!_content.trim()) {
      throw new Error('Journal content cannot be empty');
    }
  }

  static create(params: {
    id?: string;
    userId: string;
    content: string;
    tags?: string[];
    createdAt?: Date;
  }): JournalEntry {
    return new JournalEntry(
      new JournalId(params.id),
      new UserId(params.userId),
      params.content,
      params.tags || [],
      params.createdAt || new Date()
    );
  }

  get id(): JournalId {
    return this._id;
  }

  get userId(): UserId {
    return this._userId;
  }

  get content(): string {
    return this._content;
  }

  get tags(): string[] {
    return [...this._tags];
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  updateContent(content: string): void {
    if (!content.trim()) {
      throw new Error('Journal content cannot be empty');
    }
    this._content = content;
  }

  addTag(tag: string): void {
    const normalizedTag = tag.trim().toLowerCase();
    if (normalizedTag && !this._tags.includes(normalizedTag)) {
      this._tags.push(normalizedTag);
    }
  }

  removeTag(tag: string): void {
    const normalizedTag = tag.trim().toLowerCase();
    this._tags = this._tags.filter(t => t !== normalizedTag);
  }

  setTags(tags: string[]): void {
    this._tags = tags
      .map(t => t.trim().toLowerCase())
      .filter(t => t.length > 0)
      .filter((t, i, arr) => arr.indexOf(t) === i); // Remove duplicates
  }

  containsText(searchText: string): boolean {
    const search = searchText.toLowerCase();
    return this._content.toLowerCase().includes(search) ||
           this._tags.some(tag => tag.includes(search));
  }

  toDTO() {
    return {
      id: this._id.toString(),
      userId: this._userId.toString(),
      content: this._content,
      tags: this._tags.length > 0 ? this._tags : undefined,
      createdAt: this._createdAt.toISOString()
    };
  }
}