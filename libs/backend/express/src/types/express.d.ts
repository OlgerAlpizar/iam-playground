/**
 * Represents API versioning and their deprecation status
 * @interface ApiVersion
 */
export interface ApiVersion {
  version: string;
  deprecated?: boolean;
  deprecationDate?: string;
  sunsetDate?: string;
}

declare global {
  namespace Express {
    interface Request {
      id?: string;
      requestId?: string;
      timedout?: boolean;
      apiVersionInfo?: ApiVersion;
    }
  }
}
