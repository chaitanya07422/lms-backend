import { Router } from 'express';

import * as sanctionController from '../controllers/sanction.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { validateQuery } from '../middleware/validateQuery';
import { asyncHandler } from '../utils/asyncHandler';
import {
  cursorPaginationQuerySchema,
  rejectLoanBodySchema,
} from '../validators/ops.validators';

const sanctionRouter = Router();

sanctionRouter.use(authenticate, authorize('sanction', 'admin'));

sanctionRouter.get(
  '/loans',
  validateQuery(cursorPaginationQuerySchema),
  asyncHandler(sanctionController.listLoans),
);
sanctionRouter.get('/loans/:loanId', asyncHandler(sanctionController.getLoan));
sanctionRouter.post('/loans/:loanId/approve', asyncHandler(sanctionController.approve));
sanctionRouter.post(
  '/loans/:loanId/reject',
  validateBody(rejectLoanBodySchema),
  asyncHandler(sanctionController.reject),
);

export { sanctionRouter };
