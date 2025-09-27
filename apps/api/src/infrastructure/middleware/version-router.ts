import { Request, Response, NextFunction, Router } from 'express';
import { ApiVersion, ApiVersioning, VersionedRequest } from './versioning';
import { logger } from '../../shared/logger';

export interface VersionHandler {
  version: ApiVersion;
  router: Router;
  deprecated?: boolean;
  sunsetDate?: Date;
}

export interface RouteConfig {
  path: string;
  handlers: Map<string, VersionHandler>;
  defaultVersion?: string;
}

export interface MigrationStrategy {
  fromVersion: ApiVersion;
  toVersion: ApiVersion;
  transformRequest?(req: any): any;
  transformResponse?(res: any): any;
}

export class VersionRouter {
  private routes: Map<string, RouteConfig> = new Map();
  private migrations: Map<string, MigrationStrategy> = new Map();

  /**
   * Register a route with version-specific handlers
   */
  registerRoute(path: string, handlers: VersionHandler[], defaultVersion?: string): void {
    const handlerMap = new Map<string, VersionHandler>();

    handlers.forEach(handler => {
      const versionKey = `${handler.version.major}.${handler.version.minor}`;
      handlerMap.set(versionKey, handler);
    });

    this.routes.set(path, {
      path,
      handlers: handlerMap,
      defaultVersion: defaultVersion || this.getLatestVersion(handlers)
    });

    logger.info('Route registered with versioning', {
      path,
      versions: Array.from(handlerMap.keys()),
      defaultVersion: defaultVersion || this.getLatestVersion(handlers)
    });
  }

  /**
   * Register migration strategy between versions
   */
  registerMigration(migration: MigrationStrategy): void {
    const migrationKey = `${migration.fromVersion.major}.${migration.fromVersion.minor}->${migration.toVersion.major}.${migration.toVersion.minor}`;
    this.migrations.set(migrationKey, migration);
    logger.info('Migration strategy registered', { migrationKey });
  }

  /**
   * Create middleware that routes to appropriate version handler
   */
  middleware() {
    return (req: Request, res: Response, next: NextFunction): void => {
      const versionedReq = req as VersionedRequest;

      // Find matching route configuration
      const routeConfig = this.findMatchingRoute(req.path);
      if (!routeConfig) {
        next();
        return;
      }

      const requestedVersion = versionedReq.apiVersion;
      const versionKey = `${requestedVersion.major}.${requestedVersion.minor}`;

      // Try to find exact version handler
      let handler = routeConfig.handlers.get(versionKey);

      // If no exact match, try to find compatible version or use migration
      if (!handler) {
        handler = this.findCompatibleHandler(requestedVersion, routeConfig);
      }

      if (!handler) {
        res.status(400).json({
          error: 'VERSION_NOT_SUPPORTED',
          message: `Version ${versionKey} is not supported for ${req.path}`,
          supportedVersions: Array.from(routeConfig.handlers.keys()),
          migrationGuide: `/api/migration-guide`
        });
        return;
      }

      // Check for deprecation
      this.addDeprecationHeaders(res, handler);

      // Apply migration if needed
      this.applyMigrationIfNeeded(req, res, requestedVersion, handler.version);

      // Route to version-specific handler
      handler.router(req, res, next);
    };
  }

  /**
   * Get version compatibility matrix
   */
  getVersionMatrix(): any {
    const matrix: any = {};

    this.routes.forEach((config, path) => {
      matrix[path] = {
        supportedVersions: Array.from(config.handlers.keys()),
        defaultVersion: config.defaultVersion,
        deprecatedVersions: Array.from(config.handlers.values())
          .filter(h => h.deprecated)
          .map(h => `${h.version.major}.${h.version.minor}`)
      };
    });

    return matrix;
  }

  /**
   * Get migration paths between versions
   */
  getMigrationPaths(): any {
    const paths: any = {};

    this.migrations.forEach((migration, key) => {
      const [from, to] = key.split('->');
      if (!paths[from]) paths[from] = [];
      paths[from].push({
        to,
        hasRequestTransform: !!migration.transformRequest,
        hasResponseTransform: !!migration.transformResponse
      });
    });

    return paths;
  }

  private findMatchingRoute(path: string): RouteConfig | undefined {
    // Try exact match first
    for (const [routePath, config] of this.routes) {
      if (this.pathMatches(path, routePath)) {
        return config;
      }
    }
    return undefined;
  }

  private pathMatches(requestPath: string, routePath: string): boolean {
    // Remove version prefix from request path for matching
    const cleanPath = requestPath.replace(/^\/v\d+(?:\.\d+)?/, '');

    // Simple path matching - could be enhanced with express-style params
    if (routePath === cleanPath) return true;

    // Check for parameter matching (simple implementation)
    const routeParts = routePath.split('/');
    const pathParts = cleanPath.split('/');

    if (routeParts.length !== pathParts.length) return false;

    return routeParts.every((part, index) => {
      return part.startsWith(':') || part === pathParts[index];
    });
  }

  private findCompatibleHandler(requestedVersion: ApiVersion, config: RouteConfig): VersionHandler | undefined {
    // Try to find the highest compatible version that's <= requested version
    const compatibleVersions = Array.from(config.handlers.entries())
      .filter(([_, handler]) => {
        return ApiVersioning.compareVersions(handler.version, requestedVersion) <= 0;
      })
      .sort(([_, a], [__, b]) => ApiVersioning.compareVersions(b.version, a.version));

    return compatibleVersions[0]?.[1];
  }

  private addDeprecationHeaders(res: Response, handler: VersionHandler): void {
    if (handler.deprecated) {
      res.setHeader('Deprecation', 'true');
      res.setHeader('X-API-Deprecation-Reason', 'Version is deprecated');

      if (handler.sunsetDate) {
        res.setHeader('Sunset', handler.sunsetDate.toUTCString());
      }

      // Add link to newer version if available
      const newerVersion = this.findNewerVersion(handler.version);
      if (newerVersion) {
        res.setHeader('Link', `</api/v${newerVersion.major}>; rel="successor-version"`);
      }
    }
  }

  private findNewerVersion(currentVersion: ApiVersion): ApiVersion | undefined {
    // Find the next available version
    const allVersions = new Set<string>();
    this.routes.forEach(config => {
      config.handlers.forEach((handler, version) => {
        allVersions.add(version);
      });
    });

    const sortedVersions = Array.from(allVersions)
      .map(v => {
        const [major, minor] = v.split('.').map(Number);
        return { major, minor };
      })
      .sort((a, b) => ApiVersioning.compareVersions(a, b))
      .filter(v => ApiVersioning.compareVersions(v, currentVersion) > 0);

    return sortedVersions[0];
  }

  private applyMigrationIfNeeded(req: Request, res: Response, requestedVersion: ApiVersion, handlerVersion: ApiVersion): void {
    if (ApiVersioning.compareVersions(requestedVersion, handlerVersion) === 0) {
      return; // No migration needed
    }

    const migrationKey = `${requestedVersion.major}.${requestedVersion.minor}->${handlerVersion.major}.${handlerVersion.minor}`;
    const migration = this.migrations.get(migrationKey);

    if (migration) {
      // Apply request transformation
      if (migration.transformRequest) {
        req.body = migration.transformRequest(req.body);
        req.query = migration.transformRequest(req.query);
      }

      // Wrap response.json to apply response transformation
      if (migration.transformResponse) {
        const originalJson = res.json.bind(res);
        res.json = function(data: any) {
          const transformedData = migration.transformResponse!(data);
          return originalJson(transformedData);
        };
      }

      logger.info('Migration applied', {
        from: requestedVersion,
        to: handlerVersion,
        migrationKey
      });
    }
  }

  private getLatestVersion(handlers: VersionHandler[]): string {
    const sortedHandlers = handlers.sort((a, b) =>
      ApiVersioning.compareVersions(b.version, a.version)
    );
    const latest = sortedHandlers[0];
    return `${latest.version.major}.${latest.version.minor}`;
  }
}

// Global instance
export const versionRouter = new VersionRouter();

/**
 * Helper function to create version-aware route middleware
 */
export function createVersionedRoute(path: string, versionHandlers: VersionHandler[], defaultVersion?: string) {
  versionRouter.registerRoute(path, versionHandlers, defaultVersion);
  return versionRouter.middleware();
}

/**
 * Helper to create a version handler
 */
export function createVersionHandler(
  major: number,
  minor: number,
  router: Router,
  options: { deprecated?: boolean; sunsetDate?: Date } = {}
): VersionHandler {
  return {
    version: { major, minor },
    router,
    deprecated: options.deprecated,
    sunsetDate: options.sunsetDate
  };
}