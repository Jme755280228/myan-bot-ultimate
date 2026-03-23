// src/services/GoService.js
const { exec } = require('child_process');
const path = require('path');

class GoService {
    /**
     * @param {string} command - လုပ်ဆောင်စေချင်တဲ့ အမိန့် (e.g., 'CALC_CASHBACK', 'VALIDATE_DATA')
     * @param {object} payload - Go ဘက်ကို ပေးလိုက်ချင်တဲ့ အချက်အလက်များ
     */
    async execute(command, payload = {}) {
        return new Promise((resolve, reject) => {
            const musclePath = path.resolve(__dirname, '../../modules-go/muscle');
            
            // Input data ကို JSON string အဖြစ် ပြောင်းပြီး Argument အနေနဲ့ ပို့မယ်
            const inputData = JSON.stringify({ command, payload });
            
            // Go Binary ကို Argument နဲ့အတူ Run မယ် (Escaping special characters for Shell)
            const fullCommand = `${musclePath} '${inputData}'`;

            exec(fullCommand, (error, stdout, stderr) => {
                if (error) {
                    reject(`❌ Go Bridge Error: ${error.message}`);
                    return;
                }
                
                if (stderr) {
                    console.warn(`⚠️ Go Warning: ${stderr}`);
                }

                try {
                    // Go က ပြန်ပို့လိုက်တဲ့ JSON result ကို Object အဖြစ် ပြောင်းယူမယ်
                    const result = JSON.parse(stdout.trim());
                    resolve(result);
                } catch (parseError) {
                    // JSON မဟုတ်တဲ့ output လာရင် plain text အဖြစ်ပဲ ပေးမယ်
                    resolve(stdout.trim());
                }
            });
        });
    }

    // Shortcut method for simple performance check
    async checkHealth() {
        return this.execute('HEALTH_CHECK');
    }
}

module.exports = new GoService();
