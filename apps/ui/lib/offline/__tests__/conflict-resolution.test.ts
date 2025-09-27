/**
 * Unit tests for conflict resolution strategies
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ConflictResolver, ConflictData, ConflictResolutionStrategy } from '../conflict-resolution';

describe('ConflictResolver', () => {
  let resolver: ConflictResolver;

  beforeEach(() => {
    resolver = new ConflictResolver({
      defaultStrategy: 'last_write_wins',
      preserveUserData: true,
      respectEntityRules: true,
      autoMergeThreshold: 0.8
    });
  });

  describe('habit conflicts', () => {
    it('should preserve completion status when client marks as completed', async () => {
      const conflict: ConflictData = {
        id: 'habit-1',
        entity: 'habit',
        conflictType: 'data',
        clientData: {
          id: 'habit-1',
          title: 'Morning Prayer',
          completedToday: true,
          streakCount: 5
        },
        serverData: {
          id: 'habit-1',
          title: 'Morning Prayer',
          completedToday: false,
          streakCount: 4
        },
        clientTimestamp: '2025-01-15T10:00:00Z',
        serverTimestamp: '2025-01-15T09:30:00Z'
      };

      const result = await resolver.resolveConflict(conflict);

      expect(result.strategy).toBe('field_level_merge');
      expect(result.resolvedData.completedToday).toBe(true);
      expect(result.resolvedData.streakCount).toBe(5); // Higher value preserved
      expect(result.requiresUserInput).toBe(false);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should use higher streak count in habit conflicts', async () => {
      const conflict: ConflictData = {
        id: 'habit-2',
        entity: 'habit',
        conflictType: 'data',
        clientData: {
          streakCount: 10,
          completedToday: true
        },
        serverData: {
          streakCount: 12,
          completedToday: false
        },
        clientTimestamp: '2025-01-15T10:00:00Z',
        serverTimestamp: '2025-01-15T09:30:00Z'
      };

      const result = await resolver.resolveConflict(conflict);

      expect(result.resolvedData.streakCount).toBe(12); // Server has higher streak
      expect(result.resolvedData.completedToday).toBe(true); // Client completion preserved
    });

    it('should use semantic merge for habit completion fields', async () => {
      const conflict: ConflictData = {
        id: 'habit-3',
        entity: 'habit',
        conflictType: 'data',
        field: 'completedToday',
        clientData: {
          completedToday: true,
          lastCompletedOn: '2025-01-15'
        },
        serverData: {
          completedToday: false,
          lastCompletedOn: '2025-01-14'
        },
        clientTimestamp: '2025-01-15T10:00:00Z',
        serverTimestamp: '2025-01-15T09:30:00Z'
      };

      const result = await resolver.resolveConflict(conflict);

      expect(result.strategy).toBe('semantic_merge');
      expect(result.resolvedData.completedToday).toBe(true);
      expect(result.resolvedData.lastCompletedOn).toBe('2025-01-15');
    });
  });

  describe('journal conflicts', () => {
    it('should prefer client content for journal entries', async () => {
      const conflict: ConflictData = {
        id: 'journal-1',
        entity: 'journal',
        conflictType: 'data',
        field: 'content',
        clientData: {
          content: 'Today I reflected on patience and gratitude...',
          tags: ['reflection', 'gratitude']
        },
        serverData: {
          content: 'Today I thought about...',
          tags: ['reflection']
        },
        clientTimestamp: '2025-01-15T10:00:00Z',
        serverTimestamp: '2025-01-15T09:30:00Z'
      };

      const result = await resolver.resolveConflict(conflict);

      expect(result.strategy).toBe('client_wins');
      expect(result.resolvedData.content).toBe('Today I reflected on patience and gratitude...');
      expect(result.requiresUserInput).toBe(false);
    });

    it('should merge journal tags automatically', async () => {
      const conflict: ConflictData = {
        id: 'journal-2',
        entity: 'journal',
        conflictType: 'data',
        clientData: {
          content: 'Reflection entry',
          tags: ['reflection', 'patience', 'gratitude']
        },
        serverData: {
          content: 'Reflection entry',
          tags: ['reflection', 'dua', 'morning']
        },
        clientTimestamp: '2025-01-15T10:00:00Z',
        serverTimestamp: '2025-01-15T09:30:00Z'
      };

      const result = await resolver.resolveConflict(conflict);

      expect(result.strategy).toBe('merge_automatic');
      expect(result.resolvedData.tags).toEqual(
        expect.arrayContaining(['reflection', 'patience', 'gratitude', 'dua', 'morning'])
      );
      expect(result.resolvedData.tags).toHaveLength(5);
    });
  });

  describe('checkin conflicts', () => {
    it('should prefer client personal data for checkins', async () => {
      const conflict: ConflictData = {
        id: 'checkin-1',
        entity: 'checkin',
        conflictType: 'data',
        clientData: {
          mood: 'peaceful',
          reflection: 'I felt closer to Allah today',
          goals: ['pray fajr', 'read quran']
        },
        serverData: {
          mood: 'neutral',
          reflection: 'Regular day',
          goals: ['pray fajr']
        },
        clientTimestamp: '2025-01-15T10:00:00Z',
        serverTimestamp: '2025-01-15T09:30:00Z'
      };

      const result = await resolver.resolveConflict(conflict);

      expect(result.strategy).toBe('semantic_merge');
      expect(result.resolvedData.mood).toBe('peaceful');
      expect(result.resolvedData.reflection).toBe('I felt closer to Allah today');
      expect(result.resolvedData.goals).toEqual(
        expect.arrayContaining(['pray fajr', 'read quran'])
      );
    });
  });

  describe('timestamp-based resolution', () => {
    it('should use last write wins for general conflicts', async () => {
      const conflict: ConflictData = {
        id: 'item-1',
        entity: 'habit',
        conflictType: 'timestamp',
        clientData: { title: 'Client Version' },
        serverData: { title: 'Server Version' },
        clientTimestamp: '2025-01-15T10:00:00Z',
        serverTimestamp: '2025-01-15T09:30:00Z'
      };

      const result = await resolver.resolveConflict(conflict);

      expect(result.strategy).toBe('last_write_wins');
      expect(result.resolvedData.title).toBe('Client Version'); // Client is newer
    });

    it('should use server data when server timestamp is newer', async () => {
      const conflict: ConflictData = {
        id: 'item-2',
        entity: 'habit',
        conflictType: 'timestamp',
        clientData: { title: 'Client Version' },
        serverData: { title: 'Server Version' },
        clientTimestamp: '2025-01-15T09:30:00Z',
        serverTimestamp: '2025-01-15T10:00:00Z'
      };

      const result = await resolver.resolveConflict(conflict);

      expect(result.strategy).toBe('last_write_wins');
      expect(result.resolvedData.title).toBe('Server Version'); // Server is newer
    });
  });

  describe('automatic merge strategy', () => {
    it('should merge non-conflicting fields automatically', async () => {
      const conflict: ConflictData = {
        id: 'item-3',
        entity: 'habit',
        conflictType: 'data',
        clientData: {
          title: 'Prayer Habit',
          completedToday: true,
          newField: 'client-only'
        },
        serverData: {
          title: 'Prayer Habit',
          streakCount: 5,
          serverField: 'server-only'
        },
        clientTimestamp: '2025-01-15T10:00:00Z',
        serverTimestamp: '2025-01-15T09:30:00Z'
      };

      const result = await resolver.resolveConflict(conflict);

      expect(result.strategy).toBe('merge_automatic');
      expect(result.resolvedData).toMatchObject({
        title: 'Prayer Habit',
        completedToday: true,
        streakCount: 5,
        newField: 'client-only',
        serverField: 'server-only'
      });
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should reduce confidence when conflicts exist', async () => {
      const conflict: ConflictData = {
        id: 'item-4',
        entity: 'journal',
        conflictType: 'data',
        clientData: {
          content: 'Client content',
          tags: ['client-tag']
        },
        serverData: {
          content: 'Server content',
          tags: ['server-tag']
        },
        clientTimestamp: '2025-01-15T10:00:00Z',
        serverTimestamp: '2025-01-15T09:30:00Z'
      };

      const result = await resolver.resolveConflict(conflict);

      expect(result.confidence).toBeLessThan(0.8);
    });
  });

  describe('field-level merge strategy', () => {
    it('should apply field-specific rules for arrays', async () => {
      const conflict: ConflictData = {
        id: 'item-5',
        entity: 'journal',
        conflictType: 'data',
        clientData: {
          tags: ['reflection', 'patience']
        },
        serverData: {
          tags: ['reflection', 'gratitude']
        },
        clientTimestamp: '2025-01-15T10:00:00Z',
        serverTimestamp: '2025-01-15T09:30:00Z'
      };

      const result = await resolver.resolveConflict(conflict);

      expect(result.resolvedData.tags).toEqual(
        expect.arrayContaining(['reflection', 'patience', 'gratitude'])
      );
      expect(result.appliedRules).toContain('merged_tags_array');
    });

    it('should use max value for streak counts', async () => {
      const conflict: ConflictData = {
        id: 'item-6',
        entity: 'habit',
        conflictType: 'data',
        clientData: {
          streakCount: 7
        },
        serverData: {
          streakCount: 5
        },
        clientTimestamp: '2025-01-15T10:00:00Z',
        serverTimestamp: '2025-01-15T09:30:00Z'
      };

      const result = await resolver.resolveConflict(conflict);

      expect(result.resolvedData.streakCount).toBe(7);
      expect(result.appliedRules).toContain('max_streak_count');
    });

    it('should preserve completion status (OR logic)', async () => {
      const conflict: ConflictData = {
        id: 'item-7',
        entity: 'habit',
        conflictType: 'data',
        clientData: {
          completedToday: true
        },
        serverData: {
          completedToday: false
        },
        clientTimestamp: '2025-01-15T10:00:00Z',
        serverTimestamp: '2025-01-15T09:30:00Z'
      };

      const result = await resolver.resolveConflict(conflict);

      expect(result.resolvedData.completedToday).toBe(true);
      expect(result.appliedRules).toContain('preserve_completion_status');
    });
  });

  describe('user preferences', () => {
    it('should respect user preference for specific entities', async () => {
      resolver.setUserPreference('journal', 'client_wins');

      const conflict: ConflictData = {
        id: 'journal-pref',
        entity: 'journal',
        conflictType: 'data',
        clientData: { content: 'Client content' },
        serverData: { content: 'Server content' },
        clientTimestamp: '2025-01-15T09:30:00Z', // Older than server
        serverTimestamp: '2025-01-15T10:00:00Z'
      };

      const result = await resolver.resolveConflict(conflict);

      expect(result.strategy).toBe('client_wins');
      expect(result.resolvedData.content).toBe('Client content');
    });

    it('should fall back to default when no user preference is set', async () => {
      const conflict: ConflictData = {
        id: 'no-pref',
        entity: 'plan',
        conflictType: 'data',
        clientData: { title: 'Client plan' },
        serverData: { title: 'Server plan' },
        clientTimestamp: '2025-01-15T10:00:00Z',
        serverTimestamp: '2025-01-15T09:30:00Z'
      };

      const result = await resolver.resolveConflict(conflict);

      expect(result.strategy).toBe('merge_manual'); // Plan default strategy
    });
  });

  describe('batch conflict resolution', () => {
    it('should resolve multiple conflicts', async () => {
      const conflicts: ConflictData[] = [
        {
          id: 'batch-1',
          entity: 'habit',
          conflictType: 'data',
          clientData: { completedToday: true },
          serverData: { completedToday: false },
          clientTimestamp: '2025-01-15T10:00:00Z',
          serverTimestamp: '2025-01-15T09:30:00Z'
        },
        {
          id: 'batch-2',
          entity: 'journal',
          conflictType: 'data',
          clientData: { content: 'Client journal' },
          serverData: { content: 'Server journal' },
          clientTimestamp: '2025-01-15T10:00:00Z',
          serverTimestamp: '2025-01-15T09:30:00Z'
        }
      ];

      const results = await resolver.resolveConflicts(conflicts);

      expect(results).toHaveLength(2);
      expect(results[0].resolvedData.completedToday).toBe(true);
      expect(results[1].resolvedData.content).toBe('Client journal');
    });

    it('should handle errors gracefully in batch resolution', async () => {
      const conflicts: ConflictData[] = [
        {
          id: 'batch-error',
          entity: 'habit' as any,
          conflictType: 'data',
          clientData: null as any, // Invalid data to trigger error
          serverData: { completedToday: false },
          clientTimestamp: '2025-01-15T10:00:00Z',
          serverTimestamp: '2025-01-15T09:30:00Z'
        }
      ];

      const results = await resolver.resolveConflicts(conflicts);

      expect(results).toHaveLength(1);
      expect(results[0].strategy).toBe('server_wins');
      expect(results[0].confidence).toBe(0);
      expect(results[0].explanation).toContain('Resolution failed');
    });
  });

  describe('strategy selection', () => {
    it('should return available strategies for different entities', () => {
      const habitStrategies = resolver.getAvailableStrategies('habit');
      const journalStrategies = resolver.getAvailableStrategies('journal');
      const planStrategies = resolver.getAvailableStrategies('plan');

      expect(habitStrategies).toContain('semantic_merge');
      expect(habitStrategies).toContain('field_level_merge');
      expect(journalStrategies).toContain('merge_automatic');
      expect(planStrategies).toEqual(['client_wins', 'server_wins', 'last_write_wins']);
    });
  });
});

describe('ConflictResolver edge cases', () => {
  let resolver: ConflictResolver;

  beforeEach(() => {
    resolver = new ConflictResolver();
  });

  it('should handle missing timestamps gracefully', async () => {
    const conflict: ConflictData = {
      id: 'no-timestamp',
      entity: 'habit',
      conflictType: 'timestamp',
      clientData: { title: 'Client' },
      serverData: { title: 'Server' },
      clientTimestamp: '',
      serverTimestamp: ''
    };

    const result = await resolver.resolveConflict(conflict);

    expect(result).toBeDefined();
    expect(result.strategy).toBeDefined();
  });

  it('should handle identical data gracefully', async () => {
    const conflict: ConflictData = {
      id: 'identical',
      entity: 'habit',
      conflictType: 'data',
      clientData: { title: 'Same', completedToday: true },
      serverData: { title: 'Same', completedToday: true },
      clientTimestamp: '2025-01-15T10:00:00Z',
      serverTimestamp: '2025-01-15T09:30:00Z'
    };

    const result = await resolver.resolveConflict(conflict);

    expect(result.resolvedData).toEqual(conflict.clientData);
    expect(result.confidence).toBeGreaterThan(0.9);
  });

  it('should handle complex nested objects', async () => {
    const conflict: ConflictData = {
      id: 'nested',
      entity: 'plan',
      conflictType: 'data',
      clientData: {
        schedule: {
          frequency: 'daily',
          times: ['fajr', 'dhuhr']
        },
        metadata: {
          created: '2025-01-15',
          version: 2
        }
      },
      serverData: {
        schedule: {
          frequency: 'daily',
          times: ['fajr']
        },
        metadata: {
          created: '2025-01-15',
          version: 1
        }
      },
      clientTimestamp: '2025-01-15T10:00:00Z',
      serverTimestamp: '2025-01-15T09:30:00Z'
    };

    const result = await resolver.resolveConflict(conflict);

    expect(result).toBeDefined();
    expect(result.resolvedData).toBeDefined();
  });
});