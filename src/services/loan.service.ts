import { evaluateBre } from '../bre/evaluateBre';
import { ACTIVE_LOAN_STATUSES, INTEREST_RATE_ANNUAL } from '../config/loan';
import { Loan, type LoanDocument } from '../models/Loan';
import { Payment } from '../models/Payment';
import { SalarySlip } from '../models/SalarySlip';
import { User } from '../models/User';
import { AppError } from '../utils/AppError';
import { computeLoanQuote, outstandingPaise } from '../utils/money';
import type { LoanApplyBody, LoanPreviewBody } from '../validators/loan.validators';
import { requireCompleteBorrowerProfile } from './borrowerProfile.service';

export interface LoanDto {
  id: string;
  borrowerId: string;
  salarySlipId: string;
  status: string;
  principalPaise: number;
  tenureDays: number;
  interestRateAnnual: number;
  interestPaise: number;
  totalRepaymentPaise: number;
  totalPaidPaise: number;
  outstandingPaise: number;
  rejectionReason?: string;
  appliedAt: string;
  sanctionedAt?: string;
  rejectedAt?: string;
  disbursedAt?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
}

function toLoanDto(loan: LoanDocument): LoanDto {
  const dto: LoanDto = {
    id: String(loan._id),
    borrowerId: String(loan.borrowerId),
    salarySlipId: String(loan.salarySlipId),
    status: loan.status,
    principalPaise: loan.principalPaise,
    tenureDays: loan.tenureDays,
    interestRateAnnual: loan.interestRateAnnual,
    interestPaise: loan.interestPaise,
    totalRepaymentPaise: loan.totalRepaymentPaise,
    totalPaidPaise: loan.totalPaidPaise,
    outstandingPaise: outstandingPaise(loan.totalRepaymentPaise, loan.totalPaidPaise),
    appliedAt: loan.appliedAt.toISOString(),
    createdAt: loan.createdAt.toISOString(),
    updatedAt: loan.updatedAt.toISOString(),
  };

  if (loan.rejectionReason) dto.rejectionReason = loan.rejectionReason;
  if (loan.sanctionedAt) dto.sanctionedAt = loan.sanctionedAt.toISOString();
  if (loan.rejectedAt) dto.rejectedAt = loan.rejectedAt.toISOString();
  if (loan.disbursedAt) dto.disbursedAt = loan.disbursedAt.toISOString();
  if (loan.closedAt) dto.closedAt = loan.closedAt.toISOString();

  return dto;
}

export function previewLoan(body: LoanPreviewBody) {
  return computeLoanQuote(body.principalPaise, body.tenureDays);
}

export async function applyForLoan(borrowerId: string, body: LoanApplyBody): Promise<LoanDto> {
  const user = await User.findById(borrowerId);
  if (!user || user.role !== 'borrower') {
    throw AppError.forbidden('Only borrowers can apply for loans');
  }

  const breInput = requireCompleteBorrowerProfile(user);
  const bre = evaluateBre(breInput);
  if (!bre.passed) {
    throw AppError.validation('Business rule checks failed', bre.failures);
  }

  const active = await Loan.findOne({
    borrowerId,
    status: { $in: [...ACTIVE_LOAN_STATUSES] },
  });
  if (active) {
    throw AppError.conflict('An active loan application already exists');
  }

  const slip = await SalarySlip.findById(body.salarySlipId);
  if (!slip || String(slip.borrowerId) !== borrowerId) {
    throw AppError.validation('Valid salary slip is required');
  }
  if (slip.loanId) {
    throw AppError.conflict('Salary slip is already linked to another loan');
  }

  const quote = computeLoanQuote(body.principalPaise, body.tenureDays);
  const now = new Date();

  const loan = await Loan.create({
    borrowerId,
    salarySlipId: slip._id,
    status: 'APPLIED',
    principalPaise: body.principalPaise,
    tenureDays: body.tenureDays,
    interestRateAnnual: INTEREST_RATE_ANNUAL,
    interestPaise: quote.interestPaise,
    totalRepaymentPaise: quote.totalRepaymentPaise,
    totalPaidPaise: 0,
    appliedAt: now,
  });

  slip.loanId = loan._id;
  await slip.save();

  return toLoanDto(loan);
}

export async function listMyLoans(borrowerId: string): Promise<LoanDto[]> {
  const loans = await Loan.find({ borrowerId }).sort({ createdAt: -1 });
  return loans.map(toLoanDto);
}

export async function getMyLoanDetail(
  borrowerId: string,
  loanId: string,
): Promise<{ loan: LoanDto; payments: Array<{
  id: string;
  utr: string;
  amountPaise: number;
  paidAt: string;
  createdAt: string;
}> }> {
  const loan = await Loan.findById(loanId);
  if (!loan || String(loan.borrowerId) !== borrowerId) {
    throw AppError.notFound('Loan not found');
  }

  const payments = await Payment.find({ loanId }).sort({ paidAt: -1 });

  return {
    loan: toLoanDto(loan),
    payments: payments.map((p) => ({
      id: String(p._id),
      utr: p.utr,
      amountPaise: p.amountPaise,
      paidAt: p.paidAt.toISOString(),
      createdAt: p.createdAt.toISOString(),
    })),
  };
}
