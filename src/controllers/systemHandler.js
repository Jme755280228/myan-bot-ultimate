const { Markup } = require('telegraf');
const db = require('../database');
const aiHelper = require('../utils/aiHelper');
const adminFirebase = require('firebase-admin');

/**
 * Admin Dashboard UI ကို တည်ဆောက်ပေးခြင်း
 */
 const renderDashboard = async (systemConfig) => {
    const stats = await db.getStats() || {};
    const aiStatus = aiHelper.getAIStatus();
    
    // 🔥 နှုတ်ပြီး တွက်မယ့်အစား တကယ့် Pending စာရင်းကို Database ကနေ တိုက်ရိုက်စစ်မယ်
    const pendingCount = await db.getPendingOrdersCount(); 
    
    const statusLabel = systemConfig.isMaintenance ? "🔴 Maintenance (AI Only)" : "🟢 Normal (Sales Open)";
    const btnLabel = systemConfig.isMaintenance ? "🟢 အရောင်းပြန်ဖွင့်မည်" : "🔴 အရောင်းခေတ္တပိတ်မည်";
    const pendingLabel = pendingCount > 0 ? `⏳ Pending Orders [${pendingCount}]` : `⏳ Pending Orders`;

    return {
        text: `🛠 **MyanBot Admin Dashboard**\n` +
              `---------------------------\n` +
              `Status: ${statusLabel}\n` +
              `Active AI Key: [🔑 ${aiStatus.activeKey}/5]\n` +
              `Total Orders: ${stats.totalOrders || 0}\n` +
              `Completed: ${stats.totalReplies || 0}\n` +
              `Pending: ${pendingCount}\n` + // 🔥 ဒီမှာ တိုက်ရိုက်ပြမယ်
              `---------------------------`,
        markup: Markup.inlineKeyboard([
            [Markup.button.callback(btnLabel, 'toggle_maintenance')],
            [Markup.button.callback(pendingLabel, 'view_pending_list')],
            [Markup.button.callback("📊 စာရင်းချုပ်ကြည့်မည်", "show_full_stats")],
            [Markup.button.callback("📱 User UI (Test)", "back_to_start")],
            [Markup.button.callback("❌ ပိတ်မည်", "delete_msg")]
        ])
    };
};
/** 
 * Pending အော်ဒါများစာရင်းထုတ်ပေးခြင်း (တန်းစီစနစ် - အရင်တင်သူ အရင်ပြမည်)
 */
const getPendingOrdersText = async () => {
    // 🔥 limitToFirst(10) ကိုသုံးပြီး အစောဆုံး (အကြာဆုံးစောင့်နေရသူ) ၁၀ ခုကို ယူမည်
    const snapshot = await adminFirebase.database().ref('orders')
        .orderByChild('status')
        .equalTo('pending')
        .limitToFirst(10) 
        .once('value');
    
    if (!snapshot.exists()) return "✅ လက်ရှိဆောင်ရွက်ရန် Pending အော်ဒါမရှိပါ။";

    let list = "⏳ **ဆောင်ရွက်ရန်ကျန်ရှိသော အော်ဒါများ (Queue)**\n";
    list += "*(အရင်တင်သူကို ထိပ်ဆုံးမှ ပြထားပါသည်)*\n\n";

    let index = 1;
    snapshot.forEach(child => {
        const o = child.val();
        // အချိန်ကို ပိုမိုရှင်းလင်းအောင် ပြရန် (ရွေးချယ်နိုင်သည်)
        const time = o.createdAt ? new Date(o.createdAt).toLocaleTimeString() : 'N/A';
        
        list += `${index}. 📞 ${o.phone} [${time}]\n   📦 ${o.planName} | 🆔: \`${o.userId}\`\n----------------\n`;
        index++;
    });
    return list;
};


/**
 * Maintenance Mode အဖွင့်/အပိတ်
 */
const toggleMaintenance = async (currentStatus) => {
    const newStatus = !currentStatus;
    const msg = newStatus ? "လက်ရှိတွင် ပလန်များ ပြင်ဆင်နေဆဲဖြစ်ပါသဖြင့် AI နှင့်သာ စကားပြောနိုင်ပါသေးသည်ခင်ဗျာ။" : "";
    
    await adminFirebase.database().ref('system_settings').update({
        isMaintenance: newStatus, 
        maintenanceMessage: msg 
    });
    return newStatus;
};

module.exports = { renderDashboard, toggleMaintenance, getPendingOrdersText };
