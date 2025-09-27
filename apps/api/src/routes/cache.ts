import { Router } from 'express';
import { container } from 'tsyringe';
import { ICacheService } from '@/domain/services/ICacheService';
import { CqrsModule } from '@/infrastructure/cqrs/CqrsModule';
import { authMiddleware } from '@/infrastructure/auth/middleware';
import { createAppError, handleExpressError, getExpressTraceId, createSuccessResponse } from '@/shared/errors/errorResponse';
import { ErrorCode } from '@/shared/errors/errorCodes';
import { createRequestLogger } from '@/shared/errors';

const router = Router();

/**
 * @openapi
 * /cache/stats:
 *   get:
 *     summary: Get cache statistics
 *     description: Retrieve detailed statistics about the Redis cache performance
 *     tags: [Cache]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cache statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     cache:
 *                       type: object
 *                       properties:
 *                         hits:
 *                           type: number
 *                           description: Number of cache hits
 *                           example: 1542
 *                         misses:
 *                           type: number
 *                           description: Number of cache misses
 *                           example: 234
 *                         keys:
 *                           type: number
 *                           description: Total number of cached keys
 *                           example: 89
 *                         connectionStatus:
 *                           type: string
 *                           description: Redis connection status
 *                           example: "connected"
 *                         hitRate:
 *                           type: number
 *                           description: Cache hit rate percentage
 *                           example: 86.8
 *                     queries:
 *                       type: object
 *                       properties:
 *                         registeredHandlers:
 *                           type: number
 *                           description: Number of registered query handlers
 *                           example: 5
 *                         cacheEnabled:
 *                           type: boolean
 *                           description: Whether query caching is enabled
 *                           example: true
 *       500:
 *         description: Internal server error
 */
router.get('/stats', authMiddleware, async (_req, res): Promise<void> => {
  const traceId = getExpressTraceId(_req);
  const requestLogger = createRequestLogger(traceId);

  try {
    requestLogger.info('Getting cache stats');

    const cacheService = container.resolve<ICacheService>('ICacheService');
    const cacheStats = await cacheService.getStats();
    const queryStats = await CqrsModule.getCacheStats();

    // Calculate hit rate
    const totalRequests = cacheStats.hits + cacheStats.misses;
    const hitRate = totalRequests > 0 ? (cacheStats.hits / totalRequests) * 100 : 0;

    requestLogger.info('Cache stats retrieved successfully', {
      cacheHits: cacheStats.hits,
      cacheMisses: cacheStats.misses,
      hitRate: Math.round(hitRate * 100) / 100
    });

    const successResponse = createSuccessResponse({
      cache: {
        ...cacheStats,
        hitRate: Math.round(hitRate * 100) / 100
      },
      queries: queryStats,
      timestamp: new Date().toISOString()
    }, traceId);

    res.json(successResponse);
  } catch (error) {
    requestLogger.error('Error getting cache stats', { error: error instanceof Error ? error.message : String(error) }, error instanceof Error ? error : undefined);
    const { response, status, headers } = handleExpressError(
      createAppError(ErrorCode.SERVER_ERROR, 'Failed to retrieve cache statistics'),
      traceId
    );
    res.status(status).set(headers).json(response);
  }
});

/**
 * @openapi
 * /cache/invalidate:
 *   post:
 *     summary: Invalidate cache entries
 *     description: Invalidate cache entries by pattern or for specific user
 *     tags: [Cache]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               pattern:
 *                 type: string
 *                 description: Cache key pattern to invalidate (optional)
 *                 example: "query:GetHabits*"
 *               userId:
 *                 type: string
 *                 format: uuid
 *                 description: User ID to invalidate all cache for (optional)
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               clearAll:
 *                 type: boolean
 *                 description: Clear all cache entries
 *                 example: false
 *           examples:
 *             pattern_invalidation:
 *               summary: Invalidate by pattern
 *               value:
 *                 pattern: "query:GetHabits*"
 *             user_invalidation:
 *               summary: Invalidate user cache
 *               value:
 *                 userId: "123e4567-e89b-12d3-a456-426614174000"
 *             clear_all:
 *               summary: Clear all cache
 *               value:
 *                 clearAll: true
 *     responses:
 *       200:
 *         description: Cache invalidation completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 deleted:
 *                   type: number
 *                   description: Number of cache entries deleted
 *                   example: 42
 *                 message:
 *                   type: string
 *                   example: "Cache invalidated successfully"
 *       400:
 *         description: Bad request - invalid parameters
 *       500:
 *         description: Internal server error
 */
router.post('/invalidate', authMiddleware, async (req, res): Promise<void> => {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId);

  try {
    const { pattern, userId, clearAll } = req.body;

    requestLogger.info('Cache invalidation requested', {
      hasPattern: !!pattern,
      hasUserId: !!userId,
      clearAll: !!clearAll
    });

    if (!pattern && !userId && !clearAll) {
      const { response, status, headers } = handleExpressError(
        createAppError(ErrorCode.BAD_REQUEST, 'Must specify pattern, userId, or clearAll'),
        traceId
      );
      res.status(status).set(headers).json(response);
      return;
    }

    let deletedCount = 0;

    if (clearAll) {
      const cacheService = container.resolve<ICacheService>('ICacheService');
      deletedCount = await cacheService.invalidatePattern('*');
    } else if (userId) {
      deletedCount = await CqrsModule.invalidateCacheForUser(userId);
    } else if (pattern) {
      deletedCount = await CqrsModule.invalidateCache(pattern);
    }

    requestLogger.info('Cache invalidated successfully', { deletedCount });

    const successResponse = createSuccessResponse({
      deleted: deletedCount,
      message: 'Cache invalidated successfully'
    }, traceId);

    res.json(successResponse);
  } catch (error) {
    requestLogger.error('Error invalidating cache', {
      error: error instanceof Error ? error.message : String(error),
      pattern: req.body?.pattern,
      userId: req.body?.userId,
      clearAll: req.body?.clearAll
    }, error instanceof Error ? error : undefined);
    const { response, status, headers } = handleExpressError(
      createAppError(ErrorCode.SERVER_ERROR, 'Failed to invalidate cache'),
      traceId
    );
    res.status(status).set(headers).json(response);
  }
});

/**
 * @openapi
 * /cache/health:
 *   get:
 *     summary: Check cache service health
 *     description: Perform health check on Redis cache service
 *     tags: [Cache]
 *     responses:
 *       200:
 *         description: Cache service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 status:
 *                   type: string
 *                   example: "healthy"
 *                 connection:
 *                   type: object
 *                   properties:
 *                     redis:
 *                       type: string
 *                       example: "connected"
 *                     ping:
 *                       type: boolean
 *                       example: true
 *                     url:
 *                       type: string
 *                       example: "redis://localhost:6379"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2024-01-15T10:30:00Z"
 *       503:
 *         description: Cache service is unhealthy
 */
router.get('/health', async (_req, res): Promise<void> => {
  const traceId = getExpressTraceId(_req);
  const requestLogger = createRequestLogger(traceId);

  try {
    requestLogger.info('Cache health check started');

    const cacheService = container.resolve<ICacheService>('ICacheService');
    const stats = await cacheService.getStats();

    // Perform a simple ping test
    const testKey = `health:check:${Date.now()}`;
    const testValue = 'ping';

    const setResult = await cacheService.set(testKey, testValue, 5); // 5 second TTL
    const getResult = await cacheService.get(testKey);
    await cacheService.del(testKey);

    const isHealthy = stats.connectionStatus === 'connected' &&
                     setResult &&
                     getResult === testValue;

    const responseData = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      connection: {
        redis: stats.connectionStatus,
        ping: setResult && getResult === testValue,
      },
      performance: {
        hits: stats.hits,
        misses: stats.misses,
        keys: stats.keys
      },
      timestamp: new Date().toISOString()
    };

    requestLogger.info('Cache health check completed', {
      status: responseData.status,
      connectionStatus: stats.connectionStatus,
      pingSuccessful: setResult && getResult === testValue
    });

    if (isHealthy) {
      const successResponse = createSuccessResponse(responseData, traceId);
      res.status(200).json(successResponse);
    } else {
      requestLogger.warn('Cache service is unhealthy');
      const { response, headers } = handleExpressError(
        createAppError(ErrorCode.SERVER_ERROR, 'Cache service is unhealthy'),
        traceId
      );
      // Override with health-specific response but keep error structure
      res.status(503).set(headers).json({
        ...response,
        data: responseData
      });
    }
  } catch (error) {
    requestLogger.error('Cache health check error', { error: error instanceof Error ? error.message : String(error) }, error instanceof Error ? error : undefined);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const { response, headers } = handleExpressError(
      createAppError(ErrorCode.SERVER_ERROR, 'Cache health check failed'),
      traceId
    );
    // Override with health-specific response but keep error structure
    res.status(503).set(headers).json({
      ...response,
      data: {
        status: 'unhealthy',
        error: errorMessage,
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * @openapi
 * /cache/keys:
 *   get:
 *     summary: List cache keys
 *     description: List cache keys matching a pattern (for debugging)
 *     tags: [Cache]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: pattern
 *         in: query
 *         description: Pattern to match cache keys
 *         schema:
 *           type: string
 *           default: "*"
 *           example: "query:*"
 *       - name: limit
 *         in: query
 *         description: Maximum number of keys to return
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *     responses:
 *       200:
 *         description: Cache keys retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 keys:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["query:GetHabits:xyz", "user:123:profile"]
 *                 count:
 *                   type: number
 *                   example: 42
 *                 pattern:
 *                   type: string
 *                   example: "query:*"
 */
router.get('/keys', authMiddleware, async (req, res): Promise<void> => {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId);

  try {
    const { pattern = '*' } = req.query;

    requestLogger.info('Listing cache keys', { pattern });

    const cacheService = container.resolve<ICacheService>('ICacheService');

    // This is a placeholder - actual implementation would depend on Redis client
    // For now, return cache stats instead
    const stats = await cacheService.getStats();

    requestLogger.info('Cache keys listing completed', {
      totalKeys: stats.keys,
      pattern: pattern as string
    });

    const successResponse = createSuccessResponse({
      keys: [], // Placeholder - would contain actual keys
      count: stats.keys,
      pattern: pattern as string,
      note: 'Key listing not fully implemented - use cache stats instead'
    }, traceId);

    res.json(successResponse);
  } catch (error) {
    requestLogger.error('Error listing cache keys', {
      error: error instanceof Error ? error.message : String(error),
      pattern: req.query?.pattern
    }, error instanceof Error ? error : undefined);
    const { response, status, headers } = handleExpressError(
      createAppError(ErrorCode.SERVER_ERROR, 'Failed to list cache keys'),
      traceId
    );
    res.status(status).set(headers).json(response);
  }
});

export default router;