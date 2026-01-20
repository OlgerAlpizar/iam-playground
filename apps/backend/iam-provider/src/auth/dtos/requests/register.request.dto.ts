import { z } from 'zod';

import { passwordSchema } from '../../utils/password.utils';

export const registerRequestSchema = z.object({
  email: z.string().email('Invalid email format').max(254, 'Email too long'),
  password: passwordSchema,
  displayName: z.string().max(100, 'Display name too long').optional(),
  firstName: z.string().max(50, 'First name too long').optional(),
  lastName: z.string().max(50, 'Last name too long').optional(),
  verificationCallbackUrl: z.string().url('Invalid callback URL').optional(),
});

export type RegisterRequest = z.infer<typeof registerRequestSchema>;
