import type { RefreshToken } from '../entities/refresh-token.entity';
import { refreshTokenFromDocument, refreshTokenToDocument } from '../mappers/refresh-token.mapper';
import { RefreshTokenModel } from '../models/refresh-token.model';

export const createRefreshToken = async (data: Partial<RefreshToken>): Promise<RefreshToken> => {
  const doc = await RefreshTokenModel.create(refreshTokenToDocument(data));
  return refreshTokenFromDocument(doc);
};

export const findRefreshTokenByHash = async (tokenHash: string): Promise<RefreshToken | null> => {
  const doc = await RefreshTokenModel.findOne({ tokenHash });
  return doc ? refreshTokenFromDocument(doc) : null;
};

export const findRefreshTokensByUserId = async (userId: string): Promise<RefreshToken[]> => {
  const docs = await RefreshTokenModel.find({ userId, isRevoked: false });
  return docs.map(refreshTokenFromDocument);
};

export const findRefreshTokensByFamily = async (family: string): Promise<RefreshToken[]> => {
  const docs = await RefreshTokenModel.find({ family });
  return docs.map(refreshTokenFromDocument);
};

export const markRefreshTokenAsUsed = async (tokenHash: string): Promise<RefreshToken | null> => {
  const doc = await RefreshTokenModel.findOneAndUpdate(
    { tokenHash },
    { isUsed: true },
    { new: true },
  );
  return doc ? refreshTokenFromDocument(doc) : null;
};

export const revokeRefreshToken = async (tokenHash: string): Promise<RefreshToken | null> => {
  const doc = await RefreshTokenModel.findOneAndUpdate(
    { tokenHash },
    { isRevoked: true },
    { new: true },
  );
  return doc ? refreshTokenFromDocument(doc) : null;
};

export const revokeRefreshTokensByFamily = async (family: string): Promise<number> => {
  const result = await RefreshTokenModel.updateMany({ family }, { isRevoked: true });
  return result.modifiedCount;
};

export const revokeAllRefreshTokensByUserId = async (userId: string): Promise<number> => {
  const result = await RefreshTokenModel.updateMany({ userId }, { isRevoked: true });
  return result.modifiedCount;
};

export const deleteRefreshTokensByUserId = async (userId: string): Promise<number> => {
  const result = await RefreshTokenModel.deleteMany({ userId });
  return result.deletedCount;
};

export const countActiveRefreshTokensByUserId = async (userId: string): Promise<number> => {
  return RefreshTokenModel.countDocuments({
    userId,
    isRevoked: false,
    isUsed: false,
    expiresAt: { $gt: new Date() },
  });
};
