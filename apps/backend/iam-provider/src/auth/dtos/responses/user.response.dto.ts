export interface UserResponse {
  id: string;
  email: string;
  isAdmin: boolean;
  isEmailVerified: boolean;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
