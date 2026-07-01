import { InlineKeyboard } from 'grammy';
import { Transaction } from '../models/Transaction.js';

const MONTHS_HE = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל',
  'מאי', 'יוני', 'יולי', 'אוגוסט',
  'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
];

export async function showSummary(ctx) {
  const now = new Date();
  const year = now.getFullYear();

  const keyboard = new InlineKeyboard();
  MONTHS_HE.forEach((month, i) => {
    keyboard.text(month, `summary_${i}`);
    if (i % 3 === 2) keyboard.row();
  });

  await ctx.reply(`בחר חודש לסיכום (${year}):`, { reply_markup: keyboard });
}

export async function handleSummaryMonth(ctx) {
  const monthIndex = parseInt(ctx.callbackQuery.data.replace('summary_', ''));
  const now = new Date();
  const year = now.getFullYear();

  await ctx.answerCallbackQuery();

  const startOfMonth = new Date(year, monthIndex, 1);
  const endOfMonth = new Date(year, monthIndex + 1, 0, 23, 59, 59);

  const transactions = await Transaction.find({
    createdAt: { $gte: startOfMonth, $lte: endOfMonth },
  });

  const monthName = MONTHS_HE[monthIndex];
  const now2 = new Date();
  const updateTime = now2.toLocaleString('he-IL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  if (transactions.length === 0) {
    await ctx.reply(`📊 סיכום ${monthName} ${year}\n\nאין מידע בחודש ${monthName} 📭\n\nעודכן: ${updateTime}`);
    return;
  }

  // פירוט לפי חשבון וקטגוריה
  const shalom = {};
  const elisheva = {};

  for (const t of transactions) {
    const target = t.account === 'shalom' ? shalom : elisheva;
    if (!target[t.category]) target[t.category] = { total: 0, items: [] };
    target[t.category].total += t.amount;
    if (t.description !== t.category) {
      target[t.category].items.push({ desc: t.description, amount: t.amount });
    }
  }

  let msg = `📊 *סיכום ${monthName} ${year}*\n\n`;

  if (Object.keys(shalom).length > 0) {
    msg += '👤 *שלום:*\n';
    for (const [cat, data] of Object.entries(shalom)) {
      const emoji = data.total < 0 ? '💸' : '💰';
      msg += `${emoji} ${cat}: ${Math.abs(data.total).toLocaleString('he-IL')}₪\n`;
      for (const item of data.items) {
        msg += `   • ${item.desc}: ${Math.abs(item.amount).toLocaleString('he-IL')}₪\n`;
      }
    }
    const totalShalom = Object.values(shalom).reduce((s, d) => s + d.total, 0);
    msg += `*סה"כ: ${totalShalom.toLocaleString('he-IL')}₪*\n\n`;
  }

  if (Object.keys(elisheva).length > 0) {
    msg += '👩 *אלישבע:*\n';
    for (const [cat, data] of Object.entries(elisheva)) {
      const emoji = data.total < 0 ? '💸' : '💰';
      msg += `${emoji} ${cat}: ${Math.abs(data.total).toLocaleString('he-IL')}₪\n`;
      for (const item of data.items) {
        msg += `   • ${item.desc}: ${Math.abs(item.amount).toLocaleString('he-IL')}₪\n`;
      }
    }
    const totalElisheva = Object.values(elisheva).reduce((s, d) => s + d.total, 0);
    msg += `*סה"כ: ${totalElisheva.toLocaleString('he-IL')}₪*\n\n`;
  }

  msg += `_עודכן: ${updateTime}_`;

  await ctx.reply(msg, { parse_mode: 'Markdown' });
}