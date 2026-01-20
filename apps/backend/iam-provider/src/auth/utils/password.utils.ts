import bcrypt from 'bcrypt';
import { z } from 'zod';

import { appConfig } from '../../config/app.config';

// Password constraints
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 16;

/**
 * Password complexity requirements:
 * - Minimum 8 characters
 * - Maximum 16 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */
export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(PASSWORD_MAX_LENGTH, 'Password too long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

/**
 * For login/reactivation - only validates presence, not complexity
 * (user may have set password before complexity rules were added)
 */
export const existingPasswordSchema = z
  .string()
  .min(1, 'Password is required')
  .max(PASSWORD_MAX_LENGTH, 'Password too long');

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, appConfig.security.bcryptRounds);
};

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};
