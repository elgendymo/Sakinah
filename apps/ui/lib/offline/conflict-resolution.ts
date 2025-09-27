/**
 * Conflict Resolution Strategies for Offline Synchronization
 *
 * This module provides comprehensive conflict resolution strategies for handling
 * data synchronization conflicts between client and server state.
 */

export interface ConflictData {
  id: string;
  entity: 'habit' | 'journal' | 'checkin' | 'plan';
  conflictType: 'timestamp' | 'version' | 'data' | 'concurrent_edit';
  clientData: Record<string, any>;
  serverData: Record<string, any>;
  clientTimestamp: string;
  serverTimestamp: string;
  field?: string; // Specific field that has conflict
  metadata?: {
    deviceId?: string;
    operationId?: string;
    userAgent?: string;
    location?: string;
  };
}

export interface ResolutionResult {
  strategy: ConflictResolutionStrategy;
  resolvedData: Record<string, any>;
  requiresUserInput: boolean;
  confidence: number; // 0-1, how confident the resolution is
  explanation: string;
  appliedRules: string[];
}

export type ConflictResolutionStrategy =
  | 'client_wins'
  | 'server_wins'
  | 'merge_automatic'
  | 'merge_manual'
  | 'last_write_wins'
  | 'field_level_merge'
  | 'semantic_merge'
  | 'user_preference';

export interface ConflictResolutionOptions {
  defaultStrategy?: ConflictResolutionStrategy;
  userPreferences?: Record<string, ConflictResolutionStrategy>;
  autoMergeThreshold?: number; // Confidence threshold for automatic merge
  preserveUserData?: boolean;
  respectEntityRules?: boolean;
}

/**
 * Main conflict resolution engine
 */
export class ConflictResolver {
  private options: Required<ConflictResolutionOptions>;
  private strategies: Map<ConflictResolutionStrategy, ConflictResolutionFunction>;

  constructor(options: ConflictResolutionOptions = {}) {
    this.options = {
      defaultStrategy: 'last_write_wins',
      userPreferences: {},
      autoMergeThreshold: 0.8,
      preserveUserData: true,
      respectEntityRules: true,
      ...options
    };

    this.strategies = new Map([
      ['client_wins', this.clientWinsStrategy],
      ['server_wins', this.serverWinsStrategy],
      ['merge_automatic', this.automaticMergeStrategy],
      ['merge_manual', this.manualMergeStrategy],
      ['last_write_wins', this.lastWriteWinsStrategy],
      ['field_level_merge', this.fieldLevelMergeStrategy],
      ['semantic_merge', this.semanticMergeStrategy],
      ['user_preference', this.userPreferenceStrategy]
    ]);
  }

  /**
   * Resolve a conflict using the best available strategy
   */
  async resolveConflict(conflict: ConflictData): Promise<ResolutionResult> {
    // Determine the best strategy for this conflict
    const strategy = this.selectBestStrategy(conflict);

    // Apply the chosen strategy
    const strategyFunction = this.strategies.get(strategy);
    if (!strategyFunction) {
      throw new Error(`Unknown conflict resolution strategy: ${strategy}`);
    }

    return await strategyFunction.call(this, conflict);
  }

  /**
   * Resolve multiple conflicts in batch
   */
  async resolveConflicts(conflicts: ConflictData[]): Promise<ResolutionResult[]> {
    const results: ResolutionResult[] = [];

    for (const conflict of conflicts) {
      try {
        const result = await this.resolveConflict(conflict);
        results.push(result);
      } catch (error) {
        // Create fallback result for failed resolutions
        results.push({
          strategy: 'server_wins',
          resolvedData: conflict.serverData,
          requiresUserInput: true,
          confidence: 0,
          explanation: `Resolution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          appliedRules: ['fallback_to_server']
        });
      }
    }

    return results;
  }

  /**
   * Set user preference for conflict resolution
   */
  setUserPreference(entity: string, strategy: ConflictResolutionStrategy): void {
    this.options.userPreferences[entity] = strategy;
  }

  /**
   * Get available strategies for an entity
   */
  getAvailableStrategies(entity: string): ConflictResolutionStrategy[] {
    const baseStrategies: ConflictResolutionStrategy[] = [
      'client_wins',
      'server_wins',
      'last_write_wins'
    ];

    // Add entity-specific strategies
    if (entity === 'habit') {
      baseStrategies.push('semantic_merge', 'field_level_merge');
    } else if (entity === 'journal') {
      baseStrategies.push('merge_automatic', 'field_level_merge');
    } else if (entity === 'checkin') {
      baseStrategies.push('semantic_merge');
    }

    return baseStrategies;
  }

  // Private strategy methods

  private selectBestStrategy(conflict: ConflictData): ConflictResolutionStrategy {
    // Check user preferences first
    const userPreference = this.options.userPreferences[conflict.entity];
    if (userPreference) {
      return userPreference;
    }

    // Apply entity-specific logic
    switch (conflict.entity) {
      case 'habit':
        return this.selectHabitStrategy(conflict);
      case 'journal':
        return this.selectJournalStrategy(conflict);
      case 'checkin':
        return this.selectCheckinStrategy(conflict);
      case 'plan':
        return this.selectPlanStrategy(conflict);
      default:
        return this.options.defaultStrategy;
    }
  }

  private selectHabitStrategy(conflict: ConflictData): ConflictResolutionStrategy {
    // For habits, completion status is most important
    if (conflict.field === 'completedToday' || conflict.field === 'streakCount') {
      return 'semantic_merge'; // Use domain knowledge
    }

    // For habit metadata (title, schedule), prefer client changes
    if (conflict.field === 'title' || conflict.field === 'schedule') {
      return 'client_wins';
    }

    return 'last_write_wins';
  }

  private selectJournalStrategy(conflict: ConflictData): ConflictResolutionStrategy {
    // Journal entries are personal, prefer client version
    if (conflict.field === 'content') {
      return 'client_wins';
    }

    // For tags and metadata, try automatic merge
    return 'merge_automatic';
  }

  private selectCheckinStrategy(conflict: ConflictData): ConflictResolutionStrategy {
    // Check-ins are time-sensitive, use semantic merge
    return 'semantic_merge';
  }

  private selectPlanStrategy(conflict: ConflictData): ConflictResolutionStrategy {
    // Plans are complex, require manual resolution
    return 'merge_manual';
  }

  // Strategy implementations

  private async clientWinsStrategy(conflict: ConflictData): Promise<ResolutionResult> {
    return {
      strategy: 'client_wins',
      resolvedData: conflict.clientData,
      requiresUserInput: false,
      confidence: 1.0,
      explanation: 'Client version was preserved as it contains the user\'s latest changes',
      appliedRules: ['preserve_client_data']
    };
  }

  private async serverWinsStrategy(conflict: ConflictData): Promise<ResolutionResult> {
    return {
      strategy: 'server_wins',
      resolvedData: conflict.serverData,
      requiresUserInput: false,
      confidence: 1.0,
      explanation: 'Server version was preserved as it represents the latest synchronized state',
      appliedRules: ['preserve_server_data']
    };
  }

  private async lastWriteWinsStrategy(conflict: ConflictData): Promise<ResolutionResult> {
    const clientTime = new Date(conflict.clientTimestamp).getTime();
    const serverTime = new Date(conflict.serverTimestamp).getTime();

    const useClient = clientTime > serverTime;

    return {
      strategy: 'last_write_wins',
      resolvedData: useClient ? conflict.clientData : conflict.serverData,
      requiresUserInput: false,
      confidence: 0.9,
      explanation: `${useClient ? 'Client' : 'Server'} version was chosen based on timestamp (${useClient ? conflict.clientTimestamp : conflict.serverTimestamp})`,
      appliedRules: ['timestamp_comparison']
    };
  }

  private async automaticMergeStrategy(conflict: ConflictData): Promise<ResolutionResult> {
    const merged = { ...conflict.serverData };
    const appliedRules: string[] = [];
    let confidence = 0.8;

    // Merge non-conflicting fields from client
    for (const [key, value] of Object.entries(conflict.clientData)) {
      if (!(key in conflict.serverData) || conflict.serverData[key] === value) {
        merged[key] = value;
        appliedRules.push(`merged_field_${key}`);
      } else if (this.canAutoMergeField(key, conflict.serverData[key], value)) {
        merged[key] = this.mergeFieldValues(conflict.serverData[key], value);
        appliedRules.push(`auto_merged_${key}`);
      } else {
        // Conflict in this field - reduce confidence
        confidence *= 0.7;
      }
    }

    return {
      strategy: 'merge_automatic',
      resolvedData: merged,
      requiresUserInput: confidence < this.options.autoMergeThreshold,
      confidence,
      explanation: `Automatically merged compatible fields. ${appliedRules.length} fields were successfully merged.`,
      appliedRules
    };
  }

  private async fieldLevelMergeStrategy(conflict: ConflictData): Promise<ResolutionResult> {
    const merged = { ...conflict.serverData };
    const appliedRules: string[] = [];

    // Apply field-specific merge rules
    for (const [key, clientValue] of Object.entries(conflict.clientData)) {
      const serverValue = conflict.serverData[key];

      if (key === 'tags' && Array.isArray(clientValue) && Array.isArray(serverValue)) {
        // Merge arrays by combining unique values
        merged[key] = [...new Set([...serverValue, ...clientValue])];
        appliedRules.push('merged_tags_array');
      } else if (key === 'streakCount' && typeof clientValue === 'number' && typeof serverValue === 'number') {
        // For streak count, use the higher value (represents more progress)
        merged[key] = Math.max(clientValue, serverValue);
        appliedRules.push('max_streak_count');
      } else if (key === 'completedToday' && typeof clientValue === 'boolean') {
        // For completion status, prefer true (completed) over false
        merged[key] = clientValue || serverValue;
        appliedRules.push('preserve_completion_status');
      } else if (clientValue !== serverValue) {
        // Use last write wins for other fields
        const clientTime = new Date(conflict.clientTimestamp).getTime();
        const serverTime = new Date(conflict.serverTimestamp).getTime();
        merged[key] = clientTime > serverTime ? clientValue : serverValue;
        appliedRules.push(`timestamp_based_${key}`);
      }
    }

    return {
      strategy: 'field_level_merge',
      resolvedData: merged,
      requiresUserInput: false,
      confidence: 0.85,
      explanation: `Applied field-specific merge rules for ${appliedRules.length} fields`,
      appliedRules
    };
  }

  private async semanticMergeStrategy(conflict: ConflictData): Promise<ResolutionResult> {
    const merged = { ...conflict.serverData };
    const appliedRules: string[] = [];

    // Apply semantic understanding based on entity type
    if (conflict.entity === 'habit') {
      merged = this.semanticMergeHabit(conflict, appliedRules);
    } else if (conflict.entity === 'checkin') {
      merged = this.semanticMergeCheckin(conflict, appliedRules);
    }

    return {
      strategy: 'semantic_merge',
      resolvedData: merged,
      requiresUserInput: false,
      confidence: 0.9,
      explanation: `Applied semantic merge rules based on ${conflict.entity} domain knowledge`,
      appliedRules
    };
  }

  private async manualMergeStrategy(conflict: ConflictData): Promise<ResolutionResult> {
    return {
      strategy: 'merge_manual',
      resolvedData: conflict.serverData, // Default to server until user input
      requiresUserInput: true,
      confidence: 0.0,
      explanation: 'Manual resolution required due to complex conflicts',
      appliedRules: ['requires_manual_resolution']
    };
  }

  private async userPreferenceStrategy(conflict: ConflictData): Promise<ResolutionResult> {
    // This would typically involve showing UI to user
    // For now, fallback to default strategy
    return this.lastWriteWinsStrategy(conflict);
  }

  // Helper methods

  private canAutoMergeField(key: string, serverValue: any, clientValue: any): boolean {
    // Arrays can often be merged
    if (Array.isArray(serverValue) && Array.isArray(clientValue)) {
      return true;
    }

    // Objects can sometimes be merged
    if (typeof serverValue === 'object' && typeof clientValue === 'object' &&
        serverValue !== null && clientValue !== null) {
      return true;
    }

    // Numbers can be merged with business logic
    if (typeof serverValue === 'number' && typeof clientValue === 'number' &&
        (key === 'streakCount' || key === 'count' || key.includes('Count'))) {
      return true;
    }

    return false;
  }

  private mergeFieldValues(serverValue: any, clientValue: any): any {
    if (Array.isArray(serverValue) && Array.isArray(clientValue)) {
      return [...new Set([...serverValue, ...clientValue])];
    }

    if (typeof serverValue === 'object' && typeof clientValue === 'object') {
      return { ...serverValue, ...clientValue };
    }

    if (typeof serverValue === 'number' && typeof clientValue === 'number') {
      return Math.max(serverValue, clientValue);
    }

    return clientValue; // Default to client value
  }

  private semanticMergeHabit(conflict: ConflictData, appliedRules: string[]): Record<string, any> {
    const merged = { ...conflict.serverData };

    // Habit-specific semantic rules
    const clientData = conflict.clientData;
    const serverData = conflict.serverData;

    // Completion status: true takes precedence (user marked as completed)
    if ('completedToday' in clientData && 'completedToday' in serverData) {
      merged.completedToday = clientData.completedToday || serverData.completedToday;
      appliedRules.push('completion_priority');
    }

    // Streak count: use the higher value (more progress)
    if ('streakCount' in clientData && 'streakCount' in serverData) {
      merged.streakCount = Math.max(
        Number(clientData.streakCount) || 0,
        Number(serverData.streakCount) || 0
      );
      appliedRules.push('max_streak_preservation');
    }

    // Last completed date: use the most recent
    if ('lastCompletedOn' in clientData && 'lastCompletedOn' in serverData) {
      const clientDate = new Date(clientData.lastCompletedOn || 0);
      const serverDate = new Date(serverData.lastCompletedOn || 0);
      merged.lastCompletedOn = clientDate > serverDate ? clientData.lastCompletedOn : serverData.lastCompletedOn;
      appliedRules.push('recent_completion_date');
    }

    return merged;
  }

  private semanticMergeCheckin(conflict: ConflictData, appliedRules: string[]): Record<string, any> {
    const merged = { ...conflict.serverData };

    // Checkin-specific semantic rules
    const clientData = conflict.clientData;

    // Mood and reflection data: prefer client (more personal)
    if ('mood' in clientData) {
      merged.mood = clientData.mood;
      appliedRules.push('personal_mood_preference');
    }

    if ('reflection' in clientData) {
      merged.reflection = clientData.reflection;
      appliedRules.push('personal_reflection_preference');
    }

    // Merge goals if both exist
    if ('goals' in clientData && 'goals' in conflict.serverData &&
        Array.isArray(clientData.goals) && Array.isArray(conflict.serverData.goals)) {
      merged.goals = [...new Set([...conflict.serverData.goals, ...clientData.goals])];
      appliedRules.push('merged_goals_array');
    }

    return merged;
  }
}

type ConflictResolutionFunction = (conflict: ConflictData) => Promise<ResolutionResult>;

/**
 * Conflict resolution UI helper
 */
export interface ConflictResolutionUI {
  showConflictDialog(conflict: ConflictData, strategies: ConflictResolutionStrategy[]): Promise<{
    strategy: ConflictResolutionStrategy;
    customData?: Record<string, any>;
  }>;

  showMergeEditor(
    clientData: Record<string, any>,
    serverData: Record<string, any>,
    suggestedMerge: Record<string, any>
  ): Promise<Record<string, any>>;

  showBatchResolutionDialog(conflicts: ConflictData[]): Promise<{
    resolutions: Array<{
      conflictId: string;
      strategy: ConflictResolutionStrategy;
      customData?: Record<string, any>;
    }>;
    applyToSimilar: boolean;
  }>;
}

/**
 * Export singleton resolver with default configuration
 */
export const conflictResolver = new ConflictResolver({
  defaultStrategy: 'field_level_merge',
  preserveUserData: true,
  respectEntityRules: true,
  autoMergeThreshold: 0.8
});