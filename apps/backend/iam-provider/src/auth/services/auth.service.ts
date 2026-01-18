import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

import { appConfig } from '../../config/app.config';
import type { LoginRequest } from '../dtos/requests/login.request.dto';
import type { RegisterRequest } from '../dtos/requests/register.request.dto';
import type { AuthResponse } from '../dtos/responses/auth.response.dto';
import type { TokenResponse } from '../dtos/responses/token.response.dto';
import type { RefreshToken } from '../entities/refresh-token.entity';
import type { User } from '../entities/user.entity';
import { AccountLockedError } from '../errors/account-locked.error';
import { DuplicateEmailError } from '../errors/duplicate-email.error';
import { InvalidCredentialsError } from '../errors/invalid-credentials.error';
import { TokenExpiredError } from '../errors/token-expired.error';
import { TokenInvalidError } from '../errors/token-invalid.error';
import { userToResponse } from '../mappers/user.mapper';
import { refreshTokenRepository } from '../repositories/refresh-token.repository';
import { userRepository } from '../repositories/user.repository';

interface JwtPayload {
  sub: string;
  email: string;
  iat: number;
  exp: number;
}

interface TokenContext {
  deviceFingerprint?: string;
  userAgent?: string;
  ipAddress?: string;
}

const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, appConfig.security.bcryptRounds);
};

const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

const generateAccessToken = (user: User): string => {
  const payload = {
    sub: user.id,
    email: user.email,
  };

  return jwt.sign(payload, appConfig.jwt.secret, {
    expiresIn: appConfig.jwt.accessTokenExpiresIn,
  });
};

const generateRefreshToken = (): string => {
  return crypto.randomBytes(64).toString('hex');
};

const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

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

const createTokenPair = async (
  user: User,
  context: TokenContext,
  family?: string,
): Promise<{ accessToken: string; refreshToken: string; refreshTokenEntity: RefreshToken }> => {
  const accessToken = generateAccessToken(user);
  const rawRefreshToken = generateRefreshToken();
  const tokenHash = hashToken(rawRefreshToken);
  const tokenFamily = family ?? crypto.randomUUID();

  const expiresAt = new Date(Date.now() + appConfig.jwt.refreshTokenExpiresIn * 1000);

  const refreshTokenEntity = await refreshTokenRepository.createRefreshToken({
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

  return {
    accessToken,
    refreshToken: rawRefreshToken,
    refreshTokenEntity,
  };
};

const register = async (dto: RegisterRequest, context: TokenContext): Promise<AuthResponse> => {
  const existingUser = await userRepository.findUserByEmail(dto.email);
  if (existingUser) {
    throw new DuplicateEmailError(dto.email);
  }

  const passwordHash = await hashPassword(dto.password);

  const user = await userRepository.createUser({
    email: dto.email.toLowerCase(),
    passwordHash,
    displayName: dto.displayName,
    firstName: dto.firstName,
    lastName: dto.lastName,
    isEmailVerified: false,
    isActive: true,
    oauthProviders: [],
    passkeys: [],
    failedLoginAttempts: 0,
  });

  const { accessToken, refreshToken } = await createTokenPair(user, context);

  return {
    user: userToResponse(user),
    accessToken,
    refreshToken,
    expiresIn: appConfig.jwt.accessTokenExpiresIn,
  };
};

const login = async (dto: LoginRequest, context: TokenContext): Promise<AuthResponse> => {
  const user = await userRepository.findUserByEmail(dto.email);

  if (!user?.passwordHash) {
    throw new InvalidCredentialsError();
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

const verifyAccessToken = (token: string): JwtPayload => {
  try {
    return jwt.verify(token, appConfig.jwt.secret) as JwtPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new TokenExpiredError();
    }
    throw new TokenInvalidError();
  }
};

export const authService = {
  register,
  login,
  refreshTokens,
  logout,
  logoutAllDevices,
  verifyAccessToken,
  hashPassword,
};
