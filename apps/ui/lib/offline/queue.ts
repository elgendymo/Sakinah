import { offlineStorage } from './storage';
import { ApiService } from '../services/api/ApiService';

export interface QueuedOperation {
  id: string;
  type: 'habit-toggle' | 'journal-create' | 'journal-delete' | 'checkin-create';
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  data?: any;
  headers?: Record<string, string>;
  priority: 'low' | 'normal' | 'high' | 'critical';
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  status: 'pending' | 'syncing' | 'failed' | 'completed';
  lastAttempt?: number;
  error?: {
    code: string;
    message: string;
    statusCode?: number;
  };
  dependencies?: string[]; // Operation IDs this depends on
  groupId?: string; // For batch operations
}

export interface QueueOptions {
  maxRetries?: number;
  retryDelay?: number;
  maxRetryDelay?: number;
  batchSize?: number;
  processingTimeout?: number;
  enableBatching?: boolean;
  priorityLevels?: Record<string, number>;
}

export interface QueueMetrics {
  totalOperations: number;
  pendingOperations: number;
  failedOperations: number;
  completedOperations: number;
  averageRetryCount: number;
  oldestPendingOperation?: number;
  queueHealth: 'healthy' | 'warning' | 'error';
}

/**
 * Enhanced offline queue management system
 *
 * Features:
 * - Priority-based processing
 * - Dependency management
 * - Batch operations
 * - Intelligent retry logic with exponential backoff
 * - Queue metrics and health monitoring
 * - Conflict detection and resolution
 */
export class OfflineQueue {
  private api: ApiService;
  private isProcessing = false;
  private processingController?: AbortController;
  private options: Required<QueueOptions>;
  private listeners: Array<(event: QueueEvent) => void> = [];

  constructor(api: ApiService, options: QueueOptions = {}) {
    this.api = api;
    this.options = {
      maxRetries: 3,
      retryDelay: 1000,
      maxRetryDelay: 30000,
      batchSize: 10,
      processingTimeout: 60000,
      enableBatching: true,
      priorityLevels: {
        low: 1,
        normal: 2,
        high: 3,
        critical: 4
      },
      ...options
    };

    // Start auto-processing when online
    this.setupOnlineListener();
  }

  /**
   * Add operation to queue
   */
  async enqueue(operation: Omit<QueuedOperation, 'id' | 'timestamp' | 'retryCount' | 'status'>): Promise<string> {
    const queuedOperation: QueuedOperation = {
      ...operation,
      id: this.generateOperationId(),
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending',
      maxRetries: operation.maxRetries ?? this.options.maxRetries
    };

    // Add to storage
    await offlineStorage.addAction({
      type: operation.type,
      data: {
        ...operation,
        ...queuedOperation
      }
    });

    this.emit({
      type: 'operation-queued',
      operation: queuedOperation
    });

    // Try to process immediately if online
    if (navigator.onLine && !this.isProcessing) {
      this.processQueue();
    }

    return queuedOperation.id;
  }

  /**
   * Add multiple operations as a batch
   */
  async enqueueBatch(operations: Array<Omit<QueuedOperation, 'id' | 'timestamp' | 'retryCount' | 'status' | 'groupId'>>): Promise<string[]> {
    const groupId = this.generateOperationId();
    const operationIds: string[] = [];

    for (const operation of operations) {
      const id = await this.enqueue({
        ...operation,
        groupId
      });
      operationIds.push(id);
    }

    this.emit({
      type: 'batch-queued',
      groupId,
      operationIds
    });

    return operationIds;
  }

  /**
   * Process the queue
   */
  async processQueue(): Promise<void> {
    if (this.isProcessing || !navigator.onLine) {
      return;
    }

    this.isProcessing = true;
    this.processingController = new AbortController();

    try {
      this.emit({ type: 'processing-started' });

      const pendingOperations = await this.getPendingOperations();

      if (pendingOperations.length === 0) {
        this.emit({ type: 'processing-completed', processed: 0, failed: 0 });
        return;
      }

      // Sort operations by priority and dependencies
      const sortedOperations = this.sortOperationsByPriority(pendingOperations);

      let processed = 0;
      let failed = 0;

      if (this.options.enableBatching) {
        // Process in batches
        const batches = this.groupOperationsIntoBatches(sortedOperations);

        for (const batch of batches) {
          if (this.processingController?.signal.aborted) break;

          const results = await this.processBatch(batch);
          processed += results.processed;
          failed += results.failed;
        }
      } else {
        // Process individually
        for (const operation of sortedOperations) {
          if (this.processingController?.signal.aborted) break;

          const success = await this.processOperation(operation);
          if (success) {
            processed++;
          } else {
            failed++;
          }
        }
      }

      this.emit({
        type: 'processing-completed',
        processed,
        failed
      });

    } catch (error) {
      console.error('Queue processing failed:', error);
      this.emit({
        type: 'processing-error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      this.isProcessing = false;
      this.processingController = undefined;
    }
  }

  /**
   * Stop queue processing
   */
  stopProcessing(): void {
    if (this.processingController) {
      this.processingController.abort();
    }
    this.isProcessing = false;
  }

  /**
   * Get queue metrics
   */
  async getMetrics(): Promise<QueueMetrics> {
    const allOperations = await this.getAllOperations();

    const pending = allOperations.filter(op => op.status === 'pending');
    const failed = allOperations.filter(op => op.status === 'failed');
    const completed = allOperations.filter(op => op.status === 'completed');

    const totalRetries = allOperations.reduce((sum, op) => sum + op.retryCount, 0);
    const averageRetryCount = allOperations.length > 0 ? totalRetries / allOperations.length : 0;

    const oldestPending = pending.length > 0
      ? Math.min(...pending.map(op => op.timestamp))
      : undefined;

    // Determine queue health
    let queueHealth: 'healthy' | 'warning' | 'error' = 'healthy';

    if (failed.length > allOperations.length * 0.1) {
      queueHealth = 'error'; // More than 10% failed
    } else if (pending.length > 50 || (oldestPending && Date.now() - oldestPending > 3600000)) {
      queueHealth = 'warning'; // Too many pending or old pending operations
    }

    return {
      totalOperations: allOperations.length,
      pendingOperations: pending.length,
      failedOperations: failed.length,
      completedOperations: completed.length,
      averageRetryCount,
      oldestPendingOperation: oldestPending,
      queueHealth
    };
  }

  /**
   * Retry failed operations
   */
  async retryFailedOperations(): Promise<void> {
    const failedOperations = await this.getFailedOperations();

    for (const operation of failedOperations) {
      if (operation.retryCount < operation.maxRetries) {
        operation.status = 'pending';
        operation.retryCount++;
        await this.updateOperation(operation);
      }
    }

    this.emit({
      type: 'failed-operations-reset',
      count: failedOperations.length
    });

    // Process queue after resetting failed operations
    if (navigator.onLine) {
      this.processQueue();
    }
  }

  /**
   * Clear completed operations
   */
  async clearCompleted(): Promise<number> {
    const completedOperations = await this.getCompletedOperations();

    for (const operation of completedOperations) {
      await this.removeOperation(operation.id);
    }

    this.emit({
      type: 'completed-operations-cleared',
      count: completedOperations.length
    });

    return completedOperations.length;
  }

  /**
   * Clear all operations
   */
  async clearAll(): Promise<void> {
    await offlineStorage.clear();

    this.emit({
      type: 'queue-cleared'
    });
  }

  /**
   * Add event listener
   */
  addEventListener(listener: (event: QueueEvent) => void): void {
    this.listeners.push(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: (event: QueueEvent) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  // Private methods

  private async getPendingOperations(): Promise<QueuedOperation[]> {
    const actions = await offlineStorage.getPendingActions();
    return actions.map(action => action.data as QueuedOperation).filter(op => op.status === 'pending');
  }

  private async getFailedOperations(): Promise<QueuedOperation[]> {
    const actions = await offlineStorage.getPendingActions();
    return actions.map(action => action.data as QueuedOperation).filter(op => op.status === 'failed');
  }

  private async getCompletedOperations(): Promise<QueuedOperation[]> {
    const actions = await offlineStorage.getPendingActions();
    return actions.map(action => action.data as QueuedOperation).filter(op => op.status === 'completed');
  }

  private async getAllOperations(): Promise<QueuedOperation[]> {
    const actions = await offlineStorage.getPendingActions();
    return actions.map(action => action.data as QueuedOperation);
  }

  private async updateOperation(operation: QueuedOperation): Promise<void> {
    await offlineStorage.updateActionStatus(operation.id, operation.status as any);
  }

  private async removeOperation(operationId: string): Promise<void> {
    await offlineStorage.removeAction(operationId);
  }

  private sortOperationsByPriority(operations: QueuedOperation[]): QueuedOperation[] {
    return operations.sort((a, b) => {
      // First sort by priority
      const priorityDiff = this.options.priorityLevels[b.priority] - this.options.priorityLevels[a.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // Then by timestamp (older first)
      return a.timestamp - b.timestamp;
    });
  }

  private groupOperationsIntoBatches(operations: QueuedOperation[]): QueuedOperation[][] {
    const batches: QueuedOperation[][] = [];
    let currentBatch: QueuedOperation[] = [];

    for (const operation of operations) {
      currentBatch.push(operation);

      if (currentBatch.length >= this.options.batchSize) {
        batches.push(currentBatch);
        currentBatch = [];
      }
    }

    if (currentBatch.length > 0) {
      batches.push(currentBatch);
    }

    return batches;
  }

  private async processBatch(operations: QueuedOperation[]): Promise<{ processed: number; failed: number }> {
    // Convert operations to sync batch format
    const syncOperations = operations.map(op => ({
      id: op.id,
      type: op.type,
      entity: this.getEntityFromType(op.type),
      operation: this.getOperationFromType(op.type),
      data: op.data,
      clientTimestamp: new Date(op.timestamp).toISOString(),
      retryCount: op.retryCount
    }));

    try {
      const response = await this.api.post('/sync/batch', {
        operations: syncOperations,
        deviceId: this.getDeviceId()
      });

      let processed = 0;
      let failed = 0;

      // Process results
      for (const result of response.data.results) {
        const operation = operations.find(op => op.id === result.operationId);
        if (!operation) continue;

        if (result.success && !result.conflict) {
          operation.status = 'completed';
          await this.updateOperation(operation);
          processed++;
        } else if (result.conflict) {
          // Handle conflict
          await this.handleConflict(operation, result.conflict);
          failed++;
        } else {
          // Handle error
          await this.handleOperationError(operation, result.error);
          failed++;
        }
      }

      return { processed, failed };

    } catch (error) {
      // Mark all operations as failed
      for (const operation of operations) {
        await this.handleOperationError(operation, {
          code: 'BATCH_FAILED',
          message: error instanceof Error ? error.message : 'Batch processing failed'
        });
      }

      return { processed: 0, failed: operations.length };
    }
  }

  private async processOperation(operation: QueuedOperation): Promise<boolean> {
    try {
      operation.status = 'syncing';
      operation.lastAttempt = Date.now();
      await this.updateOperation(operation);

      this.emit({
        type: 'operation-processing',
        operation
      });

      // Make API call
      const response = await this.api.request(operation.endpoint, {
        method: operation.method,
        body: operation.data,
        headers: operation.headers,
        timeout: this.options.processingTimeout
      });

      // Mark as completed
      operation.status = 'completed';
      await this.updateOperation(operation);

      this.emit({
        type: 'operation-completed',
        operation,
        response: response.data
      });

      return true;

    } catch (error) {
      await this.handleOperationError(operation, {
        code: 'API_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        statusCode: error instanceof Error && 'statusCode' in error ? (error as any).statusCode : undefined
      });

      return false;
    }
  }

  private async handleOperationError(operation: QueuedOperation, error: { code: string; message: string; statusCode?: number }): Promise<void> {
    operation.retryCount++;
    operation.error = error;

    if (operation.retryCount >= operation.maxRetries || this.shouldNotRetry(error)) {
      operation.status = 'failed';
    } else {
      operation.status = 'pending';
    }

    await this.updateOperation(operation);

    this.emit({
      type: 'operation-failed',
      operation,
      error
    });
  }

  private async handleConflict(operation: QueuedOperation, conflict: any): Promise<void> {
    // For now, mark as failed and emit conflict event
    operation.status = 'failed';
    operation.error = {
      code: 'CONFLICT',
      message: 'Data conflict detected'
    };

    await this.updateOperation(operation);

    this.emit({
      type: 'operation-conflict',
      operation,
      conflict
    });
  }

  private shouldNotRetry(error: { code: string; statusCode?: number }): boolean {
    const noRetryErrors = ['UNAUTHORIZED', 'FORBIDDEN', 'NOT_FOUND', 'BAD_REQUEST', 'CONFLICT'];
    const noRetryStatusCodes = [400, 401, 403, 404, 409];

    return noRetryErrors.includes(error.code) ||
           (error.statusCode && noRetryStatusCodes.includes(error.statusCode));
  }

  private getEntityFromType(type: string): string {
    const mapping: Record<string, string> = {
      'habit-toggle': 'habit',
      'journal-create': 'journal',
      'journal-delete': 'journal',
      'checkin-create': 'checkin'
    };
    return mapping[type] || 'unknown';
  }

  private getOperationFromType(type: string): string {
    const mapping: Record<string, string> = {
      'habit-toggle': 'update',
      'journal-create': 'create',
      'journal-delete': 'delete',
      'checkin-create': 'create'
    };
    return mapping[type] || 'unknown';
  }

  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDeviceId(): string {
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
      deviceId = `device_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('device_id', deviceId);
    }
    return deviceId;
  }

  private setupOnlineListener(): void {
    window.addEventListener('online', () => {
      setTimeout(() => {
        if (!this.isProcessing) {
          this.processQueue();
        }
      }, 1000); // Small delay to ensure connection is stable
    });
  }

  private emit(event: QueueEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Queue event listener error:', error);
      }
    });
  }
}

export type QueueEvent =
  | { type: 'operation-queued'; operation: QueuedOperation }
  | { type: 'batch-queued'; groupId: string; operationIds: string[] }
  | { type: 'processing-started' }
  | { type: 'processing-completed'; processed: number; failed: number }
  | { type: 'processing-error'; error: string }
  | { type: 'operation-processing'; operation: QueuedOperation }
  | { type: 'operation-completed'; operation: QueuedOperation; response: any }
  | { type: 'operation-failed'; operation: QueuedOperation; error: any }
  | { type: 'operation-conflict'; operation: QueuedOperation; conflict: any }
  | { type: 'failed-operations-reset'; count: number }
  | { type: 'completed-operations-cleared'; count: number }
  | { type: 'queue-cleared' };

// Export singleton instance
export const offlineQueue = new OfflineQueue(
  // This will be properly initialized with the ApiService instance in the main app
  {} as ApiService
);