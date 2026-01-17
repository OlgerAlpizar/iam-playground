import type { UserResponse } from './user.response.dto';

export interface SearchUsersResponse {
  users: UserResponse[];
  total: number;
  limit: number;
  skip: number;
  hasMore: boolean;
}
