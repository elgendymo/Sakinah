/**
 * Offline Synchronization Service
 *
 * This service integrates all offline sync components and provides a unified
 * interface for offline-aware operations across the application.
 */

import { ApiService } from './api/ApiService';
import { offlineStorage } from '../offline/storage';
import { OfflineQueue, QueueEvent } from '../offline/queue';
import { ConflictResolver, ConflictData, ResolutionResult } from '../offline/conflict-resolution';
import { ConnectionMonitor, NetworkEvent } from '../offline/connection-monitor';

export interface SyncServiceConfig {
  apiService: ApiService;
  enableAutoSync?: boolean;
  syncInterval?: number;
  conflictResolutionStrategy?: 'auto' | 'manual' | 'mixed';
  maxRetries?: number;
  batchSize?: number;
}

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  pendingOperations: number;
  conflicts: number;
  syncHealth: 'healthy' | 'warning' | 'error';
  queueMetrics: {
    totalOperations: number;
    pendingOperations: number;
    failedOperations: number;
    completedOperations: number;
  };
  connectionStatus: {
    quality: string;
    type: string;
    isStable: boolean;
  };
}

export interface OfflineOperation {
  id: string;
  action: 'create' | 'update' | 'delete';
  entity: 'habit' | 'journal' | 'checkin' | 'plan';
  data: any;
  metadata?: {
    optimisticUpdate?: boolean;
    priority?: 'low' | 'normal' | 'high' | 'critical';
    dependencies?: string[];
  };
}

/**
 * Main offline synchronization service that orchestrates all sync components
 */
export class OfflineSyncService {
  private apiService: ApiService;
  private queue: OfflineQueue;
  private conflictResolver: ConflictResolver;
  private connectionMonitor: ConnectionMonitor;
  private config: Required<SyncServiceConfig>;
  private syncListeners: Array<(status: SyncStatus) => void> = [];
  private conflictListeners: Array<(conflicts: ConflictData[]) => void> = [];
  private pendingConflicts: ConflictData[] = [];
  private autoSyncInterval?: NodeJS.Timeout;
  private isSyncing = false;
  private lastSyncTime: Date | null = null;

  constructor(config: SyncServiceConfig) {
    this.config = {
      enableAutoSync: true,
      syncInterval: 30000, // 30 seconds
      conflictResolutionStrategy: 'mixed',
      maxRetries: 3,
      batchSize: 10,
      ...config
    };

    this.apiService = config.apiService;
    this.connectionMonitor = new ConnectionMonitor();
    this.conflictResolver = new ConflictResolver();
    this.queue = new OfflineQueue(this.apiService, {
      maxRetries: this.config.maxRetries,
      batchSize: this.config.batchSize,
      enableBatching: true
    });

    this.setupEventListeners();

    if (this.config.enableAutoSync) {
      this.startAutoSync();
    }
  }

  /**
   * Initialize the sync service
   */
  async initialize(): Promise<void> {
    await offlineStorage.init();
    this.connectionMonitor.start();

    // Load pending conflicts from storage
    await this.loadPendingConflicts();

    // Emit initial status
    this.emitSyncStatus();
  }

  /**
   * Perform an offline-aware operation
   */
  async performOperation(operation: OfflineOperation): Promise<{
    success: boolean;
    result?: any;
    queuedForSync?: boolean;
    error?: Error;
  }> {
    const connectionStatus = this.connectionMonitor.getConnectionStatus();

    if (connectionStatus.isOnline && connectionStatus.connectionQuality !== 'poor') {
      // Try to perform operation online
      try {
        const result = await this.performOnlineOperation(operation);

        // Also queue for offline storage as backup
        if (operation.metadata?.optimisticUpdate) {
          await this.storeOfflineOperation(operation);
        }

        return { success: true, result };

      } catch (error) {
        // Failed online, queue for offline sync
        await this.queueOfflineOperation(operation);

        return {
          success: false,
          queuedForSync: true,
          error: error instanceof Error ? error : new Error('Unknown error')
        };
      }
    } else {
      // Perform offline operation
      await this.performOfflineOperation(operation);
      await this.queueOfflineOperation(operation);

      return { success: true, queuedForSync: true };
    }
  }

  /**
   * Manually trigger sync
   */
  async sync(): Promise<{
    success: boolean;
    processed: number;
    failed: number;
    conflicts: number;
  }> {
    if (this.isSyncing) {
      throw new Error('Sync already in progress');
    }

    if (!this.connectionMonitor.getConnectionStatus().isOnline) {
      throw new Error('Cannot sync while offline');
    }

    this.isSyncing = true;

    try {
      // Process the queue
      await this.queue.processQueue();

      // Get metrics
      const metrics = await this.queue.getMetrics();

      this.lastSyncTime = new Date();
      this.emitSyncStatus();

      return {
        success: true,
        processed: metrics.completedOperations,
        failed: metrics.failedOperations,
        conflicts: this.pendingConflicts.length
      };

    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Resolve a conflict
   */
  async resolveConflict(
    conflictId: string,
    resolution: 'client' | 'server' | 'merge',
    mergedData?: any
  ): Promise<void> {
    const conflict = this.pendingConflicts.find(c => c.id === conflictId);
    if (!conflict) {
      throw new Error(`Conflict ${conflictId} not found`);
    }

    try {
      // Call backend to resolve conflict
      await this.apiService.post(`/sync/conflicts/${conflictId}/resolve`, {
        resolution,
        mergedData
      });

      // Remove from pending conflicts
      this.pendingConflicts = this.pendingConflicts.filter(c => c.id !== conflictId);

      // Update local storage if needed
      if (resolution === 'client' || resolution === 'merge') {
        const dataToStore = resolution === 'merge' ? mergedData : conflict.clientData;
        await this.updateLocalData(conflict.entity, conflict.id, dataToStore);
      }

      this.emitConflicts();
      this.emitSyncStatus();

    } catch (error) {
      throw new Error(`Failed to resolve conflict: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Auto-resolve conflicts using configured strategy
   */
  async autoResolveConflicts(): Promise<number> {
    if (this.config.conflictResolutionStrategy === 'manual') {
      return 0; // Don't auto-resolve in manual mode
    }

    let resolvedCount = 0;

    for (const conflict of this.pendingConflicts) {
      try {
        const resolution = await this.conflictResolver.resolveConflict(conflict);

        if (resolution.requiresUserInput && this.config.conflictResolutionStrategy !== 'auto') {
          continue; // Skip conflicts that require user input in mixed mode
        }

        await this.resolveConflict(
          conflict.id,
          this.mapResolutionStrategy(resolution),
          resolution.resolvedData
        );

        resolvedCount++;

      } catch (error) {
        console.error(`Failed to auto-resolve conflict ${conflict.id}:`, error);
      }
    }

    return resolvedCount;
  }

  /**
   * Get current sync status
   */
  async getSyncStatus(): Promise<SyncStatus> {
    const connectionStatus = this.connectionMonitor.getConnectionStatus();
    const queueMetrics = await this.queue.getMetrics();

    return {
      isOnline: connectionStatus.isOnline,
      isSyncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime,
      pendingOperations: queueMetrics.pendingOperations,
      conflicts: this.pendingConflicts.length,
      syncHealth: this.calculateSyncHealth(queueMetrics, connectionStatus),
      queueMetrics,
      connectionStatus: {
        quality: connectionStatus.connectionQuality,
        type: connectionStatus.connectionType,
        isStable: connectionStatus.isStable
      }
    };
  }

  /**
   * Clear all offline data
   */
  async clearOfflineData(): Promise<void> {
    await this.queue.clearAll();
    await offlineStorage.clear();
    this.pendingConflicts = [];
    this.emitSyncStatus();
    this.emitConflicts();
  }

  /**
   * Add sync status listener
   */
  addSyncStatusListener(listener: (status: SyncStatus) => void): void {
    this.syncListeners.push(listener);
  }

  /**
   * Remove sync status listener
   */
  removeSyncStatusListener(listener: (status: SyncStatus) => void): void {
    const index = this.syncListeners.indexOf(listener);
    if (index > -1) {
      this.syncListeners.splice(index, 1);
    }
  }

  /**
   * Add conflict listener
   */
  addConflictListener(listener: (conflicts: ConflictData[]) => void): void {
    this.conflictListeners.push(listener);
  }

  /**
   * Remove conflict listener
   */
  removeConflictListener(listener: (conflicts: ConflictData[]) => void): void {
    const index = this.conflictListeners.indexOf(listener);
    if (index > -1) {
      this.conflictListeners.splice(index, 1);
    }
  }

  /**
   * Stop the sync service
   */
  stop(): void {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
      this.autoSyncInterval = undefined;
    }

    this.queue.stopProcessing();
    this.connectionMonitor.stop();
  }

  // Private methods

  private setupEventListeners(): void {
    // Connection events
    this.connectionMonitor.addEventListener((event: NetworkEvent) => {
      if (event.type === 'online' && this.config.enableAutoSync) {
        // Trigger sync when coming back online
        setTimeout(() => this.triggerAutoSync(), 1000);
      }
      this.emitSyncStatus();
    });

    // Queue events
    this.queue.addEventListener((event: QueueEvent) => {
      if (event.type === 'operation-conflict') {
        this.pendingConflicts.push(event.conflict);
        this.emitConflicts();
      }

      if (event.type === 'processing-completed') {
        this.lastSyncTime = new Date();
      }

      this.emitSyncStatus();
    });
  }

  private startAutoSync(): void {
    this.autoSyncInterval = setInterval(() => {
      this.triggerAutoSync();
    }, this.config.syncInterval);
  }

  private async triggerAutoSync(): Promise<void> {
    if (this.isSyncing) return;

    const connectionStatus = this.connectionMonitor.getConnectionStatus();
    if (!connectionStatus.isOnline || connectionStatus.connectionQuality === 'poor') {
      return;
    }

    try {
      await this.sync();

      // Auto-resolve conflicts if enabled
      if (this.config.conflictResolutionStrategy !== 'manual') {
        await this.autoResolveConflicts();
      }

    } catch (error) {
      console.error('Auto-sync failed:', error);
    }
  }

  private async performOnlineOperation(operation: OfflineOperation): Promise<any> {
    const endpoint = this.buildEndpoint(operation);
    const method = this.getHttpMethod(operation.action);

    const response = await this.apiService.request(endpoint, {
      method,
      body: operation.data,
      timeout: 10000 // Shorter timeout for online operations
    });

    return response.data;
  }

  private async performOfflineOperation(operation: OfflineOperation): Promise<void> {
    // Store operation in offline storage for immediate UI updates
    await this.storeOfflineOperation(operation);
  }

  private async storeOfflineOperation(operation: OfflineOperation): Promise<void> {
    switch (operation.entity) {
      case 'habit':
        if (operation.action === 'update') {
          await offlineStorage.toggleHabitOffline(
            operation.data.habitId,
            operation.data.completed
          );
        }
        break;

      case 'journal':
        if (operation.action === 'create') {
          await offlineStorage.saveJournalEntry({
            id: operation.id,
            content: operation.data.content,
            tags: operation.data.tags,
            createdAt: new Date().toISOString(),
            isOffline: true,
            lastUpdated: Date.now()
          });
        } else if (operation.action === 'delete') {
          await offlineStorage.deleteJournalEntryOffline(operation.data.entryId);
        }
        break;

      case 'checkin':
        if (operation.action === 'create') {
          await offlineStorage.saveCheckin({
            id: operation.id,
            date: operation.data.date,
            data: operation.data,
            isOffline: true,
            lastUpdated: Date.now()
          });
        }
        break;
    }
  }

  private async queueOfflineOperation(operation: OfflineOperation): Promise<void> {
    await this.queue.enqueue({
      type: this.mapOperationType(operation),
      endpoint: this.buildEndpoint(operation),
      method: this.getHttpMethod(operation.action),
      data: operation.data,
      priority: operation.metadata?.priority || 'normal',
      maxRetries: this.config.maxRetries
    });
  }

  private buildEndpoint(operation: OfflineOperation): string {
    const baseEndpoints: Record<string, string> = {
      habit: '/v2/habits',
      journal: '/v2/journal',
      checkin: '/v2/checkins',
      plan: '/v2/plans'
    };

    let endpoint = baseEndpoints[operation.entity];

    if (operation.action === 'update' && operation.entity === 'habit') {
      const action = operation.data.completed ? 'complete' : 'incomplete';
      endpoint = `/v2/habits/${operation.data.habitId}/${action}`;
    } else if (operation.action === 'delete') {
      endpoint = `${endpoint}/${operation.data.id || operation.data.entryId}`;
    }

    return endpoint;
  }

  private getHttpMethod(action: string): 'GET' | 'POST' | 'PUT' | 'DELETE' {
    const methodMap: Record<string, 'GET' | 'POST' | 'PUT' | 'DELETE'> = {
      create: 'POST',
      update: 'PUT',
      delete: 'DELETE'
    };

    return methodMap[action] || 'POST';
  }

  private mapOperationType(operation: OfflineOperation): 'habit-toggle' | 'journal-create' | 'journal-delete' | 'checkin-create' {
    if (operation.entity === 'habit' && operation.action === 'update') {
      return 'habit-toggle';
    } else if (operation.entity === 'journal' && operation.action === 'create') {
      return 'journal-create';
    } else if (operation.entity === 'journal' && operation.action === 'delete') {
      return 'journal-delete';
    } else if (operation.entity === 'checkin' && operation.action === 'create') {
      return 'checkin-create';
    }

    throw new Error(`Unsupported operation type: ${operation.entity}:${operation.action}`);
  }

  private mapResolutionStrategy(resolution: ResolutionResult): 'client' | 'server' | 'merge' {
    if (resolution.strategy === 'client_wins') return 'client';
    if (resolution.strategy === 'server_wins') return 'server';
    return 'merge';
  }

  private calculateSyncHealth(queueMetrics: any, connectionStatus: any): 'healthy' | 'warning' | 'error' {
    // Error conditions
    if (!connectionStatus.isOnline) return 'error';
    if (queueMetrics.failedOperations > queueMetrics.totalOperations * 0.2) return 'error';
    if (this.pendingConflicts.length > 10) return 'error';

    // Warning conditions
    if (queueMetrics.pendingOperations > 50) return 'warning';
    if (connectionStatus.connectionQuality === 'poor') return 'warning';
    if (!connectionStatus.isStable) return 'warning';
    if (this.pendingConflicts.length > 0) return 'warning';

    return 'healthy';
  }

  private async loadPendingConflicts(): Promise<void> {
    try {
      const response = await this.apiService.get('/sync/status');
      this.pendingConflicts = response.data.pendingConflicts || [];
      this.emitConflicts();
    } catch (error) {
      console.error('Failed to load pending conflicts:', error);
    }
  }

  private async updateLocalData(entity: string, id: string, data: any): Promise<void> {
    switch (entity) {
      case 'habit':
        // Update habit in local storage
        const habits = await offlineStorage.getHabits();
        const habitIndex = habits.findIndex(h => h.id === id);
        if (habitIndex > -1) {
          habits[habitIndex] = { ...habits[habitIndex], ...data };
          await offlineStorage.saveHabits(habits);
        }
        break;

      case 'journal':
        // Update journal entry in local storage
        const entries = await offlineStorage.getJournalEntries();
        const entryIndex = entries.findIndex(e => e.id === id);
        if (entryIndex > -1) {
          entries[entryIndex] = { ...entries[entryIndex], ...data };
          await offlineStorage.saveJournalEntry(entries[entryIndex]);
        }
        break;

      // Add other entity types as needed
    }
  }

  private async emitSyncStatus(): Promise<void> {
    const status = await this.getSyncStatus();
    this.syncListeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        console.error('Sync status listener error:', error);
      }
    });
  }

  private emitConflicts(): void {
    this.conflictListeners.forEach(listener => {
      try {
        listener([...this.pendingConflicts]);
      } catch (error) {
        console.error('Conflict listener error:', error);
      }
    });
  }
}

// Singleton instance for app-wide usage
let syncServiceInstance: OfflineSyncService | null = null;

export function createSyncService(config: SyncServiceConfig): OfflineSyncService {
  if (syncServiceInstance) {
    syncServiceInstance.stop();
  }

  syncServiceInstance = new OfflineSyncService(config);
  return syncServiceInstance;
}

export function getSyncService(): OfflineSyncService | null {
  return syncServiceInstance;
}