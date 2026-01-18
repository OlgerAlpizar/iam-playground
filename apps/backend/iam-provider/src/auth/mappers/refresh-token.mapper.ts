import type { Types } from 'mongoose';

import type { RefreshToken } from '../entities/refresh-token.entity';
import type { RefreshTokenDocument } from '../models/refresh-token.model';

export const refreshTokenFromDocument = (doc: RefreshTokenDocument): RefreshToken => {
  return {
    id: (doc._id as Types.ObjectId).toString(),
    userId: doc.userId.toString(),
    tokenHash: doc.tokenHash,
    deviceFingerprint: doc.deviceFingerprint,
    userAgent: doc.userAgent,
    ipAddress: doc.ipAddress,
    family: doc.family,
    isUsed: doc.isUsed,
    isRevoked: doc.isRevoked,
    expiresAt: doc.expiresAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
};

export const refreshTokenToDocument = (
  entity: Partial<RefreshToken>,
): Partial<RefreshTokenDocument> => {
  return {
    ...(entity.userId !== undefined && { userId: entity.userId }),
    ...(entity.tokenHash !== undefined && { tokenHash: entity.tokenHash }),
    ...(entity.deviceFingerprint !== undefined && { deviceFingerprint: entity.deviceFingerprint }),
    ...(entity.userAgent !== undefined && { userAgent: entity.userAgent }),
    ...(entity.ipAddress !== undefined && { ipAddress: entity.ipAddress }),
    ...(entity.family !== undefined && { family: entity.family }),
    ...(entity.isUsed !== undefined && { isUsed: entity.isUsed }),
    ...(entity.isRevoked !== undefined && { isRevoked: entity.isRevoked }),
    ...(entity.expiresAt !== undefined && { expiresAt: entity.expiresAt }),
  } as Partial<RefreshTokenDocument>;
};
