import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { errorHandler } from './shared/errors';
import { CacheFactory } from './infrastructure/cache/factory';
import { PrometheusMetricsProvider } from './infrastructure/observability/PrometheusMetricsProvider';
import { EventDispatcher } from './domain/events/EventDispatcher';
import { HabitEventHandlers } from './application/event-handlers/HabitEventHandlers';
import { container } from './infrastructure/di/container';
import { EventProjectionManager } from './infrastructure/events/EventProjectionManager';
import { metricsMiddleware, errorLoggingMiddleware } from './infrastructure/middleware/observability';
import apiRouter from './routes';
import swaggerRouter from './infrastructure/swagger/setup';

export async function createApp(): Promise<Express> {
  const app = express();

  // Initialize cache
  await CacheFactory.create();

  // Initialize metrics
  const metrics = new PrometheusMetricsProvider();

  // Initialize event handlers
  const eventDispatcher = EventDispatcher.getInstance();
  HabitEventHandlers.registerAll(eventDispatcher);

  // Start event projections
  const projectionManager = container.resolve<EventProjectionManager>('IEventProjectionStore');
  await projectionManager.startProjections();

  // Security middleware
  app.use(helmet());
  
  // CORS configuration for Replit compatibility
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001', 
    'http://localhost:3004',
    'http://localhost:5000'
  ];
  
  if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
  }
  
  if (process.env.REPLIT_DOMAINS) {
    const replitDomain = process.env.REPLIT_DOMAINS.split(',')[0];
    allowedOrigins.push(`https://${replitDomain}`);
    allowedOrigins.push(`http://${replitDomain}`);
  }
  
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.some(allowed => origin.startsWith(allowed))) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
  }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: 'Too many requests from this IP',
  });
  app.use('/api/', limiter);

  // AI endpoints have stricter limits
  const aiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: 'Too many AI requests',
  });
  app.use('/api/ai/', aiLimiter);
  app.use('/api/v*/ai/', aiLimiter);

  // Body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Observability middleware
  app.use(metricsMiddleware(metrics));

  // Metrics endpoint
  app.get('/metrics', async (_req, res) => {
    res.set('Content-Type', metrics.getContentType());
    res.end(await metrics.getMetrics());
  });

  // API Documentation (Swagger)
  app.use('/api/docs', swaggerRouter);

  // API routes with versioning
  app.use('/api', apiRouter);

  // Error handling
  app.use(errorLoggingMiddleware);
  app.use(errorHandler);

  return app;
}