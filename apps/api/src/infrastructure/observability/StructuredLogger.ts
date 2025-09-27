import winston from 'winston';
import { AsyncLocalStorage } from 'async_hooks';

export interface LogContext {
  correlationId?: string;
  userId?: string;
  requestId?: string;
  [key: string]: any;
}

export class StructuredLogger {
  private logger: winston.Logger;
  private static instance: StructuredLogger;
  private static contextStorage = new AsyncLocalStorage<LogContext>();

  private constructor() {
    const logLevel = process.env.LOG_LEVEL || 'info';
    const isProduction = process.env.NODE_ENV === 'production';

    this.logger = winston.createLogger({
      level: logLevel,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
        winston.format.printf(info => {
          const context = StructuredLogger.contextStorage.getStore() || {};
          const { timestamp, level, message, ...otherInfo } = info;
          return JSON.stringify({
            timestamp,
            level,
            message,
            ...context,
            ...otherInfo
          });
        })
      ),
      defaultMeta: { service: 'sakinah-api' },
      transports: [
        isProduction
          ? new winston.transports.Console({
              format: winston.format.json()
            })
          : new winston.transports.Console({
              format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple(),
                winston.format.printf(info => {
                  const context = StructuredLogger.contextStorage.getStore() || {};
                  const contextStr = Object.keys(context).length > 0
                    ? ` [${JSON.stringify(context)}]`
                    : '';
                  return `${info.timestamp} ${info.level}: ${info.message}${contextStr}`;
                })
              )
            })
      ]
    });

    // Add file transport in production
    if (isProduction) {
      this.logger.add(
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error'
        })
      );
      this.logger.add(
        new winston.transports.File({
          filename: 'logs/combined.log'
        })
      );
    }
  }

  static getInstance(): StructuredLogger {
    if (!StructuredLogger.instance) {
      StructuredLogger.instance = new StructuredLogger();
    }
    return StructuredLogger.instance;
  }

  static runWithContext<T>(context: LogContext, fn: () => T): T {
    return StructuredLogger.contextStorage.run(context, fn);
  }

  static addToContext(additionalContext: LogContext): void {
    const currentContext = StructuredLogger.contextStorage.getStore() || {};
    const newContext = { ...currentContext, ...additionalContext };
    StructuredLogger.contextStorage.enterWith(newContext);
  }

  private getContext(): LogContext {
    return StructuredLogger.contextStorage.getStore() || {};
  }

  info(message: string, meta?: any): void {
    this.logger.info(message, { ...this.getContext(), ...meta });
  }

  error(message: string, error?: Error | any, meta?: any): void {
    const errorMeta = error instanceof Error
      ? {
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name
          }
        }
      : { error };

    this.logger.error(message, { ...this.getContext(), ...errorMeta, ...meta });
  }

  warn(message: string, meta?: any): void {
    this.logger.warn(message, { ...this.getContext(), ...meta });
  }

  debug(message: string, meta?: any): void {
    this.logger.debug(message, { ...this.getContext(), ...meta });
  }

  http(message: string, meta?: any): void {
    this.logger.http(message, { ...this.getContext(), ...meta });
  }

  // Helper for timing operations
  startTimer(label: string): () => void {
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      this.info(`${label} completed`, { duration_ms: duration });
    };
  }
}