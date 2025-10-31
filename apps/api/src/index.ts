// Configure module-alias before any imports that use path aliases
import { addAliases } from 'module-alias';

// Set up path aliases - __dirname will be dist folder, so alias points to dist
addAliases({
  '@': __dirname,
});

import 'reflect-metadata';
import dotenv from 'dotenv';

dotenv.config();

import { configureDependencies } from './infrastructure/di/container';
import { createApp } from './server';
import { logger } from './shared/logger';

const PORT = process.env.PORT || 3001;

// Initialize DI container and start server
(async () => {
  try {
    logger.info('Initializing dependencies...');
    await configureDependencies();

    logger.info('Creating application...');
    const app = await createApp();

    app.listen(PORT, () => {
      logger.info(`API server running on port ${PORT}`);
      logger.info(`Redis caching enabled with fallback to memory cache`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
})();
