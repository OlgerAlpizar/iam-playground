import { z } from 'zod';

import { existingPasswordSchema } from '../../utils/password.utils';

export const reactivateAccountRequestSchema = z.object({
  email: z.string().email('Invalid email format').max(254, 'Email too long'),
  password: existingPasswordSchema,
});

export type ReactivateAccountRequest = z.infer<typeof reactivateAccountRequestSchema>;
