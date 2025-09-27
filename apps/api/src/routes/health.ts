import { Router } from 'express';
import {
  handleExpressError,
  getExpressTraceId,
  createSuccessResponse,
  createRequestLogger
} from '@/shared/errors';

const router = Router();

interface HealthCheckResponse {
  status: 'ok' | 'error';
  timestamp: string;
  version: string;
  environment: string;
  uptime: number;
  memory: {
    used: string;
    total: string;
    percentage: string;
  };
}

router.get('/', async (req, res): Promise<void> => {
  const traceId = getExpressTraceId(req);
  const requestLogger = createRequestLogger(traceId);

  try {
    requestLogger.info('Health check requested');

    const memUsage = process.memoryUsage();
    const totalMemory = memUsage.heapTotal;
    const usedMemory = memUsage.heapUsed;
    const memoryPercentage = ((usedMemory / totalMemory) * 100).toFixed(2);

    const healthData: Omit<HealthCheckResponse, 'status' | 'timestamp'> = {
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: Math.floor(process.uptime()),
      memory: {
        used: `${Math.round(usedMemory / 1024 / 1024)}MB`,
        total: `${Math.round(totalMemory / 1024 / 1024)}MB`,
        percentage: `${memoryPercentage}%`
      }
    };

    requestLogger.info('Health check completed', { uptime: healthData.uptime });
    const response = createSuccessResponse({
      ...healthData,
      status: 'ok'
    }, traceId);
    res.status(200).json(response);
  } catch (error) {
    const { response, status, headers } = handleExpressError(error, traceId);
    requestLogger.error('Health check error', { error: error instanceof Error ? error.message : String(error) }, error instanceof Error ? error : undefined);
    res.status(status).set(headers as any).json(response);
  }
});

export default router;