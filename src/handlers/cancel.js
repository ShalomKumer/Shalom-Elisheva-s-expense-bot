import { Transaction } from '../models/Transaction.js';

export async function cancelLast(ctx) {
  const userId = ctx.from.id;

  // מציאת העסקה האחרונה של המשתמש
  const last = await Transaction.findOne({ addedBy: userId })
    .sort({ createdAt: -1 });

  if (!last) {
    await ctx.reply('אין עסקאות לביטול 📭');
    return;
  }

  const accountName = last.account === 'shalom' ? 'שלום' : 'אלישבע';
  const type = last.amount < 0 ? 'הוצאה' : 'הכנסה';
  const amount = Math.abs(last.amount);

  await Transaction.findByIdAndDelete(last._id);

  await ctx.reply(
    '↩️ *בוטלה הרשומה האחרונה:*\n\n' +
    `${type} של ${amount.toLocaleString('he-IL')}₪\n` +
    `קטגוריה: ${last.category}\n` +
    `חשבון: ${accountName}`,
    { parse_mode: 'Markdown' }
  );
}