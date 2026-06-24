import { Account } from '../models/Account.js';
import { Transaction } from '../models/Transaction.js';

export async function showBalance(ctx) {
  // שליפת שני החשבונות
  const shalomAccount = await Account.findOne({ owner: 'shalom' });
  const elishevaAccount = await Account.findOne({ owner: 'elisheva' });

  // סכום כל העסקאות לכל חשבון
  const shalomTransactions = await Transaction.find({ account: 'shalom' });
  const elishevaTransactions = await Transaction.find({ account: 'elisheva' });

  const shalomTotal = shalomTransactions.reduce((sum, t) => sum + t.amount, 0);
  const elishevaTotal = elishevaTransactions.reduce((sum, t) => sum + t.amount, 0);

  const shalomBalance = shalomAccount.openingBalance + shalomTotal;
  const elishevaBalance = elishevaAccount.openingBalance + elishevaTotal;
  const combinedBalance = shalomBalance + elishevaBalance;

  await ctx.reply(
    '💳 *מצב החשבונות*\n\n' +
    `👤 שלום: *${shalomBalance.toLocaleString('he-IL')}₪*\n` +
    `👩 אלישבע: *${elishevaBalance.toLocaleString('he-IL')}₪*\n\n` +
    `💰 סה"כ משק בית: *${combinedBalance.toLocaleString('he-IL')}₪*`,
    { parse_mode: 'Markdown' }
  );
}