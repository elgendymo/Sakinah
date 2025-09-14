// Database abstraction layer exports
export * from './types';
export * from './base';
export * from './factory';

// Specific implementations (for direct use if needed)
export { DevelopmentDatabaseClient } from './sqlite/development';
export { ProductionDatabaseClient } from './supabase/production';

// Main exports for application use
export { DatabaseFactory, getDatabase, resetDatabase, db } from './factory';
export type { IDatabaseClient, DatabaseResult } from './types';