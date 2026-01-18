import type { CreateUserRequest } from '../dtos/requests/create-user.request.dto';
import type { UpdateUserRequest } from '../dtos/requests/update-user.request.dto';
import type { User } from '../entities/user.entity';
import { DuplicateEmailError } from '../errors/duplicate-email.error';
import { userRepository } from '../repositories/user.repository';

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
  return userRepository.updateUser(userId, { isActive: false });
};

const reactivateUser = async (userId: string): Promise<User> => {
  return userRepository.updateUser(userId, { isActive: true });
};

export const userService = {
  createUser,
  getUserById,
  getUserByEmail,
  updateUser,
  deleteUser,
  verifyUserEmail,
  deactivateUser,
  reactivateUser,
};
