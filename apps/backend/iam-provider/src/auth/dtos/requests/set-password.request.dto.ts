import { z } from 'zod';

import { passwordSchema } from '../../utils/password.utils';

export const setPasswordRequestSchema = z.object({
  password: passwordSchema,
});

export type SetPasswordRequest = z.infer<typeof setPasswordRequestSchema>;
