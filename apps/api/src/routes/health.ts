import { Router } from 'express';

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

router.get('/', (_req, res) => {
  const memUsage = process.memoryUsage();
  const totalMemory = memUsage.heapTotal;
  const usedMemory = memUsage.heapUsed;
  const memoryPercentage = ((usedMemory / totalMemory) * 100).toFixed(2);

  const healthResponse: HealthCheckResponse = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: Math.floor(process.uptime()),
    memory: {
      used: `${Math.round(usedMemory / 1024 / 1024)}MB`,
      total: `${Math.round(totalMemory / 1024 / 1024)}MB`,
      percentage: `${memoryPercentage}%`
    }
  };

  res.json(healthResponse);
});

export default router;