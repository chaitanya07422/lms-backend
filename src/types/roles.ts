export const USER_ROLES = [
  'admin',
  'sales',
  'sanction',
  'disbursement',
  'collection',
  'borrower',
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const EMPLOYMENT_MODES = ['Salaried', 'Self-Employed', 'Unemployed'] as const;

export type EmploymentMode = (typeof EMPLOYMENT_MODES)[number];
