import type { User } from './user.entity';

export interface FindUsersResult {
  users: User[];
  total: number;
  limit: number;
  skip: number;
  hasMore: boolean;
}
