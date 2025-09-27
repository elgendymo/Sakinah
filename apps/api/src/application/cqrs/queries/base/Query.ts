/**
 * Base Query interface for CQRS pattern
 */
export interface Query {
  // Query marker interface
}
/**
 * Base Query Handler interface
 */
export interface QueryHandler<TQuery extends Query, TResult = any> {
  handle(query: TQuery): Promise<TResult>;
}

/**
 * Query Bus interface for dispatching queries
 */
export interface QueryBus {
  dispatch<TQuery extends Query, TResult = any>(query: TQuery, options?: any): Promise<TResult>;
  register<TQuery extends Query, TResult = any>(
    queryType: string,
    handler: QueryHandler<TQuery, TResult>
  ): void;
}

/**
 * Base abstract query class
 */
export abstract class BaseQuery<_TResult = any> implements Query {
  public readonly timestamp: Date;
  public readonly correlationId: string;

  constructor(
    public readonly type: string,
    public readonly userId?: string,
    correlationId?: string
  ) {
    this.timestamp = new Date();
    this.correlationId = correlationId || this.generateCorrelationId();
  }

  private generateCorrelationId(): string {
    return `qry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Pagination parameters for queries
 */
export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated result wrapper
 */
export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}