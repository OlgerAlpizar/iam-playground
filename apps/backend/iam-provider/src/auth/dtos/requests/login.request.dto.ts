import { z } from 'zod';

import { existingPasswordSchema } from '../../utils/password.utils';

export const loginRequestSchema = z.object({
  email: z.string().email('Invalid email format').max(254, 'Email too long'),
  password: existingPasswordSchema,
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;
