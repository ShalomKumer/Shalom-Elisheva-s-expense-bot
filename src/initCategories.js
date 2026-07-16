import 'dotenv/config';
import { connectDB } from './db.js';
import { Category } from './models/Category.js';

await connectDB();

const categories = [
  // הוצאות חד פעמיות
  { name: 'שכר דירה', type: 'expense', subType: 'one-time' },
  { name: 'ניקוי עוסק פטור', type: 'expense', subType: 'one-time' },
  { name: 'רואת חשבון', type: 'expense', subType: 'one-time' },
  { name: 'חשמל', type: 'expense', subType: 'one-time' },
  { name: 'מים', type: 'expense', subType: 'one-time' },
  { name: 'אינטרנט', type: 'expense', subType: 'one-time' },
  { name: 'AI', type: 'expense', subType: 'one-time' },
  { name: 'מכונת כביסה', type: 'expense', subType: 'one-time' },
  { name: 'נסיעות', type: 'expense', subType: 'one-time' },
  { name: 'רפואה וויטמינים', type: 'expense', subType: 'one-time' },
  { name: 'פארם', type: 'expense', subType: 'one-time' },
  { name: 'קניות שבועיות', type: 'expense', subType: 'one-time' },
  { name: 'יציאות', type: 'expense', subType: 'one-time' },
  { name: 'אוכל בחוץ', type: 'expense', subType: 'one-time' },
  { name: 'ביגוד והנעלה', type: 'expense', subType: 'one-time' },
  { name: 'רכב', type: 'expense', subType: 'one-time' },
  { name: 'מעבר דירה', type: 'expense', subType: 'one-time' },
  { name: 'מנוי חד פעמי', type: 'expense', subType: 'one-time' },
  { name: 'בלת"ם', type: 'expense', subType: 'one-time' },
  { name: 'אחר', type: 'expense', subType: 'one-time' },
  // הוצאות בתשלומים
  { name: 'קניות גדולות', type: 'expense', subType: 'installments' },
  // הכנסות חד פעמיות
  { name: 'משכורת חודשית', type: 'income', subType: 'one-time' },
  { name: 'סכום תקופתי', type: 'income', subType: 'one-time' },
  { name: 'עבודות אחרות', type: 'income', subType: 'one-time' },
  { name: 'אחר', type: 'income', subType: 'one-time' },
];

for (const cat of categories) {
  await Category.findOneAndUpdate(
    { name: cat.name, type: cat.type },
    cat,
    { upsert: true, returnDocument: 'after' }
  );
}

console.log('✅ קטגוריות אותחלו בהצלחה!');
process.exit(0);