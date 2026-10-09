import { Schema, model, type Document, type InferSchemaType } from 'mongoose';

import { EMPLOYMENT_MODES, USER_ROLES } from '../types/roles';

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: USER_ROLES,
      required: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    pan: {
      type: String,
      uppercase: true,
      trim: true,
    },
    dateOfBirth: {
      type: Date,
    },
    monthlySalaryPaise: {
      type: Number,
      min: 0,
    },
    employmentMode: {
      type: String,
      enum: EMPLOYMENT_MODES,
    },
    profileComplete: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

userSchema.index({ role: 1, createdAt: -1 });

export type UserDocument = Document & InferSchemaType<typeof userSchema>;

export const User = model('User', userSchema);
