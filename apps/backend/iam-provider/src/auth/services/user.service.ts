import { appConfig } from '../../config/app.config';
import type { CreateUserRequest } from '../dtos/requests/create-user.request.dto';
import type { SearchUsersRequest } from '../dtos/requests/search-users.request.dto';
import type { UpdateUserRequest } from '../dtos/requests/update-user.request.dto';
import type { FindUsersResult } from '../entities/find-users-result.entity';
import type { User } from '../entities/user.entity';
import { DuplicateEmailError } from '../errors/duplicate-email.error';
import { UserNotFoundError } from '../errors/user-not-found.error';
import { userRepository } from '../repositories/user.repository';

const calculateDeletionDeadline = (): Date => {
  const days = appConfig.security.inactiveAccountRetentionDays;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
};

const searchUsers = async (params: SearchUsersRequest): Promise<FindUsersResult> => {
  return userRepository.findUsers(params);
};

const createUser = async (dto: CreateUserRequest): Promise<User> => {
  const existingUser = await userRepository.findUserByEmail(dto.email);
  if (existingUser) {
    throw new DuplicateEmailError(dto.email);
  }

  const userData: Partial<User> = {
    email: dto.email,
    passwordHash: dto.passwordHash,
    displayName: dto.displayName,
    firstName: dto.firstName,
    lastName: dto.lastName,
  };

  return userRepository.createUser(userData);
};

const getUserById = async (id: string): Promise<User> => {
  return userRepository.getUserById(id);
};

const getUserByEmail = async (email: string): Promise<User> => {
  return userRepository.getUserByEmail(email);
};

const updateUser = async (id: string, dto: UpdateUserRequest): Promise<User> => {
  const userData: Partial<User> = {
    ...(dto.displayName !== undefined && { displayName: dto.displayName }),
    ...(dto.firstName !== undefined && { firstName: dto.firstName }),
    ...(dto.lastName !== undefined && { lastName: dto.lastName }),
    ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
    ...(dto.passwordHash !== undefined && { passwordHash: dto.passwordHash }),
    ...(dto.isEmailVerified !== undefined && { isEmailVerified: dto.isEmailVerified }),
    ...(dto.isActive !== undefined && { isActive: dto.isActive }),
    ...(dto.failedLoginAttempts !== undefined && { failedLoginAttempts: dto.failedLoginAttempts }),
    ...(dto.lockoutUntil !== undefined && { lockoutUntil: dto.lockoutUntil ?? undefined }),
    ...(dto.lastLoginAt !== undefined && { lastLoginAt: dto.lastLoginAt }),
  };

  return userRepository.updateUser(id, userData);
};

const deleteUser = async (id: string): Promise<void> => {
  await userRepository.deleteUser(id);
};

const verifyUserEmail = async (userId: string): Promise<User> => {
  return userRepository.updateUser(userId, { isEmailVerified: true });
};

const deactivateUser = async (userId: string): Promise<User> => {
  const deletionDeadline = calculateDeletionDeadline();

  return userRepository.updateUser(userId, {
    isActive: false,
    inactiveAt: new Date(),
    deletionDeadline,
  });
};

const reactivateUser = async (userId: string): Promise<User> => {
  const user = await userRepository.findUserById(userId);

  if (!user) {
    throw new UserNotFoundError(userId);
  }

  // Can only reactivate if not yet permanently deleted (deletionDeadline hasn't passed)
  if (user.deletionDeadline && user.deletionDeadline < new Date()) {
    throw new UserNotFoundError(userId);
  }

  return userRepository.updateUser(userId, {
    isActive: true,
    inactiveAt: undefined,
    deletionDeadline: undefined,
  });
};

export const userService = {
  searchUsers,
  createUser,
  getUserById,
  getUserByEmail,
  updateUser,
  deleteUser,
  verifyUserEmail,
  deactivateUser,
  reactivateUser,
};
