import { Schema, model, type Document, type InferSchemaType } from 'mongoose';

const salarySlipSchema = new Schema(
  {
    borrowerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    loanId: {
      type: Schema.Types.ObjectId,
      ref: 'Loan',
      default: null,
    },
    originalName: {
      type: String,
      required: true,
      trim: true,
    },
    mimeType: {
      type: String,
      required: true,
      enum: ['application/pdf', 'image/jpeg', 'image/png'],
    },
    sizeBytes: {
      type: Number,
      required: true,
      min: 1,
      max: 5_242_880,
    },
    storagePath: {
      type: String,
      required: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

salarySlipSchema.index({ borrowerId: 1, createdAt: -1 });

export type SalarySlipDocument = Document & InferSchemaType<typeof salarySlipSchema>;

export const SalarySlip = model('SalarySlip', salarySlipSchema);
