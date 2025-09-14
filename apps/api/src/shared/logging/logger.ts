import { LogLevel, LogContext, ErrorContext } from '../errors/types';

export interface Logger {
  debug(message: string, context?: ErrorContext): void;
  info(message: string, context?: ErrorContext): void;
  warn(message: string, context?: ErrorContext): void;
  error(message: string, context?: ErrorContext, error?: Error): void;
}

class AppLogger implements Logger {
  private isProduction = process.env.NODE_ENV === 'production';
  private isTest = process.env.NODE_ENV === 'test';

  private sanitizeForProduction(data: any): any {
    if (!data || typeof data !== 'object') return data;

    const sanitized = { ...data };

    // Fields to redact in production
    const sensitiveFields = [
      'password', 'token', 'apiKey', 'secret', 'auth', 'authorization',
      'cookie', 'session', 'jwt', 'key', 'email', 'phone', 'ssn',
      'creditCard', 'bankAccount', 'userId', 'id'
    ];

    const redactValue = (obj: any, path = ''): any => {
      if (obj === null || obj === undefined) return obj;

      if (Array.isArray(obj)) {
        return obj.map((item, index) => redactValue(item, `${path}[${index}]`));
      }

      if (typeof obj === 'object') {
        const result: any = {};
        for (const [key, value] of Object.entries(obj)) {
          const currentPath = path ? `${path}.${key}` : key;
          const shouldRedact = sensitiveFields.some(field =>
            key.toLowerCase().includes(field.toLowerCase())
          );

          if (shouldRedact) {
            result[key] = '[REDACTED]';
          } else {
            result[key] = redactValue(value, currentPath);
          }
        }
        return result;
      }

      return obj;
    };

    return redactValue(sanitized);
  }

  private formatForDevelopment(level: LogLevel, message: string, context?: ErrorContext, error?: Error): string {
    const timestamp = new Date().toISOString();
    const traceId = context?.traceId || 'no-trace';
    const userId = context?.userId ? ` [User: ${context.userId}]` : '';

    let formatted = `[${timestamp}][${level.toUpperCase()}][${traceId}]${userId} ${message}`;

    if (context && Object.keys(context).length > 0) {
      const cleanContext = { ...context };
      delete cleanContext.traceId;
      delete cleanContext.userId;

      if (Object.keys(cleanContext).length > 0) {
        formatted += `\n  Context: ${JSON.stringify(cleanContext, null, 2)}`;
      }
    }

    if (error && error.stack) {
      formatted += `\n  Error: ${error.message}\n  Stack: ${error.stack}`;
    }

    return formatted;
  }

  private formatForProduction(level: LogLevel, message: string, context?: ErrorContext, error?: Error): string {
    const logData: LogContext = {
      timestamp: new Date().toISOString(),
      level,
      message,
      traceId: context?.traceId || 'unknown',
      ...this.sanitizeForProduction(context)
    };

    if (error) {
      logData.error = {
        message: error.message,
        name: error.name,
        ...(this.isProduction ? {} : { stack: error.stack })
      };
    }

    return JSON.stringify(logData);
  }

  private log(level: LogLevel, message: string, context?: ErrorContext, error?: Error): void {
    // Skip logging in test environment unless explicitly enabled
    if (this.isTest && !process.env.ENABLE_TEST_LOGGING) {
      return;
    }

    const formatted = this.isProduction
      ? this.formatForProduction(level, message, context, error)
      : this.formatForDevelopment(level, message, context, error);

    // Use appropriate console method based on level
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formatted);
        break;
      case LogLevel.INFO:
        console.info(formatted);
        break;
      case LogLevel.WARN:
        console.warn(formatted);
        break;
      case LogLevel.ERROR:
        console.error(formatted);
        break;
    }
  }

  debug(message: string, context?: ErrorContext): void {
    // Only log debug messages in development
    if (!this.isProduction) {
      this.log(LogLevel.DEBUG, message, context);
    }
  }

  info(message: string, context?: ErrorContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: ErrorContext): void {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, context?: ErrorContext, error?: Error): void {
    this.log(LogLevel.ERROR, message, context, error);
  }
}

// Singleton instance
export const logger = new AppLogger();

// Request-scoped logger factory
export function createRequestLogger(traceId: string, userId?: string) {
  const baseContext = { traceId, userId };

  return {
    debug: (message: string, context?: ErrorContext) =>
      logger.debug(message, { ...baseContext, ...context }),
    info: (message: string, context?: ErrorContext) =>
      logger.info(message, { ...baseContext, ...context }),
    warn: (message: string, context?: ErrorContext) =>
      logger.warn(message, { ...baseContext, ...context }),
    error: (message: string, context?: ErrorContext, error?: Error) =>
      logger.error(message, { ...baseContext, ...context }, error)
  };
}

// Performance timing logger
export function createTimedLogger(traceId: string, operation: string, userId?: string) {
  const start = Date.now();
  const requestLogger = createRequestLogger(traceId, userId);

  requestLogger.info(`Starting ${operation}`);

  return {
    ...requestLogger,
    finish: (success: boolean = true, data?: any) => {
      const duration = Date.now() - start;
      const level = success ? 'info' : 'error';
      const message = `Completed ${operation} in ${duration}ms`;

      requestLogger[level](message, {
        duration,
        operation,
        success,
        ...(data && { result: data })
      });
    }
  };
}

// Error boundary logger for unhandled errors
export function setupGlobalErrorHandlers() {
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    logger.error('Unhandled Promise Rejection', {
      reason: reason?.toString(),
      promise: promise?.toString()
    }, reason instanceof Error ? reason : new Error(String(reason)));
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception', {}, error);
    // In production, you might want to gracefully shut down
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  });
}