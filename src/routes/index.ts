import { Router } from 'express';

import { adminRouter } from './admin.routes';
import { authRouter } from './auth.routes';
import { borrowerRouter } from './borrower.routes';
import { healthRouter } from './health.routes';
import { loanRouter } from './loan.routes';
import { salarySlipRouter } from './salarySlip.routes';

const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/ops/admin', adminRouter);
apiRouter.use('/borrowers', borrowerRouter);
apiRouter.use('/loans', loanRouter);
apiRouter.use('/salary-slips', salarySlipRouter);

export { apiRouter };
