import { Router } from 'express';

import * as adminController from '../controllers/admin.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { validateQuery } from '../middleware/validateQuery';
import { asyncHandler } from '../utils/asyncHandler';
import {
  adminSummaryQuerySchema,
  createUserBodySchema,
} from '../validators/admin.validators';

const adminRouter = Router();

adminRouter.use(authenticate, authorize('admin'));

adminRouter.get(
  '/summary',
  validateQuery(adminSummaryQuerySchema),
  asyncHandler(adminController.getSummary),
);

adminRouter.post(
  '/users',
  validateBody(createUserBodySchema),
  asyncHandler(adminController.createUser),
);

export { adminRouter };
