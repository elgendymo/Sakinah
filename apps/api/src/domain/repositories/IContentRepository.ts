import { Result } from '@/shared/result';
import { ContentSnippet, ContentType } from '@sakinah/types';

export interface ContentFilter {
  tags?: string[];
  type?: ContentType;
  limit?: number;
  offset?: number;
}

export interface IContentRepository {
  findByTags(tags: string[]): Promise<Result<ContentSnippet[]>>;
  findById(id: string): Promise<Result<ContentSnippet | null>>;
  findAll(): Promise<Result<ContentSnippet[]>>;
  findWithFilter(filter: ContentFilter): Promise<Result<ContentSnippet[]>>;
}