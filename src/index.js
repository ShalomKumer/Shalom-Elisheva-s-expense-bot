import "dotenv/config";
import express from "express";
import { Bot, Keyboard } from "grammy";
import { connectDB } from "./db.js";
import {
  startExpense,
  handleAccount,
  handleCategory,
  handleAmount,
} from "./handlers/expense.js";
import { showBalance } from "./handlers/balance.js";
import { showSummary, handleSummaryMonth } from "./handlers/summary.js";
import { cancelLast, confirmCancel, abortCancel } from "./handlers/cancel.js";
import {
  startUpdateBalance,
  handleBalanceAccount,
  handleBalanceAmount,
} from "./handlers/updateBalance.js";
import {
  startInstallment,
  handleInstallmentAccount,
  handleInstallmentText,
  processMonthlyInstallments,
  showInstallments,
} from "./handlers/installment.js";
import {
  showManageMenu,
  handleManageAction,
  handleNewCatType,
  handleNewCatSubType,
  handleNewCatName,
  handleDisableCat,
  getCatSession,
} from "./handlers/categories.js";

const app = express();
const PORT = process.env.PORT || 3000;

const token = process.env.BOT_TOKEN;
if (!token) {
  throw new Error("חסר BOT_TOKEN בקובץ .env");
}

const allowedIds = (process.env.ALLOWED_IDS || "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean)
  .map(Number);

const bot = new Bot(token);

// ---- מקלדת קבועה ----
const mainKeyboard = new Keyboard()
  .text("💸 הוצאה").text("💰 הכנסה").row()
  .text("💳 יתרה").text("📊 סיכום").row()
  .text("⚙️ נוסף")
  .resized()
  .persistent();

// ---- שכבת אבטחה ----
bot.use(async (ctx, next) => {
  const userId = ctx.from?.id;

  if (allowedIds.length === 0) {
    await ctx.reply(
      "שלום! עוד לא הוגדרה רשימת מורשים.\n" +
        `ה-ID שלך בטלגרם הוא: ${userId}\n` +
        "הוסף אותו ל-ALLOWED_IDS בקובץ .env והפעל מחדש."
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
bot.command("start", async (ctx) => {
  await ctx.reply(
    `היי ${ctx.from.first_name}! 👋\n\n` + "בחר פעולה מהתפריט למטה:",
    { reply_markup: mainKeyboard }
  );
});

// ---- כפתורי inline ----
bot.callbackQuery(/^account_/, handleAccount);
bot.callbackQuery(/^inst_account_/, handleInstallmentAccount);
bot.callbackQuery(/^cat_manage/, handleManageAction);
bot.callbackQuery(/^new_cat_type_/, handleNewCatType);
bot.callbackQuery(/^new_cat_sub_/, handleNewCatSubType);
bot.callbackQuery(/^disable_cat_/, handleDisableCat);
bot.callbackQuery(/^cat_/, handleCategory);
bot.callbackQuery(/^summary_/, handleSummaryMonth);
bot.callbackQuery("confirm_cancel", confirmCancel);
bot.callbackQuery("abort_cancel", abortCancel);
bot.callbackQuery(/^balance_account_/, handleBalanceAccount);

// ---- הודעות טקסט ----
bot.on("message:text", async (ctx) => {
  const text = ctx.message.text;

  if (text === "💸 הוצאה") return startExpense(ctx, "expense");
  if (text === "💰 הכנסה") return startExpense(ctx, "income");
  if (text === "💳 יתרה") return showBalance(ctx);
  if (text === "📊 סיכום") return showSummary(ctx);
  if (text === "⚙️ נוסף") return showManageMenu(ctx);

  // סדר חשוב: קודם categories, אחר כך installments, אחר כך balance, אחר כך expense
  const catHandled = await handleNewCatName(ctx);
  if (catHandled) return;

  const installmentHandled = await handleInstallmentText(ctx);
  if (installmentHandled) return;

  const balanceHandled = await handleBalanceAmount(ctx);
  if (balanceHandled) return;

  const handled = await handleAmount(ctx);
  if (!handled) {
    await ctx.reply("בחר פעולה מהתפריט 👇", { reply_markup: mainKeyboard });
  }
});

// ---- טיפול בשגיאות ----
bot.catch((err) => {
  console.error("שגיאה בבוט:", err);
});

// ---- cron יומי ----
setInterval(async () => {
  try {
    await processMonthlyInstallments();
  } catch (err) {
    console.error("שגיאה בעיבוד תשלומים:", err);
  }
}, 24 * 60 * 60 * 1000);

app.get("/", (req, res) => res.send("הבוט רץ! 🤖"));
app.listen(PORT, () => console.log(`שרת HTTP רץ על פורט ${PORT}`));

// ---- הפעלה ----
await connectDB();
bot.start();
console.log("הבוט רץ! שלח לו הודעה בטלגרם.");