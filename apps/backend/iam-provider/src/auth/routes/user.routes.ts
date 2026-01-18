import { requestValidation } from '@authentication/backend-express/middlewares';
import { Router } from 'express';
import { z } from 'zod';

import { userController } from '../controllers/user.controller';
import { createUserRequestSchema } from '../dtos/requests/create-user.request.dto';
import { updateUserRequestSchema } from '../dtos/requests/update-user.request.dto';

const router = Router();

const idParamsSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId format'),
});

router.post('/', requestValidation.validateBody(createUserRequestSchema), userController.create);

router.get('/:id', requestValidation.validateParams(idParamsSchema), userController.getById);

router.patch(
  '/:id',
  requestValidation.validate({ params: idParamsSchema, body: updateUserRequestSchema }),
  userController.update,
);

router.delete('/:id', requestValidation.validateParams(idParamsSchema), userController.remove);

router.post(
  '/:id/verify-email',
  requestValidation.validateParams(idParamsSchema),
  userController.verifyEmail,
);

router.post(
  '/:id/deactivate',
  requestValidation.validateParams(idParamsSchema),
  userController.deactivate,
);

router.post(
  '/:id/reactivate',
  requestValidation.validateParams(idParamsSchema),
  userController.reactivate,
);

export const userRoutes = router;
