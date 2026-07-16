import { InlineKeyboard } from 'grammy';
import { Category } from '../models/Category.js';

const sessions = {};

// ---- הצגת תפריט ניהול ----
export async function showManageMenu(ctx) {
  const keyboard = new InlineKeyboard()
    .text('➕ הוסף קטגוריה', 'cat_manage_add').row()
    .text('🗑 השבת קטגוריה', 'cat_manage_disable').row()
    .text('📦 תשלומים פעילים', 'cat_manage_installments').row()
    .text('🔄 עדכון יתרה', 'cat_manage_balance').row()
    .text('↩️ ביטול אחרון', 'cat_manage_cancel');

  await ctx.reply('⚙️ *תפריט ניהול:*', {
    parse_mode: 'Markdown',
    reply_markup: keyboard,
  });
}

// ---- הוספת קטגוריה: שלב 1 — הכנסה או הוצאה ----
export async function handleManageAction(ctx) {
  const action = ctx.callbackQuery.data;
  const userId = ctx.from.id;

  await ctx.answerCallbackQuery();

  if (action === 'cat_manage_add') {
    sessions[userId] = { action: 'add_category', step: 'type' };

    const keyboard = new InlineKeyboard()
      .text('💸 הוצאה', 'new_cat_type_expense')
      .text('💰 הכנסה', 'new_cat_type_income');

    await ctx.reply('זו קטגוריית הכנסה או הוצאה?', { reply_markup: keyboard });
    return;
  }

  if (action === 'cat_manage_disable') {
    await showDisableMenu(ctx);
    return;
  }

  if (action === 'cat_manage_installments') {
    const { showInstallments } = await import('./installment.js');
    await showInstallments(ctx);
    return;
  }

  if (action === 'cat_manage_balance') {
    const { startUpdateBalance } = await import('./updateBalance.js');
    await startUpdateBalance(ctx);
    return;
  }

  if (action === 'cat_manage_cancel') {
    const { cancelLast } = await import('./cancel.js');
    await cancelLast(ctx);
    return;
  }
}

// ---- הוספת קטגוריה: שלב 2 — סוג (הוצאה/הכנסה) ----
export async function handleNewCatType(ctx) {
  const userId = ctx.from.id;
  const type = ctx.callbackQuery.data === 'new_cat_type_expense' ? 'expense' : 'income';
  sessions[userId] = { action: 'add_category', step: 'subType', type };

  await ctx.answerCallbackQuery();

  let keyboard;
  if (type === 'expense') {
    keyboard = new InlineKeyboard()
      .text('חד פעמי', 'new_cat_sub_one-time').row()
      .text('תשלומים', 'new_cat_sub_installments');
  } else {
    keyboard = new InlineKeyboard()
      .text('חד פעמי', 'new_cat_sub_one-time').row()
      .text('חוזר (כל חודש)', 'new_cat_sub_recurring');
  }

  await ctx.reply('איזה סוג?', { reply_markup: keyboard });
}

// ---- הוספת קטגוריה: שלב 3 — שם ----
export async function handleNewCatSubType(ctx) {
  const userId = ctx.from.id;
  const subType = ctx.callbackQuery.data.replace('new_cat_sub_', '');
  sessions[userId].subType = subType;
  sessions[userId].step = 'name';

  await ctx.answerCallbackQuery();
  await ctx.reply('מה שם הקטגוריה החדשה?');
}

// ---- הוספת קטגוריה: שלב 4 — שמירה ----
export async function handleNewCatName(ctx) {
  const userId = ctx.from.id;
  const session = sessions[userId];

  if (!session || session.action !== 'add_category' || session.step !== 'name') return false;

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

  const typeText = session.type === 'expense' ? 'הוצאה' : 'הכנסה';
  const subTypeText = {
    'one-time': 'חד פעמי',
    'installments': 'תשלומים',
    'recurring': 'חוזר',
  }[session.subType];

  await ctx.reply(
    `✅ קטגוריה נוספה!\n\n` +
    `שם: ${name}\n` +
    `סוג: ${typeText}\n` +
    `סוג משנה: ${subTypeText}`
  );

  delete sessions[userId];
  return true;
}

// ---- השבתת קטגוריה ----
async function showDisableMenu(ctx) {
  const categories = await Category.find({ active: true });

  if (categories.length === 0) {
    await ctx.reply('אין קטגוריות פעילות 📭');
    return;
  }

  const keyboard = new InlineKeyboard();
  categories.forEach((cat, i) => {
    const typeEmoji = cat.type === 'expense' ? '💸' : '💰';
    keyboard.text(`${typeEmoji} ${cat.name}`, `disable_cat_${cat._id}`);
    if (i % 2 === 1) keyboard.row();
  });

  await ctx.reply('איזו קטגוריה להשבית?', { reply_markup: keyboard });
}

export async function handleDisableCat(ctx) {
  const catId = ctx.callbackQuery.data.replace('disable_cat_', '');
  await ctx.answerCallbackQuery();

  const cat = await Category.findByIdAndUpdate(catId, { active: false }, { new: true });
  await ctx.reply(`✅ קטגוריה "${cat.name}" הושבתה.`);
}

export function getCatSession(userId) {
  return sessions[userId];
}