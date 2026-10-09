import { Router } from 'express';

import * as salarySlipController from '../controllers/salarySlip.controller';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const salarySlipRouter = Router();

salarySlipRouter.get('/:id/download', authenticate, asyncHandler(salarySlipController.download));

export { salarySlipRouter };
