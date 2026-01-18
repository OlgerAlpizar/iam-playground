import { escapeRegex } from '@authentication/backend-utils';
import type { FilterQuery, PipelineStage } from 'mongoose';

import type { SearchUsersRequest } from '../dtos/requests/search-users.request.dto';
import type { FindUsersResult } from '../entities/find-users-result.entity';
import type { OAuthProvider } from '../entities/oauth-provider.entity';
import type { PasskeyCredential } from '../entities/passkey-credential.entity';
import { SortOrder } from '../entities/sort-order.entity';
import type { User } from '../entities/user.entity';
import { UserSortField } from '../entities/user-sort-field.entity';
import { DuplicateEmailError } from '../errors/duplicate-email.error';
import { UserNotFoundError } from '../errors/user-not-found.error';
import { userFromDocument, userToDocument } from '../mappers/user.mapper';
import type { UserDocument } from '../models/user.model';
import { UserModel } from '../models/user.model';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const MIN_SEARCH_LENGTH = 2;

const MONGO_ID_FIELD = '_id';
const MONGO_TEXT_SCORE = 'textScore';
const FACET_DATA = 'data';
const FACET_METADATA = 'metadata';
const FACET_TOTAL = 'total';
const SCORE_FIELD = 'score';

const OAUTH_PROVIDER_PATH = 'oauthProviders.provider';
const OAUTH_PROVIDER_ID_PATH = 'oauthProviders.providerId';
const PASSKEY_CREDENTIAL_ID_PATH = 'passkeys.credentialId';
const PASSKEY_COUNTER_PATH = 'passkeys.$.counter';
const PASSKEY_LAST_USED_PATH = 'passkeys.$.lastUsedAt';

interface FindUsersAggregateResult {
  data: UserDocument[];
  metadata: Array<{ total: number }>;
}

const toFindUsersResult = (
  aggregateResult: FindUsersAggregateResult,
  limit: number,
  skip: number,
): FindUsersResult => {
  const users = aggregateResult.data.map(userFromDocument);
  const total = aggregateResult.metadata[0]?.total ?? 0;

  return {
    users,
    total,
    limit,
    skip,
    hasMore: skip + users.length < total,
  };
};

const findUsers = async (params: SearchUsersRequest = {}): Promise<FindUsersResult> => {
  const requestedLimit = params.limit ?? DEFAULT_LIMIT;
  const limit = Math.min(Math.max(1, requestedLimit), MAX_LIMIT);
  const skip = Math.max(0, params.skip ?? 0);
  const { sortBy = UserSortField.CreatedAt, sortOrder = SortOrder.Desc } = params;

  const matchConditions: FilterQuery<UserDocument>[] = [];
  const pipeline: PipelineStage[] = [];

  if (params.search && params.search.length >= MIN_SEARCH_LENGTH) {
    matchConditions.push({ $text: { $search: params.search } });
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
    matchConditions.push({ [OAUTH_PROVIDER_PATH]: params.oauthProvider });
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

  if (matchConditions.length > 0) {
    pipeline.push({ $match: { $and: matchConditions } });
  }

  const useTextScore = params.search && params.search.length >= MIN_SEARCH_LENGTH;
  const sortField = sortBy === UserSortField.Id ? MONGO_ID_FIELD : sortBy;
  const sortDirection = sortOrder === SortOrder.Asc ? 1 : -1;

  pipeline.push({
    $facet: {
      [FACET_DATA]: [
        useTextScore
          ? { $sort: { [SCORE_FIELD]: { $meta: MONGO_TEXT_SCORE }, [sortField]: sortDirection } }
          : { $sort: { [sortField]: sortDirection } },
        { $skip: skip },
        { $limit: limit },
      ],
      [FACET_METADATA]: [{ $count: FACET_TOTAL }],
    },
  });

  const [result] = await UserModel.aggregate<FindUsersAggregateResult>(pipeline);

  return toFindUsersResult(result, limit, skip);
};

const findUserById = async (id: string): Promise<User | null> => {
  const doc = await UserModel.findById(id);
  return doc ? userFromDocument(doc) : null;
};

const getUserById = async (id: string): Promise<User> => {
  const user = await findUserById(id);
  if (!user) {
    throw new UserNotFoundError(id);
  }
  return user;
};

const findUserByEmail = async (email: string): Promise<User | null> => {
  const doc = await UserModel.findOne({ email: email.toLowerCase() });
  return doc ? userFromDocument(doc) : null;
};

const getUserByEmail = async (email: string): Promise<User> => {
  const user = await findUserByEmail(email);
  if (!user) {
    throw new UserNotFoundError(email);
  }
  return user;
};

const findUserByOAuthProvider = async (
  provider: string,
  providerId: string,
): Promise<User | null> => {
  const doc = await UserModel.findOne({
    [OAUTH_PROVIDER_PATH]: provider,
    [OAUTH_PROVIDER_ID_PATH]: providerId,
  });
  return doc ? userFromDocument(doc) : null;
};

const findUserByPasskeyCredentialId = async (credentialId: string): Promise<User | null> => {
  const doc = await UserModel.findOne({
    [PASSKEY_CREDENTIAL_ID_PATH]: credentialId,
  });
  return doc ? userFromDocument(doc) : null;
};

const createUser = async (data: Partial<User>): Promise<User> => {
  if (!data.email) {
    throw new Error('Email is required to create a user');
  }

  try {
    const document = userToDocument(data);
    const doc = await UserModel.create(document);
    return userFromDocument(doc);
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      throw new DuplicateEmailError(data.email);
    }
    throw error;
  }
};

const updateUser = async (id: string, data: Partial<User>): Promise<User> => {
  const document = userToDocument(data);
  const doc = await UserModel.findByIdAndUpdate(id, document, {
    new: true,
    runValidators: true,
  });
  if (!doc) {
    throw new UserNotFoundError(id);
  }
  return userFromDocument(doc);
};

const deleteUser = async (id: string): Promise<void> => {
  const result = await UserModel.findByIdAndDelete(id);
  if (!result) {
    throw new UserNotFoundError(id);
  }
};

const addOAuthProvider = async (userId: string, provider: OAuthProvider): Promise<User> => {
  const doc = await UserModel.findByIdAndUpdate(
    userId,
    { $push: { oauthProviders: provider } },
    { new: true, runValidators: true },
  );
  if (!doc) {
    throw new UserNotFoundError(userId);
  }
  return userFromDocument(doc);
};

const removeOAuthProvider = async (
  userId: string,
  provider: string,
  providerId: string,
): Promise<User> => {
  const doc = await UserModel.findByIdAndUpdate(
    userId,
    { $pull: { oauthProviders: { provider, providerId } } },
    { new: true },
  );
  if (!doc) {
    throw new UserNotFoundError(userId);
  }
  return userFromDocument(doc);
};

const addPasskey = async (userId: string, passkey: PasskeyCredential): Promise<User> => {
  const doc = await UserModel.findByIdAndUpdate(
    userId,
    { $push: { passkeys: passkey } },
    { new: true, runValidators: true },
  );
  if (!doc) {
    throw new UserNotFoundError(userId);
  }
  return userFromDocument(doc);
};

const updatePasskeyCounter = async (
  userId: string,
  credentialId: string,
  counter: number,
): Promise<User> => {
  const doc = await UserModel.findOneAndUpdate(
    { _id: userId, [PASSKEY_CREDENTIAL_ID_PATH]: credentialId },
    {
      $set: {
        [PASSKEY_COUNTER_PATH]: counter,
        [PASSKEY_LAST_USED_PATH]: new Date(),
      },
    },
    { new: true },
  );
  if (!doc) {
    throw new UserNotFoundError(userId);
  }
  return userFromDocument(doc);
};

const removePasskey = async (userId: string, credentialId: string): Promise<User> => {
  const doc = await UserModel.findByIdAndUpdate(
    userId,
    { $pull: { passkeys: { credentialId } } },
    { new: true },
  );
  if (!doc) {
    throw new UserNotFoundError(userId);
  }
  return userFromDocument(doc);
};

const incrementFailedLoginAttempts = async (userId: string): Promise<User> => {
  const doc = await UserModel.findByIdAndUpdate(
    userId,
    { $inc: { failedLoginAttempts: 1 } },
    { new: true },
  );
  if (!doc) {
    throw new UserNotFoundError(userId);
  }
  return userFromDocument(doc);
};

const resetFailedLoginAttempts = async (userId: string): Promise<User> => {
  const doc = await UserModel.findByIdAndUpdate(
    userId,
    { failedLoginAttempts: 0, lockoutUntil: null },
    { new: true },
  );
  if (!doc) {
    throw new UserNotFoundError(userId);
  }
  return userFromDocument(doc);
};

const setLockout = async (userId: string, until: Date): Promise<User> => {
  const doc = await UserModel.findByIdAndUpdate(userId, { lockoutUntil: until }, { new: true });
  if (!doc) {
    throw new UserNotFoundError(userId);
  }
  return userFromDocument(doc);
};

const updateLastLogin = async (userId: string): Promise<User> => {
  const doc = await UserModel.findByIdAndUpdate(userId, { lastLoginAt: new Date() }, { new: true });
  if (!doc) {
    throw new UserNotFoundError(userId);
  }
  return userFromDocument(doc);
};

export const userRepository = {
  findUsers,
  findUserById,
  getUserById,
  findUserByEmail,
  getUserByEmail,
  findUserByOAuthProvider,
  findUserByPasskeyCredentialId,
  createUser,
  updateUser,
  deleteUser,
  addOAuthProvider,
  removeOAuthProvider,
  addPasskey,
  updatePasskeyCounter,
  removePasskey,
  incrementFailedLoginAttempts,
  resetFailedLoginAttempts,
  setLockout,
  updateLastLogin,
};
