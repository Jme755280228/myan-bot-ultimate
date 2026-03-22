const admin = require('../config/firebase');
const db = admin.database();

class BaseRepository {
    constructor() {
        this.db = db;
        this.ref = (path) => db.ref(path);
    }

    // 🧹 Internal Helper
    _purify(data) {
        return JSON.parse(JSON.stringify(data));
    }

    // --- 1. USER SESSION & PROFILE ---
    async saveUserSession(userId, sessionData) {
        try {
            await this.db.ref(`sessions/${userId}`).update(this._purify(sessionData));
            return true;
        } catch (error) {
            console.error("Firebase Session Save Error:", error);
            return false;
        }
    }

    async updateUserProfile(userId, userData) {
        try {
            await this.db.ref(`users/${userId}`).update({
                ...this._purify(userData),
                lastActive: admin.database.ServerValue.TIMESTAMP
            });
            return true;
        } catch (error) {
            return false;
        }
    }

    async getUserSession(userId) {
        try {
            const snapshot = await this.db.ref(`sessions/${userId}`).once('value');
            return snapshot.val() || { step: 'IDLE' };
        } catch (error) {
            return { step: 'IDLE' };
        }
    }

    // --- 2. ORDER PROCESSING ---
    async saveOrder(orderData) {
        const userId = orderData.userId;
        const lockRef = this.db.ref(`order_locks/${userId}`);

        const lockResult = await lockRef.transaction((currentValue) => {
            if (currentValue === null) {
                return { locked: true, timestamp: admin.database.ServerValue.TIMESTAMP };
            }
            return;
        });

        if (lockResult.committed) {
            try {
                const orderRef = this.db.ref('orders').push();
                const orderId = orderRef.key;

                const dataWithId = {
                    ...orderData,
                    orderId: orderId,
                    status: 'pending',
                    createdAt: new Date().toISOString(),
                    photoId: orderData.photoId || null,
                    transactionId: orderData.transactionId || null,
                    accountName: orderData.accountName || null,
                    orderMode: orderData.orderMode || 'MANUAL'
                };

                await orderRef.set(this._purify(dataWithId));
                setTimeout(() => lockRef.remove(), 5000);
                return orderId;
            } catch (err) {
                await lockRef.remove();
                throw err;
            }
        } else {
            throw new Error("DUPLICATE_ORDER_ATTEMPT");
        }
    }

    async getPendingOrdersCount() {
        const snapshot = await this.db.ref('orders').orderByChild('status').equalTo('pending').once('value');
        return snapshot.numChildren() || 0;
    }

    async updateOrderStatus(orderKey, status) {
        try {
            const updates = { status, updatedAt: new Date().toISOString() };
            if (status === 'completed') updates.completedAt = new Date().toISOString();
            if (status === 'rejected') updates.rejectedAt = new Date().toISOString();
            await this.db.ref(`orders/${orderKey}`).update(updates);
            return true;
        } catch (error) {
            return false;
        }
    }

    // --- 3. SYSTEM SETTINGS ---
    async getBotSettings() {
        const snapshot = await this.db.ref('system_settings/config').once('value');
        let data = snapshot.val();
        if (!data) {
            data = { isMaintenance: false, globalDisc: 0, u9: 0, aiEnabled: true };
            await this.db.ref('system_settings/config').set(data);
        }
        return data;
    }

    // --- 4. AI & PRODUCTS ---
    async getChatContext(userId) {
        const snapshot = await this.db.ref(`chat_context/${userId}`).once('value');
        return snapshot.val() || "";
    }

    async getProductData() {
        const snapshot = await this.db.ref('products').once('value');
        return snapshot.val() || {};
    }

    // --- 5. PLAN MANAGEMENT ---
    async updatePlanPrice(operator, category, planId, newPrice) {
        const path = `plans/${operator.toLowerCase()}/${category.toLowerCase()}/${planId}`;
        await this.db.ref(path).update({ price: newPrice });
        return true;
    }
}

module.exports = new BaseRepository();
