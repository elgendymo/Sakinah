import { Request, Response, NextFunction } from 'express';
import { StructuredLogger } from '../observability/StructuredLogger';

const logger = StructuredLogger.getInstance();

export class TimeoutError extends Error {
  constructor(timeoutMs: number, operation?: string) {
    const message = operation
      ? `Operation '${operation}' timed out after ${timeoutMs}ms`
      : `Request timed out after ${timeoutMs}ms`;
    super(message);
    this.name = 'TimeoutError';
  }
}

export interface TimeoutOptions {
  timeoutMs: number;
  message?: string;
  skipIf?: (req: Request) => boolean;
}

export class TimeoutHandler {
  static readonly DEFAULT_TIMEOUT_MS = 30000; // 30 seconds

  // Request timeout middleware
  static requestTimeout(options: Partial<TimeoutOptions> = {}) {
    const { timeoutMs = TimeoutHandler.DEFAULT_TIMEOUT_MS, message, skipIf } = options;

    return (req: Request, res: Response, next: NextFunction): void => {
      // Skip timeout if condition is met
      if (skipIf && skipIf(req)) {
        return next();
      }

      let timeoutTriggered = false;

      // Set timeout
      const timer = setTimeout(() => {
        if (!res.headersSent) {
          timeoutTriggered = true;

          logger.warn('Request timeout', {
            method: req.method,
            url: req.url,
            timeoutMs,
            correlationId: (req as any).correlationId,
            requestId: (req as any).requestId
          });

          res.status(408).json({
            error: message || 'Request Timeout',
            message: `Request timed out after ${timeoutMs}ms`,
            timeout: timeoutMs,
            timestamp: new Date().toISOString()
          });
        }
      }, timeoutMs);

      // Clean up timer when response finishes
      res.on('finish', () => {
        clearTimeout(timer);
      });

      // Clean up timer when response closes
      res.on('close', () => {
        clearTimeout(timer);
      });

      // Wrap response methods to check for timeout
      const originalSend = res.send;
      const originalJson = res.json;
      const originalEnd = res.end;

      res.send = function(data) {
        if (timeoutTriggered) {
          logger.debug('Attempted to send response after timeout');
          return res;
        }
        return originalSend.call(this, data);
      };

      res.json = function(data) {
        if (timeoutTriggered) {
          logger.debug('Attempted to send JSON response after timeout');
          return res;
        }
        return originalJson.call(this, data);
      };

      res.end = function(data) {
        if (timeoutTriggered) {
          logger.debug('Attempted to end response after timeout');
          return res;
        }
        return originalEnd.call(this, data);
      };

      next();
    };
  }

  // Timeout wrapper for async operations
  static async withTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
    operationName?: string
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      let timeoutTriggered = false;

      const timer = setTimeout(() => {
        timeoutTriggered = true;
        const error = new TimeoutError(timeoutMs, operationName);

        logger.warn('Operation timeout', {
          operationName,
          timeoutMs,
          error: error.message
        });

        reject(error);
      }, timeoutMs);

      operation()
        .then(result => {
          if (!timeoutTriggered) {
            clearTimeout(timer);
            resolve(result);
          }
        })
        .catch(error => {
          if (!timeoutTriggered) {
            clearTimeout(timer);
            reject(error);
          }
        });
    });
  }

  // Race multiple operations with timeout
  static async race<T>(
    operations: Array<() => Promise<T>>,
    timeoutMs: number
  ): Promise<T> {
    const promises = operations.map(op => op());
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new TimeoutError(timeoutMs, 'race operation'));
      }, timeoutMs);
    });

    return Promise.race([...promises, timeoutPromise]);
  }

  // Timeout decorator for methods
  static timeout(timeoutMs: number, operationName?: string) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
      const originalMethod = descriptor.value;
      const name = operationName || `${target.constructor.name}.${propertyKey}`;

      descriptor.value = async function (...args: any[]) {
        return TimeoutHandler.withTimeout(
          () => originalMethod.apply(this, args),
          timeoutMs,
          name
        );
      };

      return descriptor;
    };
  }
}

// Specific timeout configurations for different scenarios
export class TimeoutMiddleware {
  // Default API request timeout (30 seconds)
  static apiTimeout() {
    return TimeoutHandler.requestTimeout({
      timeoutMs: 30000,
      message: 'API request timed out'
    });
  }

  // Extended timeout for long-running operations (2 minutes)
  static longOperationTimeout() {
    return TimeoutHandler.requestTimeout({
      timeoutMs: 120000,
      message: 'Long operation timed out'
    });
  }

  // Quick timeout for health checks and simple operations (5 seconds)
  static quickTimeout() {
    return TimeoutHandler.requestTimeout({
      timeoutMs: 5000,
      message: 'Quick operation timed out'
    });
  }

  // AI operation timeout (60 seconds for LLM calls)
  static aiTimeout() {
    return TimeoutHandler.requestTimeout({
      timeoutMs: 60000,
      message: 'AI operation timed out'
    });
  }

  // Database operation timeout (10 seconds)
  static databaseTimeout() {
    return TimeoutHandler.requestTimeout({
      timeoutMs: 10000,
      message: 'Database operation timed out'
    });
  }

  // Custom timeout
  static custom(options: TimeoutOptions) {
    return TimeoutHandler.requestTimeout(options);
  }
}

// Utility class for managing operation timeouts
export class OperationTimeout {
  private timer?: NodeJS.Timeout;
  private isExpired = false;

  constructor(
    private timeoutMs: number,
    private onTimeout?: () => void
  ) {}

  start(): void {
    this.timer = setTimeout(() => {
      this.isExpired = true;
      if (this.onTimeout) {
        this.onTimeout();
      }
    }, this.timeoutMs);
  }

  clear(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
  }

  extend(additionalMs: number): void {
    if (this.timer && !this.isExpired) {
      this.clear();
      this.timeoutMs += additionalMs;
      this.start();
    }
  }

  get expired(): boolean {
    return this.isExpired;
  }

  get remainingMs(): number {
    if (this.isExpired) return 0;
    // Note: This is an approximation since we don't track start time
    return this.timeoutMs;
  }
}

// Timeout manager for coordinating multiple operations
export class TimeoutManager {
  private operations: Map<string, OperationTimeout> = new Map();

  createTimeout(
    id: string,
    timeoutMs: number,
    onTimeout?: () => void
  ): OperationTimeout {
    const timeout = new OperationTimeout(timeoutMs, onTimeout);
    this.operations.set(id, timeout);
    timeout.start();
    return timeout;
  }

  clearTimeout(id: string): void {
    const timeout = this.operations.get(id);
    if (timeout) {
      timeout.clear();
      this.operations.delete(id);
    }
  }

  clearAllTimeouts(): void {
    for (const [id, timeout] of this.operations) {
      timeout.clear();
      this.operations.delete(id);
    }
  }

  extendTimeout(id: string, additionalMs: number): boolean {
    const timeout = this.operations.get(id);
    if (timeout) {
      timeout.extend(additionalMs);
      return true;
    }
    return false;
  }

  getActiveTimeouts(): string[] {
    return Array.from(this.operations.keys()).filter(
      id => !this.operations.get(id)?.expired
    );
  }
}