// src/repositories/BaseRepository.sqlite.js (SQLite Mock Version)
const sqlite3 = require('better-sqlite3');
const db = new sqlite3('local_test.db');

class BaseRepository {
    constructor() {
        // Table မရှိရင် ဆောက်ပေးထားမယ်
        db.prepare(`CREATE TABLE IF NOT EXISTS firebase_nodes (path TEXT PRIMARY KEY, value TEXT)`).run();
    }

    // --- 🎯 Firebase .set() သို့မဟုတ် .update() ကို SQLite နဲ့ Mock လုပ်ခြင်း ---
    async update(path, data) {
        const jsonValue = JSON.stringify(data);
        const upsert = db.prepare(`
            INSERT INTO firebase_nodes (path, value) VALUES (?, ?)
            ON CONFLICT(path) DO UPDATE SET value = excluded.value
        `);
        upsert.run(path, jsonValue);
        console.log(`💾 [SQLite] Saved to path: ${path}`);
        return true;
    }

    // --- 🎯 Firebase .once('value') ကို Mock လုပ်ခြင်း ---
    async get(path) {
        const row = db.prepare('SELECT value FROM firebase_nodes WHERE path = ?').get(path);
        return row ? JSON.parse(row.value) : null;
    }

    // --- 👤 User Session Logic (နဂိုအတိုင်းပဲ၊ အထဲက engine ပဲ ပြောင်းသွားတာ) ---
    async saveUserSession(userId, sessionData) {
        return await this.update(`sessions/${userId}`, sessionData);
    }

    async getUserSession(userId) {
        const data = await this.get(`sessions/${userId}`);
        return data || { step: 'IDLE' };
    }
}

module.exports = new BaseRepository();
