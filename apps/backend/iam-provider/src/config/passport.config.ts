import passport from 'passport';
import { Profile as GitHubProfile, Strategy as GitHubStrategy } from 'passport-github2';
import {
  Profile as GoogleProfile,
  Strategy as GoogleStrategy,
  VerifyCallback,
} from 'passport-google-oauth20';

import type { OAuthProvider } from '../auth/entities/oauth-provider.entity';
import { OAuthProviderType } from '../auth/entities/oauth-provider.entity';
import { appConfig } from './app.config';

export interface OAuthProfile {
  provider: OAuthProviderType;
  providerId: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
}

const configureGoogleStrategy = (): void => {
  const googleConfig = appConfig.oauth.google;
  if (!googleConfig) {
    return;
  }

  const verifyCallback = (
    _accessToken: string,
    _refreshToken: string,
    profile: GoogleProfile,
    done: VerifyCallback,
  ): void => {
    const oauthProfile: OAuthProfile = {
      provider: OAuthProviderType.Google,
      providerId: profile.id,
      email: profile.emails?.[0]?.value ?? '',
      displayName: profile.displayName,
      avatarUrl: profile.photos?.[0]?.value,
    };
    done(null, oauthProfile as unknown as Express.User);
  };

  passport.use(
    new GoogleStrategy(
      {
        clientID: googleConfig.clientId,
        clientSecret: googleConfig.clientSecret,
        callbackURL: googleConfig.callbackUrl,
        scope: ['profile', 'email'],
      },
      verifyCallback,
    ),
  );
};

const configureGitHubStrategy = (): void => {
  const githubConfig = appConfig.oauth.github;
  if (!githubConfig) {
    return;
  }

  passport.use(
    new GitHubStrategy(
      {
        clientID: githubConfig.clientId,
        clientSecret: githubConfig.clientSecret,
        callbackURL: githubConfig.callbackUrl,
        scope: ['user:email'],
      },
      (
        _accessToken: string,
        _refreshToken: string,
        profile: GitHubProfile,
        done: (error: Error | null, user?: OAuthProfile) => void,
      ) => {
        const oauthProfile: OAuthProfile = {
          provider: OAuthProviderType.Github,
          providerId: profile.id,
          email: profile.emails?.[0]?.value ?? '',
          displayName: profile.displayName ?? profile.username ?? '',
          avatarUrl: profile.photos?.[0]?.value,
        };
        done(null, oauthProfile);
      },
    ),
  );
};

/**
 * Configures Passport.js OAuth strategies (Google, GitHub).
 * Call this before using passport authentication middleware.
 */
export const configurePassportStrategies = (): void => {
  configureGoogleStrategy();
  configureGitHubStrategy();
};

export const toOAuthProvider = (profile: OAuthProfile): OAuthProvider => ({
  provider: profile.provider,
  providerId: profile.providerId,
  email: profile.email,
  displayName: profile.displayName,
  avatarUrl: profile.avatarUrl,
});
