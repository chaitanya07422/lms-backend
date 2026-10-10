import { Types } from 'mongoose';

import { ACTIVE_LOAN_STATUSES } from '../config/loan';
import { Loan } from '../models/Loan';
import { SalarySlip } from '../models/SalarySlip';
import { User } from '../models/User';
import { AppError } from '../utils/AppError';
import type { CursorPaginationQuery } from '../validators/ops.validators';
import { toPublicUser } from './auth.service';

type LeadCursor = { createdAt: string; id: string };

function encodeCursor(createdAt: Date, id: string): string {
  return Buffer.from(
    JSON.stringify({ createdAt: createdAt.toISOString(), id }),
    'utf8',
  ).toString('base64url');
}

function decodeCursor(raw: string): LeadCursor {
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as {
      createdAt?: unknown;
      id?: unknown;
    };
    if (
      typeof parsed.createdAt === 'string' &&
      typeof parsed.id === 'string' &&
      Types.ObjectId.isValid(parsed.id)
    ) {
      return { createdAt: parsed.createdAt, id: parsed.id };
    }
  } catch {
    /* fall through */
  }
  throw AppError.validation('Invalid queue cursor');
}

export async function listLeads(query: CursorPaginationQuery) {
  const activeBorrowerIds = await Loan.distinct('borrowerId', {
    status: { $in: [...ACTIVE_LOAN_STATUSES] },
  });

  const filter: Record<string, unknown> = {
    role: 'borrower',
    _id: { $nin: activeBorrowerIds },
  };

  if (query.cursor) {
    const cursor = decodeCursor(query.cursor);
    const cursorDate = new Date(cursor.createdAt);
    const cursorId = new Types.ObjectId(cursor.id);
    filter.$or = [
      { createdAt: { $lt: cursorDate } },
      { createdAt: cursorDate, _id: { $lt: cursorId } },
    ];
  }

  const limit = query.limit;
  const users = await User.find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1);

  const hasMore = users.length > limit;
  const page = hasMore ? users.slice(0, limit) : users;

  const userIds = page.map((u) => u._id);
  const slips = await SalarySlip.find({ borrowerId: { $in: userIds } }).select('borrowerId');
  const slipSet = new Set(slips.map((s) => String(s.borrowerId)));

  const items = page.map((user) => {
    const hasSalarySlip = slipSet.has(String(user._id));
    let progress: 'SIGNED_UP' | 'DETAILS_DONE' | 'SLIP_UPLOADED' = 'SIGNED_UP';
    if (hasSalarySlip) {
      progress = 'SLIP_UPLOADED';
    } else if (user.profileComplete) {
      progress = 'DETAILS_DONE';
    }
    return {
      id: String(user._id),
      email: user.email,
      fullName: user.fullName,
      profileComplete: user.profileComplete,
      hasSalarySlip,
      progress,
      createdAt: user.createdAt.toISOString(),
    };
  });

  const last = page[page.length - 1];
  const nextCursor =
    hasMore && last?.createdAt ? encodeCursor(last.createdAt, String(last._id)) : null;

  return { items, nextCursor, hasMore };
}

export async function getLeadDetail(userId: string) {
  const user = await User.findById(userId);
  if (!user || user.role !== 'borrower') {
    throw AppError.notFound('Lead not found');
  }

  const active = await Loan.findOne({
    borrowerId: user._id,
    status: { $in: [...ACTIVE_LOAN_STATUSES] },
  });
  if (active) {
    throw AppError.notFound('Lead not found');
  }

  return toPublicUser(user);
}
