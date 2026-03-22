const { OP, CAT, STEP, STATUS, LABELS, DB_FIELDS, ACTION } = require('../utils/constants');
const db = require('../database');
const { Markup } = require('telegraf');

// --- ၁။ Helper Functions ---
const escapeHTML = (str) => String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function calculateDiscountedPrice(originalPrice, globalDisc = 0, opDisc = 0, isPromo = false) {
    const totalDiscPercent = isPromo ? (Number(globalDisc) + Number(opDisc)) : Number(globalDisc);
    const discountAmount = (originalPrice * totalDiscPercent) / 100;
    return Math.floor(originalPrice - discountAmount);
}

// --- ၂။ Dashboard & Main UI ---
async function showAdminDashboard(ctx) {
    try {
        const settings = await db.getBotSettings();
        const stats = await db.getStats();
        const currentGlobal = settings[DB_FIELDS.GLOBAL_DISC] || 0;

        let message = `🛠 <b>Jme Admin Dashboard</b>\n` +
                      `--------------------------\n` +
                      `🔧 Maintenance: <b>${settings.isMaintenance ? '🔴 CLOSED' : '🟢 OPEN'}</b>\n` +
                      `📢 Promo Mode: <b>${settings.isPromotionActive ? 'ON ✅' : 'OFF ❌'}</b>\n` +
                      `🌍 Global Disc: <b>${currentGlobal}%</b>\n` + 
                      `📊 Stats: Total (${stats.totalOrders || 0}) | Pending (${stats.pendingOrders || 0})\n` +
                      `--------------------------`;

        const buttons = [
            [Markup.button.callback('📦 Plan Management', 'manage_plans'), Markup.button.callback('📋 Pending Orders', 'view_pending_list')],
            [Markup.button.callback(settings.isMaintenance ? '🟢 Open Bot' : '🔴 Close Bot', 'toggle_maintenance'), Markup.button.callback(settings.isPromotionActive ? '🔴 Promo Off' : '🟢 Promo On', 'toggle_promo')],
            [Markup.button.callback('🌍 Global %', 'set_global_disc'), Markup.button.callback('📱 Operator %', 'view_op_discounts')],
            [Markup.button.callback('📢 Broadcast', 'admin_broadcast'), Markup.button.callback('📈 Analytics', 'view_analytics')],
            [Markup.button.callback('👥 User List', 'admin_view_users'), Markup.button.callback('🔄 Refresh', 'back_to_admin')]
        ];

        if (ctx.callbackQuery) return await ctx.editMessageText(message, { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) }).catch(() => {});
        return await ctx.reply(message, { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
    } catch (err) { console.error(err); }
}

// --- ၃။ Order Processing Logic ---
async function showPendingOrdersList(ctx) {
    try {
        const snapshot = await db.db.ref('orders').orderByChild('status').equalTo(STATUS.PENDING).limitToLast(10).once('value');
        const orders = snapshot.val();
        if (!orders) return ctx.editMessageText("✅ စစ်ဆေးရန် အော်ဒါမရှိပါ။", { parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.callback('⬅️ Back', 'back_to_admin')]]) });

        const buttons = Object.entries(orders).reverse().map(([id, o]) => [Markup.button.callback(`🔍 ${o.userName} (${o.amount} Ks)`, `checkorder_${id}`)]);
        buttons.push([Markup.button.callback('⬅️ Back', 'back_to_admin')]);
        return ctx.editMessageText("📋 <b>စောင့်ဆိုင်းနေသော အော်ဒါများ:</b>", { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
    } catch (e) { console.error(e); }
}

async function handleCheckOrder(ctx, orderId) {
    const snap = await db.db.ref(`orders/${orderId}`).once('value');
    const order = snap.val();
    if (!order) return ctx.answerCbQuery("❌ ရှာမတွေ့တော့ပါ။");

    let msg = `🆔 <b>Order ID:</b> <code>${orderId}</code>\n👤 <b>User:</b> ${escapeHTML(order.userName)}\n📞 <b>Phone:</b> <code>${order.phone}</code>\n📦 <b>Plan:</b> ${order.planName}\n💰 <b>Amount:</b> ${order.amount} MMK`;
    const buttons = [[Markup.button.callback('✅ Approve', `approve_${orderId}`), Markup.button.callback('❌ Reject', `reject_${orderId}`)], [Markup.button.callback('⬅️ Back', 'view_pending_list')]];

    if (order.screenshot) return ctx.replyWithPhoto(order.screenshot, { caption: msg, parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
    return ctx.editMessageText(msg, { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
}

// --- ၄။ User & Plan Management ---
async function getUserList(ctx, page = 0) {
    const snapshot = await db.db.ref('users').limitToFirst(100).once('value');
    const users = snapshot.val();
    if (!users) return ctx.answerCbQuery("User မရှိပါ။");
    const userIds = Object.keys(users);
    const start = page * 10;
    const currentBatch = userIds.slice(start, start + 10);
    let msg = `👥 <b>User List</b>\n\n`;
    const buttons = currentBatch.map(id => [Markup.button.callback(`💬 Reply to ${users[id].userName || id}`, `reply_${id}`)]);
    buttons.push([Markup.button.callback('⬅️ Back', 'back_to_admin')]);
    return ctx.editMessageText(msg, { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
}

async function showPlanManagement(ctx) {
    const operators = [OP.MPT, OP.ATOM, OP.U9, OP.MYTEL];
    const buttons = operators.map(op => [Markup.button.callback(`🛰 ${op.toUpperCase()} Plans`, `manage_op_${op}`)]);
    buttons.push([Markup.button.callback('⬅️ Back', 'back_to_admin')]);
    return ctx.editMessageText("📦 <b>Operator ရွေးချယ်ပါ</b>", { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
}

// --- ၅။ Core Logic Handler (Text Inputs) ---
const handleAdminLogic = async (ctx, bot, session, text) => {
    const userId = String(ctx.from.id);
    if (!ctx.state.isAdmin) return false;

    if (session.step === STEP.REPLY_MODE && session.replyTarget) {
        await bot.telegram.sendMessage(session.replyTarget, `👨‍💻 <b>Admin Message:</b>\n\n${text}`, { parse_mode: 'HTML' });
        await ctx.reply("✅ ပို့ပြီးပါပြီ။");
        await db.saveUserSession(userId, { step: STEP.IDLE });
        return true;
    }

    if (session.step === STEP.SET_GLOBAL_PERCENT) {
        const disc = parseInt(text);
        if (isNaN(disc)) return ctx.reply("ဂဏန်းပဲ ရိုက်ပေးပါဗျ။");
        await db.db.ref('system_settings/config').update({ [DB_FIELDS.GLOBAL_DISC]: disc });
        await db.saveUserSession(userId, { step: STEP.IDLE });
        return showAdminDashboard(ctx);
    }

    if (session.step === STEP.WAITING_BROADCAST_DATA) {
        const snap = await db.db.ref('users').once('value');
        const users = snap.val() || {};
        for (const id in users) {
            try { await bot.telegram.sendMessage(id, text, { parse_mode: 'HTML' }); } catch (e) {}
        }
        await ctx.reply("✅ Broadcast ပြီးပါပြီ။");
        await db.saveUserSession(userId, { step: STEP.IDLE });
        return true;
    }

    return false;
};

// --- ၆။ Action Registration ---
function handleAdminAction(bot) {
    bot.action('admin_view_users', (ctx) => getUserList(ctx, 0));
    bot.action('manage_plans', (ctx) => showPlanManagement(ctx));
    bot.action('view_pending_list', (ctx) => showPendingOrdersList(ctx));
    bot.action('back_to_admin', (ctx) => showAdminDashboard(ctx));
    bot.action('set_global_disc', async (ctx) => {
        await db.saveUserSession(ctx.from.id, { step: STEP.SET_GLOBAL_PERCENT });
        return ctx.reply("🌍 Global Discount % ရိုက်ထည့်ပါ -");
    });
    bot.action('admin_broadcast', async (ctx) => {
        await db.saveUserSession(ctx.from.id, { step: STEP.WAITING_BROADCAST_DATA });
        return ctx.reply("📢 Broadcast လုပ်မည့်စာ ပို့ပေးပါ -");
    });
    bot.action(/^checkorder_(.+)$/, (ctx) => handleCheckOrder(ctx, ctx.match[1]));
    bot.action(/^approve_(.+)$/, async (ctx) => {
        const id = ctx.match[1];
        await db.db.ref(`orders/${id}`).update({ status: STATUS.COMPLETED });
        ctx.answerCbQuery("Approved!");
        return showPendingOrdersList(ctx);
    });
    bot.action('toggle_maintenance', async (ctx) => {
        const settings = await db.getBotSettings();
        await db.db.ref('system_settings/config').update({ isMaintenance: !settings.isMaintenance });
        return showAdminDashboard(ctx);
    });
}

module.exports = { 
    showAdminDashboard, handleAdminAction, handleAdminLogic,
    showPendingOrdersList, getUserList, showPlanManagement, handleCheckOrder
};
