// src/repositories/BaseRepository.js

const isDevelopment = process.env.NODE_ENV === 'development';
const isTermux = process.env.TERMUX_VERSION !== undefined; // Termux ဟုတ်မဟုတ် စစ်ဆေးခြင်း

/**
 * 🏛️ ARCHI LAW: THE DATABASE SELECTOR
 * Environment နှင့် Platform ပေါ်မူတည်၍ သင့်တော်သော Storage ကို ရွေးချယ်မည်။
 */

if (isDevelopment) {
    if (isTermux) {
        console.log("📦 [Database] Termux Detected: Running with LowDB (JSON Mode)");
        // LowDB သုံးထားတဲ့ implementation ဆီ ပို့မယ်
        module.exports = require('./BaseRepository.json'); 
    } else {
        console.log("🛠️ [Database] Desktop/Server Detected: Running with SQLite");
        module.exports = require('./BaseRepository.sqlite');
    }
} else {
    console.log("🔥 [Database] Production Mode: Running with Firebase");
    module.exports = require('./FirebaseRepository');
}

