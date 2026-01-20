import { winstonLogger } from '@authentication/backend-utils';
import jwt from 'jsonwebtoken';

import { appConfig } from '../../config/app.config';
import type { LoginRequest } from '../dtos/requests/login.request.dto';
import type { ReactivateAccountRequest } from '../dtos/requests/reactivate-account.request.dto';
import type { RegisterRequest } from '../dtos/requests/register.request.dto';
import type { AuthResponse, RegisterResponse } from '../dtos/responses/auth.response.dto';
import type { SessionResponse, SessionsListResponse } from '../dtos/responses/session.response.dto';
import type { TokenResponse } from '../dtos/responses/token.response.dto';
import type { User } from '../entities/user.entity';
import { AccountLockedError } from '../errors/account-locked.error';
import { AccountPendingDeletionError } from '../errors/account-pending-deletion.error';
import { DuplicateEmailError } from '../errors/duplicate-email.error';
import { EmailNotVerifiedError } from '../errors/email-not-verified.error';
import { InvalidCredentialsError } from '../errors/invalid-credentials.error';
import { PasswordAlreadySetError } from '../errors/password-already-set.error';
import { TokenExpiredError } from '../errors/token-expired.error';
import { TokenInvalidError } from '../errors/token-invalid.error';
import { userToResponse } from '../mappers/user.mapper';
import { refreshTokenRepository } from '../repositories/refresh-token.repository';
import { userRepository } from '../repositories/user.repository';
import { hashPassword, verifyPassword } from '../utils/password.utils';
import { createTokenPair, hashToken, type TokenContext } from '../utils/token.utils';
import { emailService } from './email.service';
import { emailVerificationService } from './email-verification.service';

interface JwtPayload {
  sub: string;
  email: string;
  isAdmin: boolean;
  iat: number;
  exp: number;
}

const isAccountLocked = (user: User): boolean => {
  if (!user.lockoutUntil) {
    return false;
  }
  return user.lockoutUntil > new Date();
};

const shouldLockAccount = (failedAttempts: number): boolean => {
  return failedAttempts >= appConfig.security.maxFailedLoginAttempts;
};

const calculateLockoutUntil = (): Date => {
  const lockoutMs = appConfig.security.lockoutDurationMinutes * 60 * 1000;
  return new Date(Date.now() + lockoutMs);
};

const register = async (dto: RegisterRequest, context: TokenContext): Promise<RegisterResponse> => {
  const existingUser = await userRepository.findUserByEmail(dto.email);
  if (existingUser) {
    throw new DuplicateEmailError(dto.email);
  }

  const passwordHash = await hashPassword(dto.password);
  const verificationDeadline = emailVerificationService.calculateVerificationDeadline();

  const user = await userRepository.createUser({
    email: dto.email.toLowerCase(),
    passwordHash,
    displayName: dto.displayName,
    firstName: dto.firstName,
    lastName: dto.lastName,
    isEmailVerified: false,
    verificationDeadline,
    isActive: true,
    oauthProviders: [],
    passkeys: [],
    failedLoginAttempts: 0,
  });

  // Send verification email (non-blocking - don't fail registration if email fails)
  let verificationUrl: string | null = null;
  try {
    const result = await emailVerificationService.sendVerificationEmail(
      user,
      dto.verificationCallbackUrl,
    );
    verificationUrl = result.verificationUrl;
  } catch (error) {
    winstonLogger.error('Failed to send verification email', { error });
  }

  const { accessToken, refreshToken } = await createTokenPair(user, context);

  return {
    user: userToResponse(user),
    accessToken,
    refreshToken,
    expiresIn: appConfig.jwt.accessTokenExpiresIn,
    verificationUrl,
  };
};

const isAccountPendingDeletion = (user: User): boolean => {
  return !user.isActive && !!user.deletionDeadline && user.deletionDeadline > new Date();
};

const login = async (dto: LoginRequest, context: TokenContext): Promise<AuthResponse> => {
  const user = await userRepository.findUserByEmail(dto.email);

  if (!user?.passwordHash) {
    throw new InvalidCredentialsError();
  }

  if (isAccountPendingDeletion(user) && user.deletionDeadline) {
    throw new AccountPendingDeletionError(user.deletionDeadline);
  }

  if (isAccountLocked(user) && user.lockoutUntil) {
    throw new AccountLockedError(user.lockoutUntil);
  }

  const isPasswordValid = await verifyPassword(dto.password, user.passwordHash);

  if (!isPasswordValid) {
    const updatedUser = await userRepository.incrementFailedLoginAttempts(user.id);

    if (shouldLockAccount(updatedUser.failedLoginAttempts)) {
      const lockoutUntil = calculateLockoutUntil();
      await userRepository.setLockout(user.id, lockoutUntil);
      throw new AccountLockedError(lockoutUntil);
    }

    throw new InvalidCredentialsError();
  }

  // Check email verification after password is validated
  if (!user.isEmailVerified) {
    throw new EmailNotVerifiedError(user.email);
  }

  await userRepository.resetFailedLoginAttempts(user.id);
  const updatedUser = await userRepository.updateLastLogin(user.id);

  const { accessToken, refreshToken } = await createTokenPair(updatedUser, context);

  return {
    user: userToResponse(updatedUser),
    accessToken,
    refreshToken,
    expiresIn: appConfig.jwt.accessTokenExpiresIn,
  };
};

const refreshTokens = async (
  rawRefreshToken: string,
  context: TokenContext,
): Promise<TokenResponse> => {
  const tokenHash = hashToken(rawRefreshToken);
  const storedToken = await refreshTokenRepository.findRefreshTokenByHash(tokenHash);

  if (!storedToken) {
    throw new TokenInvalidError();
  }

  if (storedToken.isRevoked) {
    await refreshTokenRepository.revokeRefreshTokensByFamily(storedToken.family);
    throw new TokenInvalidError('Token has been revoked');
  }

  if (storedToken.isUsed) {
    await refreshTokenRepository.revokeRefreshTokensByFamily(storedToken.family);
    throw new TokenInvalidError('Token reuse detected');
  }

  if (storedToken.expiresAt < new Date()) {
    throw new TokenExpiredError();
  }

  await refreshTokenRepository.markRefreshTokenAsUsed(tokenHash);

  const user = await userRepository.findUserById(storedToken.userId);
  if (!user?.isActive) {
    throw new TokenInvalidError('User not found or inactive');
  }

  const { accessToken, refreshToken } = await createTokenPair(user, context, storedToken.family);

  return {
    accessToken,
    refreshToken,
    expiresIn: appConfig.jwt.accessTokenExpiresIn,
  };
};

const logout = async (rawRefreshToken: string): Promise<void> => {
  const tokenHash = hashToken(rawRefreshToken);
  const storedToken = await refreshTokenRepository.findRefreshTokenByHash(tokenHash);

  if (storedToken) {
    await refreshTokenRepository.revokeRefreshTokensByFamily(storedToken.family);
  }
};

const logoutAllDevices = async (userId: string): Promise<number> => {
  return refreshTokenRepository.revokeAllRefreshTokensByUserId(userId);
};

const reactivateAccount = async (
  dto: ReactivateAccountRequest,
  context: TokenContext,
): Promise<AuthResponse> => {
  const user = await userRepository.findUserByEmail(dto.email);

  if (!user?.passwordHash) {
    throw new InvalidCredentialsError();
  }

  // Verify password before reactivating
  const isPasswordValid = await verifyPassword(dto.password, user.passwordHash);
  if (!isPasswordValid) {
    throw new InvalidCredentialsError();
  }

  // Check if account is actually pending deletion
  if (!isAccountPendingDeletion(user)) {
    throw new InvalidCredentialsError();
  }

  // Reactivate the account
  const reactivatedUser = await userRepository.updateUser(user.id, {
    isActive: true,
    inactiveAt: undefined,
    deletionDeadline: undefined,
  });

  await userRepository.resetFailedLoginAttempts(reactivatedUser.id);
  const updatedUser = await userRepository.updateLastLogin(reactivatedUser.id);

  const { accessToken, refreshToken } = await createTokenPair(updatedUser, context);

  return {
    user: userToResponse(updatedUser),
    accessToken,
    refreshToken,
    expiresIn: appConfig.jwt.accessTokenExpiresIn,
  };
};

const loginWithPasskey = async (user: User, context: TokenContext): Promise<AuthResponse> => {
  // Check if account is locked
  if (user.lockoutUntil && user.lockoutUntil > new Date()) {
    throw new AccountLockedError(user.lockoutUntil);
  }

  // Check if account is pending deletion
  if (!user.isActive && user.deletionDeadline) {
    throw new AccountPendingDeletionError(user.deletionDeadline);
  }

  // Reset failed attempts and update last login
  if (user.failedLoginAttempts > 0) {
    await userRepository.resetFailedLoginAttempts(user.id);
  }
  await userRepository.updateLastLogin(user.id);

  const { accessToken, refreshToken } = await createTokenPair(user, context);

  return {
    user: userToResponse(user),
    accessToken,
    refreshToken,
    expiresIn: appConfig.jwt.accessTokenExpiresIn,
  };
};

const setPassword = async (userId: string, password: string): Promise<User> => {
  const user = await userRepository.getUserById(userId);

  // Check if user already has a password
  if (user.passwordHash) {
    throw new PasswordAlreadySetError();
  }

  const passwordHash = await hashPassword(password);

  return userRepository.updateUser(userId, { passwordHash });
};

const changePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<User> => {
  const user = await userRepository.getUserById(userId);

  // User must have a password to change it
  if (!user.passwordHash) {
    throw new InvalidCredentialsError();
  }

  // Verify current password
  const isCurrentPasswordValid = await verifyPassword(currentPassword, user.passwordHash);
  if (!isCurrentPasswordValid) {
    throw new InvalidCredentialsError();
  }

  const passwordHash = await hashPassword(newPassword);
  const updatedUser = await userRepository.updateUser(userId, { passwordHash });

  // Send security notification (non-blocking)
  emailService.sendPasswordChangedNotification(user.email).catch((error) => {
    winstonLogger.error('Failed to send password changed notification', { error, userId });
  });

  return updatedUser;
};

type TokenIntrospectionResult = {
  active: boolean;
  sub?: string;
  email?: string;
  isAdmin?: boolean;
  exp?: number;
  iat?: number;
};

const introspectToken = (token: string): TokenIntrospectionResult => {
  try {
    const payload = jwt.verify(token, appConfig.jwt.secret) as JwtPayload & { iat?: number };

    return {
      active: true,
      sub: payload.sub,
      email: payload.email,
      isAdmin: payload.isAdmin,
      exp: payload.exp,
      iat: payload.iat,
    };
  } catch {
    return { active: false };
  }
};

const getActiveSessions = async (
  userId: string,
  currentRefreshToken?: string,
): Promise<SessionsListResponse> => {
  const tokens = await refreshTokenRepository.findRefreshTokensByUserId(userId);
  const currentTokenHash = currentRefreshToken ? hashToken(currentRefreshToken) : null;

  // Filter only active (not expired, not used) sessions
  const activeSessions = tokens.filter((token) => !token.isUsed && token.expiresAt > new Date());

  const sessions: SessionResponse[] = activeSessions.map((token) => ({
    id: token.id,
    deviceFingerprint: token.deviceFingerprint,
    userAgent: token.userAgent,
    ipAddress: token.ipAddress,
    createdAt: token.createdAt,
    expiresAt: token.expiresAt,
    isCurrent: currentTokenHash === token.tokenHash,
  }));

  return {
    sessions,
    total: sessions.length,
  };
};

const revokeSession = async (userId: string, sessionId: string): Promise<void> => {
  const tokens = await refreshTokenRepository.findRefreshTokensByUserId(userId);
  const session = tokens.find((token) => token.id === sessionId);

  if (!session) {
    throw new TokenInvalidError('Session not found');
  }

  // Revoke the entire token family to invalidate all related tokens
  await refreshTokenRepository.revokeRefreshTokensByFamily(session.family);
};

export const authService = {
  register,
  login,
  loginWithPasskey,
  refreshTokens,
  logout,
  logoutAllDevices,
  setPassword,
  changePassword,
  reactivateAccount,
  introspectToken,
  getActiveSessions,
  revokeSession,
};
