import { z } from 'zod';

export const resendVerificationRequestSchema = z.object({
  email: z.string().email('Invalid email format').max(254, 'Email too long'),
  verificationCallbackUrl: z.string().url('Invalid callback URL').optional(),
});

export type ResendVerificationRequest = z.infer<typeof resendVerificationRequestSchema>;
