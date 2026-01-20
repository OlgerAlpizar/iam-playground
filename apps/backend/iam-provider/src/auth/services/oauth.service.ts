import { appConfig } from '../../config/app.config';
import type { OAuthProfile } from '../../config/passport.config';
import { toOAuthProvider } from '../../config/passport.config';
import type { AuthResponse } from '../dtos/responses/auth.response.dto';
import type { User } from '../entities/user.entity';
import { CannotUnlinkOnlyAuthMethodError } from '../errors/cannot-unlink-only-auth-method.error';
import { OAuthAlreadyLinkedError } from '../errors/oauth-already-linked.error';
import { userToResponse } from '../mappers/user.mapper';
import { userRepository } from '../repositories/user.repository';
import { createTokenPair, type TokenContext } from '../utils/token.utils';

const authenticateWithOAuth = async (
  profile: OAuthProfile,
  context: TokenContext,
): Promise<AuthResponse> => {
  // 1. Try to find user by OAuth provider
  let user = await userRepository.findUserByOAuthProvider(profile.provider, profile.providerId);

  if (user) {
    // User already linked with this OAuth provider - just login
    const updatedUser = await userRepository.updateLastLogin(user.id);
    const { accessToken, refreshToken } = await createTokenPair(updatedUser, context);

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

      const { accessToken, refreshToken } = await createTokenPair(updatedUser, context);

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

  const { accessToken, refreshToken } = await createTokenPair(newUser, context);

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
    throw new OAuthAlreadyLinkedError();
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
    throw new CannotUnlinkOnlyAuthMethodError();
  }

  return userRepository.removeOAuthProvider(userId, provider, providerId);
};

export const oauthService = {
  authenticateWithOAuth,
  linkOAuthProvider,
  unlinkOAuthProvider,
};
