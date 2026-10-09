import { Router } from 'express';

import * as sanctionController from '../controllers/sanction.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { rejectLoanBodySchema } from '../validators/ops.validators';

const sanctionRouter = Router();

sanctionRouter.use(authenticate, authorize('sanction', 'admin'));

sanctionRouter.get('/loans', asyncHandler(sanctionController.listLoans));
sanctionRouter.get('/loans/:loanId', asyncHandler(sanctionController.getLoan));
sanctionRouter.post('/loans/:loanId/approve', asyncHandler(sanctionController.approve));
sanctionRouter.post(
  '/loans/:loanId/reject',
  validateBody(rejectLoanBodySchema),
  asyncHandler(sanctionController.reject),
);

export { sanctionRouter };
