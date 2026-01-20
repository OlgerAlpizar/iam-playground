import type { RegistrationResponseJSON } from '@simplewebauthn/server';
import { z } from 'zod';

export const passkeyRegisterVerifyRequestSchema = z.object({
  response: z.object({}).passthrough(), // WebAuthn response validated by simplewebauthn
  displayName: z.string().min(1, 'Display name is required').max(100, 'Display name too long'),
});

export interface PasskeyRegisterVerifyRequest {
  response: RegistrationResponseJSON;
  displayName: string;
}
