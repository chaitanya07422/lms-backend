import { Router } from 'express';

import * as salesController from '../controllers/sales.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validateQuery } from '../middleware/validateQuery';
import { asyncHandler } from '../utils/asyncHandler';
import { paginationQuerySchema } from '../validators/ops.validators';

const salesRouter = Router();

salesRouter.use(authenticate, authorize('sales', 'admin'));

salesRouter.get(
  '/leads',
  validateQuery(paginationQuerySchema),
  asyncHandler(salesController.listLeads),
);

salesRouter.get('/leads/:userId', asyncHandler(salesController.getLead));

export { salesRouter };
