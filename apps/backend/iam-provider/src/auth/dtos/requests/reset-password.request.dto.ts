import { z } from 'zod';

import { passwordSchema } from '../../utils/password.utils';

export const resetPasswordRequestSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  newPassword: passwordSchema,
});

export type ResetPasswordRequest = z.infer<typeof resetPasswordRequestSchema>;
