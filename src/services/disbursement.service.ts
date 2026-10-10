import { Types } from 'mongoose';

import { Loan } from '../models/Loan';
import { User } from '../models/User';
import { AppError } from '../utils/AppError';
import { toLoanDto, type LoanDto } from './loan.service';

export async function listSanctionedLoans(): Promise<
  Array<LoanDto & { borrowerName: string; borrowerEmail: string; borrowerPan: string }>
> {
  const loans = await Loan.find({ status: 'SANCTIONED' }).sort({ sanctionedAt: -1 });
  const borrowers = await User.find({
    _id: { $in: loans.map((loan) => loan.borrowerId) },
  });
  const byId = new Map(borrowers.map((b) => [String(b._id), b]));

  return loans.map((loan) => {
    const borrower = byId.get(String(loan.borrowerId));
    return {
      ...toLoanDto(loan),
      borrowerName: borrower?.fullName ?? 'Unknown',
      borrowerEmail: borrower?.email ?? '',
      borrowerPan: borrower?.pan ?? '—',
    };
  });
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
