export const INTEREST_RATE_ANNUAL = 12;

export const MIN_PRINCIPAL_PAISE = 5_000_000; // ₹50,000
export const MAX_PRINCIPAL_PAISE = 50_000_000; // ₹5,00,000

export const MIN_TENURE_DAYS = 30;
export const MAX_TENURE_DAYS = 365;

export const MIN_MONTHLY_SALARY_PAISE = 2_500_000; // ₹25,000

export const MIN_AGE = 23;
export const MAX_AGE = 50;

export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

export const ACTIVE_LOAN_STATUSES = ['APPLIED', 'SANCTIONED', 'DISBURSED'] as const;

export const LOAN_STATUSES = [
  'APPLIED',
  'SANCTIONED',
  'REJECTED',
  'DISBURSED',
  'CLOSED',
] as const;

export type LoanStatus = (typeof LOAN_STATUSES)[number];
