import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    account: {
      type: String,
      required: true,
      enum: ['shalom', 'elisheva'],
    },
    amount: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        'שכר דירה',
        'מזון וקניות',
        'יציאות ודייטים',
        'תחבורה',
        'בריאות',
        'ביגוד',
        'מנויים',
        'חיסכון',
        'הכנסה',
        'אחר',
      ],
    },
    addedBy: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

export const Transaction = mongoose.model('Transaction', transactionSchema);