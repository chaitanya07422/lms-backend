import { Router } from 'express';

import * as disbursementController from '../controllers/disbursement.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validateQuery } from '../middleware/validateQuery';
import { asyncHandler } from '../utils/asyncHandler';
import { cursorPaginationQuerySchema } from '../validators/ops.validators';

const disbursementRouter = Router();

disbursementRouter.use(authenticate, authorize('disbursement', 'admin'));

disbursementRouter.get(
  '/loans',
  validateQuery(cursorPaginationQuerySchema),
  asyncHandler(disbursementController.listLoans),
);
disbursementRouter.get('/loans/:loanId', asyncHandler(disbursementController.getLoan));
disbursementRouter.post('/loans/:loanId/disburse', asyncHandler(disbursementController.disburse));

export { disbursementRouter };
