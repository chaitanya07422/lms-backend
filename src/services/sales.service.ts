import { ACTIVE_LOAN_STATUSES } from '../config/loan';
import { Loan } from '../models/Loan';
import { User } from '../models/User';
import { AppError } from '../utils/AppError';
import { toPublicUser } from './auth.service';

export async function listLeads(page: number, limit: number) {
  const activeBorrowerIds = await Loan.distinct('borrowerId', {
    status: { $in: [...ACTIVE_LOAN_STATUSES] },
  });

  const filter = {
    role: 'borrower' as const,
    _id: { $nin: activeBorrowerIds },
  };

  const [total, users] = await Promise.all([
    User.countDocuments(filter),
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
  ]);

  return {
    items: users.map((user) => ({
      id: String(user._id),
      email: user.email,
      fullName: user.fullName,
      profileComplete: user.profileComplete,
      createdAt: user.createdAt.toISOString(),
    })),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
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
