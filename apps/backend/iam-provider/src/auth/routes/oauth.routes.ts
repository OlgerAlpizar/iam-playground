import { jwtAuth, requestValidation } from '@authentication/backend-express/middlewares';
import { Router } from 'express';
import { z } from 'zod';

import { appConfig } from '../../config/app.config';
import { oauthController } from '../controllers/oauth.controller';

const router = Router();

// JWT authentication middleware (independent of Passport.js)
const requireAuth = jwtAuth.createMiddleware({ secret: appConfig.jwt.secret });

// Provider params validation
const providerParamsSchema = z.object({
  provider: z.enum(['google', 'github'], { message: 'Invalid OAuth provider' }),
  providerId: z.string().min(1, 'Provider ID is required').max(100, 'Provider ID too long'),
});

// Google OAuth routes (only if configured)
if (appConfig.oauth.google) {
  router.get('/google', oauthController.googleAuth);
  router.get('/google/callback', oauthController.googleCallback);
}

// GitHub OAuth routes (only if configured)
if (appConfig.oauth.github) {
  router.get('/github', oauthController.githubAuth);
  router.get('/github/callback', oauthController.githubCallback);
}

// Provider management (requires authentication)
router.delete(
  '/:provider/:providerId',
  requireAuth,
  requestValidation.validateParams(providerParamsSchema),
  oauthController.unlinkProvider,
);

export const oauthRoutes = router;
