// services/AIService.js
const { askGemini } = require('../utils/aiHelper');
const db = require('../database');
const { DB_FIELDS } = require('../utils/constants');

class AIService {
  
      // 🚀 index.js ကနေ တိုက်ရိုက်လှမ်းခေါ်မယ့် Main Entry Point
    async processMediaRequest(ctx, userId, settings) {
        try {
            const text = ctx.message.text || ctx.message.caption || "";

            // ၁။ အကယ်၍ User က ဓာတ်ပုံ (Photo) ပို့လာလျှင်
            if (ctx.message.photo) {
                console.log("📸 [AIService] Processing Photo...");
                const photo = ctx.message.photo[ctx.message.photo.length - 1];
                const fileLink = await ctx.telegram.getFileLink(photo.file_id);
                
                // analyzeImage ကို လှမ်းခေါ်ပြီး အဖြေပြန်ပေးမယ်
                return await this.analyzeImage(fileLink.href, text, userId);
            }

            // ၂။ အကယ်၍ User က စာသား (Text) သီးသန့် ပို့လာလျှင်
            if (text && !text.startsWith('/')) {
                console.log("💬 [AIService] Processing Text...");
                const result = await this.handleRequest(userId, text, ctx.state.isAdmin, settings);
                return result ? result.text : null;
            }

            // ၃။ (နောင်အဆင့်) အကယ်၍ Voice ပို့လာလျှင် ဒီနေရာမှာ ထပ်တိုးမယ်
            // if (ctx.message.voice) { ... Go Module ချိတ်ဆက်မှု ... }

            return null;
        } catch (error) {
            console.error("❌ [AIService] processMediaRequest Error:", error);
            return "ခေတ္တ အဆင်မပြေဖြစ်နေပါသည်။";
        }
    }

    
    // 📸 ၁။ index.js မှ Telegram URL ကို လက်ခံပြီး Buffer ပြောင်းပေးမည့် Function အသစ်
      async analyzeImage(imageUrl, caption, userId) {
        try {
            console.log("📥 [AIService] Fetching image from Telegram...");
            
            const response = await fetch(imageUrl);
            const arrayBuffer = await response.arrayBuffer();
            const imageBuffer = Buffer.from(arrayBuffer);
            
            // 🔥 ပြင်လိုက်တဲ့နေရာ: MIME type ကို image/jpeg လို့ တိုက်ရိုက်သတ်မှတ်ပေးလိုက်မယ်
            const mimeType = "image/jpeg"; 

            const sysConfig = await db.getBotSettings();
            const result = await this.handleRequest(userId, caption, true, sysConfig, imageBuffer, mimeType);
            
            return result ? result.text : null;

        } catch (error) {
            console.error("❌ [AIService] Image Analysis Error:", error);
            return "ပုံကို ဖတ်ရာတွင် အခက်အခဲရှိနေပါသည်။ ကျေးဇူးပြု၍ ခဏနေမှ ပြန်စမ်းပေးပါ။";
        }
    }

    // 💬 ၂။ မူလရှိပြီးသား (စာရော၊ ပုံပါ လက်ခံမည့်) Main Function
    async handleRequest(userId, text, isAdmin, sysConfig, imageBuffer = null, mimeType = "image/jpeg") {
        // AI Enabled မဖြစ်ရင် ပြန်ထွက်မယ်
        if (!isAdmin && !sysConfig.aiEnabled) return null;

        try {
            // ၁။ Database မှ Real-time Discount များကို တိုက်ရိုက်ဆွဲယူခြင်း
            const settings = await db.getBotSettings();
            
            const gD = settings[DB_FIELDS.GLOBAL_DISC] || 0;
            const mB = settings[DB_FIELDS.MPT_DISC] || 0;
            const aB = settings[DB_FIELDS.ATOM_DISC] || 0;
            const uB = settings[DB_FIELDS.OOREDOO_DISC] || 0; 
            const myB = settings[DB_FIELDS.MYTEL_DISC] || 0;

            // ၂။ Jme Style Marketing Prompt (Compact & High Conversion)
            const attractionPrompt = `
[ROLE]: Jme Telecom Sales Expert (Direct, Warm & Persuasive)
[CONTEXT]: Real-time Dynamic Discount rates from our system.

[DATA - Dynamic Operator Discounts]:
- MPT Total Discount: ${gD + mB}% Off
- ATOM Total Discount: ${gD + aB}% Off
- Ooredoo/U9 Total Discount: ${gD + uB}% Off
- Mytel Total Discount: ${gD + myB}% Off

[MARKETING RULES]:
- စာသားကို တိုတို၊ ရှင်းရှင်း၊ ထိထိမိမိပဲ ရေးပါ။ စာပိုဒ်ရှည်ကြီးတွေ ရှောင်ပါ။
- Jme ရဲ့ ကိုယ်ပိုင်လေသံ "အကျိုးများမယ့် ဝန်ဆောင်မှုတွေ ရွေးလိုက်တော့နော်" ဆိုတာမျိုး ထည့်သုံးပါ။

[VISION RULE]:
- အကယ်၍ user က screenshot ပို့လာပါက ထိုပုံထဲရှိ operator နှင့် ဘေလ်အခြေအနေကို ဖတ်ပြီး သက်ဆိုင်ရာ Operator ၏ discount ဖြင့် တွက်ချက်ပေးပါ။

[RESPONSE STEPS]:
၁။ User သုံးနေသော Operator ကို အခြေခံ၍ သီးသန့် (Dynamic) သက်သာခွင့်ကို တိုက်ရိုက်ပြောပြပါ။
၂။ အရင်း ၁၀၀၀ နဲ့ တွက်ပြပါ။ (ဥပမာ- ၁၀၀၀ ဖိုးဝယ်ရင် ${1000 - (1000 * (gD + mB) / 100)} ကျပ်ပဲ ကျသင့်)
၃။ အဆုံးသတ်: "မိတ်ဆွေရဲ့ ဖုန်းနံပါတ်လေးကို အောက်မှာ ရိုက်ထည့်ကြည့်ရုံနဲ့ အကျိုးများမယ့် ဝန်ဆောင်မှုတွေ ရွေးလိုက်တော့နော်။ ဘယ် Operator သုံးတာလဲခင်ဗျာ?"

User Query: ${text || "Screenshot analysis request"}
Response:`;

            // 📸 ဓာတ်ပုံပါလာရင် Gemini နားလည်တဲ့ format ပြောင်းမယ်
            let mediaPart = null;
            if (imageBuffer) {
                mediaPart = {
                    inlineData: {
                        data: imageBuffer.toString("base64"),
                        mimeType: mimeType
                    }
                };
            }

            // ၃။ Gemini ဆီသို့ စာရော၊ ပုံပါ (ရှိလျှင်) ပို့ဆောင်ခြင်း
            const aiResponseRaw = await askGemini(text || "ဒီပုံလေးကို ကြည့်ပြီး အကူအညီပေးပါ။", attractionPrompt, mediaPart);
            
            if (!aiResponseRaw || !aiResponseRaw.success) return null;

            return { text: aiResponseRaw.text };

        } catch (error) {
            console.error("AIService Error:", error);
            return null;
        }
    }
}

module.exports = new AIService();
