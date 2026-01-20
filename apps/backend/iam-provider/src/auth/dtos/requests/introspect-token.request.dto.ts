import { z } from 'zod';

export const introspectTokenRequestSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

export type IntrospectTokenRequest = z.infer<typeof introspectTokenRequestSchema>;
