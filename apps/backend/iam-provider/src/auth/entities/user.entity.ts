import type { OAuthProvider } from './oauth-provider.entity';
import type { PasskeyCredential } from './passkey-credential.entity';

export interface User {
  id: string;
  email: string;
  passwordHash?: string;
  isAdmin: boolean;
  isEmailVerified: boolean;
  verificationDeadline?: Date;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  isActive: boolean;
  inactiveAt?: Date;
  deletionDeadline?: Date;
  oauthProviders: OAuthProvider[];
  passkeys: PasskeyCredential[];
  failedLoginAttempts: number;
  lockoutUntil?: Date;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
