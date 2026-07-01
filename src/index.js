import 'dotenv/config';
import express from 'express';
import { Bot, Keyboard } from 'grammy';
import { connectDB } from './db.js';
import {
  startExpense,
  handleAccount,
  handleCategory,
  handleAmount,
} from './handlers/expense.js';
import { showBalance } from './handlers/balance.js';
import { showSummary, handleSummaryMonth } from './handlers/summary.js';
import { cancelLast, confirmCancel, abortCancel } from './handlers/cancel.js';

const app = express();
const PORT = process.env.PORT || 3000;

const token = process.env.BOT_TOKEN;
if (!token) {
  throw new Error('חסר BOT_TOKEN בקובץ .env');
}

const allowedIds = (process.env.ALLOWED_IDS || '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean)
  .map(Number);

const bot = new Bot(token);

// ---- מקלדת קבועה ----
const mainKeyboard = new Keyboard()
  .text('💸 הוצאה').text('💰 הכנסה').row()
  .text('💳 יתרה').text('📊 סיכום').row()
  .text('↩️ ביטול')
  .resized()
  .persistent();

// ---- שכבת אבטחה ----
bot.use(async (ctx, next) => {
  const userId = ctx.from?.id;

  if (allowedIds.length === 0) {
    await ctx.reply(
      'שלום! עוד לא הוגדרה רשימת מורשים.\n' +
      `ה-ID שלך בטלגרם הוא: ${userId}\n` +
      'הוסף אותו ל-ALLOWED_IDS בקובץ .env והפעל מחדש.'
    );
    return;
  }

  if (!allowedIds.includes(userId)) {
    await ctx.reply(`זהו בוט פרטי. ה-ID שלך הוא ${userId}.`);
    return;
  }

  await next();
});

// ---- פקודת start ----
bot.command('start', async (ctx) => {
  await ctx.reply(
    `היי ${ctx.from.first_name}! 👋\n\n` +
    'בחר פעולה מהתפריט למטה:',
    { reply_markup: mainKeyboard }
  );
});

// ---- פקודות ישירות (גיבוי) ----
bot.command('expense', async (ctx) => {
  await startExpense(ctx, 'expense');
});

bot.command('income', async (ctx) => {
  await startExpense(ctx, 'income');
});

// ---- כפתורי inline ----
bot.callbackQuery(/^account_/, handleAccount);
bot.callbackQuery(/^cat_/, handleCategory);
bot.callbackQuery(/^summary_/, handleSummaryMonth);
bot.callbackQuery('confirm_cancel', confirmCancel);
bot.callbackQuery('abort_cancel', abortCancel);

// ---- הודעות טקסט ----
bot.on('message:text', async (ctx) => {
  const text = ctx.message.text;

  if (text === '💸 הוצאה') return startExpense(ctx, 'expense');
  if (text === '💰 הכנסה') return startExpense(ctx, 'income');
  if (text === '💳 יתרה') return showBalance(ctx);
  if (text === '📊 סיכום') return showSummary(ctx);
  if (text === '↩️ ביטול') return cancelLast(ctx);

  const handled = await handleAmount(ctx);
  if (!handled) {
    await ctx.reply('בחר פעולה מהתפריט 👇', { reply_markup: mainKeyboard });
  }
});

// ---- טיפול בשגיאות ----
bot.catch((err) => {
  console.error('שגיאה בבוט:', err);
});

app.get('/', (req, res) => res.send('הבוט רץ! 🤖'));
app.listen(PORT, () => console.log(`שרת HTTP רץ על פורט ${PORT}`));

// ---- הפעלה ----
await connectDB();
bot.start();
console.log('הבוט רץ! שלח לו הודעה בטלגרם.');