import type { OAuthProvider } from './oauth-provider.entity';
import type { PasskeyCredential } from './passkey-credential.entity';

export interface User {
  id: string;
  email: string;
  isEmailVerified: boolean;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  isActive: boolean;
  oauthProviders: OAuthProvider[];
  passkeys: PasskeyCredential[];
  failedLoginAttempts: number;
  lockoutUntil?: Date;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
