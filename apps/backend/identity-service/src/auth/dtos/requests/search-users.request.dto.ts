import { z } from 'zod';

import { OAuthProviderType } from '../../entities/oauth-provider.entity';
import { SortOrder } from '../../entities/sort-order.entity';

export const searchUsersRequestSchema = z.object({
  search: z.string().max(100).optional(),
  email: z.string().email().optional(),
  isEmailVerified: z.coerce.boolean().optional(),
  isActive: z.coerce.boolean().optional(),
  oauthProvider: z.nativeEnum(OAuthProviderType).optional(),
  hasPasskeys: z.coerce.boolean().optional(),
  hasFailedAttempts: z.coerce.boolean().optional(),
  createdSince: z.coerce.date().optional(),
  updatedUntil: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  skip: z.coerce.number().int().min(0).optional(),
  sortBy: z.enum(['id', 'email', 'displayName', 'createdAt', 'updatedAt']).optional(),
  sortOrder: z.nativeEnum(SortOrder).optional(),
});

export type SearchUsersRequest = z.infer<typeof searchUsersRequestSchema>;
