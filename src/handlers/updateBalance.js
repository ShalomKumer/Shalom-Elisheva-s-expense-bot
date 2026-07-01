import { InlineKeyboard } from 'grammy';
import { Account } from '../models/Account.js';

const sessions = {};

export async function startUpdateBalance(ctx) {
  const userId = ctx.from.id;
  sessions[userId] = { action: 'updateBalance' };

  const keyboard = new InlineKeyboard()
    .text('👤 שלום', 'balance_account_shalom')
    .text('👩 אלישבע', 'balance_account_elisheva');

  await ctx.reply('איזה חשבון לעדכן?', { reply_markup: keyboard });
}

export async function handleBalanceAccount(ctx) {
  const userId = ctx.from.id;
  const account = ctx.callbackQuery.data === 'balance_account_shalom' ? 'shalom' : 'elisheva';
  sessions[userId] = { action: 'updateBalance', account };

  await ctx.answerCallbackQuery();
  await ctx.reply('הכנס את היתרה הנוכחית בחשבון (בשקלים):');
}

export async function handleBalanceAmount(ctx) {
  const userId = ctx.from.id;
  const session = sessions[userId];

  if (!session || session.action !== 'updateBalance') return false;

  const amount = parseFloat(ctx.message.text);
  if (isNaN(amount)) {
    await ctx.reply('⚠️ סכום לא תקין. הכנס מספר, למשל: 3500');
    return true;
  }

  await Account.findOneAndUpdate(
    { owner: session.account },
    { openingBalance: amount },
    { returnDocument: 'after' }
  );

  const accountName = session.account === 'shalom' ? 'שלום' : 'אלישבע';
  delete sessions[userId];

  await ctx.reply(
    `✅ יתרת חשבון ${accountName} עודכנה!\n\n` +
    `💳 יתרה חדשה: ${amount.toLocaleString('he-IL')}₪\n\n` +
    `⚠️ שים לב: עדכון זה מאפס את יתרת הפתיחה ומחשב מחדש את כל ההיסטוריה מנקודה זו.`
  );

  return true;
}