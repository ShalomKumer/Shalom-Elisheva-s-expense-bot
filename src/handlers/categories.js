import { InlineKeyboard } from "grammy";
import { Category } from "../models/Category.js";
import { Installment } from "../models/Installment.js";
import { Transaction } from "../models/Transaction.js";

const sessions = {};

// ---- הצגת תפריט ניהול ----
export async function showManageMenu(ctx) {
  const keyboard = new InlineKeyboard()
    .text("➕ הוסף קטגוריה", "cat_manage_add")
    .row()
    .text("🗑 השבת קטגוריה", "cat_manage_disable")
    .row()
    .text("📦 קנייה בתשלומים", "cat_manage_new_installment")
    .row()
    .text("📋 תשלומים פעילים", "cat_manage_installments")
    .row()
    .text("🔄 עדכון יתרה", "cat_manage_balance")
    .row()
    .text("↩️ ביטול אחרון", "cat_manage_cancel");

  await ctx.reply("⚙️ *תפריט ניהול:*", {
    parse_mode: "Markdown",
    reply_markup: keyboard,
  });
}

export async function handleManageAction(ctx) {
  const action = ctx.callbackQuery.data;
  const userId = ctx.from.id;

  await ctx.answerCallbackQuery();

  if (action === "cat_manage_add") {
    sessions[userId] = { action: "add_category", step: "type" };

    const keyboard = new InlineKeyboard()
      .text("💸 הוצאה", "new_cat_type_expense")
      .text("💰 הכנסה", "new_cat_type_income");

    await ctx.reply("זו קטגוריית הכנסה או הוצאה?", { reply_markup: keyboard });
    return;
  }

  if (action === "cat_manage_disable") {
    await showDisableMenu(ctx);
    return;
  }

  if (action === "cat_manage_new_installment") {
    const { startInstallment } = await import("./installment.js");
    await startInstallment(ctx);
    return;
  }

  if (action === "cat_manage_installments") {
    const { showInstallments } = await import("./installment.js");
    await showInstallments(ctx);
    return;
  }

  if (action === "cat_manage_balance") {
    const { startUpdateBalance } = await import("./updateBalance.js");
    await startUpdateBalance(ctx);
    return;
  }

  if (action === "cat_manage_cancel") {
    const { cancelLast } = await import("./cancel.js");
    await cancelLast(ctx);
    return;
  }
}

// ---- הוספת קטגוריה: שלב 1 — סוג ----
export async function handleNewCatType(ctx) {
  const userId = ctx.from.id;
  const type =
    ctx.callbackQuery.data === "new_cat_type_expense" ? "expense" : "income";
  sessions[userId] = { action: "add_category", step: "subType", type };

  await ctx.answerCallbackQuery();

  let keyboard;
  if (type === "expense") {
    keyboard = new InlineKeyboard().text("חד פעמי", "new_cat_sub_one-time");
  } else {
    keyboard = new InlineKeyboard()
      .text("חד פעמי", "new_cat_sub_one-time")
      .row()
      .text("חוזר (כל חודש)", "new_cat_sub_recurring");
  }

  await ctx.reply("איזה סוג?", { reply_markup: keyboard });
}

// ---- הוספת קטגוריה: שלב 2 — סוג משנה ----
export async function handleNewCatSubType(ctx) {
  const userId = ctx.from.id;
  const subType = ctx.callbackQuery.data.replace("new_cat_sub_", "");
  sessions[userId].subType = subType;

  await ctx.answerCallbackQuery();

  // אם זו הכנסה חוזרת — נשאל על פרטים נוספים
  if (subType === "recurring") {
    sessions[userId].step = "recurring_account";

    const keyboard = new InlineKeyboard()
      .text("👤 שלום", "recurring_account_shalom")
      .text("👩 אלישבע", "recurring_account_elisheva");

    await ctx.reply("לאיזה חשבון ייכנס ההכנסה החוזרת?", {
      reply_markup: keyboard,
    });
    return;
  }

  sessions[userId].step = "name";
  await ctx.reply("מה שם הקטגוריה החדשה?");
}

// ---- הכנסה חוזרת: בחירת חשבון ----
export async function handleRecurringAccount(ctx) {
  const userId = ctx.from.id;
  const account =
    ctx.callbackQuery.data === "recurring_account_shalom"
      ? "shalom"
      : "elisheva";
  sessions[userId].account = account;
  sessions[userId].step = "recurring_name";

  await ctx.answerCallbackQuery();
  await ctx.reply("מה שם ההכנסה החוזרת? (למשל: משכורת)");
}

// ---- הכנסה חוזרת: שם + סכום + חודשים ----
export async function handleRecurringText(ctx) {
  const userId = ctx.from.id;
  const session = sessions[userId];

  if (!session || session.action !== "add_category") return false;

  if (session.step === "recurring_name") {
    session.name = ctx.message.text.trim();
    session.step = "recurring_amount";
    await ctx.reply(`מה הסכום החודשי של "${session.name}"?`);
    return true;
  }

  if (session.step === "recurring_amount") {
    const amount = parseFloat(ctx.message.text);
    if (isNaN(amount) || amount <= 0) {
      await ctx.reply("⚠️ סכום לא תקין. הכנס מספר, למשל: 10300");
      return true;
    }
    session.amount = amount;
    session.step = "recurring_months";
    await ctx.reply("לכמה חודשים? (הכנס מספר)");
    return true;
  }

  if (session.step === "recurring_months") {
    const months = parseInt(ctx.message.text);
    if (isNaN(months) || months <= 0) {
      await ctx.reply("⚠️ מספר לא תקין. הכנס מספר שלם, למשל: 12");
      return true;
    }

    // שמירת קטגוריה
    await Category.findOneAndUpdate(
      { name: session.name, type: "income" },
      {
        name: session.name,
        type: "income",
        subType: "recurring",
        active: true,
      },
      { upsert: true, returnDocument: "after" },
    );

    // שמירת הכנסה חוזרת ב-Installment (שימוש חוזר במודל)
    const now = new Date();
    await Installment.create({
      account: session.account,
      name: session.name,
      totalAmount: session.amount * months,
      monthlyAmount: session.amount,
      totalMonths: months,
      paidMonths: 0,
      dayOfMonth: 1, // תמיד ב-1 לחודש
      firstPaymentDate: new Date(now.getFullYear(), now.getMonth() + 1, 1),
      active: true,
      addedBy: userId,
      isIncome: true,
    });

    const accountName = session.account === "shalom" ? "שלום" : "אלישבע";

    await ctx.reply(
      `✅ הכנסה חוזרת נוספה!\n\n` +
        `שם: ${session.name}\n` +
        `סכום: ${session.amount.toLocaleString("he-IL")}₪/חודש\n` +
        `חשבון: ${accountName}\n` +
        `משך: ${months} חודשים\n` +
        `תשלום ראשון: 1 לחודש הבא`,
    );

    delete sessions[userId];
    return true;
  }

  return false;
}

// ---- הוספת קטגוריה: שלב 3 — שם ----
export async function handleNewCatName(ctx) {
  const userId = ctx.from.id;
  const session = sessions[userId];

  if (!session || session.action !== "add_category") return false;

  // הכנסה חוזרת מטופלת בנפרד
  if (
    ["recurring_name", "recurring_amount", "recurring_months"].includes(
      session.step,
    )
  ) {
    return handleRecurringText(ctx);
  }

  if (session.step !== "name") return false;

  const name = ctx.message.text.trim();

  const existing = await Category.findOne({ name, type: session.type });
  if (existing) {
    if (existing.active) {
      await ctx.reply(`⚠️ קטגוריה "${name}" כבר קיימת.`);
    } else {
      await Category.findByIdAndUpdate(existing._id, { active: true });
      await ctx.reply(`✅ קטגוריה "${name}" הופעלה מחדש!`);
    }
    delete sessions[userId];
    return true;
  }

  await Category.create({
    name,
    type: session.type,
    subType: session.subType,
    active: true,
  });

  const typeText = session.type === "expense" ? "הוצאה" : "הכנסה";

  await ctx.reply(
    `✅ קטגוריה נוספה!\n\n` + `שם: ${name}\n` + `סוג: ${typeText}`,
  );

  delete sessions[userId];
  return true;
}

// ---- השבתת קטגוריה ----
async function showDisableMenu(ctx) {
  const categories = await Category.find({ active: true });

  if (categories.length === 0) {
    await ctx.reply("אין קטגוריות פעילות 📭");
    return;
  }

  const keyboard = new InlineKeyboard();
  categories.forEach((cat, i) => {
    const typeEmoji = cat.type === "expense" ? "💸" : "💰";
    keyboard.text(`${typeEmoji} ${cat.name}`, `disable_cat_${cat._id}`);
    if (i % 2 === 1) keyboard.row();
  });

  await ctx.reply("איזו קטגוריה להשבית?", { reply_markup: keyboard });
}

export async function handleDisableCat(ctx) {
  const catId = ctx.callbackQuery.data.replace("disable_cat_", "");
  await ctx.answerCallbackQuery();

  const cat = await Category.findByIdAndUpdate(
    catId,
    { active: false },
    { new: true },
  );
  await ctx.reply(`✅ קטגוריה "${cat.name}" הושבתה.`);
}

export function getCatSession(userId) {
  return sessions[userId];
}
