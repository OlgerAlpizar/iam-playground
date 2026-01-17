import { escapeRegex } from '@authentication/backend-utils';
import type { PipelineStage } from 'mongoose';

import type { SearchUsersRequest } from '../dtos/requests/search-users.request.dto';
import type { SearchUsersResponse } from '../dtos/responses/search-users.response.dto';
import type { OAuthProvider } from '../entities/oauth-provider.entity';
import type { PasskeyCredential } from '../entities/passkey-credential.entity';
import { SortOrder } from '../entities/sort-order.entity';
import type { User } from '../entities/user.entity';
import { userFromDocument, userToDocument, userToResponse } from '../mappers/user.mapper';
import type { UserDocument } from '../models/user.model';
import { UserModel } from '../models/user.model';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const MIN_SEARCH_LENGTH = 2;

export const findUserById = async (id: string): Promise<User | null> => {
  const doc = await UserModel.findById(id);
  return doc ? userFromDocument(doc) : null;
};

export const findUserByEmail = async (email: string): Promise<User | null> => {
  const doc = await UserModel.findOne({ email: email.toLowerCase() });
  return doc ? userFromDocument(doc) : null;
};

export const findUserByOAuthProvider = async (
  provider: string,
  providerId: string,
): Promise<User | null> => {
  const doc = await UserModel.findOne({
    'oauthProviders.provider': provider,
    'oauthProviders.providerId': providerId,
  });
  return doc ? userFromDocument(doc) : null;
};

export const findUserByPasskeyCredentialId = async (credentialId: string): Promise<User | null> => {
  const doc = await UserModel.findOne({
    'passkeys.credentialId': credentialId,
  });
  return doc ? userFromDocument(doc) : null;
};

export const findUsers = async (params: SearchUsersRequest = {}): Promise<SearchUsersResponse> => {
  const requestedLimit = params.limit ?? DEFAULT_LIMIT;
  const limit = Math.min(Math.max(1, requestedLimit), MAX_LIMIT);
  const skip = Math.max(0, params.skip ?? 0);
  const { sortBy = 'createdAt', sortOrder = SortOrder.Desc } = params;

  const matchConditions: Record<string, unknown>[] = [];

  if (params.search && params.search.length >= MIN_SEARCH_LENGTH) {
    matchConditions.push({ $text: { $search: params.search } });
  } else if (params.search) {
    const safeSearch = escapeRegex(params.search);
    const searchRegex = { $regex: safeSearch, $options: 'i' };
    matchConditions.push({
      $or: [
        { email: searchRegex },
        { displayName: searchRegex },
        { firstName: searchRegex },
        { lastName: searchRegex },
      ],
    });
  }

  if (params.email) {
    const safeEmail = escapeRegex(params.email);
    matchConditions.push({ email: { $regex: safeEmail, $options: 'i' } });
  }

  if (params.isEmailVerified !== undefined) {
    matchConditions.push({ isEmailVerified: params.isEmailVerified });
  }

  if (params.isActive !== undefined) {
    matchConditions.push({ isActive: params.isActive });
  }

  if (params.oauthProvider) {
    matchConditions.push({ 'oauthProviders.provider': params.oauthProvider });
  }

  if (params.hasPasskeys !== undefined) {
    matchConditions.push(
      params.hasPasskeys
        ? { passkeys: { $exists: true, $not: { $size: 0 } } }
        : { $or: [{ passkeys: { $exists: false } }, { passkeys: { $size: 0 } }] },
    );
  }

  if (params.hasFailedAttempts !== undefined) {
    matchConditions.push(
      params.hasFailedAttempts
        ? { failedLoginAttempts: { $gt: 0 } }
        : { failedLoginAttempts: { $eq: 0 } },
    );
  }

  if (params.createdSince) {
    matchConditions.push({ createdAt: { $gte: params.createdSince } });
  }

  if (params.updatedUntil) {
    matchConditions.push({ updatedAt: { $lte: params.updatedUntil } });
  }

  const pipeline: PipelineStage[] = [];

  if (matchConditions.length > 0) {
    pipeline.push({ $match: { $and: matchConditions } });
  }

  const useTextScore = params.search && params.search.length >= MIN_SEARCH_LENGTH;
  const sortField = sortBy === 'id' ? '_id' : sortBy;
  const sortDirection = sortOrder === SortOrder.Asc ? 1 : -1;

  pipeline.push({
    $facet: {
      data: [
        useTextScore
          ? { $sort: { score: { $meta: 'textScore' }, [sortField]: sortDirection } }
          : { $sort: { [sortField]: sortDirection } },
        { $skip: skip },
        { $limit: limit },
      ],
      metadata: [{ $count: 'total' }],
    },
  });

  interface AggregateResult {
    data: UserDocument[];
    metadata: Array<{ total: number }>;
  }

  const [result] = await UserModel.aggregate<AggregateResult>(pipeline);

  const users = result.data.map(userFromDocument).map(userToResponse);
  const total = result.metadata[0]?.total ?? 0;

  return {
    users,
    total,
    limit,
    skip,
    hasMore: skip + users.length < total,
  };
};

export const createUser = async (data: Partial<User>): Promise<User> => {
  const document = userToDocument(data);
  const doc = await UserModel.create(document);
  return userFromDocument(doc);
};

export const updateUser = async (id: string, data: Partial<User>): Promise<User | null> => {
  const document = userToDocument(data);
  const doc = await UserModel.findByIdAndUpdate(id, document, {
    new: true,
    runValidators: true,
  });
  return doc ? userFromDocument(doc) : null;
};

export const deleteUser = async (id: string): Promise<boolean> => {
  const result = await UserModel.findByIdAndDelete(id);
  return result !== null;
};

export const addOAuthProvider = async (
  userId: string,
  provider: OAuthProvider,
): Promise<User | null> => {
  const doc = await UserModel.findByIdAndUpdate(
    userId,
    { $push: { oauthProviders: provider } },
    { new: true, runValidators: true },
  );
  return doc ? userFromDocument(doc) : null;
};

export const removeOAuthProvider = async (
  userId: string,
  provider: string,
  providerId: string,
): Promise<User | null> => {
  const doc = await UserModel.findByIdAndUpdate(
    userId,
    { $pull: { oauthProviders: { provider, providerId } } },
    { new: true },
  );
  return doc ? userFromDocument(doc) : null;
};

export const addPasskey = async (
  userId: string,
  passkey: PasskeyCredential,
): Promise<User | null> => {
  const doc = await UserModel.findByIdAndUpdate(
    userId,
    { $push: { passkeys: passkey } },
    { new: true, runValidators: true },
  );
  return doc ? userFromDocument(doc) : null;
};

export const updatePasskeyCounter = async (
  userId: string,
  credentialId: string,
  counter: number,
): Promise<User | null> => {
  const doc = await UserModel.findOneAndUpdate(
    { _id: userId, 'passkeys.credentialId': credentialId },
    {
      $set: {
        'passkeys.$.counter': counter,
        'passkeys.$.lastUsedAt': new Date(),
      },
    },
    { new: true },
  );
  return doc ? userFromDocument(doc) : null;
};

export const removePasskey = async (userId: string, credentialId: string): Promise<User | null> => {
  const doc = await UserModel.findByIdAndUpdate(
    userId,
    { $pull: { passkeys: { credentialId } } },
    { new: true },
  );
  return doc ? userFromDocument(doc) : null;
};

export const incrementFailedLoginAttempts = async (userId: string): Promise<User | null> => {
  const doc = await UserModel.findByIdAndUpdate(
    userId,
    { $inc: { failedLoginAttempts: 1 } },
    { new: true },
  );
  return doc ? userFromDocument(doc) : null;
};

export const resetFailedLoginAttempts = async (userId: string): Promise<User | null> => {
  const doc = await UserModel.findByIdAndUpdate(
    userId,
    { failedLoginAttempts: 0, lockoutUntil: null },
    { new: true },
  );
  return doc ? userFromDocument(doc) : null;
};

export const setLockout = async (userId: string, until: Date): Promise<User | null> => {
  const doc = await UserModel.findByIdAndUpdate(userId, { lockoutUntil: until }, { new: true });
  return doc ? userFromDocument(doc) : null;
};

export const updateLastLogin = async (userId: string): Promise<User | null> => {
  const doc = await UserModel.findByIdAndUpdate(userId, { lastLoginAt: new Date() }, { new: true });
  return doc ? userFromDocument(doc) : null;
};
