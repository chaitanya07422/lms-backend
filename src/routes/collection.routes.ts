import { Router } from 'express';

import * as collectionController from '../controllers/collection.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { recordPaymentBodySchema } from '../validators/ops.validators';

const collectionRouter = Router();

collectionRouter.use(authenticate, authorize('collection', 'admin'));

collectionRouter.get('/loans', asyncHandler(collectionController.listLoans));
collectionRouter.get('/loans/:loanId', asyncHandler(collectionController.getLoan));
collectionRouter.get('/loans/:loanId/payments', asyncHandler(collectionController.listPayments));
collectionRouter.post(
  '/loans/:loanId/payments',
  validateBody(recordPaymentBodySchema),
  asyncHandler(collectionController.recordPayment),
);

export { collectionRouter };
