import { Request, Response, NextFunction } from 'express';
import { logger } from '../../shared/logger';

export interface ApiVersion {
  major: number;
  minor: number;
  patch?: number;
}

export interface VersionedRequest extends Request {
  apiVersion: ApiVersion;
}

export class ApiVersioning {
  private static readonly DEFAULT_VERSION: ApiVersion = { major: 1, minor: 0 };
  private static readonly SUPPORTED_VERSIONS: ApiVersion[] = [
    { major: 1, minor: 0 },
    { major: 1, minor: 1 },
    { major: 2, minor: 0 }
  ];

  /**
   * Extract API version from request
   * Supports:
   * - Header: Accept: application/vnd.sakinah.v1+json
   * - Header: API-Version: 1.0
   * - URL: /api/v1/resource
   * - Query: ?version=1.0
   */
  static extractVersion(req: Request): ApiVersion {
    // Try Accept header first (content negotiation)
    const acceptHeader = req.headers.accept;
    if (acceptHeader && acceptHeader.includes('vnd.sakinah')) {
      const match = acceptHeader.match(/vnd\.sakinah\.v(\d+)(?:\.(\d+))?/);
      if (match) {
        return {
          major: parseInt(match[1]),
          minor: parseInt(match[2] || '0')
        };
      }
    }

    // Try custom API-Version header
    const versionHeader = req.headers['api-version'] as string;
    if (versionHeader) {
      const [major, minor] = versionHeader.split('.').map(Number);
      return { major, minor: minor || 0 };
    }

    // Try URL path versioning
    const pathMatch = req.path.match(/\/v(\d+)(?:\.(\d+))?/);
    if (pathMatch) {
      return {
        major: parseInt(pathMatch[1]),
        minor: parseInt(pathMatch[2] || '0')
      };
    }

    // Try query parameter
    const queryVersion = req.query.version as string;
    if (queryVersion) {
      const [major, minor] = queryVersion.split('.').map(Number);
      return { major, minor: minor || 0 };
    }

    // Return default version
    return this.DEFAULT_VERSION;
  }

  /**
   * Check if a version is supported
   */
  static isVersionSupported(version: ApiVersion): boolean {
    return this.SUPPORTED_VERSIONS.some(
      v => v.major === version.major && v.minor === version.minor
    );
  }

  /**
   * Compare two versions
   * Returns: -1 if v1 < v2, 0 if equal, 1 if v1 > v2
   */
  static compareVersions(v1: ApiVersion, v2: ApiVersion): number {
    if (v1.major !== v2.major) {
      return v1.major < v2.major ? -1 : 1;
    }
    if (v1.minor !== v2.minor) {
      return v1.minor < v2.minor ? -1 : 1;
    }
    return 0;
  }

  /**
   * Get deprecation status for a version
   */
  static getDeprecationStatus(version: ApiVersion): {
    deprecated: boolean;
    sunsetDate?: Date;
    message?: string;
  } {
    // Version 1.0 is deprecated
    if (version.major === 1 && version.minor === 0) {
      return {
        deprecated: true,
        sunsetDate: new Date('2025-06-01'),
        message: 'Version 1.0 is deprecated and will be removed on June 1, 2025. Please upgrade to version 2.0.'
      };
    }

    return { deprecated: false };
  }
}

/**
 * Middleware to handle API versioning
 */
export function versioningMiddleware(req: Request, res: Response, next: NextFunction): void {
  const version = ApiVersioning.extractVersion(req);
  (req as VersionedRequest).apiVersion = version;

  // Check if version is supported
  if (!ApiVersioning.isVersionSupported(version)) {
    logger.warn('Unsupported API version requested', { version, path: req.path });
    res.status(400).json({
      error: 'Unsupported API version',
      requestedVersion: `${version.major}.${version.minor}`,
      supportedVersions: ['1.0', '1.1', '2.0']
    });
    return;
  }

  // Add version to response headers
  res.setHeader('API-Version', `${version.major}.${version.minor}`);

  // Check for deprecation
  const deprecationStatus = ApiVersioning.getDeprecationStatus(version);
  if (deprecationStatus.deprecated) {
    res.setHeader('Deprecation', 'true');
    if (deprecationStatus.sunsetDate) {
      res.setHeader('Sunset', deprecationStatus.sunsetDate.toUTCString());
    }
    res.setHeader('Link', '</api/v2>; rel="successor-version"');

    logger.info('Deprecated API version used', { version, path: req.path });
  }

  next();
}

/**
 * Route handler wrapper for version-specific logic
 */
export function versionedRoute(
  handlers: Map<string, (req: VersionedRequest, res: Response) => void>
) {
  return (req: Request, res: Response): void => {
    const versionedReq = req as VersionedRequest;
    const versionKey = `${versionedReq.apiVersion.major}.${versionedReq.apiVersion.minor}`;

    // Find exact match first
    let handler = handlers.get(versionKey);

    // If no exact match, find the closest lower version
    if (!handler) {
      const sortedVersions = Array.from(handlers.keys()).sort((a, b) => {
        const [aMajor, aMinor] = a.split('.').map(Number);
        const [bMajor, bMinor] = b.split('.').map(Number);
        return ApiVersioning.compareVersions(
          { major: bMajor, minor: bMinor },
          { major: aMajor, minor: aMinor }
        );
      });

      for (const v of sortedVersions) {
        const [major, minor] = v.split('.').map(Number);
        if (ApiVersioning.compareVersions(
          { major, minor },
          versionedReq.apiVersion
        ) <= 0) {
          handler = handlers.get(v);
          break;
        }
      }
    }

    // If still no handler, use the default (lowest version)
    if (!handler) {
      handler = handlers.get('1.0');
    }

    if (!handler) {
      res.status(501).json({
        error: 'Not implemented for this version'
      });
      return;
    }

    handler(versionedReq, res);
  };
}