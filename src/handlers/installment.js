import { InlineKeyboard } from "grammy";
import { Installment } from "../models/Installment.js";
import { Transaction } from "../models/Transaction.js";
import { sessions } from './expense.js';

export async function startInstallment(ctx) {
  const userId = ctx.from.id;
  sessions[userId] = { action: "installment", step: "account" };

  const keyboard = new InlineKeyboard()
    .text("👤 שלום", "inst_account_shalom")
    .text("👩 אלישבע", "inst_account_elisheva");

  await ctx.reply("באיזה חשבון?", { reply_markup: keyboard });
}

export async function handleInstallmentAccount(ctx) {
  const userId = ctx.from.id;
  const account =
    ctx.callbackQuery.data === "inst_account_shalom" ? "shalom" : "elisheva";
  sessions[userId].account = account;
  sessions[userId].step = "name";

  await ctx.answerCallbackQuery();
  await ctx.reply("מה שם הקנייה? (למשל: אייפון)");
}

export async function handleInstallmentText(ctx) {
  const userId = ctx.from.id;
  const session = sessions[userId];

  if (!session || session.action !== "installment") return false;

  if (session.step === "name") {
    session.name = ctx.message.text;
    session.step = "totalAmount";
    await ctx.reply(`מה הסכום המלא של "${session.name}"?`);
    return true;
  }

  if (session.step === "totalAmount") {
    const amount = parseFloat(ctx.message.text);
    if (isNaN(amount) || amount <= 0) {
      await ctx.reply("⚠️ סכום לא תקין. הכנס מספר, למשל: 4099");
      return true;
    }
    session.totalAmount = amount;
    session.step = "months";
    await ctx.reply("כמה תשלומים?");
    return true;
  }

  if (session.step === "months") {
    const months = parseInt(ctx.message.text);
    if (isNaN(months) || months <= 0) {
      await ctx.reply("⚠️ מספר לא תקין. הכנס מספר שלם, למשל: 6");
      return true;
    }

    session.totalMonths = months;
    session.monthlyAmount = Math.round((session.totalAmount / months) * 100) / 100;

    const now = new Date();
    const day = now.getDate();
    let firstPayment;

    if (day < 15) {
      firstPayment = new Date(now.getFullYear(), now.getMonth(), day);
    } else {
      firstPayment = new Date(now.getFullYear(), now.getMonth() + 1, day);
    }

    await Installment.create({
      account: session.account,
      name: session.name,
      totalAmount: session.totalAmount,
      monthlyAmount: session.monthlyAmount,
      totalMonths: months,
      paidMonths: 0,
      dayOfMonth: day,
      firstPaymentDate: firstPayment,
      active: true,
      addedBy: userId,
    });

    if (day < 15) {
      await Transaction.create({
        account: session.account,
        amount: -session.monthlyAmount,
        description: `${session.name} (תשלום 1/${months})`,
        category: "קניות גדולות",
        addedBy: userId,
      });

      await Installment.findOneAndUpdate(
        { account: session.account, name: session.name, active: true },
        { $inc: { paidMonths: 1 } }
      );
    }

    const accountName = session.account === "shalom" ? "שלום" : "אלישבע";
    const firstPaymentStr = firstPayment.toLocaleDateString("he-IL");

    await ctx.reply(
      `✅ נרשם!\n\n` +
      `📦 ${session.name}\n` +
      `💰 סכום כולל: ${session.totalAmount.toLocaleString("he-IL")}₪\n` +
      `📅 ${months} תשלומים של ${session.monthlyAmount.toLocaleString("he-IL")}₪\n` +
      `🗓 תשלום ראשון: ${firstPaymentStr}\n` +
      `🏦 חשבון: ${accountName}`
    );

    delete sessions[userId];
    return true;
  }

  return false;
}

export async function processMonthlyInstallments() {
  const now = new Date();
  const today = now.getDate();

  const installments = await Installment.find({ active: true });

  for (const inst of installments) {
    if (inst.dayOfMonth !== today) continue;
    if (inst.paidMonths === 0) continue;

    const paymentNumber = inst.paidMonths + 1;

    await Transaction.create({
      account: inst.account,
      amount: -inst.monthlyAmount,
      description: `${inst.name} (תשלום ${paymentNumber}/${inst.totalMonths})`,
      category: "קניות גדולות",
      addedBy: inst.addedBy,
    });

    await Installment.findByIdAndUpdate(inst._id, {
      $inc: { paidMonths: 1 },
      ...(paymentNumber >= inst.totalMonths ? { active: false } : {}),
    });
  }
}

export async function showInstallments(ctx) {
  const installments = await Installment.find({ active: true });

  if (installments.length === 0) {
    await ctx.reply("אין תשלומים פעילים כרגע 📭");
    return;
  }

  const shalom = installments.filter((i) => i.account === "shalom");
  const elisheva = installments.filter((i) => i.account === "elisheva");

  let msg = "📦 *תשלומים פעילים:*\n\n";

  if (shalom.length > 0) {
    msg += "👤 *שלום:*\n";
    let total = 0;
    for (const inst of shalom) {
      const remaining = inst.totalMonths - inst.paidMonths;
      msg += `• ${inst.name} — ${inst.monthlyAmount.toLocaleString("he-IL")}₪/חודש (נשארו ${remaining} מתוך ${inst.totalMonths})\n`;
      total += inst.monthlyAmount;
    }
    msg += `*סה"כ: ${total.toLocaleString("he-IL")}₪/חודש*\n\n`;
  }

  if (elisheva.length > 0) {
    msg += "👩 *אלישבע:*\n";
    let total = 0;
    for (const inst of elisheva) {
      const remaining = inst.totalMonths - inst.paidMonths;
      msg += `• ${inst.name} — ${inst.monthlyAmount.toLocaleString("he-IL")}₪/חודש (נשארו ${remaining} מתוך ${inst.totalMonths})\n`;
      total += inst.monthlyAmount;
    }
    msg += `*סה"כ: ${total.toLocaleString("he-IL")}₪/חודש*\n`;
  }

  await ctx.reply(msg, { parse_mode: "Markdown" });
}