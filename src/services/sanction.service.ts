import { Types } from 'mongoose';

import { Loan } from '../models/Loan';
import { SalarySlip } from '../models/SalarySlip';
import { User } from '../models/User';
import { AppError } from '../utils/AppError';
import { toPublicUser } from './auth.service';
import { toLoanDto, type LoanDto } from './loan.service';
import { toSalarySlipDto } from './salarySlip.service';

export async function listAppliedLoans(): Promise<
  Array<LoanDto & { borrowerName: string; borrowerEmail: string }>
> {
  const loans = await Loan.find({ status: 'APPLIED' }).sort({ appliedAt: -1 });
  const borrowerIds = loans.map((loan) => loan.borrowerId);
  const borrowers = await User.find({ _id: { $in: borrowerIds } });
  const byId = new Map(borrowers.map((b) => [String(b._id), b]));

  return loans.map((loan) => {
    const borrower = byId.get(String(loan.borrowerId));
    return {
      ...toLoanDto(loan),
      borrowerName: borrower?.fullName ?? 'Unknown',
      borrowerEmail: borrower?.email ?? '',
    };
  });
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
  const loan = await Loan.findById(loanId);
  if (!loan) {
    throw AppError.notFound('Loan not found');
  }
  if (loan.status !== 'APPLIED') {
    throw AppError.conflict(`Cannot approve loan in status ${loan.status}`);
  }

  loan.status = 'SANCTIONED';
  loan.sanctionedBy = new Types.ObjectId(actorId);
  loan.sanctionedAt = new Date();
  await loan.save();

  return toLoanDto(loan);
}

export async function rejectLoan(
  loanId: string,
  actorId: string,
  reason: string,
): Promise<LoanDto> {
  const loan = await Loan.findById(loanId);
  if (!loan) {
    throw AppError.notFound('Loan not found');
  }
  if (loan.status !== 'APPLIED') {
    throw AppError.conflict(`Cannot reject loan in status ${loan.status}`);
  }

  loan.status = 'REJECTED';
  loan.rejectionReason = reason;
  loan.rejectedBy = new Types.ObjectId(actorId);
  loan.rejectedAt = new Date();
  await loan.save();

  return toLoanDto(loan);
}
