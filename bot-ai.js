require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function runMyanBot() {
    try {
        console.log("Jme's MyanBot AI is starting...");

        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
        
        // Gemini 2.5 Flash က Quota ပိုရသလို Stable လည်း ပိုဖြစ်ပါတယ်
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.5-flash" 
        });

        // Chat history ကို အရှင်းဆုံး ထားပါမယ် (Tokens သက်သာအောင်)
        const chat = model.startChat();

        console.log("Sending query to MyanBot AI Core...");
        
        const prompt = "What is your primary objective?";
        const result = await chat.sendMessage(prompt);
        const responseText = result.response.text();

        console.log("\n--- MyanBot AI Response ---");
        console.log(responseText);

    } catch (error) {
        if (error.status === 429) {
            console.error("⚠️ Quota Limit ပြည့်သွားပါပြီ။ ၅ မိနစ်လောက် စောင့်ပြီးမှ ပြန်စမ်းကြည့်ပါ Jme။");
        } else {
            console.error("Error starting AI:", error);
        }
    }
}

runMyanBot();
