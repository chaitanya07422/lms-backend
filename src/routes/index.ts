import { Router } from 'express';

import { adminRouter } from './admin.routes';
import { authRouter } from './auth.routes';
import { borrowerRouter } from './borrower.routes';
import { collectionRouter } from './collection.routes';
import { disbursementRouter } from './disbursement.routes';
import { healthRouter } from './health.routes';
import { loanRouter } from './loan.routes';
import { salarySlipRouter } from './salarySlip.routes';
import { salesRouter } from './sales.routes';
import { sanctionRouter } from './sanction.routes';

const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/ops/admin', adminRouter);
apiRouter.use('/ops/sales', salesRouter);
apiRouter.use('/ops/sanction', sanctionRouter);
apiRouter.use('/ops/disbursement', disbursementRouter);
apiRouter.use('/ops/collection', collectionRouter);
apiRouter.use('/borrowers', borrowerRouter);
apiRouter.use('/loans', loanRouter);
apiRouter.use('/salary-slips', salarySlipRouter);

export { apiRouter };
