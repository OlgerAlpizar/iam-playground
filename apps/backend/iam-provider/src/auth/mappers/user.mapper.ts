import type { Types } from 'mongoose';

import type { UpdateUserRequest } from '../dtos/requests/update-user.request.dto';
import type { UserResponse } from '../dtos/responses/user.response.dto';
import type { User } from '../entities/user.entity';
import type { UserDocument } from '../models/user.model';

export const userFromDocument = (doc: UserDocument): User => {
  return {
    id: (doc._id as Types.ObjectId).toString(),
    email: doc.email,
    passwordHash: doc.passwordHash,
    isAdmin: doc.isAdmin,
    isEmailVerified: doc.isEmailVerified,
    verificationDeadline: doc.verificationDeadline,
    displayName: doc.displayName,
    firstName: doc.firstName,
    lastName: doc.lastName,
    avatarUrl: doc.avatarUrl,
    isActive: doc.isActive,
    inactiveAt: doc.inactiveAt,
    deletionDeadline: doc.deletionDeadline,
    oauthProviders: doc.oauthProviders ?? [],
    passkeys: doc.passkeys ?? [],
    failedLoginAttempts: doc.failedLoginAttempts,
    lockoutUntil: doc.lockoutUntil,
    lastLoginAt: doc.lastLoginAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
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

export const userToDocument = (entity: Partial<User>): Partial<UserDocument> => {
  return {
    ...(entity.email !== undefined && { email: entity.email }),
    ...(entity.passwordHash !== undefined && { passwordHash: entity.passwordHash }),
    ...(entity.isAdmin !== undefined && { isAdmin: entity.isAdmin }),
    ...(entity.displayName !== undefined && { displayName: entity.displayName }),
    ...(entity.firstName !== undefined && { firstName: entity.firstName }),
    ...(entity.lastName !== undefined && { lastName: entity.lastName }),
    ...(entity.avatarUrl !== undefined && { avatarUrl: entity.avatarUrl }),
    ...(entity.isEmailVerified !== undefined && { isEmailVerified: entity.isEmailVerified }),
    ...(entity.verificationDeadline !== undefined && {
      verificationDeadline: entity.verificationDeadline ?? null,
    }),
    ...(entity.isActive !== undefined && { isActive: entity.isActive }),
    ...(entity.inactiveAt !== undefined && { inactiveAt: entity.inactiveAt ?? null }),
    ...(entity.deletionDeadline !== undefined && {
      deletionDeadline: entity.deletionDeadline ?? null,
    }),
    ...(entity.oauthProviders !== undefined && { oauthProviders: entity.oauthProviders }),
    ...(entity.passkeys !== undefined && { passkeys: entity.passkeys }),
    ...(entity.failedLoginAttempts !== undefined && {
      failedLoginAttempts: entity.failedLoginAttempts,
    }),
    ...(entity.lockoutUntil !== undefined && { lockoutUntil: entity.lockoutUntil }),
    ...(entity.lastLoginAt !== undefined && { lastLoginAt: entity.lastLoginAt }),
  };
};

export const userToResponse = (user: User): UserResponse => ({
  id: user.id,
  email: user.email,
  isAdmin: user.isAdmin,
  isEmailVerified: user.isEmailVerified,
  displayName: user.displayName,
  firstName: user.firstName,
  lastName: user.lastName,
  avatarUrl: user.avatarUrl,
  isActive: user.isActive,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});
