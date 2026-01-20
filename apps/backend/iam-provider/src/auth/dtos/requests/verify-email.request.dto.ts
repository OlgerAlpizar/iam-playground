import { z } from 'zod';

export const verifyEmailRequestSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

export type VerifyEmailRequest = z.infer<typeof verifyEmailRequestSchema>;
