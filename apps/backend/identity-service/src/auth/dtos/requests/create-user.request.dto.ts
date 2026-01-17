import { z } from 'zod';

export const createUserRequestSchema = z.object({
  email: z.string().email(),
  passwordHash: z.string().optional(),
  displayName: z.string().max(100).optional(),
  firstName: z.string().max(50).optional(),
  lastName: z.string().max(50).optional(),
});

export type CreateUserRequest = z.infer<typeof createUserRequestSchema>;
