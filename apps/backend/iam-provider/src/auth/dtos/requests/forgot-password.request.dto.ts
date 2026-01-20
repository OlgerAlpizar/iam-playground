import { z } from 'zod';

export const forgotPasswordRequestSchema = z.object({
  email: z.string().email('Invalid email format').max(254, 'Email too long'),
  resetCallbackUrl: z.string().url('Invalid callback URL').optional(),
});

export type ForgotPasswordRequest = z.infer<typeof forgotPasswordRequestSchema>;
