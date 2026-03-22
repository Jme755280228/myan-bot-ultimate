// src/repositories/BaseRepository.json.js
const fs = require('fs');
const path = require('path');

/**
 * 🏛️ ARCHI LAW: THE JSON PERSISTENCE LAYER
 * Termux ပေါ်တွင် SQLite အစား အသုံးပြုရန် ပေါ့ပါးသော JSON Engine။
 */

class BaseRepositoryJSON {
    constructor() {
        // data/local_db.json ဆိုပြီး သိမ်းမယ်
        this.dbPath = path.resolve(__dirname, '../../data/local_db.json');
        
        // Directory မရှိရင် ဆောက်မယ်
        const dir = path.dirname(this.dbPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // File မရှိရင် structure အလွတ်နဲ့ ဆောက်မယ်
        if (!fs.existsSync(this.dbPath)) {
            fs.writeFileSync(this.dbPath, JSON.stringify({ nodes: {} }, null, 2));
        }
    }

    // File ထဲက data ကို ဖတ်ယူခြင်း
    _read() {
        try {
            const content = fs.readFileSync(this.dbPath, 'utf-8');
            return JSON.parse(content);
        } catch (error) {
            return { nodes: {} };
        }
    }

    // File ထဲသို့ data ပြန်သိမ်းခြင်း
    _write(data) {
        fs.writeFileSync(this.dbPath, JSON.stringify(data, null, 2), 'utf-8');
    }

    /**
     * 🎯 Firebase-style update logic
     * path: 'orders/ORD-123'
     */
    async update(path, data) {
        const db = this._read();
        db.nodes[path] = {
            ...data,
            updatedAt: new Date().toISOString()
        };
        this._write(db);
        console.log(`💾 [JSON-DB] Path Updated: ${path}`);
        return true;
    }

    /**
     * 🎯 Firebase-style get logic
     */
    async get(path) {
        const db = this._read();
        return db.nodes[path] || null;
    }

    // Helper for Sessions
    async saveUserSession(userId, sessionData) {
        return await this.update(`sessions/${userId}`, sessionData);
    }

    async getUserSession(userId) {
        const data = await this.get(`sessions/${userId}`);
        return data || { step: 'IDLE' };
    }
}

module.exports = new BaseRepositoryJSON();

