import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/result';
import { IContentRepository, ContentFilter } from '@/domain/repositories';
import { ContentSnippet, ContentType } from '@sakinah/types';
import { IDatabaseClient } from '../database/types';
import { Cacheable } from '../cache/decorators/Cacheable';

@injectable()
export class ContentRepositoryAdapter implements IContentRepository {
  constructor(
    @inject('IDatabaseClient') private db: IDatabaseClient
  ) {}

  @Cacheable({
    key: (tags: string[]) => `content:tags:${tags.sort().join(',')}`,
    ttl: 3600, // 1 hour
    tags: ['content']
  })
  async findByTags(tags: string[]): Promise<Result<ContentSnippet[]>> {
    try {
      const result = await this.db.getContentSnippetsByTags(tags);

      if (result.error) {
        return Result.error(new Error(result.error.message));
      }

      return Result.ok(result.data || []);
    } catch (error) {
      return Result.error(error as Error);
    }
  }

  @Cacheable({
    key: (id: string) => `content:id:${id}`,
    ttl: 3600, // 1 hour
    tags: ['content']
  })
  async findById(id: string): Promise<Result<ContentSnippet | null>> {
    try {
      const result = await this.db.getContentSnippetById(id);

      if (result.error) {
        return Result.error(new Error(result.error.message));
      }

      return Result.ok(result.data);
    } catch (error) {
      return Result.error(error as Error);
    }
  }

  async findAll(): Promise<Result<ContentSnippet[]>> {
    try {
      const result = await this.db.getAllContentSnippets();

      if (result.error) {
        return Result.error(new Error(result.error.message));
      }

      return Result.ok(result.data || []);
    } catch (error) {
      return Result.error(error as Error);
    }
  }

  @Cacheable({
    key: (filter: ContentFilter) => {
      const parts = [];
      if (filter.tags) parts.push(`tags:${filter.tags.sort().join(',')}`);
      if (filter.type) parts.push(`type:${filter.type}`);
      if (filter.limit) parts.push(`limit:${filter.limit}`);
      if (filter.offset) parts.push(`offset:${filter.offset}`);
      return `content:filter:${parts.join(':')}`;
    },
    ttl: 1800, // 30 minutes
    tags: ['content']
  })
  async findWithFilter(filter: ContentFilter): Promise<Result<ContentSnippet[]>> {
    try {
      let result;

      // Use optimized queries when possible
      if (filter.tags && filter.tags.length > 0) {
        result = await this.db.getContentSnippetsByTags(filter.tags);
      } else {
        result = await this.db.getAllContentSnippets();
      }

      if (result.error) {
        return Result.error(new Error(result.error.message));
      }

      let content = result.data || [];

      // Apply type filter if specified
      if (filter.type) {
        content = content.filter(item => item.type === filter.type);
      }

      // Apply pagination
      const offset = filter.offset || 0;
      const limit = filter.limit || 20;

      // Ensure limit doesn't exceed maximum
      const maxLimit = 100;
      const actualLimit = Math.min(limit, maxLimit);

      const paginatedContent = content.slice(offset, offset + actualLimit);

      return Result.ok(paginatedContent);
    } catch (error) {
      return Result.error(error as Error);
    }
  }
}