import { Transaction } from '../models/Transaction.js';

export async function showSummary(ctx) {
  // תחילת החודש הנוכחי
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const transactions = await Transaction.find({
    createdAt: { $gte: startOfMonth },
  });

  if (transactions.length === 0) {
    await ctx.reply('אין עסקאות החודש עדיין 📭');
    return;
  }

  // פירוט לפי חשבון וקטגוריה
  const shalom = {};
  const elisheva = {};

  for (const t of transactions) {
    const target = t.account === 'shalom' ? shalom : elisheva;
    if (!target[t.category]) target[t.category] = 0;
    target[t.category] += t.amount;
  }

  // בניית הודעה
  let msg = `📊 *סיכום ${now.toLocaleString('he-IL', { month: 'long' })} ${now.getFullYear()}*\n\n`;

  if (Object.keys(shalom).length > 0) {
    msg += '👤 *שלום:*\n';
    for (const [cat, amount] of Object.entries(shalom)) {
      const emoji = amount < 0 ? '💸' : '💰';
      msg += `${emoji} ${cat}: ${Math.abs(amount).toLocaleString('he-IL')}₪\n`;
    }
    const totalShalom = Object.values(shalom).reduce((s, a) => s + a, 0);
    msg += `*סה"כ: ${totalShalom.toLocaleString('he-IL')}₪*\n\n`;
  }

  if (Object.keys(elisheva).length > 0) {
    msg += '👩 *אלישבע:*\n';
    for (const [cat, amount] of Object.entries(elisheva)) {
      const emoji = amount < 0 ? '💸' : '💰';
      msg += `${emoji} ${cat}: ${Math.abs(amount).toLocaleString('he-IL')}₪\n`;
    }
    const totalElisheva = Object.values(elisheva).reduce((s, a) => s + a, 0);
    msg += `*סה"כ: ${totalElisheva.toLocaleString('he-IL')}₪*\n`;
  }

  await ctx.reply(msg, { parse_mode: 'Markdown' });
}