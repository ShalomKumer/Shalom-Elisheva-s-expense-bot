import 'dotenv/config';
import { connectDB } from './db.js';
import { Account } from './models/Account.js';

await connectDB();

// יתרות פתיחה — שנה את המספרים לפי המצב האמיתי בחשבונות שלכם היום
await Account.findOneAndUpdate(
  { owner: 'shalom' },
  { owner: 'shalom', openingBalance: 0 },
  { upsert: true, new: true }
);

await Account.findOneAndUpdate(
  { owner: 'elisheva' },
  { owner: 'elisheva', openingBalance: 0 },
  { upsert: true, new: true }
);

console.log('✅ החשבונות אותחלו בהצלחה!');
process.exit(0);