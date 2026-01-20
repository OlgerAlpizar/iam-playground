import type { DomainAsHttpError } from '@authentication/backend-express/middlewares';

export const DomainErrors: Record<string, DomainAsHttpError> = {
  USER_NOT_FOUND: { statusCode: 404, message: 'User not found' },
  DUPLICATE_EMAIL: { statusCode: 409, message: 'Email already registered' },
  INVALID_CREDENTIALS: { statusCode: 401, message: 'Invalid credentials' },
  ACCOUNT_LOCKED: { statusCode: 423, message: 'Account is locked' },
  ACCOUNT_PENDING_DELETION: { statusCode: 403, message: 'Account is pending deletion' },
  TOKEN_EXPIRED: { statusCode: 401, message: 'Token has expired' },
  TOKEN_INVALID: { statusCode: 401, message: 'Invalid token' },
  EMAIL_NOT_VERIFIED: { statusCode: 403, message: 'Email not verified' },
  VERIFICATION_TOKEN_EXPIRED: { statusCode: 410, message: 'Verification token has expired' },
  VERIFICATION_TOKEN_INVALID: { statusCode: 400, message: 'Invalid verification token' },
  PASSWORD_ALREADY_SET: { statusCode: 409, message: 'Password is already set' },
  PASSWORD_NOT_ENABLED: {
    statusCode: 400,
    message: 'This account does not have password authentication enabled',
  },
  // Passkey errors
  PASSKEY_CHALLENGE_EXPIRED: { statusCode: 400, message: 'Passkey challenge not found or expired' },
  PASSKEY_NOT_FOUND: { statusCode: 404, message: 'Passkey not found' },
  PASSKEY_VERIFICATION_FAILED: { statusCode: 400, message: 'Passkey verification failed' },
  // OAuth errors
  OAUTH_ALREADY_LINKED: {
    statusCode: 409,
    message: 'This OAuth account is already linked to another user',
  },
  CANNOT_UNLINK_ONLY_AUTH_METHOD: {
    statusCode: 400,
    message: 'Cannot unlink the only authentication method',
  },
} as const;
