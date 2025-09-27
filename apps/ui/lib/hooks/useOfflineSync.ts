import { useState, useEffect, useCallback } from 'react';
import { offlineStorage } from '@/lib/offline/storage';
import { api } from '@/lib/api';

interface OfflineSyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingActions: number;
  lastSyncTime: Date | null;
  syncError: Error | null;
}

interface UseOfflineSyncReturn extends OfflineSyncStatus {
  syncNow: () => Promise<void>;
  clearSyncError: () => void;
  registerForBackgroundSync: (tag: string) => Promise<boolean>;
}

export function useOfflineSync(): UseOfflineSyncReturn {
  const [syncStatus, setSyncStatus] = useState<OfflineSyncStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
    pendingActions: 0,
    lastSyncTime: null,
    syncError: null
  });

  // Update online status
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateOnlineStatus = () => {
      setSyncStatus(prev => ({ ...prev, isOnline: navigator.onLine }));
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  // Load pending actions count on mount
  useEffect(() => {
    const loadPendingCount = async () => {
      try {
        const actions = await offlineStorage.getPendingActions();
        setSyncStatus(prev => ({ ...prev, pendingActions: actions.length }));
      } catch (error) {
        console.error('Failed to load pending actions:', error);
      }
    };

    loadPendingCount();
  }, []);

  // Auto-sync when coming back online
  useEffect(() => {
    if (syncStatus.isOnline && syncStatus.pendingActions > 0 && !syncStatus.isSyncing) {
      syncNow();
    }
  }, [syncStatus.isOnline]);

  const syncNow = useCallback(async () => {
    if (syncStatus.isSyncing) return;

    setSyncStatus(prev => ({ ...prev, isSyncing: true, syncError: null }));

    try {
      // Get user token (this should be adapted to your auth system)
      const token = localStorage.getItem('auth_token') || '';
      if (!token) {
        throw new Error('No authentication token available');
      }

      const pendingActions = await offlineStorage.getPendingActions();
      let successCount = 0;
      let failureCount = 0;

      for (const action of pendingActions) {
        try {
          await offlineStorage.updateActionStatus(action.id, 'syncing');

          switch (action.type) {
            case 'habit-toggle':
              await api.toggleHabit(action.data.habitId, action.data.completed, token);
              break;

            case 'journal-create':
              await api.createJournalEntry({
                content: action.data.content,
                tags: action.data.tags
              }, token);
              break;

            case 'journal-delete':
              await api.deleteJournalEntry(action.data.entryId, token);
              break;

            case 'checkin-create':
              await api.createCheckin(action.data.data, token);
              break;

            default:
              console.warn('Unknown action type:', action.type);
          }

          // Success - remove action
          await offlineStorage.removeAction(action.id);
          successCount++;

        } catch (error) {
          console.error(`Failed to sync action ${action.id}:`, error);

          if (action.retryCount < 3) {
            // Retry later
            await offlineStorage.updateActionStatus(action.id, 'pending', true);
          } else {
            // Max retries exceeded - mark as failed
            await offlineStorage.updateActionStatus(action.id, 'failed');
          }
          failureCount++;
        }
      }

      // Update status
      const remainingActions = await offlineStorage.getPendingActions();
      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        pendingActions: remainingActions.length,
        lastSyncTime: new Date(),
        syncError: failureCount > 0 ? new Error(`${failureCount} actions failed to sync`) : null
      }));

      // Show success notification if we synced actions
      if (successCount > 0) {
        showSyncNotification(`Synced ${successCount} action(s) successfully`);
      }

    } catch (error) {
      console.error('Sync failed:', error);
      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        syncError: error as Error
      }));
    }
  }, [syncStatus.isSyncing]);

  const clearSyncError = useCallback(() => {
    setSyncStatus(prev => ({ ...prev, syncError: null }));
  }, []);

  const registerForBackgroundSync = useCallback(async (tag: string): Promise<boolean> => {
    if (!('serviceWorker' in navigator) || !('sync' in window.ServiceWorkerRegistration.prototype)) {
      console.warn('Background sync not supported');
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      // Type cast to access sync property (Background Sync API)
      await (registration as any).sync.register(tag);
      return true;
    } catch (error) {
      console.error('Failed to register background sync:', error);
      return false;
    }
  }, []);

  return {
    ...syncStatus,
    syncNow,
    clearSyncError,
    registerForBackgroundSync
  };
}

// Hook for offline-aware API calls
export function useOfflineAwareApi() {
  const { isOnline } = useOfflineSync();

  const makeOfflineAwareCall = useCallback(async <T>(
    onlineCall: () => Promise<T>,
    offlineCall: () => Promise<T>,
    fallbackData?: T
  ): Promise<T> => {
    if (isOnline) {
      try {
        return await onlineCall();
      } catch (error) {
        console.warn('Online call failed, trying offline fallback:', error);
        if (offlineCall) {
          return await offlineCall();
        }
        if (fallbackData !== undefined) {
          return fallbackData;
        }
        throw error;
      }
    } else {
      if (offlineCall) {
        return await offlineCall();
      }
      if (fallbackData !== undefined) {
        return fallbackData;
      }
      throw new Error('Offline and no fallback available');
    }
  }, [isOnline]);

  return {
    isOnline,
    makeOfflineAwareCall
  };
}

// Utility function to show sync notifications
function showSyncNotification(message: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Sakinah', {
      body: message,
      icon: '/icons/icon-192x192.png',
      tag: 'sync-notification'
    });
  }
}

// Hook for managing offline storage
export function useOfflineStorage() {
  const [storageInfo, setStorageInfo] = useState({
    pendingActions: 0,
    totalHabits: 0,
    totalJournals: 0,
    totalCheckins: 0
  });

  const refreshStorageInfo = useCallback(async () => {
    try {
      const info = await offlineStorage.getStorageInfo();
      setStorageInfo(info);
    } catch (error) {
      console.error('Failed to get storage info:', error);
    }
  }, []);

  useEffect(() => {
    refreshStorageInfo();
  }, [refreshStorageInfo]);

  const clearOfflineData = useCallback(async () => {
    try {
      await offlineStorage.clear();
      await refreshStorageInfo();
    } catch (error) {
      console.error('Failed to clear offline data:', error);
    }
  }, [refreshStorageInfo]);

  return {
    storageInfo,
    refreshStorageInfo,
    clearOfflineData
  };
}