// src/services/OrderService.js

const dbRepository = require('../repositories/BaseRepository');

const { OP, CAT, STATUS, DB_FIELDS } = require('../constants/systemConstants'); // 📜 Archi Law (Article 2) ကို အသုံးပြုခြင်း
const crypto = require('crypto');

class OrderService {
    
    /**
     * 🛡️ Integrity Rule: ဖုန်းနံပါတ်ကို သန့်စင်ပြီး Operator ခွဲခြားပေးခြင်း
     */
    parsePhoneAndOperator(rawText) {
        const mmNums = { '၀':'0', '၁':'1', '၂':'2', '၃':'3', '၄':'4', '၅':'5', '၆':'6', '၇':'7', '၈':'8', '၉':'9' };

        // မြန်မာဂဏန်းတွေကို အင်္ဂလိပ်ဂဏန်းပြောင်း၊ စာသားတွေဖယ်ရှားမယ်
        let cleanPhone = rawText.replace(/[၀-၉]/g, (d) => mmNums[d]).replace(/\D/g, "").trim();

        // 09 ပုံစံဖြစ်အောင် ပြင်မယ်
        if (cleanPhone.startsWith('959')) {
            cleanPhone = '09' + cleanPhone.slice(3);
        } else if (cleanPhone.startsWith('9') && !cleanPhone.startsWith('09')) {
            cleanPhone = '09' + cleanPhone.slice(1);
        }

        if (!cleanPhone.startsWith('09')) {
            return { isValid: false, cleanPhone: rawText, operator: null };
        }

        const char3 = cleanPhone.charAt(2);
        let operator = null;

        // 📜 Global Constants ကို အသုံးပြုပြီး Operator ခွဲခြားခြင်း
        if (['2','4','5','8'].includes(char3)) operator = OP.MPT;
        else if (char3 === '3') operator = OP.MEC;
        else if (char3 === '6') operator = OP.MYTEL;
        else if (char3 === '9') operator = OP.U9; // 💎 Diamond Bridge ကို လေးစားလိုက်နာခြင်း
        else if (char3 === '7') operator = OP.ATOM;

        const isValid = operator !== null && (cleanPhone.length >= 9 && cleanPhone.length <= 11);

        // 🎯 JARVIS FIX (Preserved): Prefix များ ဖြတ်ထုတ်ခြင်း
        if (isValid) {
            if (operator === OP.ATOM) {
                // ATOM: ရှေ့ဆုံးက '0' တစ်လုံးပဲ ဖြုတ်မယ် (97... ကျန်မယ်)
                cleanPhone = cleanPhone.substring(1);
            }
            else if (operator === OP.MPT) {
                // MPT: ရှေ့ဆုံးက '09' နှစ်လုံးစလုံး ဖြုတ်မယ် (2/4/5/8... နဲ့ တန်းစမယ်)
                cleanPhone = cleanPhone.substring(2);
            }
        }

        return { isValid, cleanPhone, operator };
    }

    /**
     * 💰 Synergy Rule: ဈေးနှုန်းတွက်ချက်ခြင်း (Repository မှတဆင့် Data ဆွဲယူခြင်း)
     */
    async calculateFinalPrice(operator, planId) {
        try {
            // ၁။ DB ထဲကနေ Settings နဲ့ Plans တွေကို လှမ်းယူမယ် (BaseRepository ကို သုံးပြီး)
            const settings = await dbRepository.get('system_settings') || { isPromotionActive: false };
            const plansData = await dbRepository.get(`plans/${operator}`) || []; // သက်ဆိုင်ရာ operator ရဲ့ plans တွေ
            
            const opKey = operator === OP.MEC ? OP.MPT : operator;

            const selectedPlan = plansData.find(p => String(p.id) === String(planId));
            if (!selectedPlan) return { error: true, message: "Plan not found" };

            const originalPrice = Number(selectedPlan.price);
            let finalPrice = originalPrice;

            // ၂။ Promotion တွက်ချက်ခြင်း
            if (settings.isPromotionActive) {
                // DB_FIELDS constants တွေကို သုံးပြီး discount rate ယူမယ်
                const particularDiscField = opKey === OP.MPT ? DB_FIELDS.MPT_DISC :
                                            opKey === OP.ATOM ? DB_FIELDS.ATOM_DISC :
                                            opKey === OP.U9 ? DB_FIELDS.OOREDOO_DISC : 
                                            opKey === OP.MYTEL ? DB_FIELDS.MYTEL_DISC : null;

                const particularDisc = particularDiscField ? (settings[particularDiscField] || 0) : 0;
                const globalDisc = settings[DB_FIELDS.GLOBAL_DISC] || 0;
                
                const discountRate = particularDisc > 0 ? particularDisc : globalDisc;

                if (discountRate > 0) {
                    finalPrice = Math.round(originalPrice - (originalPrice * discountRate / 100));
                }
            }

            return {
                planName: selectedPlan.name,
                originalPrice,
                finalPrice,
                isPromo: finalPrice < originalPrice
            };
        } catch (error) {
            console.error("Price Calculation Error:", error);
            return { error: true, message: "System error during price calculation." };
        }
    }

    /**
     * 📦 Final Preparation & Save (Altruism Rule: စနစ်တကျ အော်ဒါတင်ခြင်း)
     */
    async processAndSaveOrder(userId, userName, state, photoId) {
        // Main Bill အော်ဒါလား၊ Data Pack လား ခွဲခြားရန် Logic (CAT enum ကိုသုံးမယ်)
        const isMainBill = state.planName.toLowerCase().includes(CAT.MAIN);
        const section = isMainBill ? CAT.MAIN : CAT.DATA;
        
        // Unique Order ID ဖန်တီးမယ်
        const orderId = `ORD-${Date.now()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

        const orderData = {
            orderId: orderId,
            userId: String(userId),
            userName: userName,
            phone: state.phone,
            operator: state.operator,
            planName: state.planName.startsWith(state.operator.toUpperCase())
                      ? state.planName
                      : `${state.operator.toUpperCase()} - ${state.planName}`,
            amount: state.price,
            screenshotId: photoId,
            section: section,
            status: STATUS.PENDING, // 📜 Rule အရ PENDING ကနေစရမယ်
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // Repository ထဲကို သိမ်းမယ်
        await dbRepository.update(`orders/${orderId}`, orderData);
        console.log(`✅ [OrderService] Successfully saved order: ${orderId}`);
        
        return orderData;
    }
}

module.exports = new OrderService();

