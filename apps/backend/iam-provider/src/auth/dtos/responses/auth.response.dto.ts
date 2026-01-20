import type { UserResponse } from './user.response.dto';

export interface AuthResponse {
  user: UserResponse;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RegisterResponse extends AuthResponse {
  verificationUrl: string | null;
}
