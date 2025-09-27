import { beforeEach, describe, it, expect, vi } from 'vitest';
import {
  HabitsV1ToV2Migration,
  MigrationRegistry,
  MigrationContext
} from '../../../src/infrastructure/middleware/migration-strategies';

// Mock logger
vi.mock('../../../src/shared/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

describe('HabitsV1ToV2Migration', () => {
  let migration: HabitsV1ToV2Migration;
  let context: MigrationContext;

  beforeEach(() => {
    migration = new HabitsV1ToV2Migration();
    context = {
      requestId: 'req-123',
      correlationId: 'corr-456',
      userId: 'user-789',
      originalVersion: { major: 1, minor: 0 },
      targetVersion: { major: 2, minor: 0 }
    };
  });

  describe('getMetadata', () => {
    it('should return correct migration metadata', () => {
      const metadata = migration.getMetadata();

      expect(metadata).toEqual({
        fromVersion: '1.0',
        targetVersion: '2.0',
        description: 'Migrate Habits API from v1 to v2 format with enhanced response structure',
        supportedEndpoints: [
          '/habits',
          '/habits/:id',
          '/habits/:id/complete',
          '/habits/:id/incomplete',
          '/habits/:id/analytics',
          '/habits/today',
          '/habits/statistics'
        ]
      });
    });
  });

  describe('transformRequest', () => {
    it('should transform v1 request to v2 format', async () => {
      const requestData = {
        title: 'Morning Prayer',
        schedule: {
          freq: 'daily'
        }
      };

      const result = await migration.transformRequest(requestData, context);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        title: 'Morning Prayer',
        schedule: {
          freq: 'daily',
          timezone: 'UTC'
        }
      });
    });

    it('should preserve existing timezone in schedule', async () => {
      const requestData = {
        title: 'Morning Prayer',
        schedule: {
          freq: 'daily',
          timezone: 'America/New_York'
        }
      };

      const result = await migration.transformRequest(requestData, context);

      expect(result.success).toBe(true);
      expect(result.data.schedule.timezone).toBe('America/New_York');
    });

    it('should handle toggle action in request', async () => {
      const requestData = {
        action: 'toggle',
        habitId: 'habit-123'
      };

      const result = await migration.transformRequest(requestData, context);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(requestData);
    });

    it('should handle transformation errors', async () => {
      // Mock a transformation that would throw
      const originalTransform = migration.transformRequest;
      migration.transformRequest = vi.fn().mockImplementation(() => {
        throw new Error('Transformation failed');
      });

      const result = await migration.transformRequest({}, context);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Request transformation failed: Transformation failed');

      // Restore original method
      migration.transformRequest = originalTransform;
    });
  });

  describe('transformResponse', () => {
    it('should transform v2 response to v1 format', async () => {
      const responseData = {
        habits: [
          {
            id: 'habit-1',
            title: 'Morning Prayer',
            streakCount: 5,
            analyticsEnabled: true,
            eventHistory: ['event1', 'event2']
          }
        ],
        events: ['event1', 'event2'],
        correlationId: 'corr-123'
      };

      const result = await migration.transformResponse(responseData, context);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        success: true,
        habits: [
          {
            id: 'habit-1',
            title: 'Morning Prayer',
            streakCount: 5
          }
        ]
      });
      expect(result.warnings).toContain('Some v2 features may not be available in v1 response format');
    });

    it('should add success field for v1 compatibility', async () => {
      const responseData = {
        message: 'Operation completed'
      };

      const result = await migration.transformResponse(responseData, context);

      expect(result.success).toBe(true);
      expect(result.data.success).toBe(true);
    });

    it('should preserve existing success field', async () => {
      const responseData = {
        success: false,
        error: 'Something went wrong'
      };

      const result = await migration.transformResponse(responseData, context);

      expect(result.success).toBe(true);
      expect(result.data.success).toBe(false);
    });

    it('should handle habits with missing streakCount', async () => {
      const responseData = {
        habits: [
          {
            id: 'habit-1',
            title: 'Morning Prayer'
          }
        ]
      };

      const result = await migration.transformResponse(responseData, context);

      expect(result.success).toBe(true);
      expect(result.data.habits[0].streakCount).toBe(0);
    });

    it('should handle transformation errors', async () => {
      // Mock a transformation that would throw
      const originalTransform = migration.transformResponse;
      migration.transformResponse = vi.fn().mockImplementation(() => {
        throw new Error('Transformation failed');
      });

      const result = await migration.transformResponse({}, context);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Response transformation failed: Transformation failed');

      // Restore original method
      migration.transformResponse = originalTransform;
    });
  });

  describe('canMigrate', () => {
    it('should return true for v1 to v2 migration', async () => {
      const canMigrate = await migration.canMigrate({}, context);
      expect(canMigrate).toBe(true);
    });

    it('should return false for unsupported version combinations', async () => {
      const invalidContext = {
        ...context,
        originalVersion: { major: 2, minor: 0 },
        targetVersion: { major: 1, minor: 0 }
      };

      const canMigrate = await migration.canMigrate({}, invalidContext);
      expect(canMigrate).toBe(false);
    });
  });
});

describe('MigrationRegistry', () => {
  let registry: MigrationRegistry;

  beforeEach(() => {
    registry = new MigrationRegistry();
  });

  describe('register', () => {
    it('should register migration strategy', () => {
      const migration = new HabitsV1ToV2Migration();
      const initialStrategies = registry.getAllStrategies().length;

      registry.register(migration);

      expect(registry.getAllStrategies().length).toBe(initialStrategies + 1);
    });
  });

  describe('getStrategy', () => {
    it('should return registered strategy for version pair', () => {
      const strategy = registry.getStrategy(
        { major: 1, minor: 0 },
        { major: 2, minor: 0 }
      );

      expect(strategy).toBeInstanceOf(HabitsV1ToV2Migration);
    });

    it('should return undefined for unregistered version pair', () => {
      const strategy = registry.getStrategy(
        { major: 3, minor: 0 },
        { major: 4, minor: 0 }
      );

      expect(strategy).toBeUndefined();
    });
  });

  describe('getStrategiesForEndpoint', () => {
    it('should return strategies that support the endpoint', () => {
      const strategies = registry.getStrategiesForEndpoint('/habits');

      expect(strategies.length).toBeGreaterThan(0);
      expect(strategies[0]).toBeInstanceOf(HabitsV1ToV2Migration);
    });

    it('should return empty array for unsupported endpoint', () => {
      const strategies = registry.getStrategiesForEndpoint('/unsupported');

      expect(strategies.length).toBe(0);
    });

    it('should match parameterized endpoints', () => {
      const strategies = registry.getStrategiesForEndpoint('/habits/123');

      expect(strategies.length).toBeGreaterThan(0);
      expect(strategies[0]).toBeInstanceOf(HabitsV1ToV2Migration);
    });
  });

  describe('getAllStrategies', () => {
    it('should return all registered strategies', () => {
      const strategies = registry.getAllStrategies();

      expect(strategies.length).toBeGreaterThan(0);
      expect(strategies.some(s => s instanceof HabitsV1ToV2Migration)).toBe(true);
    });
  });
});