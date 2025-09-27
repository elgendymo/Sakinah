import { ApiVersion } from './versioning';
import { logger } from '../../shared/logger';

export interface MigrationContext {
  requestId: string;
  correlationId: string;
  userId?: string;
  originalVersion: ApiVersion;
  targetVersion: ApiVersion;
}

export interface MigrationResult<T = any> {
  success: boolean;
  data?: T;
  warnings?: string[];
  errors?: string[];
}

export abstract class BaseMigrationStrategy {
  abstract readonly fromVersion: ApiVersion;
  abstract readonly targetVersion: ApiVersion;
  abstract readonly description: string;

  /**
   * Transform request data from source version to target version
   */
  abstract transformRequest(data: any, context: MigrationContext): Promise<MigrationResult>;

  /**
   * Transform response data from target version back to source version format
   */
  abstract transformResponse(data: any, context: MigrationContext): Promise<MigrationResult>;

  /**
   * Validate that migration can be performed
   */
  async canMigrate(data: any, context: MigrationContext): Promise<boolean> {
    return true; // Default implementation
  }

  /**
   * Get migration metadata
   */
  getMetadata() {
    return {
      fromVersion: `${this.fromVersion.major}.${this.fromVersion.minor}`,
      targetVersion: `${this.targetVersion.major}.${this.targetVersion.minor}`,
      description: this.description,
      supportedEndpoints: this.getSupportedEndpoints()
    };
  }

  abstract getSupportedEndpoints(): string[];

  protected logMigration(action: string, context: MigrationContext, additionalData?: any) {
    logger.info(`Migration ${action}`, {
      fromVersion: this.fromVersion,
      targetVersion: this.targetVersion,
      requestId: context.requestId,
      correlationId: context.correlationId,
      userId: context.userId,
      ...additionalData
    });
  }
}

/**
 * Migration strategy for Habits API from v1 to v2
 */
export class HabitsV1ToV2Migration extends BaseMigrationStrategy {
  readonly fromVersion: ApiVersion = { major: 1, minor: 0 };
  readonly targetVersion: ApiVersion = { major: 2, minor: 0 };
  readonly description = 'Migrate Habits API from v1 to v2 format with enhanced response structure';

  async transformRequest(data: any, context: MigrationContext): Promise<MigrationResult> {
    try {
      this.logMigration('request_transform_started', context);

      // v1 to v2 request transformations
      const transformed = { ...data };

      // Handle habit toggle migration to specific complete/incomplete endpoints
      if (context.originalVersion.major === 1) {
        // If this was a toggle request, we need to determine the action
        if (data.action === 'toggle' || data.toggle !== undefined) {
          // This would need to be handled at the route level, not here
          this.logMigration('toggle_action_detected', context, { originalAction: data.action });
        }

        // Add v2-specific fields with defaults
        if (data.schedule && !data.schedule.timezone) {
          transformed.schedule = {
            ...data.schedule,
            timezone: 'UTC' // Default timezone for v2
          };
        }
      }

      this.logMigration('request_transform_completed', context);

      return {
        success: true,
        data: transformed
      };
    } catch (error) {
      this.logMigration('request_transform_failed', context, { error: error.message });
      return {
        success: false,
        errors: [`Request transformation failed: ${error.message}`]
      };
    }
  }

  async transformResponse(data: any, context: MigrationContext): Promise<MigrationResult> {
    try {
      this.logMigration('response_transform_started', context);

      // v2 to v1 response transformations
      const transformed = { ...data };

      if (context.originalVersion.major === 1) {
        // Add v1 compatibility fields
        if (data.success === undefined) {
          // v1 expects success field, v2 uses HTTP status codes
          transformed.success = true;
        }

        // Remove v2-specific fields that v1 doesn't understand
        if (transformed.events) {
          delete transformed.events; // v1 doesn't have events
        }

        if (transformed.correlationId) {
          delete transformed.correlationId; // v1 doesn't expose correlation IDs
        }

        // Transform habit data structure if needed
        if (transformed.habits) {
          transformed.habits = transformed.habits.map((habit: any) => {
            const v1Habit = { ...habit };

            // Remove v2-specific fields
            delete v1Habit.analyticsEnabled;
            delete v1Habit.eventHistory;

            // Ensure v1 fields are present
            if (v1Habit.streakCount === undefined) {
              v1Habit.streakCount = 0;
            }

            return v1Habit;
          });
        }
      }

      this.logMigration('response_transform_completed', context);

      return {
        success: true,
        data: transformed,
        warnings: context.originalVersion.major === 1 ?
          ['Some v2 features may not be available in v1 response format'] : undefined
      };
    } catch (error) {
      this.logMigration('response_transform_failed', context, { error: error.message });
      return {
        success: false,
        errors: [`Response transformation failed: ${error.message}`]
      };
    }
  }

  getSupportedEndpoints(): string[] {
    return [
      '/habits',
      '/habits/:id',
      '/habits/:id/complete',
      '/habits/:id/incomplete',
      '/habits/:id/analytics',
      '/habits/today',
      '/habits/statistics'
    ];
  }

  async canMigrate(data: any, context: MigrationContext): Promise<boolean> {
    // Check if the data structure is compatible with migration
    if (context.originalVersion.major === 1 && context.targetVersion.major === 2) {
      // Ensure required fields for v2 are present or can be defaulted
      return true;
    }
    return false;
  }
}

/**
 * Migration strategy for Plans API (placeholder for future implementation)
 */
export class PlansV1ToV2Migration extends BaseMigrationStrategy {
  readonly fromVersion: ApiVersion = { major: 1, minor: 0 };
  readonly targetVersion: ApiVersion = { major: 2, minor: 0 };
  readonly description = 'Migrate Plans API from v1 to v2 format with enhanced filtering and active plan support';

  async transformRequest(data: any, context: MigrationContext): Promise<MigrationResult> {
    // TODO: Implement plans-specific request transformations
    return { success: true, data };
  }

  async transformResponse(data: any, context: MigrationContext): Promise<MigrationResult> {
    // TODO: Implement plans-specific response transformations
    return { success: true, data };
  }

  getSupportedEndpoints(): string[] {
    return [
      '/plans',
      '/plans/:id',
      '/plans/active',
      '/ai/suggest-plan'
    ];
  }
}

/**
 * Migration strategy registry
 */
export class MigrationRegistry {
  private strategies: Map<string, BaseMigrationStrategy> = new Map();

  constructor() {
    this.registerDefaultStrategies();
  }

  register(strategy: BaseMigrationStrategy): void {
    const key = this.getStrategyKey(strategy.fromVersion, strategy.targetVersion);
    this.strategies.set(key, strategy);
    logger.info('Migration strategy registered', {
      key,
      description: strategy.description,
      supportedEndpoints: strategy.getSupportedEndpoints()
    });
  }

  getStrategy(fromVersion: ApiVersion, targetVersion: ApiVersion): BaseMigrationStrategy | undefined {
    const key = this.getStrategyKey(fromVersion, targetVersion);
    return this.strategies.get(key);
  }

  getAllStrategies(): BaseMigrationStrategy[] {
    return Array.from(this.strategies.values());
  }

  getStrategiesForEndpoint(endpoint: string): BaseMigrationStrategy[] {
    return this.getAllStrategies().filter(strategy =>
      strategy.getSupportedEndpoints().some(supportedEndpoint =>
        this.endpointMatches(endpoint, supportedEndpoint)
      )
    );
  }

  private registerDefaultStrategies(): void {
    this.register(new HabitsV1ToV2Migration());
    this.register(new PlansV1ToV2Migration());
  }

  private getStrategyKey(fromVersion: ApiVersion, targetVersion: ApiVersion): string {
    return `${fromVersion.major}.${fromVersion.minor}->${targetVersion.major}.${targetVersion.minor}`;
  }

  private endpointMatches(requestEndpoint: string, supportedEndpoint: string): boolean {
    // Simple pattern matching - could be enhanced
    const pattern = supportedEndpoint.replace(/:id/g, '[^/]+');
    const regex = new RegExp(`^${pattern}$`);
    return regex.test(requestEndpoint);
  }
}

// Global registry instance
export const migrationRegistry = new MigrationRegistry();