/**
 * Version Strategy Interface
 *
 * Defines the contract for API versioning strategies
 */
export interface VersionStrategy {
  /**
   * Build the versioned endpoint URL
   */
  buildEndpoint(endpoint: string, version: string): string;

  /**
   * Extract version from request or response
   */
  extractVersion(headers: Headers): string | undefined;

  /**
   * Validate if a version is supported
   */
  isVersionSupported(version: string): boolean;

  /**
   * Get the default version
   */
  getDefaultVersion(): string;

  /**
   * Get migration path from one version to another
   */
  getMigrationPath(fromVersion: string, toVersion: string): string[] | undefined;
}

/**
 * URL Path Versioning Strategy
 *
 * Version is included in the URL path (e.g., /v1/users, /v2/users)
 * This is the default strategy for the Sakinah application
 */
export class ApiVersionStrategy implements VersionStrategy {
  private supportedVersions: Set<string>;
  private defaultVersion: string;
  private versionMigrationMap: Map<string, Map<string, string[]>>;

  constructor(
    supportedVersions: string[] = ['v1'],
    defaultVersion: string = 'v1'
  ) {
    this.supportedVersions = new Set(supportedVersions);
    this.defaultVersion = defaultVersion;
    this.versionMigrationMap = new Map();

    // Initialize migration paths
    this.initializeMigrationPaths();
  }

  /**
   * Build versioned endpoint URL
   */
  public buildEndpoint(endpoint: string, version: string): string {
    // Remove any existing version prefix
    const cleanEndpoint = this.removeVersionPrefix(endpoint);

    // If endpoint already starts with a version, use it
    const versionPattern = /^\/v\d+/;
    if (versionPattern.test(endpoint)) {
      return endpoint;
    }

    // Add version prefix if not present
    return `/${version}${cleanEndpoint.startsWith('/') ? cleanEndpoint : '/' + cleanEndpoint}`;
  }

  /**
   * Extract version from headers
   */
  public extractVersion(headers: Headers): string | undefined {
    // Check X-API-Version header first
    const headerVersion = headers.get('X-API-Version');
    if (headerVersion && this.isVersionSupported(headerVersion)) {
      return headerVersion;
    }

    // Check Accept header for version
    const acceptHeader = headers.get('Accept');
    if (acceptHeader) {
      const versionMatch = acceptHeader.match(/version=(\w+)/);
      if (versionMatch && this.isVersionSupported(versionMatch[1])) {
        return versionMatch[1];
      }
    }

    return undefined;
  }

  /**
   * Check if version is supported
   */
  public isVersionSupported(version: string): boolean {
    return this.supportedVersions.has(version);
  }

  /**
   * Get default version
   */
  public getDefaultVersion(): string {
    return this.defaultVersion;
  }

  /**
   * Get migration path between versions
   */
  public getMigrationPath(fromVersion: string, toVersion: string): string[] | undefined {
    const fromMap = this.versionMigrationMap.get(fromVersion);
    if (!fromMap) return undefined;

    return fromMap.get(toVersion);
  }

  /**
   * Remove version prefix from endpoint
   */
  private removeVersionPrefix(endpoint: string): string {
    return endpoint.replace(/^\/v\d+/, '');
  }

  /**
   * Initialize migration paths between versions
   */
  private initializeMigrationPaths(): void {
    // Define migration paths for future version transitions
    // Currently empty as we only have v1

    // Example for future use:
    // this.versionMigrationMap.set('v1', new Map([
    //   ['v2', ['migrate-auth', 'migrate-response-format']]
    // ]));
  }
}

/**
 * Header-based Versioning Strategy
 *
 * Version is passed via headers only (no URL changes)
 */
export class HeaderVersionStrategy implements VersionStrategy {
  private supportedVersions: Set<string>;
  private defaultVersion: string;

  constructor(
    supportedVersions: string[] = ['v1'],
    defaultVersion: string = 'v1'
  ) {
    this.supportedVersions = new Set(supportedVersions);
    this.defaultVersion = defaultVersion;
  }

  public buildEndpoint(endpoint: string, _version: string): string {
    // No URL modification needed for header-based versioning
    return endpoint;
  }

  public extractVersion(headers: Headers): string | undefined {
    const version = headers.get('API-Version') || headers.get('X-API-Version');
    return version && this.isVersionSupported(version) ? version : undefined;
  }

  public isVersionSupported(version: string): boolean {
    return this.supportedVersions.has(version);
  }

  public getDefaultVersion(): string {
    return this.defaultVersion;
  }

  public getMigrationPath(_fromVersion: string, _toVersion: string): string[] | undefined {
    // Migration paths would be defined here
    return undefined;
  }
}

/**
 * Query Parameter Versioning Strategy
 *
 * Version is passed as a query parameter (e.g., /users?version=v1)
 */
export class QueryVersionStrategy implements VersionStrategy {
  private supportedVersions: Set<string>;
  private defaultVersion: string;
  private parameterName: string;

  constructor(
    supportedVersions: string[] = ['v1'],
    defaultVersion: string = 'v1',
    parameterName: string = 'version'
  ) {
    this.supportedVersions = new Set(supportedVersions);
    this.defaultVersion = defaultVersion;
    this.parameterName = parameterName;
  }

  public buildEndpoint(endpoint: string, version: string): string {
    const url = new URL(endpoint, 'http://temp.com');
    url.searchParams.set(this.parameterName, version);
    return url.pathname + url.search;
  }

  public extractVersion(headers: Headers): string | undefined {
    // For query-based versioning, version is in URL, not headers
    // This would be extracted from the request URL in practice
    return undefined;
  }

  public isVersionSupported(version: string): boolean {
    return this.supportedVersions.has(version);
  }

  public getDefaultVersion(): string {
    return this.defaultVersion;
  }

  public getMigrationPath(_fromVersion: string, _toVersion: string): string[] | undefined {
    return undefined;
  }
}

/**
 * Composite Versioning Strategy
 *
 * Combines multiple versioning strategies with fallback support
 */
export class CompositeVersionStrategy implements VersionStrategy {
  private strategies: VersionStrategy[];
  private primaryStrategy: VersionStrategy;

  constructor(
    primaryStrategy: VersionStrategy,
    ...fallbackStrategies: VersionStrategy[]
  ) {
    this.primaryStrategy = primaryStrategy;
    this.strategies = [primaryStrategy, ...fallbackStrategies];
  }

  public buildEndpoint(endpoint: string, version: string): string {
    return this.primaryStrategy.buildEndpoint(endpoint, version);
  }

  public extractVersion(headers: Headers): string | undefined {
    for (const strategy of this.strategies) {
      const version = strategy.extractVersion(headers);
      if (version) return version;
    }
    return undefined;
  }

  public isVersionSupported(version: string): boolean {
    return this.strategies.some(s => s.isVersionSupported(version));
  }

  public getDefaultVersion(): string {
    return this.primaryStrategy.getDefaultVersion();
  }

  public getMigrationPath(fromVersion: string, toVersion: string): string[] | undefined {
    for (const strategy of this.strategies) {
      const path = strategy.getMigrationPath(fromVersion, toVersion);
      if (path) return path;
    }
    return undefined;
  }
}