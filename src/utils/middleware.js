const db = require('../database');
const { STATUS, STEP } = require('./constants'); 
// config.js မလိုတော့ပါဘူး၊ env နဲ့တင် လုံလောက်ပါတယ်
// const config = require('./config'); 

const authMiddleware = async (ctx, next) => {
    try {
        // Chat types (group/channel) မဟုတ်ဘဲ user ဆီကလာမှ စစ်မည်
        if (!ctx.from || ctx.from.is_bot) return next();
        
        const userId = String(ctx.from.id);

        // ၁။ Database မှ လိုအပ်သော data များကို တစ်ခါတည်း ဆွဲယူခြင်း
        const [userSnap, sessionData, settings] = await Promise.all([
            db.db.ref(`users/${userId}`).once('value'),
            db.getUserSession(userId),
            db.getBotSettings()
        ]);

        const user = userSnap.val() || {};

        // ၂။ Blocked User ဖြစ်ပါက ဘာမှ ထပ်မလုပ်တော့ဘဲ ရပ်လိုက်မည်
        if (user.status === STATUS.BLOCKED) {
            if (ctx.callbackQuery) return ctx.answerCbQuery("🚫 သင့်ကို ပိတ်ပင်ထားပါသည်။", { show_alert: true });
            return; 
        }

        // ၃။ Admin Check (ENV ထဲက Admin ID များကို Array အဖြစ်ပြောင်း၍ စစ်ဆေးခြင်း)
        const adminIds = String(process.env.ADMIN_ID || "")
            .split(',')
            .map(id => id.trim());
        
        const isAdmin = adminIds.includes(userId);

        // State ထဲသို့ data များ ထည့်သွင်းခြင်း (နောက် Handler တွေမှာ ပြန်သုံးရန်)
        ctx.state.user = user;
        ctx.state.isAdmin = isAdmin;
        ctx.state.session = sessionData || { step: STEP.IDLE };
        ctx.state.settings = settings;

        // ၄။ Maintenance Mode စစ်ဆေးခြင်း
        // Admin မဟုတ်လျှင် Maintenance Message ပြပြီး ရပ်မည်
        if (settings.isMaintenance && !isAdmin) {
            const maintenanceText = settings.maintenanceMessage || "⚠️ စနစ်ကို ခေတ္တပြုပြင်ထိန်းသိမ်းနေပါသည်။ မကြာမီ ပြန်လည်ဖွင့်လှစ်ပါမည်။";
            
            if (ctx.callbackQuery) {
                return ctx.answerCbQuery(maintenanceText, { show_alert: true });
            }
            return ctx.reply(maintenanceText);
        }

        return next();
    } catch (error) {
        console.error("❌ Middleware Error:", error);
        return next(); // Error တက်ရင်တောင် Bot ရပ်မသွားအောင် next() ကို လွှတ်ပေးထားသည်
    }
};

module.exports = { authMiddleware };
