/**
 * React hook for using the offline sync service
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { OfflineSyncService, SyncStatus, OfflineOperation } from '../services/OfflineSyncService';
import { ConflictData } from '../offline/conflict-resolution';

export interface UseSyncServiceOptions {
  autoInit?: boolean;
  enableNotifications?: boolean;
}

export interface SyncServiceHook {
  // Status
  syncStatus: SyncStatus | null;
  conflicts: ConflictData[];
  isInitialized: boolean;
  isLoading: boolean;
  error: Error | null;

  // Operations
  performOperation: (operation: OfflineOperation) => Promise<{
    success: boolean;
    result?: any;
    queuedForSync?: boolean;
    error?: Error;
  }>;
  sync: () => Promise<void>;
  resolveConflict: (conflictId: string, resolution: 'client' | 'server' | 'merge', mergedData?: any) => Promise<void>;
  autoResolveConflicts: () => Promise<number>;
  clearOfflineData: () => Promise<void>;

  // Utilities
  retry: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useSyncService(
  syncService: OfflineSyncService | null,
  options: UseSyncServiceOptions = {}
): SyncServiceHook {
  const { autoInit = true, enableNotifications = true } = options;

  // State
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [conflicts, setConflicts] = useState<ConflictData[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Refs for stable references
  const syncServiceRef = useRef<OfflineSyncService | null>(syncService);
  const notificationPermissionRef = useRef<NotificationPermission>('default');

  // Update ref when service changes
  useEffect(() => {
    syncServiceRef.current = syncService;
  }, [syncService]);

  // Request notification permission
  useEffect(() => {
    if (enableNotifications && 'Notification' in window) {
      Notification.requestPermission().then(permission => {
        notificationPermissionRef.current = permission;
      });
    }
  }, [enableNotifications]);

  // Initialize sync service
  useEffect(() => {
    if (!syncService || !autoInit) return;

    const initialize = async () => {
      setIsLoading(true);
      setError(null);

      try {
        await syncService.initialize();
        setIsInitialized(true);

        // Set up listeners
        const statusListener = (status: SyncStatus) => {
          setSyncStatus(status);
        };

        const conflictListener = (conflictList: ConflictData[]) => {
          setConflicts(conflictList);

          // Show notification for new conflicts if enabled
          if (enableNotifications && conflictList.length > conflicts.length) {
            showConflictNotification(conflictList.length - conflicts.length);
          }
        };

        syncService.addSyncStatusListener(statusListener);
        syncService.addConflictListener(conflictListener);

        // Load initial status
        const initialStatus = await syncService.getSyncStatus();
        setSyncStatus(initialStatus);

      } catch (err) {
        setError(err instanceof Error ? err : new Error('Initialization failed'));
      } finally {
        setIsLoading(false);
      }
    };

    initialize();

    // Cleanup
    return () => {
      if (syncServiceRef.current) {
        syncServiceRef.current.stop();
      }
    };
  }, [syncService, autoInit, enableNotifications, conflicts.length]);

  // Operations
  const performOperation = useCallback(async (operation: OfflineOperation) => {
    if (!syncServiceRef.current) {
      throw new Error('Sync service not available');
    }

    setError(null);

    try {
      const result = await syncServiceRef.current.performOperation(operation);

      // Show success notification if operation was queued for sync
      if (result.queuedForSync && enableNotifications) {
        showOperationNotification(operation, 'queued');
      } else if (result.success && enableNotifications) {
        showOperationNotification(operation, 'completed');
      }

      return result;

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Operation failed');
      setError(error);

      if (enableNotifications) {
        showOperationNotification(operation, 'failed');
      }

      throw error;
    }
  }, [enableNotifications]);

  const sync = useCallback(async () => {
    if (!syncServiceRef.current) {
      throw new Error('Sync service not available');
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await syncServiceRef.current.sync();

      if (enableNotifications && result.processed > 0) {
        showSyncNotification(result.processed, result.failed, result.conflicts);
      }

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Sync failed');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [enableNotifications]);

  const resolveConflict = useCallback(async (
    conflictId: string,
    resolution: 'client' | 'server' | 'merge',
    mergedData?: any
  ) => {
    if (!syncServiceRef.current) {
      throw new Error('Sync service not available');
    }

    setError(null);

    try {
      await syncServiceRef.current.resolveConflict(conflictId, resolution, mergedData);

      if (enableNotifications) {
        showConflictResolutionNotification(conflictId, resolution);
      }

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Conflict resolution failed');
      setError(error);
      throw error;
    }
  }, [enableNotifications]);

  const autoResolveConflicts = useCallback(async () => {
    if (!syncServiceRef.current) {
      throw new Error('Sync service not available');
    }

    setError(null);

    try {
      const resolvedCount = await syncServiceRef.current.autoResolveConflicts();

      if (enableNotifications && resolvedCount > 0) {
        showAutoResolveNotification(resolvedCount);
      }

      return resolvedCount;

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Auto-resolve failed');
      setError(error);
      throw error;
    }
  }, [enableNotifications]);

  const clearOfflineData = useCallback(async () => {
    if (!syncServiceRef.current) {
      throw new Error('Sync service not available');
    }

    setError(null);

    try {
      await syncServiceRef.current.clearOfflineData();

      if (enableNotifications) {
        showClearDataNotification();
      }

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Clear data failed');
      setError(error);
      throw error;
    }
  }, [enableNotifications]);

  const retry = useCallback(async () => {
    if (error) {
      setError(null);
      await sync();
    }
  }, [error, sync]);

  const refresh = useCallback(async () => {
    if (!syncServiceRef.current) return;

    try {
      const status = await syncServiceRef.current.getSyncStatus();
      setSyncStatus(status);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Refresh failed'));
    }
  }, []);

  return {
    // Status
    syncStatus,
    conflicts,
    isInitialized,
    isLoading,
    error,

    // Operations
    performOperation,
    sync,
    resolveConflict,
    autoResolveConflicts,
    clearOfflineData,

    // Utilities
    retry,
    refresh
  };
}

// Notification helpers
function showConflictNotification(newConflictCount: number): void {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Sakinah - Sync Conflicts', {
      body: `${newConflictCount} new sync conflict${newConflictCount > 1 ? 's' : ''} detected. Please review and resolve.`,
      icon: '/icons/icon-192x192.png',
      tag: 'sync-conflicts',
      requireInteraction: true
    });
  }
}

function showOperationNotification(
  operation: OfflineOperation,
  status: 'queued' | 'completed' | 'failed'
): void {
  if ('Notification' in window && Notification.permission === 'granted') {
    const entityName = operation.entity.charAt(0).toUpperCase() + operation.entity.slice(1);
    const actionName = operation.action.charAt(0).toUpperCase() + operation.action.slice(1);

    let title = 'Sakinah';
    let body = '';

    switch (status) {
      case 'queued':
        title = 'Sakinah - Offline';
        body = `${entityName} ${actionName.toLowerCase()} saved locally. Will sync when online.`;
        break;
      case 'completed':
        title = 'Sakinah - Success';
        body = `${entityName} ${actionName.toLowerCase()}d successfully.`;
        break;
      case 'failed':
        title = 'Sakinah - Error';
        body = `Failed to ${operation.action} ${operation.entity}. Please try again.`;
        break;
    }

    new Notification(title, {
      body,
      icon: '/icons/icon-192x192.png',
      tag: `operation-${status}`
    });
  }
}

function showSyncNotification(processed: number, failed: number, conflicts: number): void {
  if ('Notification' in window && Notification.permission === 'granted') {
    let body = `Synced ${processed} operation${processed !== 1 ? 's' : ''}`;

    if (failed > 0) {
      body += `, ${failed} failed`;
    }

    if (conflicts > 0) {
      body += `, ${conflicts} conflict${conflicts !== 1 ? 's' : ''} need resolution`;
    }

    new Notification('Sakinah - Sync Complete', {
      body,
      icon: '/icons/icon-192x192.png',
      tag: 'sync-complete'
    });
  }
}

function showConflictResolutionNotification(_conflictId: string, resolution: string): void {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Sakinah - Conflict Resolved', {
      body: `Conflict resolved using ${resolution} version.`,
      icon: '/icons/icon-192x192.png',
      tag: 'conflict-resolved'
    });
  }
}

function showAutoResolveNotification(resolvedCount: number): void {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Sakinah - Auto-Resolve', {
      body: `Automatically resolved ${resolvedCount} conflict${resolvedCount !== 1 ? 's' : ''}.`,
      icon: '/icons/icon-192x192.png',
      tag: 'auto-resolve'
    });
  }
}

function showClearDataNotification(): void {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Sakinah - Data Cleared', {
      body: 'All offline data has been cleared.',
      icon: '/icons/icon-192x192.png',
      tag: 'data-cleared'
    });
  }
}

/**
 * Hook for simplified habit operations with sync
 */
export function useSyncedHabits(syncService: OfflineSyncService | null) {
  const { performOperation, syncStatus, error } = useSyncService(syncService);

  const toggleHabit = useCallback(async (habitId: string, completed: boolean) => {
    return performOperation({
      id: `habit-${habitId}-${Date.now()}`,
      action: 'update',
      entity: 'habit',
      data: { habitId, completed },
      metadata: {
        optimisticUpdate: true,
        priority: 'normal'
      }
    });
  }, [performOperation]);

  return {
    toggleHabit,
    isOnline: syncStatus?.isOnline ?? false,
    isSyncing: syncStatus?.isSyncing ?? false,
    error
  };
}

/**
 * Hook for simplified journal operations with sync
 */
export function useSyncedJournal(syncService: OfflineSyncService | null) {
  const { performOperation, syncStatus, error } = useSyncService(syncService);

  const createJournalEntry = useCallback(async (content: string, tags?: string[]) => {
    return performOperation({
      id: `journal-${Date.now()}`,
      action: 'create',
      entity: 'journal',
      data: { content, tags },
      metadata: {
        optimisticUpdate: true,
        priority: 'normal'
      }
    });
  }, [performOperation]);

  const deleteJournalEntry = useCallback(async (entryId: string) => {
    return performOperation({
      id: `journal-delete-${entryId}-${Date.now()}`,
      action: 'delete',
      entity: 'journal',
      data: { entryId },
      metadata: {
        priority: 'normal'
      }
    });
  }, [performOperation]);

  return {
    createJournalEntry,
    deleteJournalEntry,
    isOnline: syncStatus?.isOnline ?? false,
    isSyncing: syncStatus?.isSyncing ?? false,
    error
  };
}

/**
 * Hook for simplified checkin operations with sync
 */
export function useSyncedCheckins(syncService: OfflineSyncService | null) {
  const { performOperation, syncStatus, error } = useSyncService(syncService);

  const createCheckin = useCallback(async (checkinData: any) => {
    return performOperation({
      id: `checkin-${Date.now()}`,
      action: 'create',
      entity: 'checkin',
      data: checkinData,
      metadata: {
        optimisticUpdate: true,
        priority: 'high' // Checkins are time-sensitive
      }
    });
  }, [performOperation]);

  return {
    createCheckin,
    isOnline: syncStatus?.isOnline ?? false,
    isSyncing: syncStatus?.isSyncing ?? false,
    error
  };
}