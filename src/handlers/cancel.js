import { InlineKeyboard } from 'grammy';
import { Transaction } from '../models/Transaction.js';

export async function cancelLast(ctx) {
  const userId = ctx.from.id;

  const last = await Transaction.findOne({ addedBy: userId })
    .sort({ createdAt: -1 });

  if (!last) {
    await ctx.reply('אין עסקאות לביטול 📭');
    return;
  }

  const accountName = last.account === 'shalom' ? 'שלום' : 'אלישבע';
  const type = last.amount < 0 ? '💸 הוצאה' : '💰 הכנסה';
  const amount = Math.abs(last.amount);
  const date = new Date(last.createdAt).toLocaleString('he-IL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  const keyboard = new InlineKeyboard()
    .text('✅ כן, בטל', 'confirm_cancel')
    .text('❌ לא, השאר', 'abort_cancel');

  await ctx.reply(
    `↩️ *העסקה האחרונה שלך:*\n\n` +
    `סוג: ${type}\n` +
    `סכום: ${amount.toLocaleString('he-IL')}₪\n` +
    `קטגוריה: ${last.category}\n` +
    (last.description !== last.category ? `פירוט: ${last.description}\n` : '') +
    `חשבון: ${accountName}\n` +
    `תאריך: ${date}\n\n` +
    `האם לבטל עסקה זו?`,
    { parse_mode: 'Markdown', reply_markup: keyboard }
  );
}

export async function confirmCancel(ctx) {
  const userId = ctx.from.id;

  const last = await Transaction.findOne({ addedBy: userId })
    .sort({ createdAt: -1 });

  if (!last) {
    await ctx.answerCallbackQuery('לא נמצאה עסקה לביטול');
    return;
  }

  await Transaction.findByIdAndDelete(last._id);
  await ctx.answerCallbackQuery();
  await ctx.editMessageText('✅ העסקה בוטלה בהצלחה!');
}

export async function abortCancel(ctx) {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText('בסדר, העסקה נשארת 👍');
}