import { Schema, model, type Document, type InferSchemaType } from 'mongoose';

const paymentSchema = new Schema(
  {
    loanId: {
      type: Schema.Types.ObjectId,
      ref: 'Loan',
      required: true,
    },
    recordedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    utr: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    amountPaise: {
      type: Number,
      required: true,
      min: 1,
    },
    paidAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

paymentSchema.index({ loanId: 1, paidAt: -1 });

export type PaymentDocument = Document & InferSchemaType<typeof paymentSchema>;

export const Payment = model('Payment', paymentSchema);
