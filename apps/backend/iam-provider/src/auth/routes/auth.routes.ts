import { jwtAuth, rateLimit, requestValidation } from '@authentication/backend-express/middlewares';
import { Router } from 'express';
import { z } from 'zod';

import { appConfig } from '../../config/app.config';
import { authController } from '../controllers/auth.controller';
import { changePasswordRequestSchema } from '../dtos/requests/change-password.request.dto';
import { forgotPasswordRequestSchema } from '../dtos/requests/forgot-password.request.dto';
import { introspectTokenRequestSchema } from '../dtos/requests/introspect-token.request.dto';
import { loginRequestSchema } from '../dtos/requests/login.request.dto';
import { reactivateAccountRequestSchema } from '../dtos/requests/reactivate-account.request.dto';
import { refreshTokenRequestSchema } from '../dtos/requests/refresh-token.request.dto';
import { registerRequestSchema } from '../dtos/requests/register.request.dto';
import { resendVerificationRequestSchema } from '../dtos/requests/resend-verification.request.dto';
import { resetPasswordRequestSchema } from '../dtos/requests/reset-password.request.dto';
import { setPasswordRequestSchema } from '../dtos/requests/set-password.request.dto';
import { verifyEmailRequestSchema } from '../dtos/requests/verify-email.request.dto';

const router = Router();

// Stricter rate limiting for auth endpoints (10 attempts per 10 minutes)
const authLimiter = rateLimit.createAuthLimiterMiddleware();

// JWT authentication middleware (independent of Passport.js)
const requireAuth = jwtAuth.createMiddleware({ secret: appConfig.jwt.secret });

// Session ID param validation (MongoDB ObjectId format)
const sessionIdParamsSchema = z.object({
  sessionId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid session ID format'),
});

// Public routes
router.post(
  '/register',
  authLimiter,
  requestValidation.validateBody(registerRequestSchema),
  authController.register,
);
router.post(
  '/login',
  authLimiter,
  requestValidation.validateBody(loginRequestSchema),
  authController.login,
);
router.post(
  '/refresh',
  requestValidation.validateBody(refreshTokenRequestSchema),
  authController.refreshToken,
);
router.post(
  '/logout',
  requestValidation.validateBody(refreshTokenRequestSchema),
  authController.logout,
);

// Email verification (public)
router.get(
  '/verify-email',
  requestValidation.validateQuery(verifyEmailRequestSchema),
  authController.verifyEmail,
);
router.post(
  '/resend-verification',
  authLimiter,
  requestValidation.validateBody(resendVerificationRequestSchema),
  authController.resendVerification,
);

// Account reactivation (public - uses email+password)
router.post(
  '/reactivate',
  authLimiter,
  requestValidation.validateBody(reactivateAccountRequestSchema),
  authController.reactivateAccount,
);

// Forgot password flow (public, rate limited)
router.post(
  '/forgot-password',
  authLimiter,
  requestValidation.validateBody(forgotPasswordRequestSchema),
  authController.forgotPassword,
);
router.post(
  '/reset-password',
  authLimiter,
  requestValidation.validateBody(resetPasswordRequestSchema),
  authController.resetPassword,
);

// Token introspection (public - for third-party tenants)
router.post(
  '/introspect',
  requestValidation.validateBody(introspectTokenRequestSchema),
  authController.introspect,
);

// Protected routes (require JWT authentication)
router.get('/me', requireAuth, authController.getMe);
router.post(
  '/set-password',
  requireAuth,
  requestValidation.validateBody(setPasswordRequestSchema),
  authController.setPassword,
);
router.post(
  '/change-password',
  requireAuth,
  requestValidation.validateBody(changePasswordRequestSchema),
  authController.changePassword,
);
router.post('/logout-all', requireAuth, authController.logoutAllDevices);
router.post('/deactivate', requireAuth, authController.deactivateAccount);

// Session management (requires authentication)
router.get('/sessions', requireAuth, authController.getSessions);
router.delete(
  '/sessions/:sessionId',
  requireAuth,
  requestValidation.validateParams(sessionIdParamsSchema),
  authController.revokeSession,
);

export const authRoutes = router;
