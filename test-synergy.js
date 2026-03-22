// test-synergy.js
const GoService = require('./src/services/GoService');

async function startSynergyTest() {
    console.log("🧠 [Node Brain] Calling Go Muscle...");
    try {
        const result = await GoService.calculatePerformance();
        console.log("💪 [Go Muscle Output]:");
        console.log(result);
        console.log("\n🎊 SYNERGY SUCCESSFUL!");
    } catch (err) {
        console.error(err);
    }
}

startSynergyTest();
