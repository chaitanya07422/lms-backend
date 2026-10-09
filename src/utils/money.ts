import { INTEREST_RATE_ANNUAL } from '../config/loan';

/** Mathematical half-up to nearest integer (for non-negative values). */
export function roundHalfUp(value: number): number {
  return Math.floor(value + 0.5);
}

export function computeSimpleInterestPaise(
  principalPaise: number,
  tenureDays: number,
  rateAnnual: number = INTEREST_RATE_ANNUAL,
): number {
  const raw = (principalPaise * rateAnnual * tenureDays) / (365 * 100);
  return roundHalfUp(raw);
}

export function computeLoanQuote(
  principalPaise: number,
  tenureDays: number,
): {
  interestRateAnnual: number;
  interestPaise: number;
  totalRepaymentPaise: number;
} {
  const interestPaise = computeSimpleInterestPaise(principalPaise, tenureDays);
  return {
    interestRateAnnual: INTEREST_RATE_ANNUAL,
    interestPaise,
    totalRepaymentPaise: principalPaise + interestPaise,
  };
}

export function outstandingPaise(totalRepaymentPaise: number, totalPaidPaise: number): number {
  return totalRepaymentPaise - totalPaidPaise;
}
