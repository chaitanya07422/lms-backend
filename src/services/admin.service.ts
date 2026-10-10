import bcrypt from 'bcrypt';

import { ACTIVE_LOAN_STATUSES } from '../config/loan';
import { env } from '../config/env';
import { Loan } from '../models/Loan';
import { Payment } from '../models/Payment';
import { User } from '../models/User';
import { AppError } from '../utils/AppError';
import { isDuplicateKeyError } from '../utils/mongoErrors';
import type { CreateUserBody } from '../validators/admin.validators';
import { toPublicUser, type PublicUser } from './auth.service';

/** Admin creates any role account. Does not issue a JWT for the new user. */
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
};

function loanRef(id: string): string {
  return `LN-${id.slice(-8).toUpperCase()}`;
}

/** Counts by status + recent lifecycle/payment events for the admin overview. */
export async function getAdminSummary() {
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
      .limit(40)
      .populate('borrowerId', 'fullName')
      .populate('sanctionedBy', 'fullName role')
      .populate('rejectedBy', 'fullName role')
      .populate('disbursedBy', 'fullName role'),
    Payment.find()
      .sort({ createdAt: -1 })
      .limit(20)
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

  type PopUser = { fullName?: string; role?: string } | null;

  const activity: AdminActivityItem[] = [];

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
        by: 'Collection',
        at: loan.closedAt.toISOString(),
      });
    }
    if (loan.disbursedAt) {
      const by = loan.disbursedBy as unknown as PopUser;
      activity.push({
        loanId: id,
        loanRef: ref,
        applicantName: name,
        event: 'Disbursed',
        by: by?.fullName ?? 'Disbursement',
        at: loan.disbursedAt.toISOString(),
      });
    }
    if (loan.rejectedAt) {
      const by = loan.rejectedBy as unknown as PopUser;
      activity.push({
        loanId: id,
        loanRef: ref,
        applicantName: name,
        event: 'Rejected',
        by: by?.fullName ?? 'Sanction',
        at: loan.rejectedAt.toISOString(),
      });
    }
    if (loan.sanctionedAt) {
      const by = loan.sanctionedBy as unknown as PopUser;
      activity.push({
        loanId: id,
        loanRef: ref,
        applicantName: name,
        event: 'Sanctioned',
        by: by?.fullName ?? 'Sanction',
        at: loan.sanctionedAt.toISOString(),
      });
    }
    if (loan.appliedAt) {
      activity.push({
        loanId: id,
        loanRef: ref,
        applicantName: name,
        event: 'Application submitted',
        by: 'Borrower',
        at: loan.appliedAt.toISOString(),
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
    const amountRupees = (payment.amountPaise / 100).toLocaleString('en-IN');
    activity.push({
      loanId,
      loanRef: loanRef(loanId),
      applicantName: loanDoc?.borrowerId?.fullName ?? 'Borrower',
      event: `Payment recorded · ₹${amountRupees}`,
      by: recorder?.fullName ?? 'Collection',
      at: payment.createdAt.toISOString(),
    });
  }

  activity.sort((a, b) => (a.at < b.at ? 1 : -1));

  return {
    counts: { applied, sanctioned, disbursed, closed, rejected, leads },
    recentActivity: activity.slice(0, 12),
  };
}
