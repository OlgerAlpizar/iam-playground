import { HttpError } from '@authentication/backend-express/middlewares';

import type { CreateUserRequest } from '../dtos/requests/create-user.request.dto';
import type { UpdateUserRequest } from '../dtos/requests/update-user.request.dto';
import type { User } from '../entities/user.entity';
import * as userRepository from '../repositories/user.repository';

export const createUser = async (dto: CreateUserRequest): Promise<User> => {
  const existingUser = await userRepository.findUserByEmail(dto.email);
  if (existingUser) {
    throw new HttpError('Conflict', 'Email already registered', 409);
  }

  // Map DTO → Entity data for repository
  const userData: Partial<User> = {
    email: dto.email,
    passwordHash: dto.passwordHash,
    displayName: dto.displayName,
    firstName: dto.firstName,
    lastName: dto.lastName,
  };

  return userRepository.createUser(userData);
};

export const getUserById = async (id: string): Promise<User> => {
  const user = await userRepository.findUserById(id);
  if (!user) {
    throw new HttpError('Not Found', 'User not found', 404);
  }
  return user;
};

export const getUserByEmail = async (email: string): Promise<User> => {
  const user = await userRepository.findUserByEmail(email);
  if (!user) {
    throw new HttpError('Not Found', 'User not found', 404);
  }
  return user;
};

export const updateUser = async (id: string, dto: UpdateUserRequest): Promise<User> => {
  // Map DTO → Entity data for repository
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

  const user = await userRepository.updateUser(id, userData);
  if (!user) {
    throw new HttpError('Not Found', 'User not found', 404);
  }
  return user;
};

export const deleteUser = async (id: string): Promise<void> => {
  const deleted = await userRepository.deleteUser(id);
  if (!deleted) {
    throw new HttpError('Not Found', 'User not found', 404);
  }
};

export const verifyUserEmail = async (userId: string): Promise<User> => {
  const user = await userRepository.updateUser(userId, { isEmailVerified: true });
  if (!user) {
    throw new HttpError('Not Found', 'User not found', 404);
  }
  return user;
};

export const deactivateUser = async (userId: string): Promise<User> => {
  const user = await userRepository.updateUser(userId, { isActive: false });
  if (!user) {
    throw new HttpError('Not Found', 'User not found', 404);
  }
  return user;
};

export const reactivateUser = async (userId: string): Promise<User> => {
  const user = await userRepository.updateUser(userId, { isActive: true });
  if (!user) {
    throw new HttpError('Not Found', 'User not found', 404);
  }
  return user;
};
