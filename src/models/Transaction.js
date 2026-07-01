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
        // הוצאות
        'שכר דירה',
        'ניקוי עוסק פטור',
        'רואת חשבון',
        'חשמל',
        'מים',
        'אינטרנט',
        'AI',
        'מכונת כביסה',
        'נסיעות',
        'רפואה וויטמינים',
        'פארם',
        'קניות שבועיות',
        'יציאות',
        'אוכל בחוץ',
        'ביגוד והנעלה',
        'קניות גדולות',
        'רכב',
        'מעבר דירה',
        'מנוי חד פעמי',
        'בלת"ם',
        'אחר',
        // הכנסות
        'משכורת חודשית',
        'פוד-סטאמפס',
        'עבודות אחרות',
        'הכנסה',
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