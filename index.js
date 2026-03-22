const express = require('express');
const { Telegraf, Markup } = require('telegraf');

const rateLimit = require('express-rate-limit');
require('dotenv').config();

// --- 🛠 Constants ခေါ်ယူခြင်း (Bugs မတက်အောင် ဒါလေး ထည့်ပေးထားပါတယ်) ---
const { STEP, DB_FIELDS, ACTION } = require('./utils/constants');

// --- Handlers, Helpers & Services ---
const userHandler = require('./handlers/userHandler');
const adminHandler = require('./handlers/adminHandler');
const helpHandler = require('./handlers/helpHandler');
const simHandler = require('./handlers/simHandler');
const aiService = require('./services/AIService');
const db = require('./database');
const { authMiddleware } = require('./utils/middleware');
// --- 1. Express Server & Security Armor 🛡️ ---
const app = express();
const port = process.env.PORT || 3000;

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 100, 
    standardHeaders: true,
    legacyHeaders: false,
    message: "⛔ Too many requests from this IP, please try again later."
});
app.set('trust proxy', 1);
app.use(limiter);

app.get('/', (req, res) => res.send('✅ JmeBot is Active and Running! 🚀'));
app.use((req, res) => res.status(404).send('⛔ Access Denied'));

app.listen(port, () => console.log(`🛡️ Server listening on port ${port}`));

// --- 2. Bot Setup ---
const bot = new Telegraf(process.env.BOT_TOKEN);

// --- #2b3. Middleware (Setup ပြီးမှ use လုပ်ပါ) ---
bot.use(authMiddleware); 

// --- 3. System Config ---
let systemConfig = { isMaintenance: false, maintenanceMessage: "" };
db.db.ref('system_settings/config').on('value', (snapshot) => {
    const data = snapshot.val();
    if (data) {
        systemConfig = { 
            isMaintenance: data.isMaintenance || false, 
            maintenanceMessage: data.maintenanceMessage || "စနစ်ကို ခေတ္တပြုပြင်ထိန်းရှိမ်းနေပါသည်။" 
        };
    }
});

// Admin Actions Initialization
adminHandler.handleAdminAction(bot);

// --- 4. Main Menus ---
const startMenu = async (ctx) => {
    const userId = String(ctx.from.id).trim();
    
    // --- ဤနေရာကို ပြင်ဆင်လိုက်သည် (ID အများကြီးကို စစ်နိုင်ရန်) ---
    const adminIdsEnv = String(process.env.ADMIN_ID || "").split(',').map(id => id.trim());
    const isAdmin = adminIdsEnv.includes(userId);
    // --------------------------------------------------

    try {
        await db.updateUserProfile(userId, {
            userName: ctx.from.first_name + (ctx.from.last_name ? " " + ctx.from.last_name : ""),
            username: ctx.from.username || "no_username"
        });
    } catch (e) { 
        console.error("User logging error:", e); 
    }

    const welcomeText = `မင်္ဂလာပါ ${ctx.from.first_name} 🙏\nJme Telecom မှ ကြိုဆိုပါတယ်။ ဝန်ဆောင်မှု ရွေးချယ်ပါ -`;
    
    const inlineButtons = [
        [Markup.button.callback('🤖 Jme AI Assistant', 'enable_ai')],
        [Markup.button.callback('📶 Data / Bill ဝယ်ယူရန်', 'data_bill_guide')],
        [Markup.button.callback('📱 SIM Card ဝယ်ယူရန်', 'sim_sales')],
        [
            Markup.button.callback('❓ USSD အကူအညီ', 'show_help_menu'),
            Markup.button.url('👨‍💻 Support Bot', 'https://t.me/MyanBotCare_bot')
        ]
    ];

    // isAdmin variable ကို သုံးပြီး စစ်ဆေးသည်
    if (isAdmin) {
        inlineButtons.push([
            Markup.button.callback('🛠 Admin Dashboard', 'admin_main_dashboard'),
            Markup.button.callback('👥 User List', 'admin_view_users')
        ]);
    }

    const mainKeyboard = Markup.keyboard([
        ['💰 ငွေဖြည့်မည် / ဝယ်ယူမည်', '📦 ပက်ကေ့ချ်များ'],
        ['💁‍♂️ အကူအညီရယူရန်', '👨‍💻 Admin သို့မေးရန်']
    ]).resize();

    if (ctx.callbackQuery) {
        return await ctx.editMessageText(welcomeText, Markup.inlineKeyboard(inlineButtons)).catch(() => ctx.reply(welcomeText, Markup.inlineKeyboard(inlineButtons)));
    } else {
        return await ctx.reply(welcomeText, { ...mainKeyboard, ...Markup.inlineKeyboard(inlineButtons) });
    }
};

bot.start(startMenu);
bot.action('back_to_start', startMenu);

// --- 6. Callbacks ---
bot.action('admin_view_users', (ctx) => adminHandler.getUserList(ctx));
bot.action(/^userpage_(\d+)$/, (ctx) => adminHandler.getUserList(ctx, parseInt(ctx.match[1])));
bot.action('admin_main_dashboard', async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    
    // Dashboard ကို ခေါ်ပြမယ်
    const sentMsg = await adminHandler.showAdminDashboard(ctx);
    
    // ⭐ ပြန်လာတဲ့ Message ထဲက ID ကို session ထဲမှာ သိမ်းထားမယ်
    // ဒါမှ နောက်တစ်ခါ % ပြောင်းရင် ဒီ ID ကိုပဲ လိုက် Edit လုပ်မှာဖြစ်ပါတယ်
    if (sentMsg && sentMsg.message_id) {
        const currentSession = await db.getUserSession(ctx.from.id) || {};
        await db.saveUserSession(ctx.from.id, { 
            ...currentSession, 
            lastDashboardId: sentMsg.message_id 
        });
    }
});
bot.action('show_help_menu', (ctx) => helpHandler.sendHelpMenu(ctx));
bot.action('view_pending_list', (ctx) => adminHandler.showPendingOrdersList(ctx));
bot.action('back_to_admin', (ctx) => adminHandler.showAdminDashboard(ctx));

// --- Management Handlers များ ---

bot.action(ACTION.MANAGE_PLANS, async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    return adminHandler.showPlanManagement(ctx);
});

bot.action(ACTION.ADD_PLAN_START, async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    return adminHandler.startAddPlan(ctx);
});

bot.action(ACTION.EDIT_PLAN_START, async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    return adminHandler.startEditPlan(ctx);
});

bot.action(ACTION.DELETE_PLAN_START, async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    return adminHandler.startDeletePlan(ctx);
});


bot.action('data_bill_guide', async (ctx) => {
    const adminIdsEnv = String(process.env.ADMIN_ID || "").split(',').map(id => id.trim());
    if (adminIdsEnv.includes(String(ctx.from.id))) {
        return ctx.answerCbQuery("⚠️ Admin က အော်ဒါတင်လို့မရပါ", { show_alert: true });
    }
    await ctx.answerCbQuery().catch(() => {});
    return ctx.reply('📶 ဝယ်ယူလိုသော ဖုန်းနံပါတ် ရိုက်ထည့်ပေးပါ (ဥပမာ- 099xxxxxxx)');
});

// ၁။ Category ရွေးတဲ့အပိုင်း (Data/Voice)
bot.action(/^cat_(.+)$/, (ctx) => {
    console.log(`\n--- 📥 INDEX LOG: Category Button Clicked ---`);
    console.log(`Raw Callback Data: ${ctx.match[0]}`); // ဥပမာ- cat_ooredoo_data
    
    const parts = ctx.match[1].split('_');
    const operator = parts[0];
    const category = parts[1];
    
    console.log(`Extracted -> Op: ${operator}, Cat: ${category}`);
    console.log(`-------------------------------------------\n`);
    
    return userHandler.showPlans(ctx, operator, category);
});

// ၂။ Plan တစ်ခုခုကို ဝယ်ဖို့ နှိပ်တဲ့အပိုင်း (Buy)
bot.action(/^buy_(.+)$/, async (ctx) => {
    console.log(`\n--- 📥 INDEX LOG: Buy Button Clicked ---`);
    console.log(`Full Match Data: ${ctx.match[0]}`); // ဥပမာ- buy_u9_data_plan_177...
    
    await ctx.answerCbQuery().catch(() => {});
    return userHandler.handlePlanSelection(ctx);
});

// --- ❓ Help Menu & USSD Actions (All Operators Fix) ---

// အကူအညီကို နှိပ်ရင် Sub-button ၂ ခု ပြပေးမည့် Handler
bot.action('order_help_menu', async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    
    const msg = `🛡️ <b>အကူအညီ လမ်းညွှန်</b>\n\nလိုအပ်သည့် အချက်အလက်ကို ရွေးချယ်ပါ -`;
    
    const buttons = Markup.inlineKeyboard([
        [
            // ၁။ Help Handler ထဲက USSD/Guide Menu ကို လှမ်းခေါ်မည့် Button
            Markup.button.callback('📖 အသုံးပြုပုံ Guide', 'show_help_menu'),
            
            // ၂။ Admin ဆီ တိုက်ရိုက်သွားမည့် Button
            Markup.button.url('👨‍💻 Admin', 'https://t.me/MyanBotCare_bot')
        ],
        [
            // ဝယ်ယူလက်စ Page ကို ပြန်သွားဖို့ Button
            Markup.button.callback('🔙 ဝယ်ယူမှုသို့ ပြန်သွားရန်', 'back_to_payment_selection')
        ]
    ]);

    return ctx.editMessageText(msg, { parse_mode: 'HTML', ...buttons });
});


// ၁။ Help Main Menu ပြသရန်
bot.action('show_help_menu', async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    return helpHandler.sendHelpMenu(ctx);
});

// ၂။ Operator တစ်ခုချင်းစီအတွက် Help ပြရန် (u9, atom, mpt, mytel အကုန်မိပါတယ်)
bot.action(/^show_help_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    const operator = ctx.match[1]; // u9, atom, mpt, mytel စသည်ဖြင့် ရရှိမည်
    console.log(`🔍 Help Requested for: ${operator}`);
    
    // helpHandler ထဲက handleHelpAction (သို့မဟုတ်) Jme သုံးထားတဲ့ function နာမည်နဲ့ လှမ်းခေါ်ပါ
    return helpHandler.handleHelpAction(ctx, operator);
});

// ၃။ Regex နဲ့ မမိမှာစိုးလို့ တစ်ခုချင်းစီကိုပါ Backup အနေနဲ့ ထည့်ထားပေးပါတယ်
bot.action('show_help_u9', (ctx) => helpHandler.handleHelpAction(ctx, 'u9'));
bot.action('show_help_atom', (ctx) => helpHandler.handleHelpAction(ctx, 'atom'));
bot.action('show_help_mpt', (ctx) => helpHandler.handleHelpAction(ctx, 'mpt'));
bot.action('show_help_mytel', (ctx) => helpHandler.handleHelpAction(ctx, 'mytel'));

// ၄။ USSD Code အသေးစိတ် Actions များ (ဥပမာ- help_check_balance)
bot.action(/^help_(.+)$/, (ctx) => helpHandler.handleHelpAction(ctx, ctx.match[1]));

bot.action('sim_sales', (ctx) => simHandler.showSimMenu(ctx));
bot.action(/^sim_(.+)$/, (ctx) => simHandler.handleSimChoice(ctx, ctx.match[1]));
bot.action('enable_ai', (ctx) => ctx.reply("🤖 Jme AI Assistant နှင့် စကားပြောနိုင်ပါပြီ။"));

// --- 🎯 Hybrid Payment Flow Actions (Screenshot vs Manual) ---

// ၁။ ပထမလမ်းခွဲ - Screenshot ပို့မည် (pay_ss) ကို နှိပ်လိုက်လျှင်
bot.action('pay_ss', async (ctx) => {
    const userId = ctx.from.id;
    const session = await db.getUserSession(userId);
    
    // Step ကို Screenshot စောင့်တဲ့အဆင့်သို့ ပြောင်းမည်
    await db.saveUserSession(userId, { ...session, step: STEP.AWAITING_PAYMENT_SS });
    
    // 🎯 ပြင်ဆင်လိုက်သည့်အပိုင်း: ငွေလွှဲရမယ့် အကောင့်အချက်အလက်များကိုပါ ထည့်သွင်းပြသခြင်း
    const paymentInstructions = 
        `💳 <b>ငွေပေးချေရန် အကောင့်များ</b>\n` +
        `--------------------------\n` +
        `📱 <b>KPay:</b> <code>${process.env.KPAY_NUMBER}</code> (${process.env.KPAY_NAME})\n` +
        `🌊 <b>Wave:</b> <code>${process.env.WAVE_NUMBER}</code> (${process.env.WAVE_NAME})\n` +
        `--------------------------\n\n` +
        `✅ အထက်ပါအကောင့်တစ်ခုခုသို့ <b>${session.amount} MMK</b> လွှဲပေးပါရန်။\n\n` +
        `📸 ပြီးလျှင် ငွေလွှဲပြေစာ <b>Screenshot</b> ကို ဤနေရာသို့ ပို့ပေးပါခင်ဗျာ။`;

    await ctx.answerCbQuery().catch(() => {});
    return ctx.editMessageText(paymentInstructions, { parse_mode: 'HTML' });
});

// ၂။ ဒုတိယလမ်းခွဲ - Manual ဖြည့်မည် (pay_manual) ကို နှိပ်လိုက်လျှင်
bot.action('pay_manual', async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    
    // Kpay/Wave ရွေးခိုင်းတဲ့ Menu ကို ပြန်ပြပေးလိုက်တာပါ
    const msg = `📱 <b>Manual ဖြည့်သွင်းရန် App ရွေးချယ်ပါ -</b>`;
    const buttons = Markup.inlineKeyboard([
        [
            Markup.button.callback('📱 Kpay', 'method_kpay'),
            Markup.button.callback('🌊 Wave', 'method_wave')
        ],
        [Markup.button.callback('🔙 နောက်သို့', 'back_to_payment_selection')] // လမ်းခွဲကို ပြန်သွားဖို့
    ]);
    return ctx.editMessageText(msg, { parse_mode: 'HTML', ...buttons });
});

// ၃။ Manual ထဲကမှ Kpay/Wave တစ်ခုခုကို ရွေးလိုက်လျှင် (ဒါက ဆရာ့မူရင်း logic ပါပဲ)
bot.action(/^method_(.+)$/, (ctx) => {
    console.log(`\n--- 📥 INDEX LOG: Manual Payment Method Clicked: ${ctx.match[1]} ---`);
    return userHandler.handlePaymentMethodSelection(ctx);
});

// ၄။ နောက်သို့ပြန်ဆုတ်ချင်လျှင် (Optional)
bot.action('back_to_payment_selection', async (ctx) => {
    // ဒီမှာ ဆရာ့ရဲ့ planName နဲ့ price အဟောင်းတွေကို session ထဲကပြန်ယူပြီး askForPaymentMethod ပြန်ခေါ်ပေးရပါမယ်
    const session = await db.getUserSession(ctx.from.id);
    return userHandler.askForPaymentMethod(ctx, session.planName, session.amount);
});

bot.action('delete_msg', (ctx) => ctx.deleteMessage());

// ၁။ User က /help လို့ ရိုက်ရင် menu ပေါ်လာအောင်
bot.help((ctx) => helpHandler.sendHelpMenu(ctx));
bot.command('help', (ctx) => helpHandler.sendHelpMenu(ctx));


// --- ⭐ Admin Commands ---
bot.command('userlist', (ctx) => {
    const adminIdsEnv = String(process.env.ADMIN_ID || "").split(',').map(id => id.trim());
    if (adminIdsEnv.includes(String(ctx.from.id))) {
        return adminHandler.getUserList(ctx);
    }
});

bot.command('reply', async (ctx) => {
    // Middleware က စစ်ပေးထားတဲ့ isAdmin ကိုပဲ သုံးတော့မယ်
    if (!ctx.state.isAdmin) return;

    const args = ctx.message.text.split(' ');
    const targetId = args[1];

    if (!targetId) return ctx.reply("⚠️ Usage: /reply [ID]");

    try {
        await db.saveUserSession(ctx.from.id, { 
            step: STEP.REPLY_MODE, 
            replyTarget: targetId 
        }); 
        return ctx.reply(`✍️ User (ID: ${targetId}) ထံသို့ စာပြန်ရန် အသင့်ဖြစ်ပါပြီ။\nစာရိုက်ပြီး ပို့လိုက်ရုံပါပဲ။`, { parse_mode: 'HTML' });
    } catch (e) { 
        console.error("Reply Command Error:", e);
        ctx.reply("❌ Session Error"); 
    }
});

// --- 5. 🔥 Message Handling (Ultimate Unified Logic) ---
bot.on(['text', 'photo', 'voice'], async (ctx) => {
    try {
        const userId = String(ctx.from.id);
        const adminIdsEnv = String(process.env.ADMIN_ID || "").split(',').map(id => id.trim());
        const isAdmin = adminIdsEnv.includes(userId);
        
        ctx.state.isAdmin = isAdmin;
        const text = ctx.message.text || ctx.message.caption || "";
        const settings = await db.getBotSettings();

        // (က) Maintenance Check (Admin မဟုတ်ရင် ပိတ်မည်)
        if (settings.isMaintenance && !isAdmin) {
            return ctx.reply(settings.maintenanceMessage || "⚠️ စနစ်ကို ခေတ္တပြုပြင်ထိန်းသိမ်းနေပါသည်။");
        }

        // (ခ) Database မှ Session Data ယူခြင်း
        const session = await db.getUserSession(userId) || { step: STEP.IDLE };

        // (ဂ) Common Buttons (Help & Support)
        if (text === '💁‍♂️ အကူအညီရယူရန်') return helpHandler.sendHelpMenu(ctx);
        if (text === '👨‍💻 Admin သို့မေးရန်') {
            return ctx.reply("Support Bot သို့ ဆက်သွယ်ပါ -", Markup.inlineKeyboard([[Markup.button.url('💬 Contact Support', 'https://t.me/MyanBotCare_bot')]]));
        }

        // (ဃ) Admin Logic Check (စာရိုက်ပြီး Admin အလုပ်လုပ်ခြင်း - Reply, Set Disc, Broadcast)
        if (isAdmin) {
            const isHandledByAdmin = await adminHandler.handleAdminLogic(ctx, bot, session, text);
            if (isHandledByAdmin) return; 
        }

        // (င) User & Order Flow (ဖုန်းနံပါတ်စစ်ခြင်း၊ အော်ဒါတင်ခြင်း၊ AI စစ်ခြင်း)
        // userHandler ထဲက handleUserLogic က AI ရော Order ရော အကုန်ကိုင်တွယ်သွားပါလိမ့်မယ်
        const isUserHandled = await userHandler.handleUserLogic(ctx, bot, session, text);
        if (isUserHandled) return;

        // (စ) Fallback - အပေါ်က ဘာနဲ့မှ မကိုက်ညီရင် Default AI Message ပို့မည်
        if (text && !text.startsWith('/')) {
            await ctx.sendChatAction('typing').catch(() => {});
            // ဒီနေရာမှာ userHandler ထဲက AI handler ကို လှမ်းခေါ်နိုင်ပါတယ်
            return true;
        }

    } catch (e) { 
        console.error("Main Loop Error:", e); 
    }
});


// 🚀 Launch
const startBot = async () => {
    try {
        console.log('⏳ Connecting to Telegram...');
        // deleteWebhook ကို timeout ဖြစ်ခဲ့ရင် ကျော်သွားဖို့ catch ခံထားပါမယ်
        await bot.telegram.deleteWebhook({ drop_pending_updates: true }).catch(err => {
            console.log("⚠️ Webhook Delete Warning (Timeout): Using existing settings.");
        });
        
        await bot.launch();
        console.log('🚀 JmeBot Connected Successfully!');
    } catch (err) { 
        console.error("❌ Bot Launch Error:", err);
        // တကယ်လို့ ပထမအကြိမ် ပျက်စီးသွားရင် ၅ စက္ကန့်နေရင် ပြန်ချိတ်ခိုင်းမယ်
        setTimeout(startBot, 5000);
    }
};

startBot();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
