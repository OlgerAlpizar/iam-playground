import { jwtAuth, rateLimit, requestValidation } from '@authentication/backend-express/middlewares';
import { Router } from 'express';
import { z } from 'zod';

import { appConfig } from '../../config/app.config';
import { passkeyController } from '../controllers/passkey.controller';
import { passkeyLoginOptionsRequestSchema } from '../dtos/requests/passkey-login-options.request.dto';
import { passkeyLoginVerifyRequestSchema } from '../dtos/requests/passkey-login-verify.request.dto';
import { passkeyRegisterVerifyRequestSchema } from '../dtos/requests/passkey-register-verify.request.dto';

const router = Router();

// Stricter rate limiting for passkey auth endpoints
const authLimiter = rateLimit.createAuthLimiterMiddleware();

// JWT authentication middleware (independent of Passport.js)
const requireAuth = jwtAuth.createMiddleware({ secret: appConfig.jwt.secret });

// Credential ID param validation
const credentialIdParamsSchema = z.object({
  credentialId: z.string().min(1, 'Credential ID is required'),
});

// Registration (requires authentication)
router.post('/register/options', requireAuth, passkeyController.getRegistrationOptions);
router.post(
  '/register/verify',
  requireAuth,
  requestValidation.validateBody(passkeyRegisterVerifyRequestSchema),
  passkeyController.verifyRegistration,
);

// Authentication (public - rate limited)
router.post(
  '/login/options',
  authLimiter,
  requestValidation.validateBody(passkeyLoginOptionsRequestSchema),
  passkeyController.getAuthenticationOptions,
);
router.post(
  '/login/verify',
  authLimiter,
  requestValidation.validateBody(passkeyLoginVerifyRequestSchema),
  passkeyController.verifyAuthentication,
);

// Management (requires authentication)
router.get('/', requireAuth, passkeyController.listPasskeys);
router.delete(
  '/:credentialId',
  requireAuth,
  requestValidation.validateParams(credentialIdParamsSchema),
  passkeyController.deletePasskey,
);

export const passkeyRoutes = router;
