import { z } from 'zod';

import { existingPasswordSchema, passwordSchema } from '../../utils/password.utils';

export const changePasswordRequestSchema = z.object({
  currentPassword: existingPasswordSchema,
  newPassword: passwordSchema,
});

export type ChangePasswordRequest = z.infer<typeof changePasswordRequestSchema>;
