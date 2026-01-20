import { generateDeviceFingerprint } from '@authentication/backend-express/utils';
import crypto from 'crypto';
import type { Request } from 'express';
import jwt from 'jsonwebtoken';

import { appConfig } from '../../config/app.config';
import type { RefreshToken } from '../entities/refresh-token.entity';
import type { User } from '../entities/user.entity';
import { refreshTokenRepository } from '../repositories/refresh-token.repository';

export interface TokenContext {
  deviceFingerprint?: string;
  userAgent?: string;
  ipAddress?: string;
}

export const getTokenContext = (req: Request): TokenContext => ({
  deviceFingerprint: generateDeviceFingerprint(req),
  userAgent: req.headers['user-agent'],
  ipAddress: req.ip,
});

export const generateAccessToken = (user: User): string => {
  const payload = {
    sub: user.id,
    email: user.email,
    isAdmin: user.isAdmin,
  };

  return jwt.sign(payload, appConfig.jwt.secret, {
    expiresIn: appConfig.jwt.accessTokenExpiresIn,
  });
};

export const generateRefreshToken = (): string => {
  return crypto.randomBytes(64).toString('hex');
};

export const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

export const createTokenPair = async (
  user: User,
  context: TokenContext,
  family?: string,
): Promise<{ accessToken: string; refreshToken: string; refreshTokenEntity: RefreshToken }> => {
  // Enforce session limit: revoke existing sessions if limit exceeded
  if (!family) {
    const activeCount = await refreshTokenRepository.countActiveRefreshTokensByUserId(user.id);
    if (activeCount >= appConfig.session.maxActiveSessions) {
      await refreshTokenRepository.revokeAllRefreshTokensByUserId(user.id);
    }
  }

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
