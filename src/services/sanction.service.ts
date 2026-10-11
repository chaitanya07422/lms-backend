import { Types } from 'mongoose';

import { Loan } from '../models/Loan';
import { SalarySlip } from '../models/SalarySlip';
import { User } from '../models/User';
import { AppError } from '../utils/AppError';
import type { CursorPaginationQuery } from '../validators/ops.validators';
import { toPublicUser } from './auth.service';
import { toLoanDto, type LoanDto } from './loan.service';
import { toSalarySlipDto } from './salarySlip.service';

export type SanctionQueueItem = LoanDto & {
  borrowerName: string;
  borrowerEmail: string;
  borrowerPan: string;
};

type QueueCursor = { appliedAt: string; id: string };

function encodeCursor(appliedAt: Date, id: string): string {
  return Buffer.from(
    JSON.stringify({ appliedAt: appliedAt.toISOString(), id }),
    'utf8',
  ).toString('base64url');
}

function decodeCursor(raw: string): QueueCursor {
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as {
      appliedAt?: unknown;
      id?: unknown;
    };
    if (
      typeof parsed.appliedAt === 'string' &&
      typeof parsed.id === 'string' &&
      Types.ObjectId.isValid(parsed.id)
    ) {
      return { appliedAt: parsed.appliedAt, id: parsed.id };
    }
  } catch {
    /* fall through */
  }
  throw AppError.validation('Invalid queue cursor');
}

export async function listAppliedLoans(query: CursorPaginationQuery): Promise<{
  items: SanctionQueueItem[];
  nextCursor: string | null;
  hasMore: boolean;
}> {
  const limit = query.limit;
  const filter: Record<string, unknown> = { status: 'APPLIED' };

  if (query.cursor) {
    const cursor = decodeCursor(query.cursor);
    const cursorDate = new Date(cursor.appliedAt);
    const cursorId = new Types.ObjectId(cursor.id);
    filter.$or = [
      { appliedAt: { $lt: cursorDate } },
      { appliedAt: cursorDate, _id: { $lt: cursorId } },
    ];
  }

  const loans = await Loan.find(filter)
    .sort({ appliedAt: -1, _id: -1 })
    .limit(limit + 1);

  const hasMore = loans.length > limit;
  const page = hasMore ? loans.slice(0, limit) : loans;

  const borrowerIds = page.map((loan) => loan.borrowerId);
  const borrowers = await User.find({ _id: { $in: borrowerIds } });
  const byId = new Map(borrowers.map((b) => [String(b._id), b]));

  const items = page.map((loan) => {
    const borrower = byId.get(String(loan.borrowerId));
    return {
      ...toLoanDto(loan),
      borrowerName: borrower?.fullName ?? 'Unknown',
      borrowerEmail: borrower?.email ?? '',
      borrowerPan: borrower?.pan ?? '—',
    };
  });

  const last = page[page.length - 1];
  const nextCursor =
    hasMore && last?.appliedAt
      ? encodeCursor(last.appliedAt, String(last._id))
      : null;

  return { items, nextCursor, hasMore };
}

export async function getAppliedLoanDetail(loanId: string) {
  const loan = await Loan.findById(loanId);
  if (!loan || loan.status !== 'APPLIED') {
    throw AppError.notFound('Applied loan not found');
  }

  const [borrower, slip] = await Promise.all([
    User.findById(loan.borrowerId),
    SalarySlip.findById(loan.salarySlipId),
  ]);

  if (!borrower) {
    throw AppError.notFound('Borrower not found');
  }

  return {
    loan: toLoanDto(loan),
    borrower: toPublicUser(borrower),
    salarySlip: slip ? toSalarySlipDto(slip) : null,
  };
}

export async function approveLoan(loanId: string, actorId: string): Promise<LoanDto> {
  const now = new Date();
  const loan = await Loan.findOneAndUpdate(
    { _id: loanId, status: 'APPLIED' },
    {
      $set: {
        status: 'SANCTIONED',
        sanctionedBy: new Types.ObjectId(actorId),
        sanctionedAt: now,
      },
    },
    { new: true },
  );

  if (!loan) {
    const existing = await Loan.findById(loanId);
    if (!existing) {
      throw AppError.notFound('Loan not found');
    }
    throw AppError.conflict(`Cannot approve loan in status ${existing.status}`);
  }

  return toLoanDto(loan);
}

export async function rejectLoan(
  loanId: string,
  actorId: string,
  reason: string,
): Promise<LoanDto> {
  const now = new Date();
  const loan = await Loan.findOneAndUpdate(
    { _id: loanId, status: 'APPLIED' },
    {
      $set: {
        status: 'REJECTED',
        rejectionReason: reason,
        rejectedBy: new Types.ObjectId(actorId),
        rejectedAt: now,
      },
    },
    { new: true },
  );

  if (!loan) {
    const existing = await Loan.findById(loanId);
    if (!existing) {
      throw AppError.notFound('Loan not found');
    }
    throw AppError.conflict(`Cannot reject loan in status ${existing.status}`);
  }

  return toLoanDto(loan);
}
