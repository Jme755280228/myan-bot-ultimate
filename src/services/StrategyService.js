// services/StrategyService.js
const db = require('../database');

class StrategyService {
    async getAIStrategyPrompt() {
        try {
            const settings = await db.getBotSettings();
            
            // ၁။ ပရိုမိုးရှင်း ပိတ်ထားလျှင် (Database ထဲက field name logic အတိုင်း စစ်သည်)
            if (!settings.isPromotionActive) {
                return "[STRATEGY]: No active promotions. Provide standard pricing. Focus on value for money based on history.";
            }

            // ၂။ ပရိုမိုးရှင်း ဖွင့်ထားလျှင်
            // ဆရာ့ database.js ထဲမှာ field နာမည်တွေက mptDisc, atomDisc စသဖြင့် ဖြစ်နေလို့ ပြန်ညှိပေးထားပါတယ်
            const globalDisc = settings.globalDisc || 0;
            const mpt = settings.mptDisc || 0;
            const atom = settings.atomDisc || 0;
            const u9 = settings.u9 || 0;
            const mytel = settings.mytelDisc || 0;
            
            let promoMessage = `[STRATEGY]: PROMOTION IS ACTIVE!\n- Global Discount: ${globalDisc}% off on everything.`;

            // Operator အလိုက် Discount ရှိလျှင် AI ကို အသိပေးခြင်း
            let opBonuses = [];
            if (mpt > 0) opBonuses.push(`MPT (${mpt}%)`);
            if (atom > 0) opBonuses.push(`ATOM (${atom}%)`);
            if (u9 > 0) opBonuses.push(`U9 (${u9}%)`);
            if (mytel > 0) opBonuses.push(`Mytel (${mytel}%)`);

            if (opBonuses.length > 0) {
                promoMessage += `\n- Extra Bonuses for: ${opBonuses.join(', ')}.`;
            }

            promoMessage += `\n- AI INSTRUCTION: Subtract these discounts from the database base price. Highlight the "Total Discounted Price" to the user. Show them how much they save compared to market price. Make the tone enthusiastic!`;
            
            return promoMessage;
        } catch (error) {
            console.error("Strategy Error:", error);
            return "[STRATEGY]: Standard sales mode. Focus on finding the cheapest plan from the database.";
        }
    }
}

module.exports = new StrategyService();
