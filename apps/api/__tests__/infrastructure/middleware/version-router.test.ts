import { beforeEach, describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction, Router } from 'express';
import { VersionRouter, createVersionHandler, VersionHandler } from '@/infrastructure/middleware/version-router';
import { VersionedRequest } from '@/infrastructure/middleware/versioning';

// Mock logger
vi.mock('../../../src/shared/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

describe('VersionRouter', () => {
  let versionRouter: VersionRouter;
  let req: Partial<VersionedRequest>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    versionRouter = new VersionRouter();

    req = {
      path: '/habits',
      method: 'GET',
      apiVersion: { major: 2, minor: 0 }
    };

    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      setHeader: vi.fn().mockReturnThis()
    };

    next = vi.fn();
  });

  describe('registerRoute', () => {
    it('should register route with version handlers', () => {
      const v1Router = Router();
      const v2Router = Router();

      const handlers: VersionHandler[] = [
        createVersionHandler(1, 0, v1Router, { deprecated: true }),
        createVersionHandler(2, 0, v2Router)
      ];

      versionRouter.registerRoute('/habits', handlers);

      const matrix = versionRouter.getVersionMatrix();
      expect(matrix['/habits']).toBeDefined();
      expect(matrix['/habits'].supportedVersions).toEqual(['1.0', '2.0']);
      expect(matrix['/habits'].deprecatedVersions).toEqual(['1.0']);
    });

    it('should set default version to latest when not specified', () => {
      const v1Router = Router();
      const v2Router = Router();

      const handlers: VersionHandler[] = [
        createVersionHandler(1, 0, v1Router),
        createVersionHandler(2, 0, v2Router)
      ];

      versionRouter.registerRoute('/habits', handlers);

      const matrix = versionRouter.getVersionMatrix();
      expect(matrix['/habits'].defaultVersion).toBe('2.0');
    });
  });

  describe('middleware', () => {
    beforeEach(() => {
      const v1Router = Router();
      const v2Router = Router();

      // Mock router behavior
      (v1Router as any) = vi.fn();
      (v2Router as any) = vi.fn();

      const handlers: VersionHandler[] = [
        createVersionHandler(1, 0, v1Router, { deprecated: true, sunsetDate: new Date('2025-06-01') }),
        createVersionHandler(2, 0, v2Router)
      ];

      versionRouter.registerRoute('/habits', handlers);
    });

    it('should route to exact version handler when available', () => {
      req.apiVersion = { major: 2, minor: 0 };

      const middleware = versionRouter.middleware();
      middleware(req as Request, res as Response, next);

      // Should find the v2 handler
      expect(next).toHaveBeenCalled();
    });

    it('should route to compatible version when exact match not found', () => {
      req.apiVersion = { major: 1, minor: 1 }; // Request v1.1, but only v1.0 available

      const middleware = versionRouter.middleware();
      middleware(req as Request, res as Response, next);

      // Should find the v1.0 handler as compatible
      expect(next).toHaveBeenCalled();
    });

    it('should return error for unsupported route', () => {
      (req as any).path = '/unknown-route';

      const middleware = versionRouter.middleware();
      middleware(req as Request, res as Response, next);

      // Should call next() for unregistered routes (let other middleware handle)
      expect(next).toHaveBeenCalled();
    });

    it('should add deprecation headers for deprecated versions', () => {
      req.apiVersion = { major: 1, minor: 0 };

      const middleware = versionRouter.middleware();
      middleware(req as Request, res as Response, next);

      expect(res.setHeader).toHaveBeenCalledWith('Deprecation', 'true');
      expect(res.setHeader).toHaveBeenCalledWith('X-API-Deprecation-Reason', 'Version is deprecated');
      expect(res.setHeader).toHaveBeenCalledWith('Sunset', expect.any(String));
      expect(res.setHeader).toHaveBeenCalledWith('Link', '</api/v2>; rel="successor-version"');
    });

    it('should return version not supported error when no compatible handler found', () => {
      // Remove all handlers and register only v2
      const versionRouter2 = new VersionRouter();
      const v2Router = Router();
      (v2Router as any) = vi.fn();

      const handlers: VersionHandler[] = [
        createVersionHandler(2, 0, v2Router)
      ];

      versionRouter2.registerRoute('/habits', handlers);

      req.apiVersion = { major: 3, minor: 0 }; // Request unsupported v3.0

      const middleware = versionRouter2.middleware();
      middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'VERSION_NOT_SUPPORTED',
        message: 'Version 3.0 is not supported for /habits',
        supportedVersions: ['2.0'],
        migrationGuide: '/api/migration-guide'
      });
    });
  });

  describe('getVersionMatrix', () => {
    it('should return version compatibility matrix', () => {
      const v1Router = Router();
      const v2Router = Router();

      const handlers: VersionHandler[] = [
        createVersionHandler(1, 0, v1Router, { deprecated: true }),
        createVersionHandler(2, 0, v2Router)
      ];

      versionRouter.registerRoute('/habits', handlers);

      const matrix = versionRouter.getVersionMatrix();

      expect(matrix).toEqual({
        '/habits': {
          supportedVersions: ['1.0', '2.0'],
          defaultVersion: '2.0',
          deprecatedVersions: ['1.0']
        }
      });
    });
  });

  describe('registerMigration', () => {
    it('should register migration strategy', () => {
      const migration = {
        fromVersion: { major: 1, minor: 0 },
        toVersion: { major: 2, minor: 0 },
        transformRequest: (data: any) => data,
        transformResponse: (data: any) => data
      };

      versionRouter.registerMigration(migration);

      const paths = versionRouter.getMigrationPaths();
      expect(paths['1.0']).toBeDefined();
      expect(paths['1.0'][0]).toEqual({
        to: '2.0',
        hasRequestTransform: true,
        hasResponseTransform: true
      });
    });
  });
});

describe('createVersionHandler', () => {
  it('should create version handler with basic properties', () => {
    const router = Router();
    const handler = createVersionHandler(2, 0, router);

    expect(handler).toEqual({
      version: { major: 2, minor: 0 },
      router,
      deprecated: undefined,
      sunsetDate: undefined
    });
  });

  it('should create version handler with deprecation options', () => {
    const router = Router();
    const sunsetDate = new Date('2025-06-01');
    const handler = createVersionHandler(1, 0, router, {
      deprecated: true,
      sunsetDate
    });

    expect(handler).toEqual({
      version: { major: 1, minor: 0 },
      router,
      deprecated: true,
      sunsetDate
    });
  });
});