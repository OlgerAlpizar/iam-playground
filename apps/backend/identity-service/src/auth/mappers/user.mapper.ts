import type { Types } from 'mongoose';

import type { CreateUserRequest, UpdateUserRequest } from '../dtos';
import type { User } from '../entities';
import type { UserDocument } from '../models';

export const userFromDocument = (doc: UserDocument): User => {
  return {
    id: (doc._id as Types.ObjectId).toString(),
    email: doc.email,
    isEmailVerified: doc.isEmailVerified,
    displayName: doc.displayName,
    firstName: doc.firstName,
    lastName: doc.lastName,
    avatarUrl: doc.avatarUrl,
    isActive: doc.isActive,
    oauthProviders: doc.oauthProviders ?? [],
    passkeys: doc.passkeys ?? [],
    failedLoginAttempts: doc.failedLoginAttempts,
    lockoutUntil: doc.lockoutUntil,
    lastLoginAt: doc.lastLoginAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
};

export const userDocumentFromCreateRequest = (data: CreateUserRequest): Partial<UserDocument> => {
  return {
    email: data.email,
    passwordHash: data.passwordHash,
    displayName: data.displayName,
    firstName: data.firstName,
    lastName: data.lastName,
  };
};

export const userDocumentFromUpdateRequest = (data: UpdateUserRequest): Partial<UserDocument> => {
  return {
    ...(data.displayName !== undefined && { displayName: data.displayName }),
    ...(data.firstName !== undefined && { firstName: data.firstName }),
    ...(data.lastName !== undefined && { lastName: data.lastName }),
    ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
    ...(data.passwordHash !== undefined && { passwordHash: data.passwordHash }),
    ...(data.isEmailVerified !== undefined && { isEmailVerified: data.isEmailVerified }),
    ...(data.failedLoginAttempts !== undefined && {
      failedLoginAttempts: data.failedLoginAttempts,
    }),
    ...(data.lockoutUntil !== undefined && { lockoutUntil: data.lockoutUntil ?? undefined }),
    ...(data.lastLoginAt !== undefined && { lastLoginAt: data.lastLoginAt }),
    ...(data.isActive !== undefined && { isActive: data.isActive }),
  };
};
