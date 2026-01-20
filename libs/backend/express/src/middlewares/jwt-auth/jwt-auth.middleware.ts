import type { NextFunction, Request, RequestHandler, Response } from 'express';
import jwt from 'jsonwebtoken';

type JwtMiddlewareOptions = {
  secret: string;
};

type DecodedToken = {
  sub: string;
  email: string;
  isAdmin?: boolean;
  iat: number;
  exp: number;
};

type AuthenticatedUser = {
  id: string;
  email: string;
  isAdmin?: boolean;
};

type AuthenticatedRequest = Request & {
  user?: AuthenticatedUser;
};

const HTTP_STATUS = {
  UNAUTHORIZED: 401,
} as const;

const AUTH_ERRORS = {
  NO_TOKEN: { error: 'UNAUTHORIZED', message: 'No token provided' },
  TOKEN_EXPIRED: { error: 'TOKEN_EXPIRED', message: 'Token has expired' },
  TOKEN_INVALID: { error: 'TOKEN_INVALID', message: 'Invalid token' },
} as const;

const extractToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7);
};

/**
 * Verifies the JWT token and attaches user info to req.user.
 * @param options - JWT auth options
 * @param options.secret - The secret used to verify tokens
 * @returns Middleware
 */
const createMiddleware = (options: JwtMiddlewareOptions): RequestHandler => {
  const { secret } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const token = extractToken(req);

    if (!token) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json(AUTH_ERRORS.NO_TOKEN);
      return;
    }

    try {
      const payload = jwt.verify(token, secret) as DecodedToken;

      (req as AuthenticatedRequest).user = {
        id: payload.sub,
        email: payload.email,
        isAdmin: payload.isAdmin,
      };

      next();
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json(AUTH_ERRORS.TOKEN_EXPIRED);
        return;
      }

      res.status(HTTP_STATUS.UNAUTHORIZED).json(AUTH_ERRORS.TOKEN_INVALID);
    }
  };
};

export const jwtAuth = {
  createMiddleware,
} as const;
