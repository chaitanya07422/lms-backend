import { Types } from 'mongoose';

import { Loan } from '../models/Loan';
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

type QueueCursor = { disbursedAt: string; id: string };

function encodeCursor(disbursedAt: Date, id: string): string {
  return Buffer.from(
    JSON.stringify({ disbursedAt: disbursedAt.toISOString(), id }),
    'utf8',
  ).toString('base64url');
}

function decodeCursor(raw: string): QueueCursor {
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as {
      disbursedAt?: unknown;
      id?: unknown;
    };
    if (
      typeof parsed.disbursedAt === 'string' &&
      typeof parsed.id === 'string' &&
      Types.ObjectId.isValid(parsed.id)
    ) {
      return { disbursedAt: parsed.disbursedAt, id: parsed.id };
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
  const filter: Record<string, unknown> = { status: 'DISBURSED' };

  if (query.cursor) {
    const cursor = decodeCursor(query.cursor);
    const cursorDate = new Date(cursor.disbursedAt);
    const cursorId = new Types.ObjectId(cursor.id);
    filter.$or = [
      { disbursedAt: { $lt: cursorDate } },
      { disbursedAt: cursorDate, _id: { $lt: cursorId } },
    ];
  }

  const loans = await Loan.find(filter)
    .sort({ disbursedAt: -1, _id: -1 })
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
    hasMore && last?.disbursedAt
      ? encodeCursor(last.disbursedAt, String(last._id))
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

export async function recordPayment(
  loanId: string,
  actorId: string,
  body: RecordPaymentBody,
): Promise<{ payment: PaymentDto; loan: LoanDto }> {
  const loan = await Loan.findById(loanId);
  if (!loan) {
    throw AppError.notFound('Loan not found');
  }
  if (loan.status !== 'DISBURSED') {
    throw AppError.conflict(`Cannot record payment for loan in status ${loan.status}`);
  }

  const outstanding = outstandingPaise(loan.totalRepaymentPaise, loan.totalPaidPaise);
  if (body.amountPaise > outstanding) {
    throw AppError.validation('Payment amount exceeds outstanding balance', [
      { outstandingPaise: outstanding, amountPaise: body.amountPaise },
    ]);
  }

  const paidAt = body.paidAt ? new Date(`${body.paidAt}T00:00:00.000Z`) : new Date();

  let payment: PaymentDocument;
  try {
    payment = await Payment.create({
      loanId: loan._id,
      recordedBy: new Types.ObjectId(actorId),
      utr: body.utr.trim(),
      amountPaise: body.amountPaise,
      paidAt,
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw AppError.conflict('UTR must be unique');
    }
    throw error;
  }

  loan.totalPaidPaise += body.amountPaise;
  if (loan.totalPaidPaise === loan.totalRepaymentPaise) {
    loan.status = 'CLOSED';
    loan.closedAt = new Date();
  }
  await loan.save();

  return {
    payment: toPaymentDto(payment),
    loan: toLoanDto(loan),
  };
}
