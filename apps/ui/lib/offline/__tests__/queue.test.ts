/**
 * Unit tests for offline queue management
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { OfflineQueue, QueuedOperation, QueueEvent } from '../queue';
import { ApiService } from '../../services/api/ApiService';

// Mock IndexedDB and related APIs
const mockIDBDatabase = {
  add: vi.fn(),
  get: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  clear: vi.fn(),
  getAll: vi.fn(),
  getAllFromIndex: vi.fn(),
  transaction: vi.fn(() => ({
    objectStore: vi.fn(() => mockIDBDatabase),
    done: Promise.resolve()
  }))
};

vi.mock('../storage', () => ({
  offlineStorage: {
    addAction: vi.fn(),
    getPendingActions: vi.fn(() => Promise.resolve([])),
    updateActionStatus: vi.fn(),
    removeAction: vi.fn(),
    clear: vi.fn()
  }
}));

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
});

describe('OfflineQueue', () => {
  let mockApiService: ApiService;
  let queue: OfflineQueue;
  let eventListener: vi.MockedFunction<(event: QueueEvent) => void>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockApiService = {
      post: vi.fn(),
      request: vi.fn()
    } as any;

    queue = new OfflineQueue(mockApiService, {
      maxRetries: 3,
      retryDelay: 100,
      batchSize: 5,
      enableBatching: true
    });

    eventListener = vi.fn();
    queue.addEventListener(eventListener);
  });

  afterEach(() => {
    queue.stop();
  });

  describe('enqueue operations', () => {
    it('should enqueue a single operation', async () => {
      const operation = {
        type: 'habit-toggle' as const,
        endpoint: '/v2/habits/123/complete',
        method: 'POST' as const,
        data: { habitId: '123', completed: true },
        priority: 'normal' as const,
        maxRetries: 3
      };

      const operationId = await queue.enqueue(operation);

      expect(operationId).toBeDefined();
      expect(operationId).toMatch(/^op_\d+_[a-z0-9]+$/);
      expect(eventListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'operation-queued',
          operation: expect.objectContaining({
            id: operationId,
            type: 'habit-toggle',
            status: 'pending'
          })
        })
      );
    });

    it('should enqueue multiple operations as a batch', async () => {
      const operations = [
        {
          type: 'habit-toggle' as const,
          endpoint: '/v2/habits/123/complete',
          method: 'POST' as const,
          data: { habitId: '123' },
          priority: 'normal' as const,
          maxRetries: 3
        },
        {
          type: 'journal-create' as const,
          endpoint: '/v2/journal',
          method: 'POST' as const,
          data: { content: 'Test entry' },
          priority: 'normal' as const,
          maxRetries: 3
        }
      ];

      const operationIds = await queue.enqueueBatch(operations);

      expect(operationIds).toHaveLength(2);
      expect(eventListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'batch-queued',
          groupId: expect.any(String),
          operationIds
        })
      );
    });

    it('should assign unique IDs to operations', async () => {
      const operation = {
        type: 'habit-toggle' as const,
        endpoint: '/v2/habits/123/complete',
        method: 'POST' as const,
        data: {},
        priority: 'normal' as const,
        maxRetries: 3
      };

      const id1 = await queue.enqueue(operation);
      const id2 = await queue.enqueue(operation);

      expect(id1).not.toBe(id2);
    });
  });

  describe('queue processing', () => {
    it('should process operations in priority order', async () => {
      const { offlineStorage } = await import('../storage');

      // Mock pending operations with different priorities
      const mockOperations = [
        {
          id: 'op1',
          data: {
            id: 'op1',
            priority: 'low',
            timestamp: 1000,
            status: 'pending',
            type: 'habit-toggle',
            endpoint: '/v2/habits/1/complete',
            method: 'POST'
          }
        },
        {
          id: 'op2',
          data: {
            id: 'op2',
            priority: 'critical',
            timestamp: 2000,
            status: 'pending',
            type: 'habit-toggle',
            endpoint: '/v2/habits/2/complete',
            method: 'POST'
          }
        },
        {
          id: 'op3',
          data: {
            id: 'op3',
            priority: 'normal',
            timestamp: 1500,
            status: 'pending',
            type: 'habit-toggle',
            endpoint: '/v2/habits/3/complete',
            method: 'POST'
          }
        }
      ];

      (offlineStorage.getPendingActions as any).mockResolvedValue(mockOperations);

      mockApiService.post = vi.fn().mockResolvedValue({
        data: {
          results: [
            { success: true, operationId: 'op2' },
            { success: true, operationId: 'op3' },
            { success: true, operationId: 'op1' }
          ]
        }
      });

      await queue.processQueue();

      // Should call API with operations sorted by priority (critical > normal > low)
      expect(mockApiService.post).toHaveBeenCalledWith('/sync/batch', {
        operations: [
          expect.objectContaining({ id: 'op2' }), // critical
          expect.objectContaining({ id: 'op3' }), // normal
          expect.objectContaining({ id: 'op1' })  // low
        ],
        deviceId: expect.any(String)
      });
    });

    it('should handle API errors gracefully', async () => {
      const { offlineStorage } = await import('../storage');

      const mockOperations = [
        {
          id: 'op1',
          data: {
            id: 'op1',
            priority: 'normal',
            timestamp: 1000,
            status: 'pending',
            type: 'habit-toggle',
            endpoint: '/v2/habits/1/complete',
            method: 'POST',
            retryCount: 0,
            maxRetries: 3
          }
        }
      ];

      (offlineStorage.getPendingActions as any).mockResolvedValue(mockOperations);
      mockApiService.post = vi.fn().mockRejectedValue(new Error('Network error'));

      await queue.processQueue();

      expect(eventListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'processing-completed',
          processed: 0,
          failed: 1
        })
      );
    });

    it('should not process when offline', async () => {
      // Set navigator to offline
      Object.defineProperty(navigator, 'onLine', { value: false });

      const { offlineStorage } = await import('../storage');
      (offlineStorage.getPendingActions as any).mockResolvedValue([
        {
          id: 'op1',
          data: { id: 'op1', status: 'pending' }
        }
      ]);

      await queue.processQueue();

      expect(mockApiService.post).not.toHaveBeenCalled();
    });

    it('should process batches when enabled', async () => {
      const { offlineStorage } = await import('../storage');

      // Create 8 operations to test batching (batch size is 5)
      const mockOperations = Array.from({ length: 8 }, (_, i) => ({
        id: `op${i + 1}`,
        data: {
          id: `op${i + 1}`,
          priority: 'normal',
          timestamp: 1000 + i,
          status: 'pending',
          type: 'habit-toggle',
          endpoint: `/v2/habits/${i + 1}/complete`,
          method: 'POST'
        }
      }));

      (offlineStorage.getPendingActions as any).mockResolvedValue(mockOperations);

      mockApiService.post = vi.fn().mockResolvedValue({
        data: {
          results: mockOperations.map(op => ({
            success: true,
            operationId: op.id
          }))
        }
      });

      await queue.processQueue();

      // Should make 2 batch calls (5 + 3 operations)
      expect(mockApiService.post).toHaveBeenCalledTimes(2);

      // First batch should have 5 operations
      expect((mockApiService.post as any).mock.calls[0][1].operations).toHaveLength(5);
      // Second batch should have 3 operations
      expect((mockApiService.post as any).mock.calls[1][1].operations).toHaveLength(3);
    });
  });

  describe('retry logic', () => {
    it('should retry failed operations up to maxRetries', async () => {
      const operation: QueuedOperation = {
        id: 'retry-op',
        type: 'habit-toggle',
        endpoint: '/v2/habits/123/complete',
        method: 'POST',
        data: {},
        priority: 'normal',
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: 3,
        status: 'pending'
      };

      const { offlineStorage } = await import('../storage');
      (offlineStorage.getPendingActions as any).mockResolvedValue([
        { id: operation.id, data: operation }
      ]);

      // Mock API to fail first 2 times, then succeed
      let callCount = 0;
      mockApiService.post = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          return Promise.reject(new Error('Temporary failure'));
        }
        return Promise.resolve({
          data: {
            results: [{ success: true, operationId: operation.id }]
          }
        });
      });

      // Process queue multiple times to simulate retries
      await queue.processQueue(); // First attempt - should fail
      await queue.processQueue(); // Second attempt - should fail
      await queue.processQueue(); // Third attempt - should succeed

      expect(mockApiService.post).toHaveBeenCalledTimes(3);
      expect(offlineStorage.updateActionStatus).toHaveBeenCalledWith(
        operation.id,
        'completed'
      );
    });

    it('should mark operation as failed after exceeding maxRetries', async () => {
      const operation: QueuedOperation = {
        id: 'max-retry-op',
        type: 'habit-toggle',
        endpoint: '/v2/habits/123/complete',
        method: 'POST',
        data: {},
        priority: 'normal',
        timestamp: Date.now(),
        retryCount: 3, // Already at max retries
        maxRetries: 3,
        status: 'pending'
      };

      const { offlineStorage } = await import('../storage');
      (offlineStorage.getPendingActions as any).mockResolvedValue([
        { id: operation.id, data: operation }
      ]);

      mockApiService.post = vi.fn().mockRejectedValue(new Error('Persistent failure'));

      await queue.processQueue();

      expect(eventListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'operation-failed',
          operation: expect.objectContaining({
            id: operation.id,
            status: 'failed'
          })
        })
      );
    });

    it('should not retry certain error types', async () => {
      const operation: QueuedOperation = {
        id: 'no-retry-op',
        type: 'habit-toggle',
        endpoint: '/v2/habits/123/complete',
        method: 'POST',
        data: {},
        priority: 'normal',
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: 3,
        status: 'pending'
      };

      const { offlineStorage } = await import('../storage');
      (offlineStorage.getPendingActions as any).mockResolvedValue([
        { id: operation.id, data: operation }
      ]);

      const unauthorizedError = new Error('Unauthorized');
      (unauthorizedError as any).statusCode = 401;
      mockApiService.post = vi.fn().mockRejectedValue(unauthorizedError);

      await queue.processQueue();

      expect(eventListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'operation-failed',
          operation: expect.objectContaining({
            id: operation.id,
            status: 'failed',
            retryCount: 1 // Incremented but marked as failed
          })
        })
      );
    });
  });

  describe('conflict handling', () => {
    it('should emit conflict events when conflicts are detected', async () => {
      const operation: QueuedOperation = {
        id: 'conflict-op',
        type: 'habit-toggle',
        endpoint: '/v2/habits/123/complete',
        method: 'POST',
        data: {},
        priority: 'normal',
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: 3,
        status: 'pending'
      };

      const { offlineStorage } = await import('../storage');
      (offlineStorage.getPendingActions as any).mockResolvedValue([
        { id: operation.id, data: operation }
      ]);

      const conflictResponse = {
        data: {
          results: [{
            success: false,
            operationId: operation.id,
            conflict: {
              id: 'conflict-123',
              serverData: { completedToday: false },
              clientData: { completedToday: true },
              conflictType: 'data'
            }
          }]
        }
      };

      mockApiService.post = vi.fn().mockResolvedValue(conflictResponse);

      await queue.processQueue();

      expect(eventListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'operation-conflict',
          operation: expect.objectContaining({ id: operation.id }),
          conflict: expect.objectContaining({
            id: 'conflict-123'
          })
        })
      );
    });
  });

  describe('queue metrics', () => {
    it('should calculate queue metrics correctly', async () => {
      const { offlineStorage } = await import('../storage');

      const mockOperations = [
        { id: 'op1', data: { status: 'pending', retryCount: 0, timestamp: Date.now() - 1000 } },
        { id: 'op2', data: { status: 'pending', retryCount: 1, timestamp: Date.now() - 2000 } },
        { id: 'op3', data: { status: 'completed', retryCount: 0, timestamp: Date.now() - 3000 } },
        { id: 'op4', data: { status: 'failed', retryCount: 3, timestamp: Date.now() - 4000 } }
      ];

      (offlineStorage.getPendingActions as any).mockResolvedValue(mockOperations);

      const metrics = await queue.getMetrics();

      expect(metrics).toMatchObject({
        totalOperations: 4,
        pendingOperations: 2,
        failedOperations: 1,
        completedOperations: 1,
        averageRetryCount: 1, // (0 + 1 + 0 + 3) / 4
        queueHealth: expect.any(String)
      });

      expect(metrics.oldestPendingOperation).toBeDefined();
      expect(metrics.queueHealth).toMatch(/^(healthy|warning|error)$/);
    });

    it('should detect unhealthy queue state', async () => {
      const { offlineStorage } = await import('../storage');

      // Create many failed operations
      const mockOperations = Array.from({ length: 20 }, (_, i) => ({
        id: `op${i}`,
        data: {
          status: i < 15 ? 'failed' : 'pending',
          retryCount: i < 15 ? 3 : 0,
          timestamp: Date.now() - i * 1000
        }
      }));

      (offlineStorage.getPendingActions as any).mockResolvedValue(mockOperations);

      const metrics = await queue.getMetrics();

      expect(metrics.queueHealth).toBe('error'); // >10% failed operations
    });
  });

  describe('queue management', () => {
    it('should retry all failed operations', async () => {
      const { offlineStorage } = await import('../storage');

      const failedOperations = [
        {
          id: 'failed1',
          data: {
            id: 'failed1',
            status: 'failed',
            retryCount: 2,
            maxRetries: 3
          }
        },
        {
          id: 'failed2',
          data: {
            id: 'failed2',
            status: 'failed',
            retryCount: 1,
            maxRetries: 3
          }
        }
      ];

      (offlineStorage.getPendingActions as any).mockResolvedValue(failedOperations);

      await queue.retryFailedOperations();

      expect(eventListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'failed-operations-reset',
          count: 2
        })
      );

      // Should update operations to pending status
      expect(offlineStorage.updateActionStatus).toHaveBeenCalledTimes(2);
    });

    it('should clear completed operations', async () => {
      const { offlineStorage } = await import('../storage');

      const completedOperations = [
        {
          id: 'completed1',
          data: { id: 'completed1', status: 'completed' }
        },
        {
          id: 'completed2',
          data: { id: 'completed2', status: 'completed' }
        }
      ];

      (offlineStorage.getPendingActions as any).mockResolvedValue(completedOperations);

      const clearedCount = await queue.clearCompleted();

      expect(clearedCount).toBe(2);
      expect(offlineStorage.removeAction).toHaveBeenCalledWith('completed1');
      expect(offlineStorage.removeAction).toHaveBeenCalledWith('completed2');
    });

    it('should clear all operations', async () => {
      await queue.clearAll();

      expect(eventListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'queue-cleared'
        })
      );

      const { offlineStorage } = await import('../storage');
      expect(offlineStorage.clear).toHaveBeenCalled();
    });
  });

  describe('event handling', () => {
    it('should allow adding and removing event listeners', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      queue.addEventListener(listener1);
      queue.addEventListener(listener2);

      // Remove one listener
      queue.removeEventListener(listener1);

      // Both listeners should have been added initially
      expect(queue['listeners']).toContain(listener2);
      expect(queue['listeners']).not.toContain(listener1);
    });

    it('should handle listener errors gracefully', async () => {
      const errorListener = vi.fn().mockImplementation(() => {
        throw new Error('Listener error');
      });

      queue.addEventListener(errorListener);

      const operation = {
        type: 'habit-toggle' as const,
        endpoint: '/v2/habits/123/complete',
        method: 'POST' as const,
        data: {},
        priority: 'normal' as const,
        maxRetries: 3
      };

      // This should not throw despite the listener error
      await expect(queue.enqueue(operation)).resolves.toBeDefined();
    });
  });
});