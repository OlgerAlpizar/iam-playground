import { adminAuth, jwtAuth, requestValidation } from '@authentication/backend-express/middlewares';
import { Router } from 'express';
import { z } from 'zod';

import { appConfig } from '../../config/app.config';
import { userController } from '../controllers/user.controller';
import { createUserRequestSchema } from '../dtos/requests/create-user.request.dto';
import { searchUsersRequestSchema } from '../dtos/requests/search-users.request.dto';
import { updateUserRequestSchema } from '../dtos/requests/update-user.request.dto';

const router = Router();

// All user management routes require admin authentication
const requireAuth = jwtAuth.createMiddleware({ secret: appConfig.jwt.secret });
const requireAdmin = adminAuth.createMiddleware();

const idParamsSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId format'),
});

router.get(
  '/',
  requireAuth,
  requireAdmin,
  requestValidation.validateQuery(searchUsersRequestSchema),
  userController.search,
);

router.post(
  '/',
  requireAuth,
  requireAdmin,
  requestValidation.validateBody(createUserRequestSchema),
  userController.create,
);

router.get(
  '/:id',
  requireAuth,
  requireAdmin,
  requestValidation.validateParams(idParamsSchema),
  userController.getById,
);

router.patch(
  '/:id',
  requireAuth,
  requireAdmin,
  requestValidation.validate({ params: idParamsSchema, body: updateUserRequestSchema }),
  userController.update,
);

router.delete(
  '/:id',
  requireAuth,
  requireAdmin,
  requestValidation.validateParams(idParamsSchema),
  userController.remove,
);

router.post(
  '/:id/verify-email',
  requireAuth,
  requireAdmin,
  requestValidation.validateParams(idParamsSchema),
  userController.verifyEmail,
);

router.post(
  '/:id/deactivate',
  requireAuth,
  requireAdmin,
  requestValidation.validateParams(idParamsSchema),
  userController.deactivate,
);

router.post(
  '/:id/reactivate',
  requireAuth,
  requireAdmin,
  requestValidation.validateParams(idParamsSchema),
  userController.reactivate,
);

export const userRoutes = router;
