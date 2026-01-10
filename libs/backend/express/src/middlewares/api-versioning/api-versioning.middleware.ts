import type { NextFunction, Request, RequestHandler, Response } from 'express';

import type { ApiVersion } from '../../types';

type ApiVersioningOptions = {
  versions: ApiVersion[];
  defaultVersion: string;
  basePath: string;
};

const extractVersion = (path: string, basePath: string): string | null => {
  const escapedBasePath = basePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^${escapedBasePath}/v(\\d+)(/.*)?$`);
  const match = path.match(pattern);
  return match ? `v${match[1]}` : null;
};

const isSunsetDatePassed = (versionInfo: ApiVersion): boolean => {
  if (versionInfo.sunsetDate) {
    const sunset = new Date(versionInfo.sunsetDate);
    const now = new Date();
    return now > sunset;
  }

  return false;
};

const setDeprecationHeaders = (res: Response, versionInfo: ApiVersion): void => {
  if (versionInfo.deprecationDate) {
    res.setHeader('X-API-Deprecation-Date', versionInfo.deprecationDate);
  }
  if (versionInfo.sunsetDate) {
    res.setHeader('X-API-Sunset-Date', versionInfo.sunsetDate);
  }
  res.setHeader('X-API-Deprecated', 'true');
};

const handleSunsetResponse = (res: Response, versionInfo: ApiVersion): void => {
  res.status(410).json({
    error: 'API version sunset',
    message: `API version "${versionInfo.version}" was sunset on ${versionInfo.sunsetDate}`,
  });
};

const handleDeprecatedVersion = (res: Response, versionInfo: ApiVersion): boolean => {
  setDeprecationHeaders(res, versionInfo);

  if (isSunsetDatePassed(versionInfo)) {
    handleSunsetResponse(res, versionInfo);
    return true;
  }
  return false;
};

const validateApiVersioningOptions = (options: ApiVersioningOptions): Map<string, ApiVersion> => {
  if (!options.versions || options.versions.length === 0) {
    throw new Error('At least one version must be provided in options.versions');
  }

  if (!options.defaultVersion) {
    throw new Error('defaultVersion must be provided');
  }

  const versionMap = new Map<string, ApiVersion>();

  for (const version of options.versions) {
    versionMap.set(version.version, version);

    if (version.deprecated) {
      if (!version.deprecationDate) {
        throw new Error(
          `Version "${version.version}" is marked as deprecated but missing deprecationDate`,
        );
      }
      if (!version.sunsetDate) {
        throw new Error(
          `Version "${version.version}" is marked as deprecated but missing sunsetDate`,
        );
      }
    }
  }

  if (!versionMap.has(options.defaultVersion)) {
    throw new Error(`Default version "${options.defaultVersion}" is not in the versions list`);
  }

  return versionMap;
};

/**
 * Creates a Middleware for API versioning.
 * Extracts and attaches version info to request object.
 * @param options - Configuration options for API versioning
 * @returns Middleware
 */
const createMiddleware = (options: ApiVersioningOptions): RequestHandler => {
  const versionMap = validateApiVersioningOptions(options);

  return (req: Request, res: Response, next: NextFunction): void => {
    const extractedVersion = extractVersion(req.path, options.basePath);

    if (extractedVersion) {
      const versionInfo = versionMap.get(extractedVersion);

      if (!versionInfo) {
        res.status(400).json({
          error: 'Unsupported API version',
          message: `API version "${extractedVersion}" is not supported`,
          supportedVersions: Array.from(versionMap.keys()),
        });
        return;
      }

      req.apiVersionInfo = versionInfo;

      if (versionInfo.deprecated) {
        const requestTerminated = handleDeprecatedVersion(res, versionInfo);
        if (requestTerminated) {
          return;
        }
      }
    } else {
      const defaultVersionInfo = versionMap.get(options.defaultVersion);
      if (!defaultVersionInfo) {
        throw new Error(`Default version "${options.defaultVersion}" configuration is invalid`);
      }
      req.apiVersionInfo = defaultVersionInfo;
    }

    next();
  };
};

/**
 * Gets the API version from the request object.
 * @param req - Express Request object
 * @returns Version string or undefined if none is attached
 */
const getVersion = (req: Request): string | undefined => req.apiVersionInfo?.version;

/**
 * Checks if the API version used in the request is deprecated.
 * @param req - Express Request object
 * @returns if version is deprecated
 */
const isDeprecated = (req: Request): boolean => req.apiVersionInfo?.deprecated ?? false;

export const apiVersioning = {
  createMiddleware,
  getVersion,
  isDeprecated,
} as const;
