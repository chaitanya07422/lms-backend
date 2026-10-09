import { Router } from 'express';

import * as borrowerController from '../controllers/borrower.controller';
import { authenticate, authorize } from '../middleware/auth';
import { handleSalarySlipUpload } from '../middleware/salarySlipUpload';
import { validateBody } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { profileBodySchema } from '../validators/borrower.validators';

const breCheckBodySchema = profileBodySchema.partial();

const borrowerRouter = Router();

borrowerRouter.use(authenticate, authorize('borrower'));

borrowerRouter.put(
  '/me/profile',
  validateBody(profileBodySchema),
  asyncHandler(borrowerController.updateProfile),
);

borrowerRouter.post(
  '/me/bre/check',
  validateBody(breCheckBodySchema),
  asyncHandler(borrowerController.checkBre),
);

borrowerRouter.post(
  '/me/salary-slip',
  handleSalarySlipUpload,
  asyncHandler(borrowerController.uploadSalarySlip),
);

borrowerRouter.get('/me/salary-slip/latest', asyncHandler(borrowerController.latestSalarySlip));

export { borrowerRouter };
