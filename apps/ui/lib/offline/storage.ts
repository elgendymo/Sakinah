// Offline storage utilities using IndexedDB for PWA
import { openDB, IDBPDatabase } from 'idb';

interface OfflineAction {
  id: string;
  type: 'habit-toggle' | 'journal-create' | 'journal-delete' | 'checkin-create';
  data: any;
  timestamp: number;
  retryCount: number;
  status: 'pending' | 'syncing' | 'failed';
}

interface StoredHabit {
  id: string;
  title: string;
  streakCount: number;
  lastCompletedOn?: string;
  completedToday: boolean;
  plan: {
    target: string;
    kind: 'takhliyah' | 'tahliyah';
  };
  lastUpdated: number;
}

interface StoredJournalEntry {
  id: string;
  content: string;
  tags?: string[];
  createdAt: string;
  isOffline: boolean;
  lastUpdated: number;
}

interface StoredCheckin {
  id: string;
  date: string;
  data: any;
  isOffline: boolean;
  lastUpdated: number;
}

class OfflineStorage {
  private dbName = 'SakinahOfflineDB';
  private version = 1;
  private db: IDBPDatabase | null = null;

  async init(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      this.db = await openDB(this.dbName, this.version, {
        upgrade(db) {
          // Actions queue for sync when online
          if (!db.objectStoreNames.contains('actions')) {
            const actionsStore = db.createObjectStore('actions', { keyPath: 'id' });
            actionsStore.createIndex('status', 'status');
            actionsStore.createIndex('timestamp', 'timestamp');
          }

          // Habits storage
          if (!db.objectStoreNames.contains('habits')) {
            const habitsStore = db.createObjectStore('habits', { keyPath: 'id' });
            habitsStore.createIndex('lastUpdated', 'lastUpdated');
          }

          // Journal entries storage
          if (!db.objectStoreNames.contains('journals')) {
            const journalsStore = db.createObjectStore('journals', { keyPath: 'id' });
            journalsStore.createIndex('createdAt', 'createdAt');
            journalsStore.createIndex('isOffline', 'isOffline');
          }

          // Check-ins storage
          if (!db.objectStoreNames.contains('checkins')) {
            const checkinsStore = db.createObjectStore('checkins', { keyPath: 'id' });
            checkinsStore.createIndex('date', 'date');
            checkinsStore.createIndex('isOffline', 'isOffline');
          }

          // App metadata
          if (!db.objectStoreNames.contains('metadata')) {
            db.createObjectStore('metadata', { keyPath: 'key' });
          }
        },
      });

      console.log('Offline storage initialized');
    } catch (error) {
      console.error('Failed to initialize offline storage:', error);
    }
  }

  // Actions queue management
  async addAction(action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount' | 'status'>): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) return;

    const fullAction: OfflineAction = {
      id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...action,
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending'
    };

    await this.db.add('actions', fullAction);
  }

  async getPendingActions(): Promise<OfflineAction[]> {
    if (!this.db) await this.init();
    if (!this.db) return [];

    return this.db.getAllFromIndex('actions', 'status', 'pending');
  }

  async updateActionStatus(actionId: string, status: OfflineAction['status'], incrementRetry = false): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) return;

    const action = await this.db.get('actions', actionId);
    if (action) {
      action.status = status;
      if (incrementRetry) {
        action.retryCount++;
      }
      await this.db.put('actions', action);
    }
  }

  async removeAction(actionId: string): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) return;

    await this.db.delete('actions', actionId);
  }

  // Habits storage
  async saveHabits(habits: StoredHabit[]): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) return;

    const tx = this.db.transaction('habits', 'readwrite');
    for (const habit of habits) {
      await tx.objectStore('habits').put({
        ...habit,
        lastUpdated: Date.now()
      });
    }
    await tx.done;
  }

  async getHabits(): Promise<StoredHabit[]> {
    if (!this.db) await this.init();
    if (!this.db) return [];

    return this.db.getAll('habits');
  }

  async toggleHabitOffline(habitId: string, completed: boolean): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) return;

    const habit = await this.db.get('habits', habitId);
    if (habit) {
      habit.completedToday = completed;
      habit.streakCount = completed ? habit.streakCount + 1 : Math.max(0, habit.streakCount - 1);
      habit.lastCompletedOn = completed ? new Date().toISOString().split('T')[0] : undefined;
      habit.lastUpdated = Date.now();

      await this.db.put('habits', habit);
    }

    // Add to sync queue
    await this.addAction({
      type: 'habit-toggle',
      data: { habitId, completed }
    });
  }

  // Journal storage
  async saveJournalEntry(entry: StoredJournalEntry): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) return;

    await this.db.put('journals', {
      ...entry,
      lastUpdated: Date.now()
    });

    // Add to sync queue if offline entry
    if (entry.isOffline) {
      await this.addAction({
        type: 'journal-create',
        data: entry
      });
    }
  }

  async getJournalEntries(): Promise<StoredJournalEntry[]> {
    if (!this.db) await this.init();
    if (!this.db) return [];

    const entries = await this.db.getAll('journals');
    return entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async deleteJournalEntryOffline(entryId: string): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) return;

    const entry = await this.db.get('journals', entryId);
    if (entry) {
      if (entry.isOffline) {
        // If it's an offline-only entry, just delete it
        await this.db.delete('journals', entryId);
      } else {
        // If it exists on server, mark for deletion and add to sync queue
        await this.db.delete('journals', entryId);
        await this.addAction({
          type: 'journal-delete',
          data: { entryId }
        });
      }
    }
  }

  // Check-ins storage
  async saveCheckin(checkin: StoredCheckin): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) return;

    await this.db.put('checkins', {
      ...checkin,
      lastUpdated: Date.now()
    });

    // Add to sync queue if offline
    if (checkin.isOffline) {
      await this.addAction({
        type: 'checkin-create',
        data: checkin
      });
    }
  }

  async getCheckins(): Promise<StoredCheckin[]> {
    if (!this.db) await this.init();
    if (!this.db) return [];

    return this.db.getAll('checkins');
  }

  // Metadata storage
  async setMetadata(key: string, value: any): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) return;

    await this.db.put('metadata', { key, value, timestamp: Date.now() });
  }

  async getMetadata(key: string): Promise<any> {
    if (!this.db) await this.init();
    if (!this.db) return null;

    const item = await this.db.get('metadata', key);
    return item?.value || null;
  }

  // Utility methods
  async clear(): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) return;

    const stores = ['actions', 'habits', 'journals', 'checkins', 'metadata'];
    for (const storeName of stores) {
      await this.db.clear(storeName);
    }
  }

  async getStorageInfo(): Promise<{
    pendingActions: number;
    totalHabits: number;
    totalJournals: number;
    totalCheckins: number;
  }> {
    if (!this.db) await this.init();
    if (!this.db) return { pendingActions: 0, totalHabits: 0, totalJournals: 0, totalCheckins: 0 };

    const [pendingActions, habits, journals, checkins] = await Promise.all([
      this.getPendingActions(),
      this.getHabits(),
      this.getJournalEntries(),
      this.getCheckins()
    ]);

    return {
      pendingActions: pendingActions.length,
      totalHabits: habits.length,
      totalJournals: journals.length,
      totalCheckins: checkins.length
    };
  }
}

// Export singleton instance
export const offlineStorage = new OfflineStorage();

// Auto-initialize when imported in browser
if (typeof window !== 'undefined') {
  offlineStorage.init().catch(console.error);
}