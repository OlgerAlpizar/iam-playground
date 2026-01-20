import jwt from 'jsonwebtoken';

import { appConfig } from '../../config/app.config';
import type { User } from '../entities/user.entity';
import { UserNotFoundError } from '../errors/user-not-found.error';
import { VerificationTokenExpiredError } from '../errors/verification-token-expired.error';
import { VerificationTokenInvalidError } from '../errors/verification-token-invalid.error';
import { userRepository } from '../repositories/user.repository';
import { emailService } from './email.service';

const TOKEN_PURPOSES = {
  EMAIL_VERIFICATION: 'email-verification',
} as const;

type SendVerificationResult = {
  verificationUrl: string | null;
};

type VerificationTokenPayload = {
  sub: string;
  email: string;
  purpose: typeof TOKEN_PURPOSES.EMAIL_VERIFICATION;
};

const calculateVerificationDeadline = (): Date => {
  const hours = appConfig.email.verificationTokenExpiresHours;
  return new Date(Date.now() + hours * 60 * 60 * 1000);
};

const generateVerificationToken = (user: User): string => {
  const payload: VerificationTokenPayload = {
    sub: user.id,
    email: user.email,
    purpose: TOKEN_PURPOSES.EMAIL_VERIFICATION,
  };

  return jwt.sign(payload, appConfig.jwt.secret, {
    expiresIn: `${appConfig.email.verificationTokenExpiresHours}h`,
  });
};

const sendVerificationEmail = async (
  user: User,
  callbackUrl?: string,
): Promise<SendVerificationResult> => {
  const token = generateVerificationToken(user);
  const verificationUrl = callbackUrl ? `${callbackUrl}?token=${token}` : null;
  const expiresIn = appConfig.email.verificationTokenExpiresHours;

  if (verificationUrl) {
    const text = `Welcome to IAM Provider!
        Please verify your email address by visiting the link below:
        ${verificationUrl}
        This link will expire in ${expiresIn} hours.
        If you didn't create an account, you can safely ignore this email.`;

    await emailService.sendEmail({
      to: user.email,
      subject: 'Verify your email address',
      text,
    });
  }

  return { verificationUrl };
};

const verifyEmail = async (token: string): Promise<User> => {
  let payload: VerificationTokenPayload;

  try {
    payload = jwt.verify(token, appConfig.jwt.secret) as VerificationTokenPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new VerificationTokenExpiredError();
    }
    throw new VerificationTokenInvalidError();
  }

  if (payload.purpose !== TOKEN_PURPOSES.EMAIL_VERIFICATION) {
    throw new VerificationTokenInvalidError();
  }

  const user = await userRepository.findUserById(payload.sub);

  if (!user) {
    throw new UserNotFoundError(payload.sub);
  }

  if (user.email !== payload.email) {
    throw new VerificationTokenInvalidError();
  }

  if (user.isEmailVerified) {
    return user;
  }

  return userRepository.updateUser(user.id, {
    isEmailVerified: true,
    verificationDeadline: undefined,
  });
};

const resendVerificationEmail = async (
  email: string,
  callbackUrl?: string,
): Promise<SendVerificationResult> => {
  const user = await userRepository.findUserByEmail(email);

  if (!user) {
    return { verificationUrl: null };
  }

  if (user.isEmailVerified) {
    return { verificationUrl: null };
  }

  return sendVerificationEmail(user, callbackUrl);
};

export const emailVerificationService = {
  calculateVerificationDeadline,
  sendVerificationEmail,
  verifyEmail,
  resendVerificationEmail,
};
