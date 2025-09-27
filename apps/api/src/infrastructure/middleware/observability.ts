import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { StructuredLogger } from '../observability/StructuredLogger';
import { IMetricsProvider } from '../observability/IMetricsProvider';
import {
  ErrorCode,
  createAppError,
  handleExpressError,
  getExpressTraceId
} from '@/shared/errors';

const logger = StructuredLogger.getInstance();

export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const correlationId = (req.headers['x-correlation-id'] as string) || uuidv4();
  const requestId = uuidv4();

  // Add to request
  (req as any).correlationId = correlationId;
  (req as any).requestId = requestId;

  // Add to response headers
  res.setHeader('X-Correlation-Id', correlationId);
  res.setHeader('X-Request-Id', requestId);

  // Run the rest of the request in context
  StructuredLogger.runWithContext(
    {
      correlationId,
      requestId,
      method: req.method,
      path: req.path,
      ip: req.ip
    },
    () => next()
  );
}

export function requestLoggingMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  logger.info('Request started', {
    method: req.method,
    url: req.url,
    query: req.query,
    headers: {
      'user-agent': req.headers['user-agent'],
      'content-type': req.headers['content-type']
    }
  });

  // Log response
  const originalSend = res.send;
  res.send = function (data) {
    const duration = Date.now() - start;

    logger.info('Request completed', {
      status: res.statusCode,
      duration_ms: duration,
      contentLength: res.get('content-length')
    });

    return originalSend.call(this, data);
  };

  next();
}

export function metricsMiddleware(metrics: IMetricsProvider) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const start = Date.now();
    const route = req.route?.path || req.path;

    // Track response
    res.on('finish', () => {
      const duration = Date.now() - start;
      const labels = {
        method: req.method,
        route,
        status: res.statusCode.toString()
      };

      metrics.increment('api_requests_total', 1, labels);
      metrics.timing('api_request_duration_seconds', duration, {
        method: req.method,
        route
      });

      // Track errors
      if (res.statusCode >= 400) {
        metrics.increment('api_errors_total', 1, {
          method: req.method,
          route,
          status_code: res.statusCode.toString()
        });
      }
    });

    next();
  };
}

export function errorLoggingMiddleware(err: Error, req: Request, res: Response, _next: NextFunction): void {
  const traceId = getExpressTraceId(req);

  logger.error('Error caught by middleware', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    traceId,
    timestamp: new Date().toISOString()
  });

  if (!res.headersSent) {
    const appError = createAppError(
      ErrorCode.SERVER_ERROR,
      process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    );

    const { response, status } = handleExpressError(appError, traceId);
    res.status(status).json(response);
  }
}