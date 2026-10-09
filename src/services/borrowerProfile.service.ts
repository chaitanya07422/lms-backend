import { evaluateBre, type BreInput, type BreResult } from '../bre/evaluateBre';
import { User, type UserDocument } from '../models/User';
import type { EmploymentMode } from '../types/roles';
import { AppError } from '../utils/AppError';
import type { ProfileBody } from '../validators/borrower.validators';
import { toPublicUser, type PublicUser } from './auth.service';

function toBreInput(input: {
  dateOfBirth: Date;
  monthlySalaryPaise: number;
  pan: string;
  employmentMode: EmploymentMode;
}): BreInput {
  return {
    dateOfBirth: input.dateOfBirth,
    monthlySalaryPaise: input.monthlySalaryPaise,
    pan: input.pan,
    employmentMode: input.employmentMode,
  };
}

export async function updateBorrowerProfile(
  userId: string,
  body: ProfileBody,
): Promise<{ user: PublicUser; bre: BreResult }> {
  const user = await User.findById(userId);
  if (!user || user.role !== 'borrower') {
    throw AppError.forbidden('Only borrowers can update this profile');
  }

  const dateOfBirth = new Date(`${body.dateOfBirth}T00:00:00.000Z`);
  const bre = evaluateBre(
    toBreInput({
      dateOfBirth,
      monthlySalaryPaise: body.monthlySalaryPaise,
      pan: body.pan,
      employmentMode: body.employmentMode,
    }),
  );

  if (!bre.passed) {
    throw AppError.validation('Business rule checks failed', bre.failures);
  }

  user.fullName = body.fullName;
  user.pan = body.pan;
  user.dateOfBirth = dateOfBirth;
  user.monthlySalaryPaise = body.monthlySalaryPaise;
  user.employmentMode = body.employmentMode;
  user.profileComplete = true;
  await user.save();

  return { user: toPublicUser(user), bre };
}

export async function checkBreForBorrower(
  userId: string,
  body?: Partial<ProfileBody>,
): Promise<BreResult> {
  const user = await User.findById(userId);
  if (!user || user.role !== 'borrower') {
    throw AppError.forbidden('Only borrowers can run BRE checks');
  }

  const fullName = body?.fullName ?? user.fullName;
  const pan = body?.pan ?? user.pan;
  const monthlySalaryPaise = body?.monthlySalaryPaise ?? user.monthlySalaryPaise;
  const employmentMode = body?.employmentMode ?? user.employmentMode;
  const dateOfBirth =
    body?.dateOfBirth !== undefined
      ? new Date(`${body.dateOfBirth}T00:00:00.000Z`)
      : user.dateOfBirth;

  if (
    !fullName ||
    !pan ||
    monthlySalaryPaise == null ||
    !employmentMode ||
    !dateOfBirth
  ) {
    throw AppError.validation('Profile fields are incomplete for BRE check');
  }

  return evaluateBre(
    toBreInput({
      dateOfBirth,
      monthlySalaryPaise,
      pan,
      employmentMode: employmentMode as EmploymentMode,
    }),
  );
}

export function requireCompleteBorrowerProfile(user: UserDocument): BreInput {
  if (
    !user.profileComplete ||
    !user.pan ||
    !user.dateOfBirth ||
    user.monthlySalaryPaise == null ||
    !user.employmentMode
  ) {
    throw AppError.validation('Complete personal details before applying');
  }

  return {
    dateOfBirth: user.dateOfBirth,
    monthlySalaryPaise: user.monthlySalaryPaise,
    pan: user.pan,
    employmentMode: user.employmentMode as EmploymentMode,
  };
}
