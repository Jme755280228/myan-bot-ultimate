const adk = require('@google/adk');
console.log("ADK Loaded successfully!");
// ADK ရဲ့ internal init logic ကို စမ်းခေါ်ကြည့်မယ်
if (adk.init) {
    adk.init();
} else {
    console.log("Available methods:", Object.keys(adk));
}

