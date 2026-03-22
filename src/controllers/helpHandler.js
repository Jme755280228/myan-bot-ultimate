const { Markup } = require('telegraf');

// ==========================================
// 💎 DIAMOND DATA STORAGE (Doctor's Style)
// ==========================================
const ussdCodes = {
    u9: {
        id: "U9 (Ooredoo)",
        prescription: "U9 ဝန်ဆောင်မှုအတွက် အောက်ပါအတိုင်း ဆောင်ရွက်ပေးပါ -",
        text: `💎 <b>U9 ဝန်ဆောင်မှုများ</b>

💰 လက်ကျန်စစ်: <code>*124#</code> 
📞 ဖုန်းနံပါတ်ကြည့်: <code>*133*6*2#</code> OR <code>*99#</code> 
📦 ပက်ကေ့ချ်ဝယ်: <code>*140#</code> 
🔄 ငွေလွှဲရန်: <code>*155*ပမာဏ*နံပါတ်#</code> 
🆘 အရေးပေါ်ချေး: <code>*125#</code> 
👤 Sim မှတ်ပုံတင်စစ်: <code>*666#</code> 
☎️ Call Center: <code>234</code> 
🌐 PayGo အဖွင့်/အပိတ်: <code>*5001#</code>`
    },
    atom: {
        id: "ATOM (Telenor)",
        prescription: "ATOM ဝန်ဆောင်မှုအတွက် အောက်ပါအတိုင်း ဆောင်ရွက်ပေးပါ -",
        text: `🟡 <b>Atom ဝန်ဆောင်မှုများ</b>

💰 လက်ကျန်စစ်: <code>*124*1#</code> 
📞 ဖုန်းနံပါတ်ကြည့်: <code>*97#</code> 
🏠 ပင်မမီနူး: <code>*979#</code> 
🔄 ငွေလွှဲရန်: <code>*122*နံပါတ်*ပမာဏ#</code> 
🆘 အရေးပေါ်ချေး: <code>*500#</code> 
👤 Sim မှတ်ပုံတင်စစ်: <code>*979*3*3#</code> 
🌐 PayGo အဖွင့်/အပိတ်: ATOM App ထဲရှိ Balance Barrier ကို သုံးပါ 
☎️ Call Center: <code>979</code>` 
    },
    mytel: {
        id: "Mytel",
        prescription: "Mytel ဝန်ဆောင်မှုအတွက် အောက်ပါအတိုင်း ဆောင်ရွက်ပေးပါ -",
        text: `🟠 <b>Mytel ဝန်ဆောင်မှုများ</b>

💰 လက်ကျန်စစ်: <code>*124*3#</code> 
📞 ဖုန်းနံပါတ်ကြည့်: <code>*88#</code> 
🏠 ပင်မမီနူး: <code>*966#</code> 
🔄 ငွေလွှဲရန်: <code>*966*6#</code> 
🆘 အရေးပေါ်ချေး: <code>*966*5#</code> 
👤 Sim မှတ်ပုံတင်စစ်: <code>*966*6#</code> 
☎️ Call Center: <code>966</code>  
🌐 PayGo အဖွင့်/အပိတ်: BDATA (to 966)`
    },
    mpt: {
        id: "MPT",
        prescription: "MPT ဝန်ဆောင်မှုအတွက် အောက်ပါအတိုင်း ဆောင်ရွက်ပေးပါ -",
        text: `🔵 <b>MPT ဝန်ဆောင်မှုများ</b>

💰 လက်ကျန်စစ်: <code>*124#</code> 
📞 ဖုန်းနံပါတ်ကြည့်: <code>*88#</code> 
🏠 ပင်မမီနူး: <code>*106#</code> 
🔄 ငွေလွှဲရန်: <code>*223*ပမာဏ*နံပါတ်#</code> 
🆘 အရေးပေါ်ချေး: <code>*800#</code> 
📦 Data ပက်ကေ့ချ်: <code>*777#</code> 
☎️ Call Center: <code>106</code>  
🌐 PayGo အဖွင့်/အပိတ်: <code>*2008#</code>`
    },
    mec: {
        id: "MEC",
        prescription: "MEC ဝန်ဆောင်မှုအတွက် အောက်ပါအတိုင်း ဆောင်ရွက်ပေးပါ -",
        text: `📶 <b>MEC ဝန်ဆောင်မှုများ</b>

💰 လက်ကျန်စစ်: <code>*124#</code> 
📞 ဖုန်းနံပါတ်ကြည့်: <code>*155#</code>`
    }
};

// ==========================================
// 🛡 HELP MENU & LOGIC (No Data Reduced)
// ==========================================
async function sendHelpMenu(ctx) {
    const text = `🛡 <b>Jme Telecom - အကူအညီလမ်းညွှန်</b>\n━━━━━━━━━━━━━━━━━━\n` +
        `📞 <b>Call Center ဝန်ထမ်းနှင့် တိုက်ရိုက်ပြောရန်</b>\n\n` +
        `⏳ <b>၅ စက္ကန့်ခန့် စောင့်ပြီးနှိပ်ရန်</b>\n` +
        `• MPT: 106 ➡️ 101010\n` +
        `• ATOM: 979 ➡️ 19\n` +
        `• U9: 234 ➡️ 101\n` +
        `• Mytel: 966 ➡️ 0\n━━━━━━━━━━━━━━━━━━`;

    const adminId = String(process.env.ADMIN_ID || "").split(',').map(id => id.trim());
    const isAdmin = adminId.includes(String(ctx.from.id));

    let buttons = [
        [Markup.button.callback('💎 U9', 'show_help_u9'), Markup.button.callback('🟡 Atom', 'show_help_atom')],
        [Markup.button.callback('🟠 Mytel', 'show_help_mytel'), Markup.button.callback('🔵 MPT', 'show_help_mpt')],
        [Markup.button.url('👨‍💻 Admin ကိုမေးရန်', 'https://t.me/MyanBotCare_bot')]
    ];

    if (isAdmin) buttons.push([Markup.button.callback('🔙 Admin Dashboard', 'back_to_admin')]);
    buttons.push([Markup.button.callback('❌ ပိတ်မည်', 'delete_msg')]);

    const keyboard = Markup.inlineKeyboard(buttons);

    try {
        if (ctx.callbackQuery) {
            await ctx.editMessageText(text, { parse_mode: 'HTML', ...keyboard }).catch(() => ctx.reply(text, { parse_mode: 'HTML', ...keyboard }));
        } else {
            await ctx.reply(text, { parse_mode: 'HTML', ...keyboard });
        }
    } catch (e) { console.error("Menu Error:", e); }
}

async function handleOperatorHelp(ctx, operatorKey) {
    const data = ussdCodes[operatorKey];
    if (!data) return;

    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🔙 နောက်သို့', 'show_help_menu')],
        [Markup.button.callback('❌ ပိတ်မည်', 'delete_msg')]
    ]);

    try {
        await ctx.answerCbQuery().catch(() => {});
        await ctx.editMessageText(data.text, { parse_mode: 'HTML', ...keyboard }).catch(() => ctx.reply(data.text, { parse_mode: 'HTML', ...keyboard }));
    } catch (e) { console.error("Operator Help Error:", e); }
}

module.exports = { 
    sendHelpMenu, 
    handleOperatorHelp, 
    ussdCodes,
    handleHelpAction: handleOperatorHelp // 👈 ဒါဆိုရင် တခြား file က handleHelpAction လို့ ခေါ်လည်း ရသွားပါပြီ
};

