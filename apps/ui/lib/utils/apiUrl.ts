const DEFAULT_API_URL = 'http://localhost:3001/api';

function trimTrailingSlashes(url: string): string {
  return url.replace(/\/+$/, '');
}

function ensureApiSuffix(url: string): string {
  const trimmed = trimTrailingSlashes(url);
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

/**
 * Resolve the base API URL for both client and server environments.
 *
 * Preference order:
 * 1. Explicit API URL env vars (NEXT_PUBLIC_API_URL, API_URL)
 * 2. Site URL env vars (NEXT_PUBLIC_SITE_URL, SITE_URL) with `/api` suffix
 * 3. Browser location (for client-side only) with `/api` suffix
 * 4. Replit domain configuration (if available) with `/api` suffix
 * 5. Local development default (`http://localhost:3001/api`)
 */
export function getApiBaseUrl(): string {
  const explicitEnv = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL;
  if (explicitEnv && explicitEnv.trim().length > 0) {
    return trimTrailingSlashes(explicitEnv);
  }

  const siteEnv = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;
  if (siteEnv && siteEnv.trim().length > 0) {
    return ensureApiSuffix(siteEnv);
  }

  if (typeof window !== 'undefined' && window.location) {
    return ensureApiSuffix(window.location.origin);
  }

  const replitDomains = process.env.NEXT_PUBLIC_REPLIT_DOMAINS || process.env.REPLIT_DOMAINS;
  if (replitDomains) {
    const primaryDomain = replitDomains
      .split(',')
      .map((value) => value.trim())
      .find((value) => value.length > 0);

    if (primaryDomain) {
      const sanitizedDomain = primaryDomain.startsWith('http')
        ? primaryDomain
        : `https://${primaryDomain}`;

      return ensureApiSuffix(sanitizedDomain);
    }
  }

  return trimTrailingSlashes(DEFAULT_API_URL);
}

/**
 * Return the base API URL with a trailing slash to simplify concatenation.
 */
export function getApiBaseUrlWithTrailingSlash(): string {
  const base = getApiBaseUrl();
  return base.endsWith('/') ? base : `${base}/`;
}

/**
 * Build a full API URL for the given path, ensuring exactly one slash
 * between the base URL and the provided path segment.
 */
export function buildApiUrl(path: string): string {
  const base = trimTrailingSlashes(getApiBaseUrl());
  if (!path) return base;

  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
  return `${base}/${normalizedPath}`;
}
