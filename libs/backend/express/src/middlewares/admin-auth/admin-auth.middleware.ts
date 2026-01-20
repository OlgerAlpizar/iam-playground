import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Creates a middleware that checks if the authenticated user is an admin.
 * @returns Middleware
 */
const createMiddleware = (): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user as { id: string; email: string; isAdmin?: boolean } | undefined;

    if (!user?.isAdmin) {
      res.status(403).json({ error: 'FORBIDDEN', message: 'Admin access required' });
      return;
    }

    next();
  };
};

export const adminAuth = {
  createMiddleware,
} as const;
