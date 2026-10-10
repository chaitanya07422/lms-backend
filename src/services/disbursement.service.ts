import { Types } from 'mongoose';

import { Loan } from '../models/Loan';
import { User } from '../models/User';
import { AppError } from '../utils/AppError';
import type { CursorPaginationQuery } from '../validators/ops.validators';
import { toLoanDto, type LoanDto } from './loan.service';

export type DisbursementQueueItem = LoanDto & {
  borrowerName: string;
  borrowerEmail: string;
  borrowerPan: string;
};

type QueueCursor = { sanctionedAt: string; id: string };

function encodeCursor(sanctionedAt: Date, id: string): string {
  return Buffer.from(
    JSON.stringify({ sanctionedAt: sanctionedAt.toISOString(), id }),
    'utf8',
  ).toString('base64url');
}

function decodeCursor(raw: string): QueueCursor {
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as {
      sanctionedAt?: unknown;
      id?: unknown;
    };
    if (
      typeof parsed.sanctionedAt === 'string' &&
      typeof parsed.id === 'string' &&
      Types.ObjectId.isValid(parsed.id)
    ) {
      return { sanctionedAt: parsed.sanctionedAt, id: parsed.id };
    }
  } catch {
    /* fall through */
  }
  throw AppError.validation('Invalid queue cursor');
}

export async function listSanctionedLoans(query: CursorPaginationQuery): Promise<{
  items: DisbursementQueueItem[];
  nextCursor: string | null;
  hasMore: boolean;
}> {
  const limit = query.limit;
  const filter: Record<string, unknown> = { status: 'SANCTIONED' };

  if (query.cursor) {
    const cursor = decodeCursor(query.cursor);
    const cursorDate = new Date(cursor.sanctionedAt);
    const cursorId = new Types.ObjectId(cursor.id);
    filter.$or = [
      { sanctionedAt: { $lt: cursorDate } },
      { sanctionedAt: cursorDate, _id: { $lt: cursorId } },
    ];
  }

  const loans = await Loan.find(filter)
    .sort({ sanctionedAt: -1, _id: -1 })
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
      borrowerPan: borrower?.pan ?? '—',
    };
  });

  const last = page[page.length - 1];
  const nextCursor =
    hasMore && last?.sanctionedAt
      ? encodeCursor(last.sanctionedAt, String(last._id))
      : null;

  return { items, nextCursor, hasMore };
}

export async function getSanctionedLoanDetail(loanId: string): Promise<LoanDto> {
  const loan = await Loan.findById(loanId);
  if (!loan || loan.status !== 'SANCTIONED') {
    throw AppError.notFound('Sanctioned loan not found');
  }
  return toLoanDto(loan);
}

export async function disburseLoan(loanId: string, actorId: string): Promise<LoanDto> {
  const loan = await Loan.findById(loanId);
  if (!loan) {
    throw AppError.notFound('Loan not found');
  }
  if (loan.status !== 'SANCTIONED') {
    throw AppError.conflict(`Cannot disburse loan in status ${loan.status}`);
  }

  loan.status = 'DISBURSED';
  loan.disbursedBy = new Types.ObjectId(actorId);
  loan.disbursedAt = new Date();
  await loan.save();

  return toLoanDto(loan);
}
