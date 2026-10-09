import {
  MAX_AGE,
  MIN_AGE,
  MIN_MONTHLY_SALARY_PAISE,
  PAN_REGEX,
} from '../config/loan';
import type { EmploymentMode } from '../types/roles';

export interface BreInput {
  dateOfBirth: Date;
  monthlySalaryPaise: number;
  pan: string;
  employmentMode: EmploymentMode;
}

export interface BreFailure {
  rule: 'BRE-AGE' | 'BRE-SALARY' | 'BRE-PAN' | 'BRE-EMPLOYMENT';
  message: string;
}

export interface BreResult {
  passed: boolean;
  failures: BreFailure[];
}

/** Age in completed years using Asia/Kolkata calendar dates. */
export function ageInYearsKolkata(dateOfBirth: Date, now: Date = new Date()): number {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const [todayYear, todayMonth, todayDay] = fmt.format(now).split('-').map(Number);
  const [birthYear, birthMonth, birthDay] = fmt.format(dateOfBirth).split('-').map(Number);

  let age = todayYear - birthYear;
  if (todayMonth < birthMonth || (todayMonth === birthMonth && todayDay < birthDay)) {
    age -= 1;
  }
  return age;
}

export function evaluateBre(input: BreInput, now: Date = new Date()): BreResult {
  const failures: BreFailure[] = [];

  const age = ageInYearsKolkata(input.dateOfBirth, now);
  if (age < MIN_AGE || age > MAX_AGE) {
    failures.push({
      rule: 'BRE-AGE',
      message: `Age must be between ${MIN_AGE} and ${MAX_AGE}.`,
    });
  }

  if (input.monthlySalaryPaise < MIN_MONTHLY_SALARY_PAISE) {
    failures.push({
      rule: 'BRE-SALARY',
      message: 'Monthly salary must be at least ₹25,000.',
    });
  }

  const pan = input.pan.trim().toUpperCase();
  if (!PAN_REGEX.test(pan)) {
    failures.push({
      rule: 'BRE-PAN',
      message: 'PAN format is invalid.',
    });
  }

  if (input.employmentMode === 'Unemployed') {
    failures.push({
      rule: 'BRE-EMPLOYMENT',
      message: 'Unemployed applicants are not eligible.',
    });
  }

  return { passed: failures.length === 0, failures };
}
