import { Router } from 'express';

import * as adminController from '../controllers/admin.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { createUserBodySchema } from '../validators/admin.validators';

const adminRouter = Router();

adminRouter.use(authenticate, authorize('admin'));

adminRouter.post(
  '/users',
  validateBody(createUserBodySchema),
  asyncHandler(adminController.createUser),
);

export { adminRouter };
