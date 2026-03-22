const { Markup } = require('telegraf');
const simPlans = require('../data/simData'); 

const simHandler = {
    showSimMenu: async (ctx) => {
        // 1️⃣ ဒီနေရာမှာလည်း HTML ပြောင်းပါမယ် (Bold အတွက် <b> သုံးနိုင်အောင်)
        const text = "📱 <b>SIM Card ရောင်းချခြင်း</b>\nဝယ်ယူလိုသည့် Operator ကို ရွေးချယ်ပါ -";
        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('💎 U9 Sim', 'sim_u9'), Markup.button.callback('🟡 Atom Sim', 'sim_atom')],
            [Markup.button.callback('🟠 Mytel Sim', 'sim_mytel'), Markup.button.callback('🔵 MPT Sim', 'sim_mpt')],
            [Markup.button.callback('🔙 နောက်သို့', 'back_to_start')]
        ]);
        // parse_mode ကို 'HTML' သို့ ပြောင်းလဲခြင်း
        await ctx.editMessageText(text, { parse_mode: 'HTML', ...keyboard });
    },

    handleSimChoice: async (ctx, operator) => {
        const plan = simPlans[operator];
        
        if (!plan) return;

        let text = "";
        let buttons = [];

        // 2️⃣ ဒီနေရာက အရေးကြီးဆုံးပါ (simData ထဲက <b> tag တွေ အလုပ်လုပ်ဖို့)
        text += `<b>${plan.title}</b>\n\n`;
        if (plan.priceDetails) text += `${plan.priceDetails}\n\n`;
        if (plan.features) text += `${plan.features}\n\n`;
        if (plan.extra) text += `${plan.extra}`;

        if (plan.available) {
            buttons.push([Markup.button.callback('🛒 ဝယ်ယူရန်', 'contact_admin')]);
        }
        
        buttons.push([Markup.button.callback('🔙 နောက်သို့', 'sim_sales')]);
        
        // parse_mode ကို 'HTML' သို့ ပြောင်းလဲခြင်း
        await ctx.editMessageText(text, { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
    }
};

module.exports = simHandler;
