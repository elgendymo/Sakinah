/**
 * Request Transformer Interface
 *
 * Transforms request data before sending to API
 */
export interface RequestTransformer {
  transform(data: unknown, endpoint: string): unknown;
}

/**
 * Response Transformer Interface
 *
 * Transforms response data after receiving from API
 */
export interface ResponseTransformer {
  transform(data: unknown, endpoint: string): unknown;
}

/**
 * Snake Case to Camel Case Transformer
 *
 * Converts snake_case keys to camelCase
 */
export class SnakeToCamelTransformer implements ResponseTransformer {
  public transform(data: unknown, _endpoint: string): unknown {
    return this.convertKeysToCamelCase(data);
  }

  private convertKeysToCamelCase(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.convertKeysToCamelCase(item));
    }

    if (typeof obj === 'object' && !(obj instanceof Date)) {
      const converted: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const camelKey = this.snakeToCamel(key);
          converted[camelKey] = this.convertKeysToCamelCase(obj[key]);
        }
      }
      return converted;
    }

    return obj;
  }

  private snakeToCamel(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }
}

/**
 * Camel Case to Snake Case Transformer
 *
 * Converts camelCase keys to snake_case
 */
export class CamelToSnakeTransformer implements RequestTransformer {
  public transform(data: unknown, _endpoint: string): unknown {
    return this.convertKeysToSnakeCase(data);
  }

  private convertKeysToSnakeCase(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.convertKeysToSnakeCase(item));
    }

    if (typeof obj === 'object' && !(obj instanceof Date)) {
      const converted: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const snakeKey = this.camelToSnake(key);
          converted[snakeKey] = this.convertKeysToSnakeCase(obj[key]);
        }
      }
      return converted;
    }

    return obj;
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}

/**
 * Date Transformer
 *
 * Converts date strings to Date objects and vice versa
 */
export class DateTransformer implements RequestTransformer, ResponseTransformer {
  private dateFields: Set<string>;
  private datePattern: RegExp;

  constructor(dateFields: string[] = ['createdAt', 'updatedAt', 'deletedAt', 'date', 'timestamp']) {
    this.dateFields = new Set(dateFields);
    this.datePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
  }

  public transform(data: unknown, _endpoint: string): unknown {
    return this.transformDates(data);
  }

  private transformDates(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.transformDates(item));
    }

    if (typeof obj === 'object' && !(obj instanceof Date)) {
      const converted: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const value = obj[key];

          // Convert Date objects to ISO strings for requests
          if (value instanceof Date) {
            converted[key] = value.toISOString();
          }
          // Convert date strings to Date objects for responses
          else if (typeof value === 'string' && (this.dateFields.has(key) || this.datePattern.test(value))) {
            const date = new Date(value);
            converted[key] = isNaN(date.getTime()) ? value : date;
          }
          else {
            converted[key] = this.transformDates(value);
          }
        }
      }
      return converted;
    }

    return obj;
  }
}

/**
 * Pagination Transformer
 *
 * Transforms pagination response format between different API versions
 */
export class PaginationTransformer implements ResponseTransformer {
  public transform(data: unknown, _endpoint: string): unknown {
    // No versioning - use consistent pagination format
    return data;
  }
}

/**
 * Error Response Transformer
 *
 * Normalizes error response format across API versions
 */
export class ErrorResponseTransformer implements ResponseTransformer {
  public transform(data: unknown, _endpoint: string): unknown {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const obj = data as any;

    // Normalize error response format
    if (obj.error || obj.message || obj.errors) {
      return {
        success: false,
        error: {
          message: obj.error || obj.message || 'An error occurred',
          code: obj.errorCode || obj.code || 'UNKNOWN_ERROR',
          details: obj.errors || obj.details || [],
          timestamp: obj.timestamp || new Date().toISOString()
        }
      };
    }

    return data;
  }
}

/**
 * Success Response Transformer
 *
 * Handles success field removal for v2 endpoints
 */
export class SuccessResponseTransformer implements ResponseTransformer {
  public transform(data: unknown, _endpoint: string): unknown {
    // No versioning - use consistent response format
    return data;
  }
}

/**
 * Islamic Content Transformer
 *
 * Ensures proper handling of Arabic text and Islamic content
 */
export class IslamicContentTransformer implements ResponseTransformer {
  public transform(data: unknown, endpoint: string): unknown {
    // Only transform content-related endpoints
    if (!endpoint.includes('/content') && !endpoint.includes('/verses') && !endpoint.includes('/hadith')) {
      return data;
    }

    return this.transformIslamicContent(data);
  }

  private transformIslamicContent(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.transformIslamicContent(item));
    }

    if (typeof obj === 'object') {
      const converted: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const value = obj[key];

          // Ensure Arabic text fields are properly marked with RTL direction
          if ((key === 'arabic' || key === 'arabicText' || key === 'ayah') && typeof value === 'string') {
            converted[key] = {
              text: value,
              direction: 'rtl',
              language: 'ar'
            };
          }
          // Preserve transliteration fields
          else if (key === 'transliteration' && typeof value === 'string') {
            converted[key] = {
              text: value,
              language: 'en-transliteration'
            };
          }
          else {
            converted[key] = this.transformIslamicContent(value);
          }
        }
      }
      return converted;
    }

    return obj;
  }
}

/**
 * Composite Transformer
 *
 * Chains multiple transformers together
 */
export class CompositeTransformer implements RequestTransformer, ResponseTransformer {
  private transformers: (RequestTransformer | ResponseTransformer)[];

  constructor(...transformers: (RequestTransformer | ResponseTransformer)[]) {
    this.transformers = transformers;
  }

  public transform(data: unknown, endpoint: string): unknown {
    let result = data;

    for (const transformer of this.transformers) {
      result = transformer.transform(result, endpoint);
    }

    return result;
  }

  public addTransformer(transformer: RequestTransformer | ResponseTransformer): void {
    this.transformers.push(transformer);
  }

  public removeTransformer(transformer: RequestTransformer | ResponseTransformer): void {
    const index = this.transformers.indexOf(transformer);
    if (index > -1) {
      this.transformers.splice(index, 1);
    }
  }
}

/**
 * Transform Builder
 *
 * Utility class for building transformation chains
 */
export class TransformBuilder {
  private requestTransformers: RequestTransformer[] = [];
  private responseTransformers: ResponseTransformer[] = [];

  public addRequestTransformer(transformer: RequestTransformer): this {
    this.requestTransformers.push(transformer);
    return this;
  }

  public addResponseTransformer(transformer: ResponseTransformer): this {
    this.responseTransformers.push(transformer);
    return this;
  }

  public buildRequestTransformer(): RequestTransformer | undefined {
    if (this.requestTransformers.length === 0) return undefined;
    if (this.requestTransformers.length === 1) return this.requestTransformers[0];
    return new CompositeTransformer(...this.requestTransformers);
  }

  public buildResponseTransformer(): ResponseTransformer | undefined {
    if (this.responseTransformers.length === 0) return undefined;
    if (this.responseTransformers.length === 1) return this.responseTransformers[0];
    return new CompositeTransformer(...this.responseTransformers);
  }

  /**
   * Create default transformers for Sakinah application
   */
  public static createDefault(): TransformBuilder {
    const builder = new TransformBuilder();

    // Request transformers
    builder.addRequestTransformer(new CamelToSnakeTransformer());
    builder.addRequestTransformer(new DateTransformer());

    // Response transformers
    builder.addResponseTransformer(new SnakeToCamelTransformer());
    builder.addResponseTransformer(new DateTransformer());
    builder.addResponseTransformer(new SuccessResponseTransformer());
    builder.addResponseTransformer(new PaginationTransformer());
    builder.addResponseTransformer(new IslamicContentTransformer());

    return builder;
  }
}