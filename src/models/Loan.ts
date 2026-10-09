import { Schema, model, type Document, type InferSchemaType } from 'mongoose';

import { INTEREST_RATE_ANNUAL, LOAN_STATUSES } from '../config/loan';

const loanSchema = new Schema(
  {
    borrowerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    salarySlipId: {
      type: Schema.Types.ObjectId,
      ref: 'SalarySlip',
      required: true,
    },
    status: {
      type: String,
      enum: LOAN_STATUSES,
      required: true,
      default: 'APPLIED',
    },
    principalPaise: {
      type: Number,
      required: true,
      min: 5_000_000,
      max: 50_000_000,
    },
    tenureDays: {
      type: Number,
      required: true,
      min: 30,
      max: 365,
    },
    interestRateAnnual: {
      type: Number,
      required: true,
      default: INTEREST_RATE_ANNUAL,
    },
    interestPaise: {
      type: Number,
      required: true,
      min: 0,
    },
    totalRepaymentPaise: {
      type: Number,
      required: true,
      min: 0,
    },
    totalPaidPaise: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
    sanctionedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    rejectedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    disbursedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    appliedAt: { type: Date, required: true },
    sanctionedAt: { type: Date },
    rejectedAt: { type: Date },
    disbursedAt: { type: Date },
    closedAt: { type: Date },
  },
  { timestamps: true },
);

loanSchema.index({ status: 1, appliedAt: -1 });
loanSchema.index({ borrowerId: 1, status: 1 });
loanSchema.index({ borrowerId: 1, createdAt: -1 });

export type LoanDocument = Document & InferSchemaType<typeof loanSchema>;

export const Loan = model('Loan', loanSchema);
