import { EnhancedServiceResult, ServiceResultHandler, serviceResult } from '../utils/service-result';
import { ErrorCode } from '../constants/errorCodes';

/**
 * Base Service Class
 *
 * Provides common functionality for all service classes:
 * - Standardized error handling
 * - Operation wrapping with timing
 * - Validation helpers
 * - Retry logic
 * - Consistent result formatting
 */
export abstract class BaseService {
  protected readonly serviceResult: ServiceResultHandler;
  protected readonly serviceName: string;

  constructor(serviceName: string) {
    this.serviceResult = serviceResult;
    this.serviceName = serviceName;
  }

  /**
   * Execute an operation with standardized error handling and timing
   */
  protected async executeOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    maxRetries: number = 3
  ): Promise<EnhancedServiceResult<T>> {
    const fullOperationName = `${this.serviceName}.${operationName}`;
    return await this.serviceResult.wrapOperation(operation, fullOperationName, maxRetries);
  }

  /**
   * Execute with input validation
   */
  protected async executeWithValidation<TInput, TOutput>(
    input: unknown,
    validator: (input: unknown) => TInput,
    processor: (validInput: TInput) => Promise<TOutput>,
    operationName: string
  ): Promise<EnhancedServiceResult<TOutput>> {
    const fullOperationName = `${this.serviceName}.${operationName}`;
    return await this.serviceResult.validateAndProcess(input, validator, processor, fullOperationName);
  }

  /**
   * Create an error result
   */
  protected createError<T>(
    message: string,
    code?: string | ErrorCode,
    details?: Record<string, unknown>,
    operationName?: string
  ): EnhancedServiceResult<T> {
    const fullOperationName = operationName ? `${this.serviceName}.${operationName}` : undefined;
    return this.serviceResult.error<T>(message, code, details, fullOperationName);
  }

  /**
   * Create a success result
   */
  protected createSuccess<T>(
    data: T,
    operationName?: string,
    executionTime?: number
  ): EnhancedServiceResult<T> {
    const fullOperationName = operationName ? `${this.serviceName}.${operationName}` : undefined;
    return this.serviceResult.success(data, fullOperationName, executionTime);
  }

  /**
   * Validate required fields
   */
  protected validateRequired(
    data: Record<string, unknown>,
    requiredFields: string[]
  ): void {
    const missingFields = requiredFields.filter(field => {
      const value = data[field];
      return value === undefined || value === null || value === '';
    });

    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }
  }

  /**
   * Validate email format
   */
  protected validateEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }
  }

  /**
   * Validate spiritual goal input (Islamic context)
   */
  protected validateSpiritualGoal(goal: string): void {
    if (!goal || goal.trim().length < 5) {
      throw new Error('Please provide a meaningful spiritual goal (at least 5 characters)');
    }

    if (goal.trim().length > 500) {
      throw new Error('Spiritual goal is too long (maximum 500 characters)');
    }

    // Basic content validation for inappropriate content
    const inappropriatePatterns = [
      /\b(hate|violence|harm)\b/i,
      /\b(inappropriate|offensive)\b/i
    ];

    for (const pattern of inappropriatePatterns) {
      if (pattern.test(goal)) {
        throw new Error('Please provide a positive and constructive spiritual goal');
      }
    }
  }

  /**
   * Validate habit name (Islamic context)
   */
  protected validateHabitName(name: string): void {
    if (!name || name.trim().length < 3) {
      throw new Error('Habit name must be at least 3 characters long');
    }

    if (name.trim().length > 100) {
      throw new Error('Habit name is too long (maximum 100 characters)');
    }
  }

  /**
   * Log operation for debugging
   */
  protected logOperation(operationName: string, data?: unknown): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${this.serviceName}.${operationName}]`, data);
    }
  }

  /**
   * Handle auth token extraction
   */
  protected extractAuthToken(headers?: Record<string, string>): string {
    const authHeader = headers?.['authorization'] || headers?.['Authorization'];

    if (!authHeader) {
      throw new Error('No authorization header provided');
    }

    if (!authHeader.startsWith('Bearer ')) {
      throw new Error('Invalid authorization header format');
    }

    return authHeader.substring(7);
  }

  /**
   * Create timeout promise for operations
   */
  protected createTimeoutPromise<T>(timeoutMs: number): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });
  }

  /**
   * Execute operation with timeout
   */
  protected async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number = 30000
  ): Promise<T> {
    return Promise.race([
      operation(),
      this.createTimeoutPromise<T>(timeoutMs)
    ]);
  }
}