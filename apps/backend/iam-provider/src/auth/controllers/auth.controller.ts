import { winstonLogger } from '@authentication/backend-utils';
import type { NextFunction, Request, Response } from 'express';

import { appConfig } from '../../config/app.config';
import type { ChangePasswordRequest } from '../dtos/requests/change-password.request.dto';
import type { ForgotPasswordRequest } from '../dtos/requests/forgot-password.request.dto';
import type { IntrospectTokenRequest } from '../dtos/requests/introspect-token.request.dto';
import type { LoginRequest } from '../dtos/requests/login.request.dto';
import type { ReactivateAccountRequest } from '../dtos/requests/reactivate-account.request.dto';
import type { RefreshTokenRequest } from '../dtos/requests/refresh-token.request.dto';
import type { RegisterRequest } from '../dtos/requests/register.request.dto';
import type { ResendVerificationRequest } from '../dtos/requests/resend-verification.request.dto';
import type { ResetPasswordRequest } from '../dtos/requests/reset-password.request.dto';
import type { SetPasswordRequest } from '../dtos/requests/set-password.request.dto';
import type { VerifyEmailRequest } from '../dtos/requests/verify-email.request.dto';
import { userToResponse } from '../mappers/user.mapper';
import { authService } from '../services/auth.service';
import { emailService } from '../services/email.service';
import { emailVerificationService } from '../services/email-verification.service';
import { passwordResetService } from '../services/password-reset.service';
import { userService } from '../services/user.service';
import { getTokenContext } from '../utils/token.utils';

const isProduction = appConfig.environment === 'production';

const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const dto = req.body as RegisterRequest;
    const context = getTokenContext(req);
    const { verificationUrl, ...authResponse } = await authService.register(dto, context);

    res.status(201).json({
      ...authResponse,
      // Include debug info only in non-production environments
      ...(!isProduction && verificationUrl && { debug: { verificationUrl } }),
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const dto = req.body as LoginRequest;
    const context = getTokenContext(req);
    const result = await authService.login(dto, context);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { refreshToken: token } = req.body as RefreshTokenRequest;
    const context = getTokenContext(req);
    const result = await authService.refreshTokens(token, context);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { refreshToken: token } = req.body as RefreshTokenRequest;
    await authService.logout(token);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

const logoutAllDevices = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    const revokedCount = await authService.logoutAllDevices(userId);
    res.json({ revokedSessions: revokedCount });
  } catch (error) {
    next(error);
  }
};

const verifyEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { token } = req.query as unknown as VerifyEmailRequest;
    const user = await emailVerificationService.verifyEmail(token);
    res.json({
      message: 'Email verified successfully',
      user: userToResponse(user),
    });
  } catch (error) {
    next(error);
  }
};

const resendVerification = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email, verificationCallbackUrl } = req.body as ResendVerificationRequest;
    const { verificationUrl } = await emailVerificationService.resendVerificationEmail(
      email,
      verificationCallbackUrl,
    );

    res.json({
      message: 'If the email exists and is not verified, a verification email was sent',
      // Include debug info only in non-production environments
      ...(!isProduction && verificationUrl && { debug: { verificationUrl } }),
    });
  } catch (error) {
    next(error);
  }
};

const reactivateAccount = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const dto = req.body as ReactivateAccountRequest;
    const context = getTokenContext(req);
    const result = await authService.reactivateAccount(dto, context);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const setPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { password } = req.body as SetPasswordRequest;
    const user = await authService.setPassword(userId, password);

    res.json({
      message: 'Password set successfully',
      user: userToResponse(user),
    });
  } catch (error) {
    next(error);
  }
};

const changePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { currentPassword, newPassword } = req.body as ChangePasswordRequest;
    const user = await authService.changePassword(userId, currentPassword, newPassword);

    res.json({
      message: 'Password changed successfully',
      user: userToResponse(user),
    });
  } catch (error) {
    next(error);
  }
};

const introspect = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const { token } = req.body as IntrospectTokenRequest;
    const result = authService.introspectToken(token);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, resetCallbackUrl } = req.body as ForgotPasswordRequest;
    const { resetUrl } = await passwordResetService.sendPasswordResetEmail(email, resetCallbackUrl);

    res.json({
      message: 'If the email exists and has a password, a reset email was sent',
      // Include debug info only in non-production environments
      ...(!isProduction && resetUrl && { debug: { resetUrl } }),
    });
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { token, newPassword } = req.body as ResetPasswordRequest;
    const user = await passwordResetService.resetPassword(token, newPassword);

    res.json({
      message: 'Password reset successfully',
      user: userToResponse(user),
    });
  } catch (error) {
    next(error);
  }
};

const getSessions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const result = await authService.getActiveSessions(userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const revokeSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { sessionId } = req.params;
    await authService.revokeSession(userId, sessionId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

const deactivateAccount = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // Deactivate the user account (soft delete)
    const user = await userService.deactivateUser(userId);

    // Revoke all sessions
    await authService.logoutAllDevices(userId);

    // Send security notification (non-blocking)
    if (user.deletionDeadline) {
      emailService
        .sendAccountDeactivatedNotification(user.email, user.deletionDeadline)
        .catch((error) => {
          winstonLogger.error('Failed to send account deactivated notification', { error, userId });
        });
    }

    res.json({
      message: 'Account deactivated successfully',
      user: userToResponse(user),
      deletionDeadline: user.deletionDeadline,
    });
  } catch (error) {
    next(error);
  }
};

const getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const user = await userService.getUserById(userId);
    res.json(userToResponse(user));
  } catch (error) {
    next(error);
  }
};

export const authController = {
  register,
  login,
  refreshToken,
  logout,
  logoutAllDevices,
  verifyEmail,
  resendVerification,
  reactivateAccount,
  setPassword,
  changePassword,
  introspect,
  forgotPassword,
  resetPassword,
  getSessions,
  revokeSession,
  deactivateAccount,
  getMe,
};
