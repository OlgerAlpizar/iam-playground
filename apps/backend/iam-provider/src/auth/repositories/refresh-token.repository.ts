import type { RefreshToken } from '../entities/refresh-token.entity';
import { refreshTokenFromDocument, refreshTokenToDocument } from '../mappers/refresh-token.mapper';
import { RefreshTokenModel } from '../models/refresh-token.model';

const createRefreshToken = async (data: Partial<RefreshToken>): Promise<RefreshToken> => {
  const doc = await RefreshTokenModel.create(refreshTokenToDocument(data));
  return refreshTokenFromDocument(doc);
};

const findRefreshTokenByHash = async (tokenHash: string): Promise<RefreshToken | null> => {
  const doc = await RefreshTokenModel.findOne({ tokenHash });
  return doc ? refreshTokenFromDocument(doc) : null;
};

const findRefreshTokensByUserId = async (userId: string): Promise<RefreshToken[]> => {
  const docs = await RefreshTokenModel.find({ userId, isRevoked: false });
  return docs.map(refreshTokenFromDocument);
};

const markRefreshTokenAsUsed = async (tokenHash: string): Promise<RefreshToken | null> => {
  const doc = await RefreshTokenModel.findOneAndUpdate(
    { tokenHash },
    { isUsed: true },
    { new: true },
  );
  return doc ? refreshTokenFromDocument(doc) : null;
};

const revokeRefreshTokensByFamily = async (family: string): Promise<number> => {
  const result = await RefreshTokenModel.updateMany({ family }, { isRevoked: true });
  return result.modifiedCount;
};

const revokeAllRefreshTokensByUserId = async (userId: string): Promise<number> => {
  const result = await RefreshTokenModel.updateMany({ userId }, { isRevoked: true });
  return result.modifiedCount;
};

const countActiveRefreshTokensByUserId = async (userId: string): Promise<number> => {
  return RefreshTokenModel.countDocuments({
    userId,
    isRevoked: false,
    isUsed: false,
    expiresAt: { $gt: new Date() },
  });
};

export const refreshTokenRepository = {
  createRefreshToken,
  findRefreshTokenByHash,
  findRefreshTokensByUserId,
  markRefreshTokenAsUsed,
  revokeRefreshTokensByFamily,
  revokeAllRefreshTokensByUserId,
  countActiveRefreshTokensByUserId,
};
