import mongoose, { Types } from 'mongoose';

import { Loan, type LoanDocument } from '../models/Loan';
import { Payment, type PaymentDocument } from '../models/Payment';
import { User } from '../models/User';
import { AppError } from '../utils/AppError';
import { isDuplicateKeyError } from '../utils/mongoErrors';
import { outstandingPaise } from '../utils/money';
import type {
  CursorPaginationQuery,
  RecordPaymentBody,
} from '../validators/ops.validators';
import { toLoanDto, type LoanDto } from './loan.service';

export interface PaymentDto {
  id: string;
  loanId: string;
  utr: string;
  amountPaise: number;
  paidAt: string;
  recordedBy: string;
  createdAt: string;
}

function toPaymentDto(payment: PaymentDocument): PaymentDto {
  return {
    id: String(payment._id),
    loanId: String(payment.loanId),
    utr: payment.utr,
    amountPaise: payment.amountPaise,
    paidAt: payment.paidAt.toISOString(),
    recordedBy: String(payment.recordedBy),
    createdAt: (payment.createdAt ?? new Date()).toISOString(),
  };
}

type QueueStatus = 'DISBURSED' | 'CLOSED';
type QueueCursor = { status: QueueStatus; disbursedAt: string; id: string };

function encodeCursor(status: QueueStatus, disbursedAt: Date, id: string): string {
  return Buffer.from(
    JSON.stringify({ status, disbursedAt: disbursedAt.toISOString(), id }),
    'utf8',
  ).toString('base64url');
}

function decodeCursor(raw: string): QueueCursor {
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as {
      status?: unknown;
      disbursedAt?: unknown;
      id?: unknown;
    };
    if (
      (parsed.status === 'DISBURSED' || parsed.status === 'CLOSED') &&
      typeof parsed.disbursedAt === 'string' &&
      typeof parsed.id === 'string' &&
      Types.ObjectId.isValid(parsed.id)
    ) {
      return {
        status: parsed.status,
        disbursedAt: parsed.disbursedAt,
        id: parsed.id,
      };
    }
  } catch {
    /* fall through */
  }
  throw AppError.validation('Invalid queue cursor');
}

export async function listDisbursedLoans(query: CursorPaginationQuery): Promise<{
  items: Array<LoanDto & { borrowerName: string; borrowerEmail: string }>;
  nextCursor: string | null;
  hasMore: boolean;
}> {
  const limit = query.limit;
  const filter: Record<string, unknown> = {
    status: { $in: ['DISBURSED', 'CLOSED'] },
  };

  if (query.cursor) {
    const cursor = decodeCursor(query.cursor);
    const cursorDate = new Date(cursor.disbursedAt);
    const cursorId = new Types.ObjectId(cursor.id);
    // Sort: status DESC (DISBURSED before CLOSED), then disbursedAt/_id DESC.
    filter.$or = [
      { status: { $lt: cursor.status } },
      { status: cursor.status, disbursedAt: { $lt: cursorDate } },
      { status: cursor.status, disbursedAt: cursorDate, _id: { $lt: cursorId } },
    ];
  }

  const loans = await Loan.find(filter)
    .sort({ status: -1, disbursedAt: -1, _id: -1 })
    .limit(limit + 1);

  const hasMore = loans.length > limit;
  const page = hasMore ? loans.slice(0, limit) : loans;

  const borrowers = await User.find({
    _id: { $in: page.map((loan) => loan.borrowerId) },
  });
  const byId = new Map(borrowers.map((b) => [String(b._id), b]));

  const items = page.map((loan) => {
    const borrower = byId.get(String(loan.borrowerId));
    return {
      ...toLoanDto(loan),
      borrowerName: borrower?.fullName ?? 'Unknown',
      borrowerEmail: borrower?.email ?? '',
    };
  });

  const last = page[page.length - 1];
  const nextCursor =
    hasMore && last?.disbursedAt && (last.status === 'DISBURSED' || last.status === 'CLOSED')
      ? encodeCursor(last.status, last.disbursedAt, String(last._id))
      : null;

  return { items, nextCursor, hasMore };
}

export async function getCollectionLoanDetail(loanId: string): Promise<{
  loan: LoanDto & { borrowerName: string; borrowerEmail: string };
  payments: PaymentDto[];
}> {
  const loan = await Loan.findById(loanId);
  if (!loan || (loan.status !== 'DISBURSED' && loan.status !== 'CLOSED')) {
    throw AppError.notFound('Collection loan not found');
  }

  const [borrower, payments] = await Promise.all([
    User.findById(loan.borrowerId),
    Payment.find({ loanId }).sort({ paidAt: -1 }),
  ]);

  return {
    loan: {
      ...toLoanDto(loan),
      borrowerName: borrower?.fullName ?? 'Unknown',
      borrowerEmail: borrower?.email ?? '',
    },
    payments: payments.map(toPaymentDto),
  };
}

export async function listPayments(loanId: string): Promise<PaymentDto[]> {
  const loan = await Loan.findById(loanId);
  if (!loan || (loan.status !== 'DISBURSED' && loan.status !== 'CLOSED')) {
    throw AppError.notFound('Collection loan not found');
  }

  const payments = await Payment.find({ loanId }).sort({ paidAt: -1 });
  return payments.map(toPaymentDto);
}

function isTransactionUnsupported(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes('transaction numbers are only allowed') ||
    message.includes('replica set') ||
    message.includes('transactions are not supported')
  );
}

function assertPaymentAllowed(loan: LoanDocument, amountPaise: number): void {
  if (loan.status !== 'DISBURSED') {
    throw AppError.conflict(`Cannot record payment for loan in status ${loan.status}`);
  }
  const outstanding = outstandingPaise(loan.totalRepaymentPaise, loan.totalPaidPaise);
  if (amountPaise > outstanding) {
    throw AppError.validation('Payment amount exceeds outstanding balance', [
      { outstandingPaise: outstanding, amountPaise },
    ]);
  }
}

/** Apply amount only if still DISBURSED and amount fits outstanding (race-safe). */
async function applyPaymentToLoanAtomic(
  loanId: string | Types.ObjectId,
  amountPaise: number,
  session?: mongoose.ClientSession,
): Promise<LoanDocument | null> {
  const closedAt = new Date();
  return Loan.findOneAndUpdate(
    {
      _id: loanId,
      status: 'DISBURSED',
      $expr: {
        $lte: [{ $add: ['$totalPaidPaise', amountPaise] }, '$totalRepaymentPaise'],
      },
    },
    [
      {
        $set: {
          totalPaidPaise: { $add: ['$totalPaidPaise', amountPaise] },
          updatedAt: new Date(),
        },
      },
      {
        $set: {
          status: {
            $cond: [
              { $eq: ['$totalPaidPaise', '$totalRepaymentPaise'] },
              'CLOSED',
              '$status',
            ],
          },
          closedAt: {
            $cond: [
              { $eq: ['$totalPaidPaise', '$totalRepaymentPaise'] },
              closedAt,
              '$closedAt',
            ],
          },
        },
      },
    ],
    { new: true, session },
  );
}

async function createPaymentRecord(
  input: {
    loanId: Types.ObjectId;
    actorId: Types.ObjectId;
    utr: string;
    amountPaise: number;
    paidAt: Date;
  },
  session?: mongoose.ClientSession,
): Promise<PaymentDocument> {
  try {
    const created = await Payment.create(
      [
        {
          loanId: input.loanId,
          recordedBy: input.actorId,
          utr: input.utr,
          amountPaise: input.amountPaise,
          paidAt: input.paidAt,
        },
      ],
      session ? { session } : undefined,
    );
    const payment = created[0];
    if (!payment) {
      throw new Error('Payment create returned empty result');
    }
    return payment;
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw AppError.conflict('UTR must be unique');
    }
    throw error;
  }
}

async function rejectFailedLoanApply(loanId: string, amountPaise: number): Promise<never> {
  const loan = await Loan.findById(loanId);
  if (!loan) {
    throw AppError.notFound('Loan not found');
  }
  assertPaymentAllowed(loan, amountPaise);
  // Status/outstanding looked fine on re-read but atomic update lost the race.
  throw AppError.conflict('Could not record payment due to a concurrent update; retry');
}

/**
 * Record a payment with outstanding check applied atomically.
 * Prefers a multi-doc transaction (Atlas/replica set); falls back to
 * conditional loan update + compensating payment delete on standalone MongoDB.
 */
export async function recordPayment(
  loanId: string,
  actorId: string,
  body: RecordPaymentBody,
): Promise<{ payment: PaymentDto; loan: LoanDto }> {
  if (!Types.ObjectId.isValid(loanId)) {
    throw AppError.notFound('Loan not found');
  }

  const amountPaise = body.amountPaise;
  const utr = body.utr.trim();
  const paidAt = body.paidAt ? new Date(`${body.paidAt}T00:00:00.000Z`) : new Date();
  const loanObjectId = new Types.ObjectId(loanId);
  const actorObjectId = new Types.ObjectId(actorId);

  try {
    return await recordPaymentInTransaction({
      loanId,
      loanObjectId,
      actorObjectId,
      amountPaise,
      utr,
      paidAt,
    });
  } catch (error) {
    if (error instanceof AppError || !isTransactionUnsupported(error)) {
      throw error;
    }
    return recordPaymentStandaloneSafe({
      loanId,
      loanObjectId,
      actorObjectId,
      amountPaise,
      utr,
      paidAt,
    });
  }
}

async function recordPaymentInTransaction(input: {
  loanId: string;
  loanObjectId: Types.ObjectId;
  actorObjectId: Types.ObjectId;
  amountPaise: number;
  utr: string;
  paidAt: Date;
}): Promise<{ payment: PaymentDto; loan: LoanDto }> {
  const session = await mongoose.startSession();
  let payment!: PaymentDocument;
  let loan!: LoanDocument;

  try {
    await session.withTransaction(async () => {
      const current = await Loan.findById(input.loanObjectId).session(session);
      if (!current) {
        throw AppError.notFound('Loan not found');
      }
      assertPaymentAllowed(current, input.amountPaise);

      payment = await createPaymentRecord(
        {
          loanId: input.loanObjectId,
          actorId: input.actorObjectId,
          utr: input.utr,
          amountPaise: input.amountPaise,
          paidAt: input.paidAt,
        },
        session,
      );

      const updated = await applyPaymentToLoanAtomic(
        input.loanObjectId,
        input.amountPaise,
        session,
      );
      if (!updated) {
        throw AppError.conflict('Could not record payment due to a concurrent update; retry');
      }
      loan = updated;
    });
  } finally {
    await session.endSession();
  }

  return {
    payment: toPaymentDto(payment),
    loan: toLoanDto(loan),
  };
}

async function recordPaymentStandaloneSafe(input: {
  loanId: string;
  loanObjectId: Types.ObjectId;
  actorObjectId: Types.ObjectId;
  amountPaise: number;
  utr: string;
  paidAt: Date;
}): Promise<{ payment: PaymentDto; loan: LoanDto }> {
  const current = await Loan.findById(input.loanObjectId);
  if (!current) {
    throw AppError.notFound('Loan not found');
  }
  assertPaymentAllowed(current, input.amountPaise);

  const payment = await createPaymentRecord({
    loanId: input.loanObjectId,
    actorId: input.actorObjectId,
    utr: input.utr,
    amountPaise: input.amountPaise,
    paidAt: input.paidAt,
  });

  const updated = await applyPaymentToLoanAtomic(input.loanObjectId, input.amountPaise);
  if (!updated) {
    await Payment.deleteOne({ _id: payment._id });
    return rejectFailedLoanApply(input.loanId, input.amountPaise);
  }

  return {
    payment: toPaymentDto(payment),
    loan: toLoanDto(updated),
  };
}
