import mongoose from 'mongoose';

const accountSchema = new mongoose.Schema(
  {
    owner: {
      type: String,
      required: true,
      enum: ['shalom', 'elisheva'],
      unique: true,
    },
    openingBalance: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  { timestamps: true }
);

export const Account = mongoose.model('Account', accountSchema);