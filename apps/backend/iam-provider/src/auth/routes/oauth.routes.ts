import { Router } from 'express';

import { appConfig } from '../../config/app.config';
import { oauthController } from '../controllers/oauth.controller';

const router = Router();

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

// Provider management (requires authentication - middleware to be added)
router.delete('/:provider/:providerId', oauthController.unlinkProvider);

export const oauthRoutes = router;
