import { InlineKeyboard } from "grammy";
import { Transaction } from "../models/Transaction.js";
import { startInstallmentFromExpense } from "./installment.js";
import { Account } from "../models/Account.js";

const sessions = {};

const EXPENSE_CATEGORIES = [
  "שכר דירה",
  "ניקוי עוסק פטור",
  "רואת חשבון",
  "חשמל",
  "מים",
  "אינטרנט",
  "AI",
  "מכונת כביסה",
  "נסיעות",
  "רפואה וויטמינים",
  "פארם",
  "קניות שבועיות",
  "יציאות",
  "אוכל בחוץ",
  "ביגוד והנעלה",
  "קניות גדולות",
  "רכב",
  "מעבר דירה",
  "מנוי חד פעמי",
  'בלת"ם',
  "אחר",
];

const INCOME_CATEGORIES = [
  "משכורת חודשית",
  "פוד-סטאמפס",
  "עבודות אחרות",
  "אחר",
];

const FREE_TEXT_CATEGORIES = ['בלת"ם', "מנוי חד פעמי", "אחר"];

export async function startExpense(ctx, type) {
  const userId = ctx.from.id;
  sessions[userId] = { type };

  const keyboard = new InlineKeyboard()
    .text("👤 שלום", "account_shalom")
    .text("👩 אלישבע", "account_elisheva");

  await ctx.reply("באיזה חשבון?", { reply_markup: keyboard });
}

export async function handleAccount(ctx) {
  const userId = ctx.from.id;
  const account =
    ctx.callbackQuery.data === "account_shalom" ? "shalom" : "elisheva";
  sessions[userId].account = account;

  await ctx.answerCallbackQuery();

  const categories =
    sessions[userId].type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const keyboard = new InlineKeyboard();
  categories.forEach((cat, i) => {
    keyboard.text(cat, `cat_${i}`);
    if (i % 2 === 1) keyboard.row();
  });

  await ctx.reply("באיזו קטגוריה?", { reply_markup: keyboard });
}

export async function handleCategory(ctx) {
  const userId = ctx.from.id;
  const categories =
    sessions[userId].type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const index = parseInt(ctx.callbackQuery.data.replace("cat_", ""));
  const category = categories[index];
  sessions[userId].category = category;

  await ctx.answerCallbackQuery();

  if (category === "קניות גדולות") {
    await ctx.answerCallbackQuery();
    await startInstallmentFromExpense(ctx, sessions[userId].account);
    delete sessions[userId];
    return;
  }

  if (FREE_TEXT_CATEGORIES.includes(category)) {
    sessions[userId].waitingForDescription = true;
    const prompts = {
      "מנוי חד פעמי": "איזה מנוי? (למשל: דיסני פלוס)",
      'בלת"ם': "תאר בקצרה את ההוצאה:",
      אחר: "רשום במה מדובר:",
    };
    await ctx.reply(prompts[category]);
    return;
  }

  await ctx.reply("הכנס סכום:");
}

export async function handleAmount(ctx) {
  const userId = ctx.from.id;
  const session = sessions[userId];

  if (!session || !session.category) return false;

  if (session.waitingForDescription) {
    session.description = ctx.message.text;
    session.waitingForDescription = false;
    await ctx.reply("הכנס סכום:");
    return true;
  }

  const amount = parseFloat(ctx.message.text);
  if (isNaN(amount) || amount <= 0) {
    await ctx.reply("⚠️ סכום לא תקין. הכנס מספר, למשל: 250");
    return true;
  }

  const finalAmount = session.type === "expense" ? -amount : amount;
  const description = session.description || session.category;

  await Transaction.create({
    account: session.account,
    amount: finalAmount,
    description,
    category: session.category,
    addedBy: userId,
  });

  const accountDoc = await Account.findOne({ owner: session.account });
  const transactions = await Transaction.find({ account: session.account });
  const total = transactions.reduce((sum, t) => sum + t.amount, 0);
  const balance = accountDoc.openingBalance + total;

  const accountName = session.account === "shalom" ? "שלום" : "אלישבע";
  const emoji = session.type === "expense" ? "💸" : "💰";
  const typeText = session.type === "expense" ? "הוצאה" : "הכנסה";

  await ctx.reply(
    `${emoji} נרשם!\n` +
      `${typeText} של ${amount.toLocaleString("he-IL")}₪\n` +
      `קטגוריה: ${session.category}` +
      (session.description ? ` — ${session.description}` : "") +
      "\n" +
      `חשבון: ${accountName}\n\n` +
      `💳 יתרה עכשיו בחשבון ${accountName}: ${balance.toLocaleString("he-IL")}₪`,
  );

  delete sessions[userId];
  return true;
}
