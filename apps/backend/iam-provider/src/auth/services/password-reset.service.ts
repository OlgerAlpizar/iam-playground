import { winstonLogger } from '@authentication/backend-utils';
import jwt from 'jsonwebtoken';

import { appConfig } from '../../config/app.config';
import type { User } from '../entities/user.entity';
import { PasswordNotEnabledError } from '../errors/password-not-enabled.error';
import { TokenExpiredError } from '../errors/token-expired.error';
import { TokenInvalidError } from '../errors/token-invalid.error';
import { UserNotFoundError } from '../errors/user-not-found.error';
import { userRepository } from '../repositories/user.repository';
import { hashPassword } from '../utils/password.utils';
import { emailService } from './email.service';

const TOKEN_PURPOSES = {
  PASSWORD_RESET: 'password-reset',
} as const;

type SendPasswordResetResult = {
  resetUrl: string | null;
};

type PasswordResetTokenPayload = {
  sub: string;
  email: string;
  purpose: typeof TOKEN_PURPOSES.PASSWORD_RESET;
};

const generatePasswordResetToken = (user: User): string => {
  const payload: PasswordResetTokenPayload = {
    sub: user.id,
    email: user.email,
    purpose: TOKEN_PURPOSES.PASSWORD_RESET,
  };

  return jwt.sign(payload, appConfig.jwt.secret, {
    expiresIn: `${appConfig.email.passwordResetTokenExpiresHours}h`,
  });
};

const sendPasswordResetEmail = async (
  email: string,
  callbackUrl?: string,
): Promise<SendPasswordResetResult> => {
  const user = await userRepository.findUserByEmail(email);

  // Don't reveal if user exists or not
  if (!user) {
    return { resetUrl: null };
  }

  // User has no password (OAuth-only account)
  if (!user.passwordHash) {
    throw new PasswordNotEnabledError();
  }

  // Don't send reset email if account is inactive
  if (!user.isActive) {
    return { resetUrl: null };
  }

  const token = generatePasswordResetToken(user);
  const resetUrl = callbackUrl ? `${callbackUrl}?token=${token}` : null;
  const expiresIn = appConfig.email.passwordResetTokenExpiresHours;

  if (resetUrl) {
    const text = `Password Reset Request

You have requested to reset your password. Click the link below to proceed:

${resetUrl}

This link will expire in ${expiresIn} hour${expiresIn > 1 ? 's' : ''}.

If you didn't request a password reset, you can safely ignore this email.
Your password will remain unchanged.`;

    await emailService.sendEmail({
      to: user.email,
      subject: 'Reset your password',
      text,
    });
  }

  return { resetUrl };
};

const resetPassword = async (token: string, newPassword: string): Promise<User> => {
  let payload: PasswordResetTokenPayload;

  try {
    payload = jwt.verify(token, appConfig.jwt.secret) as PasswordResetTokenPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new TokenExpiredError();
    }
    throw new TokenInvalidError();
  }

  if (payload.purpose !== TOKEN_PURPOSES.PASSWORD_RESET) {
    throw new TokenInvalidError();
  }

  const user = await userRepository.findUserById(payload.sub);

  if (!user) {
    throw new UserNotFoundError(payload.sub);
  }

  if (user.email !== payload.email) {
    throw new TokenInvalidError();
  }

  // Don't allow reset if user has no password (OAuth-only)
  if (!user.passwordHash) {
    throw new PasswordNotEnabledError();
  }

  const passwordHash = await hashPassword(newPassword);

  const updatedUser = await userRepository.updateUser(user.id, {
    passwordHash,
    // Reset lockout on password change
    failedLoginAttempts: 0,
    lockoutUntil: undefined,
  });

  // Send security notification (non-blocking)
  emailService.sendPasswordChangedNotification(user.email).catch((error) => {
    winstonLogger.error('Failed to send password changed notification', { error, userId: user.id });
  });

  return updatedUser;
};

export const passwordResetService = {
  sendPasswordResetEmail,
  resetPassword,
};
