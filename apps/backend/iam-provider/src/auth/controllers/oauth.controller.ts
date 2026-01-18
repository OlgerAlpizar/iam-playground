import { generateDeviceFingerprint } from '@authentication/backend-express/utils';
import type { NextFunction, Request, Response } from 'express';
import passport from 'passport';

import { appConfig } from '../../config/app.config';
import type { OAuthProfile } from '../../config/passport.config';
import { oauthService } from '../services/oauth.service';

const getTokenContext = (req: Request) => ({
  deviceFingerprint: generateDeviceFingerprint(req),
  userAgent: req.headers['user-agent'],
  ipAddress: req.ip,
});

const getFrontendUrl = (): string => appConfig.whiteListUrls[0];

const createOAuthCallback = (provider: 'google' | 'github') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errorMessage = `${
      provider.charAt(0).toUpperCase() + provider.slice(1)
    } authentication failed`;

    const handleAuthentication = (
      err: Error | null,
      profile: OAuthProfile | false | null,
    ): void => {
      if (err || !profile) {
        res.redirect(`${getFrontendUrl()}/auth/error?message=${encodeURIComponent(errorMessage)}`);
        return;
      }

      const context = getTokenContext(req);
      oauthService
        .authenticateWithOAuth(profile, context)
        .then((result) => {
          const params = new URLSearchParams({
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            expiresIn: result.expiresIn.toString(),
          });
          res.redirect(`${getFrontendUrl()}/auth/callback?${params.toString()}`);
        })
        .catch((error: unknown) => {
          next(error);
        });
    };

    (
      passport.authenticate(provider, { session: false }, handleAuthentication) as (
        req: Request,
        res: Response,
        next: NextFunction,
      ) => void
    )(req, res, next);
  };
};

const googleAuth = (req: Request, res: Response, next: NextFunction): void => {
  (
    passport.authenticate('google', { scope: ['profile', 'email'], session: false }) as (
      req: Request,
      res: Response,
      next: NextFunction,
    ) => void
  )(req, res, next);
};

const githubAuth = (req: Request, res: Response, next: NextFunction): void => {
  (
    passport.authenticate('github', { scope: ['user:email'], session: false }) as (
      req: Request,
      res: Response,
      next: NextFunction,
    ) => void
  )(req, res, next);
};

const googleCallback = createOAuthCallback('google');
const githubCallback = createOAuthCallback('github');

const linkProvider = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const profile = req.body as OAuthProfile;
    const user = await oauthService.linkOAuthProvider(userId, profile);
    res.json(user);
  } catch (err) {
    next(err);
  }
};

const unlinkProvider = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { provider, providerId } = req.params;
    const user = await oauthService.unlinkOAuthProvider(userId, provider, providerId);
    res.json(user);
  } catch (err) {
    next(err);
  }
};

export const oauthController = {
  googleAuth,
  googleCallback,
  githubAuth,
  githubCallback,
  linkProvider,
  unlinkProvider,
};
