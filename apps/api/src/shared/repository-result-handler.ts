import { Result } from './result';
import { ErrorCode, createAppError } from './errors';
import { DatabaseResult as LegacyDatabaseResult } from '../infrastructure/database/types';
import { ErrorMapper, getDbType } from './errors';

/**
 * Centralized result handling utility for repositories
 * Provides consistent error/success formatting across all repository operations
 */
export class RepositoryResultHandler {
  /**
   * Handles single entity results from database operations
   */
  static handleSingleResult<T>(dbResult: LegacyDatabaseResult<T>): Result<T | null> {
    if (dbResult.error) {
      const errorCode = ErrorMapper.mapToApiError(dbResult.error, getDbType());
      const error = createAppError(errorCode, dbResult.error.message);
      return Result.error(error);
    }
    return Result.ok(dbResult.data);
  }

  /**
   * Handles single entity results where null is treated as an error
   */
  static handleRequiredResult<T>(dbResult: LegacyDatabaseResult<T>, entityName: string): Result<T> {
    if (dbResult.error) {
      const errorCode = ErrorMapper.mapToApiError(dbResult.error, getDbType());
      const error = createAppError(errorCode, dbResult.error.message);
      return Result.error(error);
    }
    if (!dbResult.data) {
      const error = createAppError(ErrorCode.NOT_FOUND, `${entityName} not found`);
      return Result.error(error);
    }
    return Result.ok(dbResult.data);
  }

  /**
   * Handles array results from database operations
   */
  static handleArrayResult<T>(dbResult: LegacyDatabaseResult<T[]>): Result<T[]> {
    if (dbResult.error) {
      const errorCode = ErrorMapper.mapToApiError(dbResult.error, getDbType());
      const error = createAppError(errorCode, dbResult.error.message);
      return Result.error(error);
    }
    return Result.ok(dbResult.data || []);
  }

  /**
   * Handles void operations (create, update, delete)
   */
  static handleVoidResult(dbResult: { error?: any }): Result<void> {
    if (dbResult.error) {
      const errorCode = ErrorMapper.mapToApiError(dbResult.error, getDbType());
      const error = createAppError(errorCode, dbResult.error.message || 'Database operation failed');
      return Result.error(error);
    }
    return Result.ok(undefined);
  }

  /**
   * Wraps repository operations in try-catch and returns Result
   */
  static async wrapOperation<T>(operation: () => Promise<T>): Promise<Result<T>> {
    try {
      const result = await operation();
      return Result.ok(result);
    } catch (error) {
      const errorCode = ErrorMapper.mapToApiError(error, getDbType());
      let appError: Error;

      if (error instanceof Error) {
        appError = createAppError(errorCode, error.message, error);
      } else {
        appError = createAppError(errorCode, 'Database operation failed');
      }

      return Result.error(appError);
    }
  }
}