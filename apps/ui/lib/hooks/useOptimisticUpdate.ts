import { useState, useCallback, useRef } from 'react';

interface OptimisticOperation<TData, TParams extends any[]> {
  id: string;
  type: string;
  params: TParams;
  optimisticUpdate: (current: TData) => TData;
  revert: (current: TData) => TData;
  timestamp: number;
  retryCount: number;
}

interface UseOptimisticUpdateOptions<TData> {
  maxRetries?: number;
  retryDelay?: number;
  onSuccess?: (operation: OptimisticOperation<TData, any>) => void;
  onError?: (error: Error, operation: OptimisticOperation<TData, any>) => void;
  onRevert?: (operation: OptimisticOperation<TData, any>) => void;
}

/**
 * Hook for managing optimistic updates with automatic rollback on failure
 */
export function useOptimisticUpdate<TData>(
  initialData: TData,
  options: UseOptimisticUpdateOptions<TData> = {}
) {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    onSuccess,
    onError,
    onRevert
  } = options;

  const [data, setData] = useState<TData>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingOperations, setPendingOperations] = useState<Map<string, OptimisticOperation<TData, any>>>(new Map());

  const operationCounter = useRef(0);
  const retryTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const generateOperationId = useCallback(() => {
    return `op_${Date.now()}_${operationCounter.current++}`;
  }, []);

  const applyOptimisticUpdate = useCallback(<TParams extends any[]>(
    type: string,
    params: TParams,
    optimisticUpdate: (current: TData) => TData,
    apiCall: (...args: TParams) => Promise<any>,
    createRevert?: (current: TData, newData: TData) => (current: TData) => TData
  ) => {
    const operationId = generateOperationId();

    // Create revert function
    const currentData = data;
    const newData = optimisticUpdate(currentData);
    const revert = createRevert
      ? createRevert(currentData, newData)
      : () => currentData;

    const operation: OptimisticOperation<TData, TParams> = {
      id: operationId,
      type,
      params,
      optimisticUpdate,
      revert,
      timestamp: Date.now(),
      retryCount: 0
    };

    // Apply optimistic update immediately
    setData(newData);
    setPendingOperations(prev => new Map(prev).set(operationId, operation));
    setIsLoading(true);

    const executeApiCall = async (retryCount = 0) => {
      try {
        const result = await apiCall(...params);

        // Success - remove from pending operations
        setPendingOperations(prev => {
          const newMap = new Map(prev);
          newMap.delete(operationId);
          return newMap;
        });

        // Clear any retry timeout
        const timeoutId = retryTimeouts.current.get(operationId);
        if (timeoutId) {
          clearTimeout(timeoutId);
          retryTimeouts.current.delete(operationId);
        }

        // Update loading state
        setPendingOperations(prev => {
          setIsLoading(prev.size > 0);
          return prev;
        });

        onSuccess?.(operation);
        return result;

      } catch (error) {
        console.error(`Optimistic update failed for ${type}:`, error);

        if (retryCount < maxRetries) {
          // Retry with exponential backoff
          const delay = retryDelay * Math.pow(2, retryCount);
          const timeoutId = setTimeout(() => {
            const updatedOperation = { ...operation, retryCount: retryCount + 1 };
            setPendingOperations(prev => new Map(prev).set(operationId, updatedOperation));
            executeApiCall(retryCount + 1);
          }, delay);

          retryTimeouts.current.set(operationId, timeoutId);

        } else {
          // Max retries exceeded - revert optimistic update
          setData(current => {
            const pendingOp = pendingOperations.get(operationId);
            return pendingOp ? pendingOp.revert(current) : current;
          });

          // Remove from pending operations
          setPendingOperations(prev => {
            const newMap = new Map(prev);
            newMap.delete(operationId);
            setIsLoading(newMap.size > 0);
            return newMap;
          });

          onError?.(error as Error, operation);
          onRevert?.(operation);
          throw error;
        }
      }
    };

    return executeApiCall();
  }, [data, maxRetries, retryDelay, onSuccess, onError, onRevert, generateOperationId]);

  const revertOperation = useCallback((operationId: string) => {
    const operation = pendingOperations.get(operationId);
    if (operation) {
      setData(current => operation.revert(current));
      setPendingOperations(prev => {
        const newMap = new Map(prev);
        newMap.delete(operationId);
        setIsLoading(newMap.size > 0);
        return newMap;
      });

      // Clear any retry timeout
      const timeoutId = retryTimeouts.current.get(operationId);
      if (timeoutId) {
        clearTimeout(timeoutId);
        retryTimeouts.current.delete(operationId);
      }

      onRevert?.(operation);
    }
  }, [pendingOperations, onRevert]);

  const revertAllOperations = useCallback(() => {
    let revertedData = data;

    // Revert operations in reverse order (LIFO)
    const operations = Array.from(pendingOperations.values())
      .sort((a, b) => b.timestamp - a.timestamp);

    for (const operation of operations) {
      revertedData = operation.revert(revertedData);
      onRevert?.(operation);
    }

    setData(revertedData);
    setPendingOperations(new Map());
    setIsLoading(false);

    // Clear all retry timeouts
    retryTimeouts.current.forEach(timeoutId => clearTimeout(timeoutId));
    retryTimeouts.current.clear();
  }, [data, pendingOperations, onRevert]);

  const retryOperation = useCallback((operationId: string) => {
    const operation = pendingOperations.get(operationId);
    if (operation && operation.retryCount < maxRetries) {
      // This would need to be implemented based on the specific use case
      // For now, we just mark it for retry
      const updatedOperation = { ...operation, retryCount: operation.retryCount + 1 };
      setPendingOperations(prev => new Map(prev).set(operationId, updatedOperation));
    }
  }, [pendingOperations, maxRetries]);

  const updateData = useCallback((newData: TData) => {
    setData(newData);
  }, []);

  return {
    data,
    isLoading,
    pendingOperations: Array.from(pendingOperations.values()),
    applyOptimisticUpdate,
    revertOperation,
    revertAllOperations,
    retryOperation,
    updateData
  };
}

// Specific hooks for common use cases

export function useOptimisticHabits(initialHabits: any[]) {
  return useOptimisticUpdate(initialHabits, {
    onError: (error, operation) => {
      console.error(`Habit operation ${operation.type} failed:`, error);
      // Could show a toast notification here
    },
    onRevert: (operation) => {
      console.log(`Reverted habit operation: ${operation.type}`);
      // Could show a toast notification here
    }
  });
}

export function useOptimisticJournal(initialEntries: any[]) {
  return useOptimisticUpdate(initialEntries, {
    onError: (error, operation) => {
      console.error(`Journal operation ${operation.type} failed:`, error);
    },
    onRevert: (operation) => {
      console.log(`Reverted journal operation: ${operation.type}`);
    }
  });
}