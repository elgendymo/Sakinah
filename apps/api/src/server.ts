import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { errorHandler } from './shared/errors';
import healthRouter from './routes/health';
import tazkiyahRouter from './routes/tazkiyah';
import planRouter from './routes/plan';
import habitRouter from './routes/habit';
import checkinRouter from './routes/checkin';
import journalRouter from './routes/journal';
import contentRouter from './routes/content';
import aiRouter from './routes/ai';

export function createApp(): Express {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
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

  // Body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Routes
  app.use('/api/health', healthRouter);
  app.use('/api/tazkiyah', tazkiyahRouter);
  app.use('/api/plans', planRouter);
  app.use('/api/habits', habitRouter);
  app.use('/api/checkins', checkinRouter);
  app.use('/api/journals', journalRouter);
  app.use('/api/content', contentRouter);
  app.use('/api/ai', aiRouter);

  // Error handling
  app.use(errorHandler);

  return app;
}