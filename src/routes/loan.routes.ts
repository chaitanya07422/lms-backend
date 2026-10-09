import { Router } from 'express';

import * as loanController from '../controllers/loan.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { loanApplyBodySchema, loanPreviewBodySchema } from '../validators/loan.validators';

const loanRouter = Router();

loanRouter.use(authenticate, authorize('borrower'));

loanRouter.post(
  '/preview',
  validateBody(loanPreviewBodySchema),
  asyncHandler(loanController.preview),
);

loanRouter.post('/apply', validateBody(loanApplyBodySchema), asyncHandler(loanController.apply));

loanRouter.get('/me', asyncHandler(loanController.listMine));

loanRouter.get('/me/:loanId', asyncHandler(loanController.getMine));

export { loanRouter };
