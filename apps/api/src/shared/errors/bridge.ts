import { Result } from '../result';
import { ErrorCode, DatabaseResult as NewDatabaseResult } from './types';
import { DatabaseResult as LegacyDatabaseResult } from '../../infrastructure/database/types';
import { ErrorMapper, getDbType } from './errorMapper';

/**
 * Bridge functions to convert between legacy and new error handling formats
 * This provides backwards compatibility while migrating to the new error system
 */
export class ErrorBridge {
  /**
   * Convert legacy DatabaseResult to new DatabaseResult format
   */
  static convertLegacyDatabaseResult<T>(
    legacyResult: LegacyDatabaseResult<T>
  ): NewDatabaseResult<T> {
    if (legacyResult.error) {
      // Create a synthetic database error with proper structure
      const errorCode = ErrorMapper.mapDatabaseError({ message: legacyResult.error.message }, getDbType());
      return {
        data: legacyResult.data,
        error: {
          code: errorCode,
          message: legacyResult.error.message,
          details: legacyResult.error
        }
      };
    }

    return {
      data: legacyResult.data,
      error: null
    };
  }

  /**
   * Convert new DatabaseResult to legacy format for backwards compatibility
   */
  static convertToLegacyDatabaseResult<T>(
    newResult: NewDatabaseResult<T>
  ): LegacyDatabaseResult<T> {
    return {
      data: newResult.data,
      error: newResult.error ? { message: newResult.error.message } : null
    };
  }

  /**
   * Convert legacy Result to new Result format (if needed)
   */
  static convertLegacyResult<T>(
    legacyResult: Result<T, Error>
  ): Result<T, ErrorCode> {
    if (Result.isError(legacyResult)) {
      const errorCode = ErrorMapper.mapToApiError(legacyResult.error, getDbType());
      return Result.error(errorCode);
    }
    return Result.ok(legacyResult.value) as Result<T, ErrorCode>;
  }

  /**
   * Wrap a legacy database operation to return new format
   */
  static async wrapLegacyOperation<T>(
    operation: () => Promise<LegacyDatabaseResult<T>>
  ): Promise<NewDatabaseResult<T>> {
    const result = await operation();
    return this.convertLegacyDatabaseResult(result);
  }

  /**
   * Handle any database result and convert to standardized Result format
   */
  static handleDatabaseResult<T>(
    dbResult: LegacyDatabaseResult<T> | NewDatabaseResult<T>
  ): Result<T | null, ErrorCode> {
    // Check if it's the new format (has error.code property)
    const isNewFormat = dbResult.error && 'code' in dbResult.error;

    if (dbResult.error) {
      let errorCode: ErrorCode;

      if (isNewFormat) {
        // New format - already has error code
        errorCode = (dbResult.error as any).code;
      } else {
        // Legacy format - map from message
        errorCode = ErrorMapper.mapToApiError(dbResult.error, getDbType());
      }

      return Result.error(errorCode);
    }

    return Result.ok(dbResult.data) as Result<T | null, ErrorCode>;
  }

  /**
   * Handle required database result (null treated as error)
   */
  static handleRequiredDatabaseResult<T>(
    dbResult: LegacyDatabaseResult<T> | NewDatabaseResult<T>,
    _entityName: string
  ): Result<T, ErrorCode> {
    const result = this.handleDatabaseResult(dbResult);

    if (result.ok && result.value === null) {
      return Result.error(ErrorCode.NOT_FOUND);
    }

    return result as Result<T, ErrorCode>;
  }

  /**
   * Handle array database result
   */
  static handleArrayDatabaseResult<T>(
    dbResult: LegacyDatabaseResult<T[]> | NewDatabaseResult<T[]>
  ): Result<T[], ErrorCode> {
    const result = this.handleDatabaseResult(dbResult);

    if (result.ok) {
      return Result.ok(result.value ?? []) as Result<T[], ErrorCode>;
    }

    return result as Result<T[], ErrorCode>;
  }
}