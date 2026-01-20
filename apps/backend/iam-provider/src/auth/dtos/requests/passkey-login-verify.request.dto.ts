import type { AuthenticationResponseJSON } from '@simplewebauthn/server';
import { z } from 'zod';

export const passkeyLoginVerifyRequestSchema = z.object({
  email: z.string().email('Invalid email format').max(254, 'Email too long'),
  response: z.object({}).passthrough(), // WebAuthn response validated by simplewebauthn
});

export interface PasskeyLoginVerifyRequest {
  email: string;
  response: AuthenticationResponseJSON;
}
