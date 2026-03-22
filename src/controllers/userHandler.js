const { Markup } = require('telegraf');
const db = require('../database');
const aiService = require('../services/AIService'); 
const fetch = require('node-fetch'); 
const orderService = require('../services/OrderService');
const adminHandler = require('./adminHandler');
const { OP, CAT, STEP, STATUS, LABELS, DB_FIELDS } = require('../utils/constants');

const activeProcessing = new Set();

// --- Helper Functions ---
function makeStrike(text) {
    return text.toString().split('').map(char => char + '\u0336').join('');
}
const escapeHTML = (str) => String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function getHelpButtons() {
    return [[Markup.button.callback('🛡️ အကူအညီ', 'order_help_menu')]];
}

// 🎯 Admin Notification UI
function buildAdminNotification(order, firebaseOrderId, ctx) {
    const safeUserName = escapeHTML(ctx.from.first_name || order.userName || 'N/A');
    const isManual = order.orderMode === 'MANUAL';
    const op = order.operator ? order.operator.toUpperCase() : "UNKNOWN";
    const amount = Number(order.amount || 0).toLocaleString();
    const planName = escapeHTML(order.planName || 'Unknown Plan');
    const originalPrice = Number(order.price || order.amount).toLocaleString();

    let msg = `🔔 <b>New Order Received!</b>\n━━━━━━━━━━━━━━━━━━━━\n<b>👤 User: ${safeUserName}</b>\n`;

    if (isManual) {
        msg += `📝 <b>Flow:</b> <u>Manual (No Screenshot)</u>\n\n`;
        msg += `📤 <b>User အမည်:</b> ${escapeHTML(order.accountName || 'N/A')}\n`;
        msg += `🔢 <b>ပြေစာ ၆ လုံး:</b> <code>${escapeHTML(order.transactionId || 'N/A')}</code>\n`;
    } else {
        msg += `🖼 <b>Flow:</b> <u>Screenshot</u>\n👀 <i>(ဓာတ်ပုံတွင် စစ်ဆေးပါ)</i>\n`;
    }

    msg += `━━━━━━━━━━━━━━━━━━━━\n📡 <b>Op:</b> ${op} | 📦 <b>Plan:</b> ${planName}\n💰 <b>Amount:</b> ${amount} MMK\n`;
    if (amount !== originalPrice) msg += `🏷️ <b>Price:</b> <s>${originalPrice}</s> MMK\n`;
    msg += `📞 <b>Phone:</b> <code>${escapeHTML(order.phone)}</code>\n🆔 <b>ID:</b> <code>${firebaseOrderId}</code>\n━━━━━━━━━━━━━━━━━━━━`;
    return msg;
}

/**
 * ၁။ Core Ordering Logic
 */
async function processOrder(ctx, bot) {
    try {
        const userId = ctx.from.id;
        const rawText = ctx.message.text || ctx.message.caption || "";
        const phoneInfo = orderService.parsePhoneAndOperator(rawText);
        const state = await db.getUserSession(userId);

        // (က) ဖုန်းနံပါတ် အသစ်စရိုက်ခြင်း (New Order Start)
        // ဒါကို အပေါ်ဆုံးမှာ ထားရပါမယ်။
        if (phoneInfo.isValid) {
            let finalOperator = phoneInfo.operator.toLowerCase();
            if (finalOperator === 'ooredoo') finalOperator = OP.U9;
            await db.saveUserSession(userId, { step: STEP.SELECTING_CATEGORY, phone: phoneInfo.cleanPhone, operator: finalOperator });

            const categoryButtons = [];
            [CAT.DATA, CAT.VOICE, CAT.MAIN].forEach(c => {
                if (finalOperator === OP.MEC && c !== CAT.MAIN) return;
                categoryButtons.push([Markup.button.callback(LABELS[c], `cat_${finalOperator}_${c}`)]);
            });

            await ctx.reply(`📶 <b>${finalOperator.toUpperCase()} (${phoneInfo.cleanPhone})</b>\n\nအမျိုးအစား ရွေးချယ်ပါ -`, {
                parse_mode: 'HTML', ...Markup.inlineKeyboard(categoryButtons)
            });
            return true;
        }

        // (ခ) AI & Image Recognition (If not phone number)
        if (!state || state.step === STEP.IDLE) {
            let imageBuffer = null;
            if (ctx.message.photo) {
                const fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
                const link = await bot.telegram.getFileLink(fileId);
                const response = await fetch(link);
                imageBuffer = Buffer.from(await response.arrayBuffer());
            }

            const settings = await db.getBotSettings();
            const isAdmin = userId == process.env.ADMIN_ID;
            const aiResponse = await aiService.handleRequest(userId, rawText, isAdmin, settings, imageBuffer);

            if (aiResponse && aiResponse.text) {
                await ctx.reply(aiResponse.text, { parse_mode: 'HTML' });
                return true; 
            }
            if (!ctx.message.photo) return false; 
        }

        if (!state) return false;

        // (ဂ) Screenshot Flow
        if (state.step === STEP.AWAITING_PAYMENT_SS && ctx.message.photo) {
            const photoId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
            const orderData = { ...state, userId, userName: ctx.from.first_name, screenshot: photoId, status: STATUS.PENDING, createdAt: new Date().toISOString() };
            const orderId = await db.saveOrder(orderData);

            await ctx.reply(`✅ <b>Screenshot လက်ခံရရှိပါသည်။</b>\nID: <code>${orderId}</code>\n⏳ စစ်ဆေးနေပါသည်...`, { parse_mode: 'HTML' });
            await bot.telegram.sendPhoto(process.env.ADMIN_ID, photoId, { 
                caption: buildAdminNotification(orderData, orderId, ctx), 
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard([[Markup.button.callback(`🔍 စစ်ဆေးမည်`, `checkorder_${orderId}`)]]) // check_ မှ checkorder_ သို့ ပြင်ထားသည်
            });
            await db.saveUserSession(userId, { step: STEP.IDLE });
            return true;
        }

        // (ဃ) Manual ID Flow
        if (state.step === STEP.AWAITING_TRANSACTION_ID && rawText) {
            if (!/^\d{6}$/.test(rawText)) return ctx.reply("⚠️ ပြေစာ ID <b>နောက်ဆုံး ၆ လုံး</b> ပဲ ရိုက်ပေးပါ။", { parse_mode: 'HTML' });
            
            const orderData = { ...state, userId, userName: ctx.from.first_name, transactionId: rawText, orderMode: 'MANUAL', status: STATUS.PENDING, createdAt: new Date().toISOString() };
            const orderId = await db.saveOrder(orderData);

            await ctx.reply(`✅ <b>အော်ဒါတင်ခြင်း အောင်မြင်ပါသည်။</b>`, { parse_mode: 'HTML' });
            await bot.telegram.sendMessage(process.env.ADMIN_ID, buildAdminNotification(orderData, orderId, ctx), { 
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard([[Markup.button.callback(`🔍 စစ်ဆေးမည်`, `checkorder_${orderId}`)]])
            });
            await db.saveUserSession(userId, { step: STEP.IDLE });
            return true;
        }

        return false;
    } catch (e) { console.error(e); return false; }
}

/**
 * ၂။ UI & Interaction Functions
 */
async function showPlans(ctx, operator, category) {
    try {
        let op = operator.toLowerCase();
        const cat = category.toLowerCase();
        if (op === 'ooredoo') op = OP.U9;

        if (cat === CAT.MAIN) {
            const state = await db.getUserSession(ctx.from.id);
            await db.saveUserSession(ctx.from.id, { ...state, step: STEP.AWAITING_MAIN_BILL_AMOUNT, operator: op });
            return ctx.editMessageText(`💰 ဝယ်ယူမည့် <b>${op.toUpperCase()} Main Bill</b> ပမာဏ ရိုက်ထည့်ပါ -`, { parse_mode: 'HTML' });
        }

        const [snap, settings] = await Promise.all([db.db.ref(`plans/${op}/${cat}`).once('value'), db.getBotSettings()]);
        const plans = snap.val();
        if (!plans) return ctx.editMessageText("⚠️ Plan မရှိသေးပါ။", Markup.inlineKeyboard([[Markup.button.callback('⬅️ နောက်သို့', 'back_to_start')]]));

        const buttons = Object.entries(plans).map(([id, p]) => {
            const disc = settings[`${op.toUpperCase()}_DISC`] || 0;
            const final = adminHandler.calculateDiscountedPrice(p.price, settings[DB_FIELDS.GLOBAL_DISC] || 0, disc, settings.isPromotionActive);
            return [Markup.button.callback(`${makeStrike(p.price)} ➔ ${final} Ks | ${p.name}`, `buy_${op}_${cat}_${id}`)];
        });
        buttons.push([Markup.button.callback('⬅️ နောက်သို့', 'back_to_start')]);

        return ctx.editMessageText(`✨ <b>${op.toUpperCase()} ${cat.toUpperCase()}</b> ရွေးချယ်ပါ -`, { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
    } catch (e) { return ctx.reply("❌ Error ဖြစ်သွားပါသည်။"); }
}

async function askForPaymentMethod(ctx, planName, price) {
    const msg = `📦 <b>${planName}</b>\nဈေးနှုန်း - <b>${price} MMK</b>\n\n✅ <b>ငွေပေးချေမည့် ပုံစံကို ရွေးချယ်ပါ 👇</b>`;
    const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('📸 Screenshot ပို့မည်', 'pay_ss'), Markup.button.callback('✍️ Manual ဖြည့်မည်', 'pay_manual')],
        [Markup.button.callback('⬅️ နောက်သို့', 'back_to_start'), Markup.button.callback('🛡️ အကူအညီ', 'order_help_menu')]
    ]);
    return ctx.callbackQuery ? ctx.editMessageText(msg, { parse_mode: 'HTML', ...buttons }) : ctx.reply(msg, { parse_mode: 'HTML', ...buttons });
}

async function handleAccountName(ctx, session) {
    await db.saveUserSession(ctx.from.id, { ...session, step: STEP.AWAITING_TRANSACTION_ID, accountName: ctx.message.text });
    await ctx.reply(`🔢 <b>ပြေစာ ID နောက်ဆုံး ၆ လုံး</b> ကို ရိုက်ထည့်ပေးပါ -`, Markup.inlineKeyboard(getHelpButtons()));
}

/**
 * ၃။ Plan Selection Logic (buy_op_cat_id)
 */
async function handlePlanSelection(ctx) {
    try {
        const userId = ctx.from.id;
        const parts = ctx.match[0].split('_'); 
        let operator = parts[1].toLowerCase();
        const category = parts[2].toLowerCase();
        const planId = parts.slice(3).join('_');

        if (operator === 'ooredoo') operator = OP.U9;

        const [planSnap, settings] = await Promise.all([
            db.db.ref(`plans/${operator}/${category}/${planId}`).once('value'),
            db.getBotSettings()
        ]);

        const planData = planSnap.val();
        if (!planData) return ctx.answerCbQuery("❌ Plan မရှိတော့ပါ။");

        // ✅ Corrected Discount Key Selection
        const opKey = operator.toUpperCase() === 'U9' ? 'OOREDOO' : operator.toUpperCase();
        const opDisc = settings[`${opKey}_DISC`] || 0;

        const finalPrice = adminHandler.calculateDiscountedPrice(
            planData.price, 
            settings[DB_FIELDS.GLOBAL_DISC] || 0, 
            opDisc, 
            settings.isPromotionActive
        );

        const currentSession = await db.getUserSession(userId);
        await db.saveUserSession(userId, { 
            ...currentSession, 
            step: STEP.AWAITING_PAYMENT_METHOD, 
            planName: planData.name, 
            price: planData.price, 
            amount: finalPrice, 
            operator 
        });

        await askForPaymentMethod(ctx, planData.name, finalPrice);
    } catch (error) { console.error(error); }
}

/**
 * ၄။ Payment Method Selection (pay_ss, pay_manual)
 */
async function handlePaymentMethodSelection(ctx) {
    const userId = String(ctx.from.id);
    const action = ctx.match[0]; // pay_ss သို့မဟုတ် pay_manual
    const session = await db.getUserSession(userId);

    if (action === 'pay_ss') {
        await db.saveUserSession(userId, { ...session, step: STEP.AWAITING_PAYMENT_SS });
        const kpay = process.env.KPAY_NUMBER || 'N/A';
        const wave = process.env.WAVE_NUMBER || 'N/A';
        
        const msg = `📸 <b>Screenshot ပေးပို့ရန်</b>\n\n` +
                    `KPay: <code>${kpay}</code>\n` +
                    `Wave: <code>${wave}</code>\n\n` +
                    `ငွေလွှဲပြီးပါက ပြေစာ (Screenshot) ကို ဓာတ်ပုံအဖြစ် ပို့ပေးပါ -`;
        return ctx.editMessageText(msg, { parse_mode: 'HTML', ...Markup.inlineKeyboard(getHelpButtons()) });
    }

    if (action === 'pay_manual') {
        const buttons = Markup.inlineKeyboard([
            [Markup.button.callback('K-Pay', 'method_kpay'), Markup.button.callback('Wave Money', 'method_wave')],
            [Markup.button.callback('⬅️ နောက်သို့', 'back_to_start')]
        ]);
        return ctx.editMessageText("📝 အသုံးပြုသည့် Payment Method ကို ရွေးချယ်ပါ -", { parse_mode: 'HTML', ...buttons });
    }
}

/**
 * ၅။ Manual Method Sub-Selection (method_kpay/wave)
 */
async function handleManualMethodType(ctx) {
    const userId = String(ctx.from.id);
    const method = ctx.match[0].split('_')[1]; // kpay သို့မဟုတ် wave
    const session = await db.getUserSession(userId);

    let adminNum = method === 'kpay' ? process.env.KPAY_NUMBER : process.env.WAVE_NUMBER;
    let adminName = method === 'kpay' ? process.env.KPAY_NAME : process.env.WAVE_NAME;

    await db.saveUserSession(userId, { ...session, step: STEP.AWAITING_ACCOUNT_NAME, tempPaymentMethod: method });
    
    const msg = `✅ <b>[${method.toUpperCase()}]</b> ရွေးချယ်ပြီးပါပြီ။\n\n` +
                `📞 Number: <code>${adminNum}</code>\n` +
                `👤 Name: ${adminName}\n\n` +
                `--------------------------\n` +
                `📝 ငွေလွှဲသူ အကောင့်နာမည် (Account Name) ရိုက်ထည့်ပေးပါ -`;
                
    return ctx.editMessageText(msg, { parse_mode: 'HTML', ...Markup.inlineKeyboard(getHelpButtons()) });
}

// --- Controller logic ---
const handleUserLogic = async (ctx, bot, session, text) => {
    if (text && text.startsWith('/')) return false;
    
    // Step check တွေ မလုပ်ခင် processOrder ကို အရင်ပေးဖြတ်တာက phone check အတွက် ပိုစိတ်ချရပါတယ်
    const handled = await processOrder(ctx, bot);
    if (handled) return true;

    if (session.step === STEP.AWAITING_ACCOUNT_NAME && ctx.message.text) {
        await handleAccountName(ctx, session);
        return true;
    }
    
    return false; 
};
// 🎯 ပြန်စုံသွားသော Export များ
module.exports = { 
    processOrder, 
    showPlans, 
    handlePlanSelection, 
    handlePaymentMethodSelection,
    handleManualMethodType,
    handleAccountName, 
    askForPaymentMethod,
    handleUserLogic 
};

