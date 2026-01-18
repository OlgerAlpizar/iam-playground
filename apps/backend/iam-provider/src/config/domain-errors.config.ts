import type { DomainAsHttpError } from '@authentication/backend-express/middlewares';

export const DomainErrors: Record<string, DomainAsHttpError> = {
  USER_NOT_FOUND: { statusCode: 404, message: 'User not found' },
  DUPLICATE_EMAIL: { statusCode: 409, message: 'Email already registered' },
  INVALID_CREDENTIALS: { statusCode: 401, message: 'Invalid credentials' },
  ACCOUNT_LOCKED: { statusCode: 423, message: 'Account is locked' },
  TOKEN_EXPIRED: { statusCode: 401, message: 'Token has expired' },
  TOKEN_INVALID: { statusCode: 401, message: 'Invalid token' },
  EMAIL_NOT_VERIFIED: { statusCode: 403, message: 'Email not verified' },
} as const;
