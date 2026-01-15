import { z } from 'zod';

export const updateUserRequestSchema = z.object({
  displayName: z.string().max(100).optional(),
  firstName: z.string().max(50).optional(),
  lastName: z.string().max(50).optional(),
  avatarUrl: z.string().url().optional(),
  passwordHash: z.string().optional(),
  isEmailVerified: z.boolean().optional(),
  failedLoginAttempts: z.number().int().min(0).optional(),
  lockoutUntil: z.date().nullable().optional(),
  lastLoginAt: z.date().optional(),
  isActive: z.boolean().optional(),
});

export type UpdateUserRequest = z.infer<typeof updateUserRequestSchema>;
