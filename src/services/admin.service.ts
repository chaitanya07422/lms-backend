import bcrypt from 'bcrypt';

import { ACTIVE_LOAN_STATUSES } from '../config/loan';
import { env } from '../config/env';
import { Loan } from '../models/Loan';
import { Payment } from '../models/Payment';
import { User } from '../models/User';
import { AppError } from '../utils/AppError';
import { isDuplicateKeyError } from '../utils/mongoErrors';
import type {
  AdminSummaryQuery,
  CreateUserBody,
} from '../validators/admin.validators';
import { toPublicUser, type PublicUser } from './auth.service';

/** Admin creates staff accounts (not borrowers). Does not issue a JWT for the new user. */
export async function createUserByAdmin(input: CreateUserBody): Promise<PublicUser> {
  const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_SALT_ROUNDS);

  try {
    const user = await User.create({
      email: input.email,
      passwordHash,
      fullName: input.fullName,
      role: input.role,
      profileComplete: false,
    });
    return toPublicUser(user);
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw AppError.conflict('Email is already registered');
    }
    throw error;
  }
}

export type AdminActivityItem = {
  loanId: string;
  loanRef: string;
  applicantName: string;
  event: string;
  by: string;
  at: string;
  /** Opaque cursor for this row (use last item’s cursor as next page cursor). */
  cursor: string;
};

type PopUser = { fullName?: string; role?: string } | null;

type ActivityBuild = Omit<AdminActivityItem, 'cursor'> & { sortKey: string };

function loanRef(id: string): string {
  return `LN-${id.slice(-8).toUpperCase()}`;
}

function roleLabel(role: string): string {
  if (!role) return 'Staff';
  return role.charAt(0).toUpperCase() + role.slice(1);
}

/** "Role · Name" for the admin activity By column. */
function byLine(actor: PopUser, fallbackRole: string, fallbackName?: string): string {
  const role = roleLabel(actor?.role ?? fallbackRole);
  const name = actor?.fullName?.trim() || fallbackName?.trim();
  return name ? `${role} · ${name}` : role;
}

function encodeCursor(at: string, sortKey: string): string {
  return Buffer.from(JSON.stringify({ at, k: sortKey }), 'utf8').toString('base64url');
}

function decodeCursor(raw: string): { at: string; k: string } {
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as {
      at?: unknown;
      k?: unknown;
    };
    if (typeof parsed.at === 'string' && typeof parsed.k === 'string') {
      return { at: parsed.at, k: parsed.k };
    }
  } catch {
    /* fall through */
  }
  throw AppError.validation('Invalid activity cursor');
}

/** True if item is strictly older than the cursor (desc timeline → next page). */
function isAfterCursor(item: ActivityBuild, cursor: { at: string; k: string }): boolean {
  if (item.at < cursor.at) return true;
  if (item.at > cursor.at) return false;
  return item.sortKey < cursor.k;
}

function compareActivityDesc(a: ActivityBuild, b: ActivityBuild): number {
  if (a.at !== b.at) return a.at < b.at ? 1 : -1;
  if (a.sortKey === b.sortKey) return 0;
  return a.sortKey < b.sortKey ? 1 : -1;
}

/** Counts by status + cursor-paginated lifecycle/payment activity for admin overview. */
export async function getAdminSummary(query: AdminSummaryQuery) {
  const limit = query.limit;
  const cursor = query.cursor ? decodeCursor(query.cursor) : null;

  const [
    applied,
    sanctioned,
    disbursed,
    closed,
    rejected,
    activeBorrowerIds,
    recentLoans,
    recentPayments,
  ] = await Promise.all([
    Loan.countDocuments({ status: 'APPLIED' }),
    Loan.countDocuments({ status: 'SANCTIONED' }),
    Loan.countDocuments({ status: 'DISBURSED' }),
    Loan.countDocuments({ status: 'CLOSED' }),
    Loan.countDocuments({ status: 'REJECTED' }),
    Loan.distinct('borrowerId', { status: { $in: [...ACTIVE_LOAN_STATUSES] } }),
    Loan.find()
      .sort({ updatedAt: -1 })
      .limit(200)
      .populate('borrowerId', 'fullName')
      .populate('sanctionedBy', 'fullName role')
      .populate('rejectedBy', 'fullName role')
      .populate('disbursedBy', 'fullName role'),
    Payment.find()
      .sort({ createdAt: -1 })
      .limit(200)
      .populate('recordedBy', 'fullName role')
      .populate({
        path: 'loanId',
        select: 'borrowerId',
        populate: { path: 'borrowerId', select: 'fullName' },
      }),
  ]);

  const leads = await User.countDocuments({
    role: 'borrower',
    _id: { $nin: activeBorrowerIds },
  });

  const activity: ActivityBuild[] = [];

  for (const loan of recentLoans) {
    const borrower = loan.borrowerId as unknown as { fullName?: string } | null;
    const name = borrower?.fullName ?? 'Borrower';
    const id = String(loan._id);
    const ref = loanRef(id);

    if (loan.closedAt) {
      activity.push({
        loanId: id,
        loanRef: ref,
        applicantName: name,
        event: 'Closed, balance reached zero',
        by: byLine(null, 'collection'),
        at: loan.closedAt.toISOString(),
        sortKey: `${id}:closed`,
      });
    }
    if (loan.disbursedAt) {
      const by = loan.disbursedBy as unknown as PopUser;
      activity.push({
        loanId: id,
        loanRef: ref,
        applicantName: name,
        event: 'Disbursed',
        by: byLine(by, 'disbursement'),
        at: loan.disbursedAt.toISOString(),
        sortKey: `${id}:disbursed`,
      });
    }
    if (loan.rejectedAt) {
      const by = loan.rejectedBy as unknown as PopUser;
      activity.push({
        loanId: id,
        loanRef: ref,
        applicantName: name,
        event: 'Rejected',
        by: byLine(by, 'sanction'),
        at: loan.rejectedAt.toISOString(),
        sortKey: `${id}:rejected`,
      });
    }
    if (loan.sanctionedAt) {
      const by = loan.sanctionedBy as unknown as PopUser;
      activity.push({
        loanId: id,
        loanRef: ref,
        applicantName: name,
        event: 'Sanctioned',
        by: byLine(by, 'sanction'),
        at: loan.sanctionedAt.toISOString(),
        sortKey: `${id}:sanctioned`,
      });
    }
    if (loan.appliedAt) {
      activity.push({
        loanId: id,
        loanRef: ref,
        applicantName: name,
        event: 'Application submitted',
        by: byLine(null, 'borrower', name),
        at: loan.appliedAt.toISOString(),
        sortKey: `${id}:applied`,
      });
    }
  }

  for (const payment of recentPayments) {
    const loanDoc = payment.loanId as unknown as {
      _id?: { toString(): string };
      borrowerId?: { fullName?: string };
    } | null;
    const recorder = payment.recordedBy as unknown as PopUser;
    const loanId = loanDoc?._id ? String(loanDoc._id) : String(payment.loanId);
    const paymentId = String(payment._id);
    const amountRupees = (payment.amountPaise / 100).toLocaleString('en-IN');
    activity.push({
      loanId,
      loanRef: loanRef(loanId),
      applicantName: loanDoc?.borrowerId?.fullName ?? 'Borrower',
      event: `Payment recorded · ₹${amountRupees}`,
      by: byLine(recorder, 'collection'),
      at: payment.createdAt.toISOString(),
      sortKey: `${loanId}:pay:${paymentId}`,
    });
  }

  activity.sort(compareActivityDesc);

  const afterCursor = cursor
    ? activity.filter((item) => isAfterCursor(item, cursor))
    : activity;

  const page = afterCursor.slice(0, limit);
  const hasMore = afterCursor.length > limit;
  const last = page[page.length - 1];
  const nextCursor =
    hasMore && last ? encodeCursor(last.at, last.sortKey) : null;

  const recentActivity: AdminActivityItem[] = page.map(({ sortKey, ...row }) => ({
    ...row,
    cursor: encodeCursor(row.at, sortKey),
  }));

  return {
    counts: { applied, sanctioned, disbursed, closed, rejected, leads },
    recentActivity,
    nextCursor,
    hasMore,
  };
}
