import { IDatabaseClient } from './types';
import { DevelopmentDatabaseClient } from './sqlite/development';
import { ProductionDatabaseClient } from './supabase/production';
import { logger } from '@/shared/logger';

export class DatabaseFactory {
  /**
   * Creates the appropriate database client based on environment configuration
   *
   * Decision Logic:
   * 1. DB_BACKEND override → Use specified backend
   * 2. NODE_ENV=production → Require Supabase (fail if missing)
   * 3. NODE_ENV=development → Prefer SQLite for easier local dev, allow Supabase override
   * 4. NODE_ENV=test → Always use SQLite for consistency
   */
  static createClient(): IDatabaseClient {
    const env = nodeEnv();
    const forced = detectBackend();

    logger.info(`Database factory: env=${env}, forced=${forced || 'auto'}`);

    // 1) Explicit override takes precedence
    if (forced === 'sqlite') {
      logger.info('Using SQLite (forced by DB_BACKEND)');
      return new DevelopmentDatabaseClient() as unknown as IDatabaseClient;
    }

    if (forced === 'supabase') {
      if (!isSupabaseReady()) {
        throw new Error('Supabase forced by DB_BACKEND but not configured properly');
      }
      logger.info('Using Supabase (forced by DB_BACKEND)');
      return new ProductionDatabaseClient() as unknown as IDatabaseClient;
    }

    // 2) Production: enforce Supabase
    if (env === 'production') {
      return makeProdClient();
    }

    // 3) Test: always use SQLite for consistency
    if (env === 'test') {
      logger.info('Using SQLite (test environment)');
      return new DevelopmentDatabaseClient() as unknown as IDatabaseClient;
    }

    // 4) Development: prefer SQLite for easier local development
    // Only use Supabase if explicitly enabled via USE_SUPABASE=true
    if (process.env.USE_SUPABASE === 'true' && isSupabaseReady()) {
      logger.info('Using Supabase (explicitly enabled in development)');
      return new ProductionDatabaseClient() as unknown as IDatabaseClient;
    }

    logger.info('Using SQLite (default for development - no setup required)');
    return new DevelopmentDatabaseClient() as unknown as IDatabaseClient;
  }

  /**
   * Get environment-specific connection info for debugging
   */
  static getConnectionInfo(): {
    environment: string;
    backend: string;
    supabaseReady: boolean;
    forcedBackend: string | null;
  } {
    return {
      environment: nodeEnv(),
      backend: detectBackend() || 'auto',
      supabaseReady: isSupabaseReady(),
      forcedBackend: detectBackend(),
    };
  }
}

// Helper functions
function nodeEnv(): 'production' | 'development' | 'test' {
  const env = (process.env.NODE_ENV || 'development').toLowerCase();
  if (env === 'production') return 'production';
  if (env === 'test') return 'test';
  return 'development';
}

function isSupabaseReady(): boolean {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return !!(url && key);
}

function detectBackend(): 'sqlite' | 'supabase' | null {
  const override = process.env.DB_BACKEND?.toLowerCase();
  if (override === 'sqlite' || override === 'supabase') return override;
  return null;
}

function makeProdClient(): IDatabaseClient {
  if (!isSupabaseReady()) {
    const missing: string[] = [];
    if (!process.env.SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      missing.push('SUPABASE_URL');
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      missing.push('SUPABASE_SERVICE_ROLE_KEY');
    }

    throw new Error(
      `Production requires Supabase configuration. Missing: ${missing.join(', ')}`
    );
  }

  logger.info('Using Supabase (production environment)');
  return new ProductionDatabaseClient() as unknown as IDatabaseClient;
}

// Singleton instance for convenience
let _dbInstance: IDatabaseClient | null = null;

export function getDatabase(): IDatabaseClient {
  if (!_dbInstance) {
    _dbInstance = DatabaseFactory.createClient();
  }
  return _dbInstance;
}

// For cleanup and testing
export function resetDatabase(): void {
  if (_dbInstance) {
    _dbInstance.close();
    _dbInstance = null;
  }
}

// Default export for convenience
export const db: IDatabaseClient = getDatabase();