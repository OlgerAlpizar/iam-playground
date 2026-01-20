import { z } from 'zod';

export const passkeyLoginOptionsRequestSchema = z.object({
  email: z.string().email('Invalid email format').max(254, 'Email too long'),
});

export type PasskeyLoginOptionsRequest = z.infer<typeof passkeyLoginOptionsRequestSchema>;
