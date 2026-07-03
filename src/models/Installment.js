import mongoose from 'mongoose';

const installmentSchema = new mongoose.Schema(
  {
    account: {
      type: String,
      required: true,
      enum: ['shalom', 'elisheva'],
    },
    name: {
      type: String,
      required: true,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    monthlyAmount: {
      type: Number,
      required: true,
    },
    totalMonths: {
      type: Number,
      required: true,
    },
    paidMonths: {
      type: Number,
      default: 0,
    },
    dayOfMonth: {
      type: Number,
      required: true,
    },
    firstPaymentDate: {
      type: Date,
      required: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
    addedBy: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

export const Installment = mongoose.model('Installment', installmentSchema);