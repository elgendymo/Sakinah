import { beforeEach, describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { ApiVersioning, versioningMiddleware, VersionedRequest } from '../../../src/infrastructure/middleware/versioning';

// Mock logger
vi.mock('../../../src/shared/logger', () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn()
  }
}));

describe('ApiVersioning', () => {
  describe('extractVersion', () => {
    it('should extract version from Accept header', () => {
      const req = {
        headers: {
          accept: 'application/vnd.sakinah.v2+json'
        },
        path: '/api/habits',
        query: {}
      } as Request;

      const version = ApiVersioning.extractVersion(req);
      expect(version).toEqual({ major: 2, minor: 0 });
    });

    it('should extract version from Accept header with minor version', () => {
      const req = {
        headers: {
          accept: 'application/vnd.sakinah.v2.1+json'
        },
        path: '/api/habits',
        query: {}
      } as Request;

      const version = ApiVersioning.extractVersion(req);
      expect(version).toEqual({ major: 2, minor: 1 });
    });

    it('should extract version from API-Version header', () => {
      const req = {
        headers: {
          'api-version': '1.1'
        },
        path: '/api/habits',
        query: {}
      } as Request;

      const version = ApiVersioning.extractVersion(req);
      expect(version).toEqual({ major: 1, minor: 1 });
    });

    it('should extract version from URL path', () => {
      const req = {
        headers: {},
        path: '/api/v2/habits',
        query: {}
      } as Request;

      const version = ApiVersioning.extractVersion(req);
      expect(version).toEqual({ major: 2, minor: 0 });
    });

    it('should extract version from URL path with minor version', () => {
      const req = {
        headers: {},
        path: '/api/v1.1/habits',
        query: {}
      } as Request;

      const version = ApiVersioning.extractVersion(req);
      expect(version).toEqual({ major: 1, minor: 1 });
    });

    it('should extract version from query parameter', () => {
      const req = {
        headers: {},
        path: '/api/habits',
        query: { version: '2.0' }
      } as Request;

      const version = ApiVersioning.extractVersion(req);
      expect(version).toEqual({ major: 2, minor: 0 });
    });

    it('should return default version when no version specified', () => {
      const req = {
        headers: {},
        path: '/api/habits',
        query: {}
      } as Request;

      const version = ApiVersioning.extractVersion(req);
      expect(version).toEqual({ major: 1, minor: 0 });
    });

    it('should prioritize Accept header over other methods', () => {
      const req = {
        headers: {
          accept: 'application/vnd.sakinah.v2+json',
          'api-version': '1.0'
        },
        path: '/api/v1/habits',
        query: { version: '1.1' }
      } as Request;

      const version = ApiVersioning.extractVersion(req);
      expect(version).toEqual({ major: 2, minor: 0 });
    });
  });

  describe('isVersionSupported', () => {
    it('should return true for supported versions', () => {
      expect(ApiVersioning.isVersionSupported({ major: 1, minor: 0 })).toBe(true);
      expect(ApiVersioning.isVersionSupported({ major: 1, minor: 1 })).toBe(true);
      expect(ApiVersioning.isVersionSupported({ major: 2, minor: 0 })).toBe(true);
    });

    it('should return false for unsupported versions', () => {
      expect(ApiVersioning.isVersionSupported({ major: 3, minor: 0 })).toBe(false);
      expect(ApiVersioning.isVersionSupported({ major: 1, minor: 5 })).toBe(false);
      expect(ApiVersioning.isVersionSupported({ major: 0, minor: 1 })).toBe(false);
    });
  });

  describe('compareVersions', () => {
    it('should compare major versions correctly', () => {
      const v1 = { major: 1, minor: 0 };
      const v2 = { major: 2, minor: 0 };

      expect(ApiVersioning.compareVersions(v1, v2)).toBe(-1);
      expect(ApiVersioning.compareVersions(v2, v1)).toBe(1);
      expect(ApiVersioning.compareVersions(v1, v1)).toBe(0);
    });

    it('should compare minor versions correctly', () => {
      const v1_0 = { major: 1, minor: 0 };
      const v1_1 = { major: 1, minor: 1 };

      expect(ApiVersioning.compareVersions(v1_0, v1_1)).toBe(-1);
      expect(ApiVersioning.compareVersions(v1_1, v1_0)).toBe(1);
      expect(ApiVersioning.compareVersions(v1_0, v1_0)).toBe(0);
    });
  });

  describe('getDeprecationStatus', () => {
    it('should mark version 1.0 as deprecated', () => {
      const status = ApiVersioning.getDeprecationStatus({ major: 1, minor: 0 });

      expect(status.deprecated).toBe(true);
      expect(status.sunsetDate).toBeInstanceOf(Date);
      expect(status.message).toContain('deprecated');
    });

    it('should not mark newer versions as deprecated', () => {
      const status = ApiVersioning.getDeprecationStatus({ major: 2, minor: 0 });

      expect(status.deprecated).toBe(false);
      expect(status.sunsetDate).toBeUndefined();
      expect(status.message).toBeUndefined();
    });
  });
});

describe('versioningMiddleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      headers: {},
      path: '/api/habits',
      query: {}
    };

    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      setHeader: vi.fn().mockReturnThis()
    };

    next = vi.fn();
  });

  it('should add version to request and response headers for supported version', () => {
    req.headers = { 'api-version': '2.0' };

    versioningMiddleware(req as Request, res as Response, next);

    const versionedReq = req as VersionedRequest;
    expect(versionedReq.apiVersion).toEqual({ major: 2, minor: 0 });
    expect(res.setHeader).toHaveBeenCalledWith('API-Version', '2.0');
    expect(next).toHaveBeenCalled();
  });

  it('should return error for unsupported version', () => {
    req.headers = { 'api-version': '3.0' };

    versioningMiddleware(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Unsupported API version',
      requestedVersion: '3.0',
      supportedVersions: ['1.0', '1.1', '2.0']
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should add deprecation headers for deprecated version', () => {
    req.headers = { 'api-version': '1.0' };

    versioningMiddleware(req as Request, res as Response, next);

    expect(res.setHeader).toHaveBeenCalledWith('API-Version', '1.0');
    expect(res.setHeader).toHaveBeenCalledWith('Deprecation', 'true');
    expect(res.setHeader).toHaveBeenCalledWith('Sunset', expect.any(String));
    expect(res.setHeader).toHaveBeenCalledWith('Link', '</api/v2>; rel="successor-version"');
    expect(next).toHaveBeenCalled();
  });

  it('should use default version when none specified', () => {
    versioningMiddleware(req as Request, res as Response, next);

    const versionedReq = req as VersionedRequest;
    expect(versionedReq.apiVersion).toEqual({ major: 1, minor: 0 });
    expect(res.setHeader).toHaveBeenCalledWith('API-Version', '1.0');
    expect(next).toHaveBeenCalled();
  });

  it('should handle version from URL path', () => {
    req.path = '/api/v2/habits';

    versioningMiddleware(req as Request, res as Response, next);

    const versionedReq = req as VersionedRequest;
    expect(versionedReq.apiVersion).toEqual({ major: 2, minor: 0 });
    expect(res.setHeader).toHaveBeenCalledWith('API-Version', '2.0');
    expect(next).toHaveBeenCalled();
  });
});