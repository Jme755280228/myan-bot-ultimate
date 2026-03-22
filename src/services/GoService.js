// src/services/GoService.js
const { exec } = require('child_process');
const path = require('path');

class GoService {
    async calculatePerformance() {
        return new Promise((resolve, reject) => {
            // Binary ဖိုင်လမ်းကြောင်းကို ညွှန်မယ်
            const musclePath = path.resolve(__dirname, '../../modules-go/muscle');
            
            // go run စား muscle ကို တိုက်ရိုက် run မယ်
            exec(musclePath, (error, stdout, stderr) => {
                if (error) {
                    reject(`❌ Go Error: ${error.message}`);
                    return;
                }
                resolve(stdout.trim());
            });
        });
    }
}

module.exports = new GoService();
