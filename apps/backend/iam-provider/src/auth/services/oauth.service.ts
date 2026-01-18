import crypto from 'crypto';
import jwt from 'jsonwebtoken';

import { appConfig } from '../../config/app.config';
import type { OAuthProfile } from '../../config/passport.config';
import { toOAuthProvider } from '../../config/passport.config';
import type { AuthResponse } from '../dtos/responses/auth.response.dto';
import type { User } from '../entities/user.entity';
import { userToResponse } from '../mappers/user.mapper';
import { refreshTokenRepository } from '../repositories/refresh-token.repository';
import { userRepository } from '../repositories/user.repository';

interface TokenContext {
  deviceFingerprint?: string;
  userAgent?: string;
  ipAddress?: string;
}

const generateTokens = async (
  user: User,
  context: TokenContext,
): Promise<{ accessToken: string; refreshToken: string }> => {
  const accessToken = jwt.sign({ sub: user.id, email: user.email }, appConfig.jwt.secret, {
    expiresIn: appConfig.jwt.accessTokenExpiresIn,
  });

  const rawRefreshToken = crypto.randomBytes(64).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
  const tokenFamily = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + appConfig.jwt.refreshTokenExpiresIn * 1000);

  await refreshTokenRepository.createRefreshToken({
    userId: user.id,
    tokenHash,
    family: tokenFamily,
    deviceFingerprint: context.deviceFingerprint,
    userAgent: context.userAgent,
    ipAddress: context.ipAddress,
    expiresAt,
    isUsed: false,
    isRevoked: false,
  });

  return { accessToken, refreshToken: rawRefreshToken };
};

const authenticateWithOAuth = async (
  profile: OAuthProfile,
  context: TokenContext,
): Promise<AuthResponse> => {
  // 1. Try to find user by OAuth provider
  let user = await userRepository.findUserByOAuthProvider(profile.provider, profile.providerId);

  if (user) {
    // User already linked with this OAuth provider - just login
    const updatedUser = await userRepository.updateLastLogin(user.id);
    const { accessToken, refreshToken } = await generateTokens(updatedUser, context);

    return {
      user: userToResponse(updatedUser),
      accessToken,
      refreshToken,
      expiresIn: appConfig.jwt.accessTokenExpiresIn,
    };
  }

  // 2. Try to find user by email to link accounts
  if (profile.email) {
    user = await userRepository.findUserByEmail(profile.email);

    if (user) {
      // Link OAuth provider to existing user
      const oauthProvider = toOAuthProvider(profile);
      const updatedUser = await userRepository.addOAuthProvider(user.id, oauthProvider);
      await userRepository.updateLastLogin(updatedUser.id);

      const { accessToken, refreshToken } = await generateTokens(updatedUser, context);

      return {
        user: userToResponse(updatedUser),
        accessToken,
        refreshToken,
        expiresIn: appConfig.jwt.accessTokenExpiresIn,
      };
    }
  }

  // 3. Create new user with OAuth provider
  const oauthProvider = toOAuthProvider(profile);
  const newUser = await userRepository.createUser({
    email: profile.email.toLowerCase(),
    displayName: profile.displayName,
    avatarUrl: profile.avatarUrl,
    isEmailVerified: true, // OAuth emails are considered verified
    isActive: true,
    oauthProviders: [oauthProvider],
    passkeys: [],
    failedLoginAttempts: 0,
  });

  const { accessToken, refreshToken } = await generateTokens(newUser, context);

  return {
    user: userToResponse(newUser),
    accessToken,
    refreshToken,
    expiresIn: appConfig.jwt.accessTokenExpiresIn,
  };
};

const linkOAuthProvider = async (userId: string, profile: OAuthProfile): Promise<User> => {
  // Check if this OAuth provider is already linked to another user
  const existingUser = await userRepository.findUserByOAuthProvider(
    profile.provider,
    profile.providerId,
  );

  if (existingUser && existingUser.id !== userId) {
    throw new Error('This OAuth account is already linked to another user');
  }

  const oauthProvider = toOAuthProvider(profile);
  return userRepository.addOAuthProvider(userId, oauthProvider);
};

const unlinkOAuthProvider = async (
  userId: string,
  provider: string,
  providerId: string,
): Promise<User> => {
  const user = await userRepository.getUserById(userId);

  // Ensure user has another way to login (password or another OAuth provider)
  const hasPassword = !!user.passwordHash;
  const otherProviders = user.oauthProviders.filter(
    (p) => !(p.provider === provider && p.providerId === providerId),
  );

  if (!hasPassword && otherProviders.length === 0) {
    throw new Error('Cannot unlink the only authentication method');
  }

  return userRepository.removeOAuthProvider(userId, provider, providerId);
};

export const oauthService = {
  authenticateWithOAuth,
  linkOAuthProvider,
  unlinkOAuthProvider,
};
