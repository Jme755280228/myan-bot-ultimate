// test-mosaic.js
const orderService = require('./src/services/OrderService');
const dbRepository = require('./src/repositories/BaseRepository');
const { STATUS, OP } = require('./src/constants/systemConstants');

async function runMosaicTest() {
    console.log("🎨 --- [Mosaic Phase 2] Full System Integration Test ---");

    try {
        // ၁။ Logic Test: Phone Parsing & Operator Detection
        const rawInput = "၀၉ ၇၇၁၂၃၄၅၆၇"; // ATOM Number
        const parsed = orderService.parsePhoneAndOperator(rawInput);
        
        console.log("📱 Step 1 (Parsing):", parsed.isValid ? "✅ Success" : "❌ Failed");
        console.log(`   Detected: ${parsed.operator} | Clean: ${parsed.cleanPhone}`);

        // ၂။ Rules Integrity Check
        if (parsed.operator !== OP.ATOM) {
            throw new Error("Operator detection mismatch with Constants!");
        }

        // ၃။ Storage Test: Order ကို JSON DB ထဲ သိမ်းမယ်
        const mockState = {
            phone: parsed.cleanPhone,
            operator: parsed.operator,
            planName: "1000MB Data Pack",
            price: 1500
        };

        console.log("💾 Step 2 (Saving to DB)...");
        const order = await orderService.processAndSaveOrder("user_termux_01", "Aung Aung", mockState, "ss_12345");
        
        console.log(`✅ Order Saved! ID: ${order.orderId}`);

        // ၄။ Reflection Test: DB ထဲကနေ ပြန်ဆွဲထုတ်ကြည့်မယ်
        const retrieved = await dbRepository.get(`orders/${order.orderId}`);
        if (retrieved && retrieved.status === STATUS.PENDING) {
            console.log("⚖️  Step 3 (Data Integrity): ✅ Verified (Data is Persistent)");
        } else {
            console.log("❌ Step 3 (Data Integrity): Failed to retrieve correct data");
        }

        console.log("\n🎊 --- ALL SYSTEMS OPERATIONAL (TERMUX MODE) ---");

    } catch (error) {
        console.error("\n💥 Test Crashed:", error.message);
    }
}

runMosaicTest();

