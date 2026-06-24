import { InlineKeyboard } from 'grammy';
import { Transaction } from '../models/Transaction.js';
import { Account } from '../models/Account.js';

// זיכרון זמני של השיחה — שומר את הצעדים של כל משתמש
const sessions = {};

const CATEGORIES = [
  'שכר דירה',
  'מזון וקניות',
  'יציאות ודייטים',
  'תחבורה',
  'בריאות',
  'ביגוד',
  'מנויים',
  'חיסכון',
  'אחר',
];

// ---- שלב 1: בחירת סוג (הוצאה / הכנסה) ----
export async function startExpense(ctx, type) {
  const userId = ctx.from.id;
  sessions[userId] = { type }; // 'expense' או 'income'

  const keyboard = new InlineKeyboard()
    .text('👤 שלום', 'account_shalom')
    .text('👩 אלישבע', 'account_elisheva');

  await ctx.reply('באיזה חשבון?', { reply_markup: keyboard });
}

// ---- שלב 2: בחירת חשבון ----
export async function handleAccount(ctx) {
  const userId = ctx.from.id;
  const account = ctx.callbackQuery.data === 'account_shalom' ? 'shalom' : 'elisheva';
  sessions[userId].account = account;

  await ctx.answerCallbackQuery();

  const keyboard = new InlineKeyboard();
  CATEGORIES.forEach((cat, i) => {
    keyboard.text(cat, `cat_${i}`);
    if (i % 2 === 1) keyboard.row();
  });

  await ctx.reply('באיזו קטגוריה?', { reply_markup: keyboard });
}

// ---- שלב 3: בחירת קטגוריה ----
export async function handleCategory(ctx) {
  const userId = ctx.from.id;
  const index = parseInt(ctx.callbackQuery.data.replace('cat_', ''));
  sessions[userId].category = CATEGORIES[index];

  await ctx.answerCallbackQuery();
  await ctx.reply('כמה? (הקלד סכום, למשל: 250)');
}

// ---- שלב 4: קבלת סכום ורישום ----
export async function handleAmount(ctx) {
  const userId = ctx.from.id;
  const session = sessions[userId];

  if (!session || !session.category) return false;

  const amount = parseFloat(ctx.message.text);
  if (isNaN(amount) || amount <= 0) {
    await ctx.reply('⚠️ סכום לא תקין. נסה שוב עם מספר, למשל: 250');
    return true;
  }

  // הוצאה = סכום שלילי, הכנסה = חיובי
  const finalAmount = session.type === 'expense' ? -amount : amount;

  await Transaction.create({
    account: session.account,
    amount: finalAmount,
    description: session.category,
    category: session.type === 'income' ? 'הכנסה' : session.category,
    addedBy: userId,
  });

  // חישוב יתרה עדכנית
  const accountDoc = await Account.findOne({ owner: session.account });
  const transactions = await Transaction.find({ account: session.account });
  const total = transactions.reduce((sum, t) => sum + t.amount, 0);
  const balance = accountDoc.openingBalance + total;

  const accountName = session.account === 'shalom' ? 'שלום' : 'אלישבע';
  const emoji = session.type === 'expense' ? '💸' : '💰';

  await ctx.reply(
    `${emoji} נרשם!\n` +
    `${session.type === 'expense' ? 'הוצאה' : 'הכנסה'} של ${amount}₪\n` +
    `קטגוריה: ${session.category}\n` +
    `חשבון: ${accountName}\n\n` +
    `💳 יתרה עכשיו בחשבון ${accountName}: ${balance.toLocaleString('he-IL')}₪`
  );

  delete sessions[userId];
  return true;
}