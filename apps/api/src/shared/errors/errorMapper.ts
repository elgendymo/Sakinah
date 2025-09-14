import { DatabaseErrorCode, ErrorCode, DatabaseToApiErrorMap } from './errorCodes';

export class ErrorMapper {
  // Map Supabase-specific errors to standard database codes
  static mapSupabaseError(error: any): DatabaseErrorCode {
    const message = error.message?.toLowerCase() || '';
    const code = error.code;

    // Supabase/PostgreSQL specific error codes
    if (code === '23505' || message.includes('duplicate key')) {
      return DatabaseErrorCode.DB_UNIQUE_VIOLATION;
    }

    if (code === '23503' || message.includes('foreign key')) {
      return DatabaseErrorCode.DB_FOREIGN_KEY_VIOLATION;
    }

    if (code === '23514' || message.includes('check constraint')) {
      return DatabaseErrorCode.DB_CONSTRAINT_VIOLATION;
    }

    if (code === '42501' || message.includes('permission denied')) {
      return DatabaseErrorCode.DB_PERMISSION_DENIED;
    }

    if (code === '42P01' || message.includes('relation') && message.includes('does not exist')) {
      return DatabaseErrorCode.DB_NOT_FOUND;
    }

    if (message.includes('connection') || message.includes('network')) {
      return DatabaseErrorCode.DB_CONNECTION_FAILED;
    }

    if (message.includes('timeout') || message.includes('timed out')) {
      return DatabaseErrorCode.DB_TIMEOUT;
    }

    if (message.includes('invalid input') || message.includes('invalid syntax')) {
      return DatabaseErrorCode.DB_INVALID_DATA;
    }

    if (code === '57014' || message.includes('canceling statement due to user request')) {
      return DatabaseErrorCode.DB_TIMEOUT;
    }

    return DatabaseErrorCode.DB_UNKNOWN_ERROR;
  }

  // Map SQLite-specific errors to standard database codes
  static mapSQLiteError(error: any): DatabaseErrorCode {
    const message = error.message?.toLowerCase() || '';
    const code = error.code;

    // SQLite specific error codes
    if (code === 'SQLITE_CONSTRAINT_UNIQUE' || message.includes('unique constraint')) {
      return DatabaseErrorCode.DB_UNIQUE_VIOLATION;
    }

    if (code === 'SQLITE_CONSTRAINT_FOREIGNKEY' || message.includes('foreign key constraint')) {
      return DatabaseErrorCode.DB_FOREIGN_KEY_VIOLATION;
    }

    if (code === 'SQLITE_CONSTRAINT' || message.includes('constraint failed')) {
      return DatabaseErrorCode.DB_CONSTRAINT_VIOLATION;
    }

    if (message.includes('no such table') || message.includes('no such column')) {
      return DatabaseErrorCode.DB_NOT_FOUND;
    }

    if (message.includes('database is locked') || message.includes('database disk image is malformed')) {
      return DatabaseErrorCode.DB_CONNECTION_FAILED;
    }

    if (message.includes('syntax error')) {
      return DatabaseErrorCode.DB_INVALID_DATA;
    }

    if (code === 'SQLITE_BUSY' || message.includes('database is busy')) {
      return DatabaseErrorCode.DB_TIMEOUT;
    }

    if (code === 'SQLITE_CANTOPEN' || message.includes('unable to open database')) {
      return DatabaseErrorCode.DB_CONNECTION_FAILED;
    }

    return DatabaseErrorCode.DB_UNKNOWN_ERROR;
  }

  // Map any database error to API error code
  static mapDatabaseToApiError(dbError: DatabaseErrorCode): ErrorCode {
    return DatabaseToApiErrorMap[dbError] || ErrorCode.DATABASE_ERROR;
  }

  // Detect database backend and map accordingly
  static mapDatabaseError(error: any, dbType: 'supabase' | 'sqlite' = 'sqlite'): DatabaseErrorCode {
    if (dbType === 'supabase') {
      return this.mapSupabaseError(error);
    } else {
      return this.mapSQLiteError(error);
    }
  }

  // Full mapping from any database error to API error
  static mapToApiError(error: any, dbType: 'supabase' | 'sqlite' = 'sqlite'): ErrorCode {
    const dbErrorCode = this.mapDatabaseError(error, dbType);
    return this.mapDatabaseToApiError(dbErrorCode);
  }
}

// Utility function to detect database type from environment
export function getDbType(): 'supabase' | 'sqlite' {
  return process.env.DB_BACKEND === 'supabase' ? 'supabase' : 'sqlite';
}